import assert from 'node:assert/strict';
import {meetingTableSpawns,adminRoomCounts,MAX_ROOM_PLAYERS} from '../skeld-operations.js';
assert.equal(MAX_ROOM_PLAYERS,15);
let previousRadius=0;
for(let n=1;n<=15;n++){
 const center={x:1.5,z:-12.8},points=meetingTableSpawns(n,center),radius=Math.hypot(points[0].x-center.x,points[0].z-center.z);
 assert(radius>=previousRadius);previousRadius=radius;assert.equal(points.length,n);
 for(let i=0;i<n;i++){
  assert(Math.abs(Math.hypot(points[i].x-center.x,points[i].z-center.z)-radius)<1e-9);
  if(n>1)assert(Math.abs(Math.hypot(points[i].x-points[(i+1)%n].x,points[i].z-points[(i+1)%n].z)-2*radius*Math.sin(Math.PI/n))<1e-9);
 }
}
assert.deepEqual(meetingTableSpawns(0,{x:0,z:0}),[]);
assert.equal(meetingTableSpawns(15,{x:0,z:0},()=>false),null);
const rooms=[{id:'left',x:0,z:0},{id:'right',x:10,z:0}],contains=(x,z,r)=>Math.abs(x-r.x)<3&&Math.abs(z-r.z)<3;
const game={phase:'play',players:{a:{alive:true,x:0,z:0},b:{alive:true,x:10,z:0},ghost:{alive:false,x:0,z:0},offline:{alive:true,disconnected:true,x:0,z:0},spectator:{alive:true,observer:true,x:0,z:0},hallway:{alive:true,x:5,z:0}},bodies:{dead:{x:0,z:0},carried:{x:0,z:0,carriedBy:'a'},removed:{x:10,z:0,removed:true}}};
assert.deepEqual(adminRoomCounts(game,rooms,id=>game.players[id],contains,1000),{left:2,right:1});
game.sabotage={type:'comms',endsAt:2000};assert.deepEqual(adminRoomCounts(game,rooms,id=>game.players[id],contains,1000),{left:0,right:0});
game.sabotage=null;game.players=Object.fromEntries(Array.from({length:15},(_,i)=>[i,{alive:true,x:0,z:0}]));game.bodies={};assert.equal(adminRoomCounts(game,rooms,id=>game.players[id],contains,1000).left,15);
console.log('PASS 1–15 evenly spaced growing spawn rings; admin counts exclude ghosts, disconnected players, spectators, hallways and carried corpses; comms blocks counts');
