// Real entry/reconciliation flow against an in-memory Firebase transport.
const fs=require('fs'),path=require('path'),{createServer}=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const fakeDatabase=`
const refs=new Map();
export const ref=(_db,path)=>({path});
function read(path){return path.split('/').reduce((o,k)=>o?.[k],window.__qaDatabase||{});}
const snapshot=(key,value)=>({key,val:()=>value,exists:()=>value!=null});
function write(path,value,merge=false){window.__qaWrites.push({path,value});const parts=path.split('/'),key=parts.pop();let node=window.__qaDatabase;for(const p of parts)node=node[p]||=( {} );node[key]=merge?{...(node[key]||{}),...value}:value;return Promise.resolve();}
export const get=async r=>snapshot(r.path.split('/').at(-1),read(r.path));
export const set=(r,v)=>write(r.path,v);
export const update=(r,v)=>write(r.path,v,true);
export const remove=r=>write(r.path,null);
export const onValue=(r,fn)=>{if(read(r.path)!==undefined)queueMicrotask(()=>fn(snapshot(r.path.split('/').at(-1),read(r.path))));return()=>{};};
export const onChildAdded=(r,fn)=>{for(const [id,value]of Object.entries(read(r.path)||{}))queueMicrotask(()=>fn(snapshot(id,value)));return()=>{};};
export const onChildChanged=(r,fn)=>{refs.set(r.path,fn);return()=>refs.delete(r.path);};
export const onChildRemoved=()=>()=>{};
export const onDisconnect=()=>({update:async()=>{},remove:async()=>{},cancel:async()=>{}});
export const serverTimestamp=()=>({'.sv':'timestamp'});
export const runTransaction=async(r,fn)=>{const value=fn(read(r.path));if(value!==undefined)await write(r.path,value);return{committed:value!==undefined,snapshot:snapshot('',value)};};
export const getDatabase=()=>({});
export const query=r=>r;
export const orderByChild=()=>{},orderByKey=()=>{},endBefore=()=>{},startAfter=()=>{},limitToFirst=()=>{},limitToLast=()=>{},equalTo=()=>{};
window.__qaEmitPlayer=(room,id,value)=>{write('rooms/'+room+'/players/'+id,value);refs.get('rooms/'+room+'/players')?.(snapshot(id,value));};
`;
const fixture=`
window.__rejoinQA={
 async load(viewMode='2d'){
  uid='qa-self';hostId='qa-host';connected=true;db={};
  const slot=SPAWN_POINTS[3],other=SPAWN_POINTS[4],oldSpawn=SPAWN_POINTS[0];
  const own={name:'レモンかす',hue:.13,costume:'captain',x:slot.x,z:slot.z,yaw:.6,online:true,updatedAt:Date.now(),lastSeenAt:Date.now()};
  const host={name:'ホスト',hue:.6,costume:'standard',x:other.x,z:other.z,online:true,updatedAt:Date.now()};
  const roster={'qa-self':{...own,x:oldSpawn.x,z:oldSpawn.z,role:'impostor',subrole:'vampire',alive:true,assignedTasks:[],tasks:{},readyAt:0},'qa-host':{...host,role:'crew',subrole:'crewmate',alive:true,assignedTasks:[],tasks:{}}};
  const round={phase:'play',round:3,startedAt:Date.now()-100000,countdownEndsAt:Date.now()-90000,playStartsAt:Date.now()-90000,players:roster,bodies:{},settings:{viewMode,mapMode:'classic',voiceEnabled:false,waveMode:'normal',killCooldownSeconds:10},lobbySettings:{viewMode,mapMode:'classic',voiceEnabled:false,roles:{vampire:1},impostorCount:1}};
  const profiles={'qa-self':own,'qa-host':host},restored=applyAccountCostume(own,profiles,uid,roster[uid]);
  window.__qaDatabase={rooms:{'5291':{hostId,createdAt:Date.now()-200000,players:{...profiles,[uid]:restored},game:round}},'.info':{connected:false}};window.__qaWrites=[];
  await enterRoom('5291',window.__qaDatabase.rooms['5291']);
  return{expected:{x:slot.x,z:slot.z},restored:{x:restored.x,z:restored.z,name:restored.name,hue:restored.hue,costume:restored.costume}};
 },
 state(){const avatar=avatars.get(uid),a=avatar?avatar.localToWorld(new THREE.Vector3(0,.82,0)).project(camera):null;return{position:{...position},avatar:avatar?{visible:avatar.visible,position:avatar.position.toArray(),costume:avatar.userData.costume,yaw:avatar.rotation.y}:null,center:a?{x:(a.x+1)*innerWidth/2,y:(1-a.y)*innerHeight/2}:null,phase:game.phase,positionedRound,rosterPositionedRound,profile:players[uid],ship:shipRoot.visible,source:currentMapMode,toast:$('toast').textContent,toastHidden:$('toast').classList.contains('hidden')};},
 lateDisconnect(){window.__qaEmitPlayer('5291',uid,{...roomRosterRaw[uid],online:false,disconnectMode:'temporary'});},
 hostWarning(){dismissToast();notifyHostOfflineOnce();toast('ホストがコマンドを取得できません：テスト','command-error');}
};
`;
(async()=>{
 const server=createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDatabase,contentType:'application/javascript'}));
 await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
 await page.route('**/space-suspect-complete.html',r=>r.fulfill({body:fs.readFileSync(root+'/space-suspect-complete.html','utf8').replace('function showMeetingIntro(reason)',fixture+'\nfunction showMeetingIntro(reason)').replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}',''),contentType:'text/html'}));
 await page.goto(base+'/space-suspect-complete.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__rejoinQA,{timeout:90000});
 for(const mode of ['2d','3d']){
  const loaded=await page.evaluate(mode=>window.__rejoinQA.load(mode),mode);await page.waitForTimeout(650);
  let s=await page.evaluate(()=>window.__rejoinQA.state());console.log('PASS',mode,'current position, visible centered avatar, costume and facing');
  assert.deepEqual(s.position,loaded.expected);assert(s.avatar?.visible&&s.ship);assert.equal(s.avatar.costume,'captain');assert.equal(s.avatar.yaw,.6);assert.equal(s.positionedRound,3);assert.equal(s.rosterPositionedRound,3);
  assert(Math.abs(s.center.x-422)<5,'own avatar centered horizontally');
  if(process.env.ROOM_QA_SHOTS){fs.mkdirSync(process.env.ROOM_QA_SHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.ROOM_QA_SHOTS,'rejoin-'+mode+'.png')});}
  await page.evaluate(()=>window.__rejoinQA.lateDisconnect());await page.waitForTimeout(100);s=await page.evaluate(()=>window.__rejoinQA.state());assert(s.profile.online&&s.avatar.visible);assert.deepEqual(s.position,loaded.expected);
  await page.evaluate(()=>window.__rejoinQA.hostWarning());s=await page.evaluate(()=>window.__rejoinQA.state());assert(s.toastHidden,'host connection errors must not open a popup');
 }
 console.log('ERRORS',errors);assert.deepEqual(errors,[]);console.log('PASS actual entry/reconciliation, current position/identity, centered avatar, old disconnect race, hidden host warnings');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
