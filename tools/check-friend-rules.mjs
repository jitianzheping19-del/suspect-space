import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createFriendService} from '../friend-service.js';
const base='http://127.0.0.1:19001',namespace='demo-friend-settings';
async function request(path,method='GET',data,actor){const url=new URL(`${base}/${path||''}.json`);url.searchParams.set('ns',namespace);if(actor)url.searchParams.set('auth_variable_override',JSON.stringify({uid:actor,token:{sub:actor}}));const response=await fetch(url,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const value=await response.json();if(!response.ok)throw Error(JSON.stringify(value));return value;}
await request('.settings/rules','PUT',JSON.parse(await fs.readFile(process.argv[2]||'database.rules.json','utf8')));
await request('','PUT',{onlineUsers:{alice:{name:'Alice',online:true,hue:.2,updatedAt:Date.now()},bob:{name:'Bob',online:true,hue:.4,updatedAt:Date.now()},mallory:{name:'Mallory',online:true,hue:.1,updatedAt:Date.now()}}});
// REST-backed adapter exercises the production service, including atomic paired changes.
function client(actor){return createFriendService({db:()=>true,ref:(_db,path)=>path||'',get:async path=>{const value=await request(path,'GET',undefined,actor);return {val:()=>value};},update:(_path,patch)=>request('','PATCH',patch,actor),uid:()=>actor,name:()=>actor==='alice'?'Alice':'Bob',now:Date.now});}
const a=client('alice'),b=client('bob');
await a.send({id:'bob',name:'Bob'});let edges=await request('friendEdges/bob','GET',undefined,'bob');assert.equal(edges.alice.state,'pending');assert.equal(edges.alice.seen,false);
await assert.rejects(()=>a.send({id:'bob',name:'Bob'}),/すでに/);
await assert.rejects(()=>a.respond('bob',true),/見つかりません/);
await assert.rejects(()=>request('friendEdges/bob/alice/state','PUT','accepted','alice'),/Permission denied/);
await assert.rejects(()=>request('friendEdges/bob','GET',undefined,'mallory'),/Permission denied/);
await assert.rejects(()=>request('friendEdges/bob/alice/state','PUT','accepted','mallory'),/Permission denied/);
await assert.rejects(()=>request('friendEdges/bob/alice/seen','PUT',true,'alice'),/Permission denied/);
await b.seen(edges);edges=await request('friendEdges/bob','GET',undefined,'bob');assert.equal(edges.alice.seen,true);assert.equal(edges.alice.state,'pending');
await b.respond('alice',true);for(const [me,peer]of [['alice','bob'],['bob','alice']])assert.equal((await request(`friendEdges/${me}/${peer}`,'GET',undefined,me)).state,'accepted');
await b.respond('alice',true);await b.remove('alice');assert.equal(await request('friendEdges/alice','GET',undefined,'alice'),null);assert.equal(await request('friendEdges/bob','GET',undefined,'bob'),null);
await a.send({id:'bob',name:'Bob'});await b.respond('alice',false);assert.equal((await request('friendEdges/alice/bob','GET',undefined,'alice')).state,'declined');await a.send({id:'bob',name:'Bob'});assert.equal((await request('friendEdges/bob/alice','GET',undefined,'bob')).seen,false);
console.log('PASS real RTDB rules: send, duplicate prevention, owner-only reads, sender cannot accept or mark read, third party blocked, seen persistence, mutual acceptance, decline and remove');
