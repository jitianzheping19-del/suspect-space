import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
const source=fs.readFileSync(new URL('../assets-source/lobby-lounge.html',import.meta.url),'utf8');
const cases=[['editable lobby',source]];
for(const name of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
 const html=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),payload=html.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
 cases.push([name,JSON.parse(gunzipSync(Buffer.from(JSON.parse(payload[1]).join(''),'base64'))).INTEGRATED_LOBBY_TEMPLATE]);
}
for(const [name,html] of cases){
 const handlers=[],parent={};
 const states=new Map([['self',{x:9,z:9,name:'Self',online:true}],['remote',{x:0,z:0,name:'Remote',online:true,costume:'premium-retroarcade',ready:true}]]);
 const ctx={parent,visualSelfUid:'self',lobbyVisualStates:states,window:{addEventListener(type,handler){if(type==='message')handlers.push(handler);}}};vm.createContext(ctx);
 const a=html.indexOf('/* LOBBY_LIVE_POSE_BEGIN */'),b=html.indexOf('/* LOBBY_LIVE_POSE_END */',a);assert(a>=0&&b>a,'live pose bridge must be shipped');vm.runInContext(html.slice(a,b),ctx);
 const c=html.indexOf('    window.applyLobbyVisualState='),d=html.indexOf('    window.updateLobbyVisualPoses=',c);assert(c>=0&&d>c);vm.runInContext(html.slice(c,d),ctx);assert.equal(handlers.length,1);
 const send=(rows,source=parent)=>handlers[0]({source,data:{type:'lobby-poses',players:rows}});
 for(let frame=0;frame<60;frame++){
  send({remote:{x:frame*.1,z:frame*.05,yaw:.5,lobbyY:0,walking:true,updatedAt:1000+frame*17}});
  assert(Math.abs(states.get('remote').x-frame*.1)<1e-9,'each frame must reach the lobby without another config update');
 }
 assert.equal(states.get('remote').name,'Remote');assert.equal(states.get('remote').costume,'premium-retroarcade');assert.equal(states.get('remote').ready,true);
 ctx.mergeLobbyVisualState('remote',{name:'Renamed',online:true,x:0,z:0,updatedAt:1000});assert.equal(states.get('remote').name,'Renamed');assert.equal(states.get('remote').x,5.9,'delayed config must not rewind movement');
 send({remote:{x:0,z:0,yaw:0,lobbyY:0,updatedAt:1001}});assert.equal(states.get('remote').x,5.9,'old position must be ignored');
 send({remote:{x:99,z:0,yaw:0,lobbyY:0,updatedAt:9000}},{});assert.equal(states.get('remote').x,5.9,'another window cannot update the lobby');
 send({self:{x:0,z:0,yaw:0,lobbyY:0,updatedAt:9000},remote:{x:NaN,z:0,yaw:0,lobbyY:0,updatedAt:9000}});assert.equal(states.get('self').x,9);assert.equal(states.get('remote').x,5.9);
 send({remote:{x:6,z:3,yaw:1,lobbyY:2,walking:true,lobbyVehicle:true,lobbyVehicleX:8,lobbyVehicleZ:9,kartSession:'session',circuitCourse:'sky',updatedAt:3000}});assert.equal(states.get('remote').lobbyVehicleX,8);assert.equal(states.get('remote').lobbyY,2);
 console.log('PASS',name,'60 live updates, metadata preservation, stale-config protection, origin/self guards and kart/jump state');
}
