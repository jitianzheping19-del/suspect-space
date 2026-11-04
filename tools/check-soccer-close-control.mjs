import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {SOCCER_CLOSE_TOUCH,sampleSoccerDribble} from '../lobby-soccer-skills.js';
const R=createLobbyGamesRules(),T=100000;
function fixture(){const players={self:{online:true,x:23,z:9,yaw:0,lobbyY:0,walking:false}};const s=R.fresh('self',T);Object.assign(s.soccer.ball,{x:23,z:9.64,dribbler:'self'});R.step(s,players,T,1/60);return {s,players};}
for(const dt of [1/60,1/30,.1])for(const [dx,dz,kind]of [[.003,0,'lateral'],[-.003,0,'lateral'],[0,-.003,'drag'],[0,.003,'nudge']]){
 const {s,players}=fixture(),g=s.soccer,p=players.self;let t=T+dt*1000;p.x+=dx;p.z+=dz;R.step(s,players,t,dt);
 assert.equal(g.dribble.rollKind,kind);const start=g.dribble.rollAt,side=g.dribble.rollSide;assert.equal(side,dx<0?-1:1);let maxContact=0,ballMovement=0,previous={...g.ball};
 for(let i=0;i<Math.ceil(.75/dt);i++){t+=dt*1000;R.step(s,players,t,dt);const c=g.dribble,m=sampleSoccerDribble(t-c.at,c.walking,t-c.rollAt,c.rollSide,false,c.phase,c);maxContact=Math.max(maxContact,m.sole);ballMovement+=Math.hypot(g.ball.x-previous.x,g.ball.z-previous.z);previous={...g.ball};assert.equal(g.ball.dribbler,'self');}
 assert(maxContact>.95,'short input completes the sole plant even after release');assert(ballMovement>.05,'ball follows the authored touch');assert.equal(g.dribble.rollAt,start,'standing still does not retrigger');
}
for(const networkMs of [16.67,50,100])for(const velocity of [.012,.18]){
 const {s,players}=fixture(),g=s.soccer,p=players.self,starts=new Set();let next=0;
 for(let age=0;age<2200;age+=1000/60){if(age>=next){p.x=23+age/1000*velocity;next+=networkMs;}R.step(s,players,T+age,1/60);if(g.dribble.rollAt!==undefined)starts.add(g.dribble.rollAt);}
 assert(starts.size>=3&&starts.size<=4,'slow held movement repeats distinct touches at '+networkMs+'ms');assert(g.dribble.precision);assert(g.dribble.phaseRate<1,'slow motion uses slow footwork');
 p.walking=false;const finalMove=p.x;for(let age=2200;age<4000;age+=1000/60)R.step(s,players,T+age,1/60);const stoppedAt=g.dribble.rollAt;
 for(let age=4000;age<5000;age+=1000/60)R.step(s,players,T+age,1/60);assert.equal(g.dribble.rollAt,stoppedAt);assert.equal(g.dribble.phaseRate,0);assert.equal(p.x,finalMove);
}
{
 const {s,players}=fixture(),g=s.soccer,p=players.self;
 for(let age=0;age<900;age+=1000/60){p.z=9+age/1000*3;p.walking=true;R.step(s,players,T+age,1/60);}assert(!g.dribble.precision);assert(g.dribble.phaseRate>3);
 g.dashes={self:{until:T+2000}};R.step(s,players,T+1000,1/60);assert.equal(g.dribble.rollAt,undefined,'sprint cancels sole locking');
}
console.log('PASS tiny four-direction nudges, completed contact after release, repeated slow touches at 60/20/10 Hz, no idle looping, possession and sprint transition');
