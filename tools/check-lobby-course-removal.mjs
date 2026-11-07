import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const extract=(a,b)=>{const x=html.indexOf(a),y=html.indexOf(b,x);assert(x>=0&&y>x,a);return html.slice(x,y);};
const reset=extract('function resetLobbyPresence(){','ssxLobbyGames=createLobbyGamesRuntime(');
const records=extract('const ROOM_POSITION_FIELDS=','function roomRosterRecord(');
for(const scenario of ['race','ascent','normal','match']){
 const saved={x:scenario==='race'?29:1,z:4,lobbyY:scenario==='ascent'?30:0,online:true,specialTickets:17,costumes:['premium-retroarcade'],lobbyCircuit:scenario==='race',lobbyKart:scenario==='race',kartSession:'retired',kartRequest:{at:100}};
 const calls=[],messages=[],context={players:{self:{...saved}},roomRosterRaw:{self:{...saved}},uid:'self',code:'test',game:{phase:scenario==='match'?'play':'lobby'},position:{x:saved.x,z:saved.z},lobbyElevation:saved.lobbyY,lobbyWalking:true,console,
  findLobbyDoorSpawn:()=>({x:0,z:-4.45}),$:()=>({contentWindow:{postMessage:v=>messages.push(v)}}),publishRoomPosition:async(...args)=>calls.push(args)};
 vm.createContext(context);vm.runInContext(records+'\n'+reset+'\nglobalThis.resetResult=resetLobbyPresence();',context);
 assert.equal(context.players.self.specialTickets,17);assert.deepEqual(context.players.self.costumes,['premium-retroarcade']);
 assert.equal(context.players.self.lobbyCircuit,false);assert.equal(context.players.self.lobbyKart,false);assert.equal(context.players.self.kartSession,null);
 assert.equal(calls.length,1);assert.equal(calls[0][3],true,'replace the old position record, including retired vehicle metadata');
 const stored=JSON.parse(vm.runInContext('JSON.stringify(makeRoomPositionRecord({...players.self,...position}))',context));
 assert(!('kartSession' in stored)&&!('lobbyKart' in stored),'course metadata is not republished');
 if(scenario==='race'||scenario==='ascent'){assert.equal(context.position.x,0);assert.equal(context.position.z,-4.45);}
 if(scenario==='match'){assert.equal(context.position.x,1);assert.equal(messages.length,0,'playing match is not moved to the lobby');}
 else{assert.equal(context.lobbyElevation,0);assert.equal(messages[0].type,'lobby-return-reset');}
}
const validate=extract('    function isValidLobbyFrameMessage(data){','    window.addEventListener("message", event => {');
const c={};vm.createContext(c);vm.runInContext(validate,c);
const accepts=data=>vm.runInContext('isValidLobbyFrameMessage('+JSON.stringify(data)+')',c);
for(const type of ['lobby-kart-course','lobby-kart-action','lobby-kart-spawn','lobby-kart-race-request','lobby-kart-ready'])assert.equal(accepts({type,course:'sky',action:'enter',round:'old'}),false);
assert(accepts({type:'lobby-position',x:23,z:9,lobbyY:0,walking:true,yaw:0}));
assert(accepts({type:'lobby-use-request'}));
for(const name of ['index.html','space-suspect.html','space-suspect-final.html','space-suspect-complete.html']){
 const source=readFileSync(name,'utf8'),match=source.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
 const lobby=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64'))).INTEGRATED_LOBBY_TEMPLATE;
 for(const token of ['installLobbyKartCircuit','createSpaceCircuitMap','createSkyLoopCircuitMap','createLobbyAscent','lobbyKartHud','KartRaceProtocol','tickLobbyKartRace'])assert(!source.includes(token)&&!lobby.includes(token),name+': '+token);
 assert(lobby.includes('createLobbyGamesScene')&&lobby.includes('installLobbyPhotoCamera')&&lobby.includes('stepSoccerCombinations'));
}
for(const directory of ['public/gas-2026-10-23','public/gas-2026-10-26','dist/gas-2026-10-23','dist/gas-2026-10-26'])assert(!existsSync(directory),directory);
console.log('PASS old-course rejoin recovery, account possessions preserved, retired messages rejected, active game/photo features retained, old distributions absent');
