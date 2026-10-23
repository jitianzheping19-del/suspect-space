// Exercise the actual host projectile rules without Firebase or a live room.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../space-suspect-complete.html'),'utf8');
let serial=0,wall=()=>false;
const events=[],deaths=[],defaults={triggerHappyAmmo:9,triggerHappyBulletRadius:.14,triggerHappyFriendlyFire:true};
const ctx={clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),token:()=>`volley-${++serial}`,
 roleBehaviorValue:(s,k)=>s[k]??defaults[k],upgradedRoleCooldownMs:()=>35000,
 roleUpgradePose:(g,id,profiles,bots)=>profiles[id]||bots[id],wallBetween:(a,b)=>wall(a,b),
 emitModRoleEvent:(g,type,by,data)=>events.push({type,by,...data}),
 recordDeath:(g,id,killer,pose,details)=>{g.players[id].alive=false;deaths.push({id,killer,...details});}};
vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('function triggerHappyAllied('),html.indexOf('function roleUpgradeArsonistAbility(')),ctx);
const game=(settings={})=>({phase:'play',settings,players:{a:{alive:true,role:'impostor',subrole:'triggerHappy'}}});
function start(g,profiles,stamp=1000,yaw=0){return ctx.beginTriggerHappyVolley({g,p:g.players.a,actor:'a',loc:profiles.a,cmd:{yaw},stamp,players:profiles,botPositions:{}});}
function step(g,profiles,stamp){ctx.tickTriggerHappy({g,players:profiles,botPositions:{},now:stamp});}
function drain(g,profiles){for(let t=1120;t<=4000;t+=20)step(g,profiles,t);}
let g=game(),poses={a:{x:0,z:0}};
assert(ctx.triggerHappyCanAim(g,'a',poses.a,0,poses,{}),'No target is required to activate');
assert(start(g,poses).ok);assert.equal(g.players.a.abilityReadyAt,36000);assert(!ctx.triggerHappyCanAim(g,'a',poses.a,0,poses,{}));
assert(start(g,poses).error,'A second press cannot restart an active volley');drain(g,poses);
assert.equal(events.filter(e=>e.type==='triggerHappyShot').length,9);assert(!g.players.a.triggerHappyVolley);assert.equal(deaths.length,0);
for(const key of ['observer','disconnected','ventId']){g=game();g.players.a[key]=true;assert(!ctx.triggerHappyCanAim(g,'a',poses.a,0,poses,{}),key);}
g=game();g.players.a.alive=false;assert(!ctx.triggerHappyCanAim(g,'a',poses.a,0,poses,{}));
g=game();g.phase='meeting';assert(!ctx.triggerHappyCanAim(g,'a',poses.a,0,poses,{}));
assert(!ctx.triggerHappyCanAim(game(),'a',{x:NaN,z:0},0,{},{}));
for(const friendly of [false,true]){
 for(const role of ['crew','impostor']){
  deaths.length=0;g=game({triggerHappyFriendlyFire:friendly,triggerHappyHits:1,triggerHappyAmmo:1});
  g.players.b={alive:true,role};poses={a:{x:0,z:0},b:{x:.274,z:3}};
  assert(start(g,poses).ok);drain(g,poses);
  assert.equal(!g.players.b.alive,role==='crew'||friendly,`${role}, friendly fire ${friendly}`);
  if(deaths.length)assert.equal(deaths[0].cause,'triggerHappy');
 }
}
deaths.length=0;events.length=0;wall=(a,b)=>Math.max(a.z,b.z)>=1.5;
g=game({triggerHappyHits:1,triggerHappyAmmo:1});g.players.b={alive:true,role:'crew'};start(g,poses);drain(g,poses);
assert(g.players.b.alive);assert.equal(deaths.length,0);assert(events.find(e=>e.type==='triggerHappyShot').length<1);
// A muzzle crossing a nearby wall must not spawn a bullet beyond that wall.
wall=(a,b)=>Math.max(a.z,b.z)>=.3;
const muzzle=ctx.triggerHappyMuzzle({x:0,z:0},0);assert(muzzle.blocked&&muzzle.z===0);
wall=()=>false;g=game();poses={a:{x:0,z:0}};start(g,poses,1000,Math.PI/2);step(g,poses,1120);
const shot=g.players.a.triggerHappyVolley.projectiles[0];assert(Math.abs(shot.x-.8)<1e-8&&Math.abs(shot.z+.274)<1e-8);
g.phase='meeting';step(g,poses,1140);assert(!g.players.a.triggerHappyVolley);
g=game({triggerHappyAmmo:2});poses={a:{x:0,z:0,yaw:0}};start(g,poses);step(g,poses,1120);poses.a.yaw=Math.PI/2;step(g,poses,1205);assert.equal(g.players.a.triggerHappyVolley.projectiles[0].yaw,0);assert.equal(g.players.a.triggerHappyVolley.projectiles[1].yaw,Math.PI/2);assert.equal(g.players.a.triggerHappyVolley.intervalMs,85);
console.log('PASS: free fire, cooldown/ammo, duplicate press, eligibility, bullet hits, friendly fire, wall/muzzle collision, facing, meeting cleanup');
