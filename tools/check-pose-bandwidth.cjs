// Execute the shipped publishers; only the transport and monotonic clock are fake.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const {createPoseSavePolicy}=await import('../room-traffic-policy.js');
 for(const file of ['index.html','space-suspect-complete.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const start=html.indexOf('const POSE_HEARTBEAT_MS='),end=html.indexOf('const reviewUI=',start);
  let callback,t=100000,writes=[],pending=false,release,direct=true,samples=0;
  class Network{
   constructor(options){this.options=options;this.context=null;this.links=new Map();this.stats={};}
   configure(context){this.context=context.enabled?context:null;}canUseDirect(){return !!this.context&&direct;}
   publishLocal(){if(this.context)samples++;}publishBots(){}tick(){}poseFor(){return null;}stop(){this.context=null;}
  }
  const row={name:'test',online:true,x:1,z:2};
  const c={createPoseSavePolicy,performance:{now:()=>t},code:'1234',connected:true,uid:'u',session:1,hostId:'u',roomCreatedAt:99,leaving:false,
   peerPoseNetwork:null,peerPoseJoined:true,peerPoseUiTimer:0,peerPoseLastRows:new Map(),peerPoseFirebaseAt:new Map(),PeerPoseNetwork:Network,
   game:{phase:'play',round:1,settings:{positionUpdateMode:'light'},players:{}},players:{u:{...row}},roomRosterRaw:{u:{...row}},roomPositionsRaw:{u:{...row}},roomPositionKnown:new Set(['u']),
   botPositions:{},position:{x:1,z:2},lastSent:{x:999,z:999,at:0},lobbyFacingYaw:0,lobbyWalking:false,lobbyElevation:0,
   lobbyKartRiding:false,lobbyCircuitLocation:false,lobbyVehicleSpawned:false,kartSession:'s',circuitCourse:'sky',avatars:new Map(),window:{},db:{},
   isHost:()=>true,isLobbyInteractionActive:()=>c.game.phase==='lobby',distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),now:()=>t,ref:(_,p)=>p,serverTimestamp:()=>({'.sv':'timestamp'}),
   update:async(p,patch)=>{writes.push({path:p,patch});if(pending)await new Promise(r=>release=r);},set:async(p,patch)=>writes.push({path:p,patch}),toast:e=>{throw e;},safeRenderUI:()=>{},setTimeout:()=>1,clearTimeout:()=>{},
   setInterval:(f,ms)=>{assert.equal(ms,50);callback=f;}
  };
  c.mergeBots=roster=>Object.fromEntries(Object.entries(roster).map(([id,p])=>[id,{...p,...(c.roomPositionsRaw[id]||{})}]));
  vm.createContext(c);const helpers=html.indexOf('const ROOM_POSITION_FIELDS=');
  vm.runInContext(html.slice(helpers,html.indexOf('let peerPoseNetwork=',helpers)),c);vm.runInContext(html.slice(start,end),c);
  await callback();assert.equal(writes.length,1);writes=[];const before=samples;
  for(let frame=1;frame<=3600;frame++){t=100000+frame*1000/60;c.position.x+=.005;vm.runInContext('publishDirectRoomPose()',c);if(frame%3===0)await callback();}
  assert.equal(writes.length,0,'continuous WebRTC movement must not create periodic Firebase snapshots');assert.equal(samples-before,3600,'frame-based pose sampling stays at 60 Hz');
  t+=50;await callback();assert.equal(writes.length,1,'stopping saves one recovery pose');assert.equal(vm.runInContext('roomPeerPose(uid).x',c),c.position.x);
  c.avatars.set('u',{rotation:{y:1.2}});vm.runInContext('publishDirectRoomPose()',c);assert.equal(c.players.u.yaw,1.2,'host authority must use the current facing, not a stale lobby yaw');
  c.peerPoseLastRows.set('other',{room:c.code,scope:vm.runInContext('roomPoseScope()',c),pose:{x:8,z:9,updatedAt:t}});c.peerPoseFirebaseAt.set('other',t-5000);assert.equal(vm.runInContext('roomPeerPose("other").x',c),8);
  c.peerPoseFirebaseAt.set('other',t+1);assert.equal(vm.runInContext('roomPeerPose("other")',c),null);
  writes=[];direct=false;for(let i=0;i<1200;i++){t+=50;c.position.x+=.005;await callback();}assert.equal(writes.length,12,'RTC recovery uses at most one moving snapshot per five seconds');
  direct=true;c.game.phase='lobby';t+=50;await callback();writes=[];
  for(let i=0;i<1200;i++){t+=50;await callback();}assert.equal(writes.length,0,'idle lobby must not publish periodic positions');
  pending=true;c.game.round++;t+=50;c.position.x+=1;const captured=c.position.x,slow=callback();await Promise.resolve();t+=50;c.position.x+=2;vm.runInContext('publishDirectRoomPose()',c);assert.equal(c.players.u.x,c.position.x,'slow durable writes must not block live poses');release();await slow;pending=false;assert.equal(c.lastSent.x,captured,'async checkpoint commits its captured position');
  c.game.lobbySettings={positionUpdateMode:'standard'};t+=50;await callback();assert(c.peerPoseNetwork.context,'every mode must retain the low-traffic direct lane');
  console.log('PASS',file,'60 Hz samples, no periodic RTC position writes, one stop snapshot, bounded recovery, local facing, idle lobby and delayed writes');
 }
})().catch(e=>{console.error(e);process.exit(1)});
