// Run the shipped publishers, including delayed writes and fallback transitions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 for(const file of ['index.html','space-suspect-complete.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const start=html.indexOf('const POSE_HEARTBEAT_MS='),end=html.indexOf('// ---------- UI ----------',start);
  let callback,t=100000,writes=[],pending,release,direct=true,samples=0;
  class Network{
   constructor(options){this.options=options;this.context=null;this.links=new Map();this.stats={};}
   configure(context){this.context=context.enabled?context:null;}
   canUseDirect(){return !!this.context&&direct;}
   publishLocal(){if(this.context)samples++;}publishBots(){}tick(){}poseFor(){return null;}
   stop(){this.context=null;}
  }
  const row={name:'test',online:true,x:1,z:2};
  const c={code:'1234',connected:true,uid:'u',session:1,hostId:'u',roomCreatedAt:99,leaving:false,
   peerPoseNetwork:null,peerPoseJoined:true,peerPoseUiTimer:0,peerPoseLastRows:new Map(),peerPoseFirebaseAt:new Map(),PeerPoseNetwork:Network,POSE_CHECKPOINT_MS:5000,POSE_FALLBACK_MS:200,
   game:{phase:'play',round:1,settings:{positionUpdateMode:'light'},players:{}},players:{u:{...row}},roomRosterRaw:{u:{...row}},roomPositionsRaw:{u:{...row}},roomPositionKnown:new Set(['u']),
   botPositions:{},position:{x:1,z:2},lastSent:{x:999,z:999,at:0},lobbyFacingYaw:0,lobbyWalking:false,lobbyElevation:0,
   lobbyKartRiding:false,lobbyCircuitLocation:false,lobbyVehicleSpawned:false,kartSession:'s',circuitCourse:'sky',avatars:new Map(),window:{},db:{},
   isHost:()=>true,isLobbyInteractionActive:()=>false,distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),now:()=>t,ref:(_,p)=>p,serverTimestamp:()=>({'.sv':'timestamp'}),
   update:async(p,patch)=>{writes.push({path:p,patch});if(pending)await new Promise(r=>release=r);},
   set:async(p,patch)=>writes.push({path:p,patch}),toast:e=>{throw e;},safeRenderUI:()=>{},setTimeout:()=>1,
   setInterval:(f,ms)=>{assert.equal(ms,50);callback=f;}
  };
  c.mergeBots=roster=>Object.fromEntries(Object.entries(roster).map(([id,p])=>[id,{...p,...(c.roomPositionsRaw[id]||{})}]));
  vm.createContext(c);
  const helpers=html.indexOf('const ROOM_POSITION_FIELDS=');
  if(helpers>=0)vm.runInContext(html.slice(helpers,html.indexOf('let peerPoseNetwork=',helpers)),c);
  vm.runInContext(html.slice(start,end),c);
  await callback();writes=[];
  for(let i=0;i<1200;i++){t+=50;c.position.x+=.005;await callback();}
  assert.equal(writes.length,12,file+' smart mode must only checkpoint every five seconds');
  assert.equal(samples,1201,file+' direct samples must keep running at 20 Hz');
  assert.equal(vm.runInContext('roomPeerPose(uid).x',c),c.position.x,'self range checks must use the current local position');
  c.peerPoseLastRows.set('other',{room:c.code,scope:vm.runInContext('roomPoseScope()',c),pose:{x:8,z:9,updatedAt:t}});
  c.peerPoseFirebaseAt.set('other',t-5000);assert.equal(vm.runInContext('roomPeerPose("other").x',c),8,'recovery must hold the final direct pose');
  c.peerPoseFirebaseAt.set('other',t+1);assert.equal(vm.runInContext('roomPeerPose("other")',c),null,'a fresh checkpoint must replace the held pose');
  direct=false;t+=200;c.position.x+=1;await callback();assert.equal(writes.length,13,'broken direct links must immediately resume 5 Hz writes');
  assert.equal(writes.at(-1).path,file==='index.html'?'rooms/1234/positions/u':'rooms/1234/players/u');
  // A pending checkpoint cannot stall the direct lane, or acknowledge a newer
  // movement that happened while Firebase was still responding.
  pending=true;t+=200;c.position.x+=1;const captured=c.position.x;const slow=callback();
  await Promise.resolve();t+=50;c.position.x+=2;const before=samples;await callback();assert.equal(samples,before+1);
  release();await slow;pending=false;assert.equal(c.lastSent.x,captured);
  t+=200;await callback();assert.equal(writes.at(-1).patch.x,Math.round(c.position.x*1000)/1000);
  c.game.settings.positionUpdateMode='standard';t+=200;c.position.x+=1;await callback();
  assert.equal(vm.runInContext('roomPoseSendIntervalMs()',c),200);
  assert.equal(c.peerPoseNetwork.context,null,'standard mode must stop peer discovery');
  console.log('PASS',file,'20 Hz samples, 12 checkpoints/minute, current self pose, fallback, async writes and standard mode');
 }
})().catch(e=>{console.error(e);process.exit(1)});
