import assert from 'node:assert/strict';
import {collideSoccerKeeper,soccerKeeperColliders} from '../lobby-soccer-air.js';
import {stepSoccerBots} from '../lobby-soccer-bots.js';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
const R=createLobbyGamesRules(),F=R.SOCCER,T=100000;
for(const team of [0,1])for(const phase of ['ready','dive','recover'])for(const age of [40,180,380,640]){
 const dir=team===0?1:-1,z=(team===0?F.near:F.far)+dir*.75;
 const k={team,x:23,z,phase,at:T,until:T+850,fromX:23,toX:24.2,height:2,side:1,saves:0};
 for(const shape of soccerKeeperColliders(k,T+age).filter(s=>['glove','body','boot'].includes(s.part))){
  const c={x:(shape.a.x+shape.b.x)/2,y:Math.max(.3,(shape.a.y+shape.b.y)/2),z:(shape.a.z+shape.b.z)/2};
  const g={keepers:{[team]:{...k}},ball:{...c,z:c.z-dir*1,vx:0,vy:0,vz:-dir*25},kicks:{},skills:{}};
  assert(collideSoccerKeeper(g,F,T+age,{...c,z:c.z+dir*1}),'swept '+phase+' '+shape.part);
  assert.equal(g.keepers[team].saves,1);assert(g.ball.vz*dir>0);assert(Math.abs(g.lastSave.z-c.z)>.05,'save starts at contact surface');
 }
 const miss={keepers:{[team]:{...k}},ball:{x:29,y:3.5,z:z-dir,vx:0,vy:0,vz:-dir*25}};
 assert(!collideSoccerKeeper(miss,F,T+age,{x:29,y:3.5,z:z+dir}),'unreachable shots stay missed');
}
console.log('PASS both keepers: fast sweeps against gloves/body/boots in ready, dive and recovery, plus unreachable misses');
for(const team of [0,1])for(const kind of ['short','long','goal']){
 const dir=team===0?1:-1,goal=team===0?F.far:F.near;
 const p={online:true,bot:true,soccerBot:true,x:23,z:kind==='goal'?goal-dir*9:10,yaw:team===0?0:Math.PI,lobbyY:0,ownedAt:T-2000,nextAction:0};
 const q={online:true,x:25,z:kind==='goal'?goal-dir*3:10+dir*(kind==='long'?11:3),lobbyY:0};
 const g={status:'playing',members:{bot:team,ally:team},bots:{bot:p},ball:{x:p.x,y:.3,z:p.z+dir*.7,dribbler:'bot'},kicks:{},skills:{},endAt:T+10000};
 stepSoccerBots(g,{bot:p,ally:q},F,T,0);
 assert.equal(g.kicks.bot?.mode,kind==='short'?'pass':'lob',kind+' pass for team '+team);assert.equal(g.kicks.bot.target,'ally');
}
console.log('PASS both bot teams: short ground passes, distant lofted passes and crosses to goal-front teammates');
