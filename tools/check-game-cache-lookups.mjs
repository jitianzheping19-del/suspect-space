import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('game-cache-worker.js','utf8').replace('__ASSET_VERSION__','current'),base='https://fixture.example/suspect-space/';
function fixture({unavailable=false}={}){
 const stores=new Map(),stats={opens:0,keys:0,matches:0,fetches:0,puts:0},listeners={},failures=new Set();
 const key=request=>typeof request==='string'?new URL(request,base).href:request.url;
 function store(name){if(!stores.has(name))stores.set(name,new Map());return stores.get(name);}
 const context={URL,Request,Response,Map,Set,Promise,self:{location:{href:base+'game-cache-worker.js'},addEventListener:(kind,fn)=>listeners[kind]=fn},caches:{
  async keys(){stats.keys++;return [...stores.keys()];},async open(name){stats.opens++;if(unavailable)throw Error('Storage unavailable');const rows=store(name);return {async match(request){stats.matches++;return rows.get(key(request))?.clone();},async put(request,response){stats.puts++;rows.set(key(request),response);}}}},
  async fetch(request){stats.fetches++;const url=key(request);if(failures.delete(url))throw Error('Network interrupted');return new Response('download:'+url);}
 };
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.probe={fetchAsset,cacheable};',context);
 return {stats,listeners,failures,seed(name,file){store('space-suspect-assets-'+name).set(base+'assets/'+file,new Response('saved:'+file));},get:file=>context.probe.fetchAsset(new Request(base+'assets/'+file))};
}
const f=fixture();
for(let i=0;i<24;i++)f.seed('current','current-'+i+'.js');
await Promise.all(Array.from({length:48},(_,i)=>f.get('current-'+i%24+'.js')));
assert.deepEqual(f.stats,{opens:1,keys:0,matches:24,fetches:0,puts:0});
for(let i=0;i<12;i++)f.seed('previous','old-'+i+'.js');
await Promise.all(Array.from({length:12},(_,i)=>f.get('old-'+i+'.js')));
assert.equal(f.stats.keys,1);assert.equal(f.stats.opens,2);assert.equal(f.stats.fetches,0);
await Promise.all(Array.from({length:32},()=>f.get('new-version.js')));
assert.equal(f.stats.fetches,1);assert.equal(f.stats.puts,1);assert.equal(f.stats.keys,1);assert.equal(f.stats.opens,2);
f.failures.add(base+'assets/retry.js');const failed=await Promise.allSettled([f.get('retry.js'),f.get('retry.js')]);assert(failed.every(r=>r.status==='rejected'));
assert.equal((await f.get('retry.js')).status,200);assert.equal(f.stats.fetches,3,'a failed request can be retried');
const noStorage=fixture({unavailable:true});await Promise.all([noStorage.get('safe.js'),noStorage.get('safe.js')]);assert.equal(noStorage.stats.fetches,1);
let intercepted=false;
for(const request of [new Request(base+'account'),new Request(base+'assets/probe.js',{method:'POST'})])f.listeners.fetch({request,respondWith(){intercepted=true;}});
assert.equal(intercepted,false,'account and mutation requests bypass the asset cache');
console.log('PASS 48 cached requests use one cache open and no enumeration; previous-version lookup opens once; cold requests coalesce; storage failures, retry and account bypass work');
