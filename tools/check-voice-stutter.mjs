import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createVoiceSpatialParamUpdater,voicePresenceConnectionChanged} from '../voice-continuity.js';
const entries=['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html'];
for(const entry of entries){
 const html=fs.readFileSync(new URL('../'+entry,import.meta.url),'utf8');
 const stats={close:0,reconcile:0,indicator:0,fullRender:0,gates:0};
 const ctx={uid:'self',voiceRemoteStates:new Map(),voicePresenceConnectionChanged,
  closeVoicePeer(){stats.close++;},syncVoicePeers(){stats.reconcile++;},refreshVoiceIndicators(){stats.indicator++;},updateVoiceReceiveGates(){stats.gates++;},safeRenderUI(){stats.fullRender++;}};
 vm.createContext(ctx);
 const start=html.indexOf('    function onRemoteVoicePresence('),end=html.indexOf('    async function subscribeSkyWayPublication',start);
 vm.runInContext(html.slice(start,end),ctx);
 const state={joined:true,session:'connection-a',memberId:'sdk-a',mic:true,speaking:false};
 ctx.onRemoteVoicePresence('other',state);assert.equal(stats.reconcile,1);
 const initialClose=stats.close;
 for(let i=0;i<500;i++)ctx.onRemoteVoicePresence('other',{...state,speaking:!!(i%2)});
 assert.equal(stats.reconcile,1,'speaking updates must not reconcile subscriptions');assert.equal(stats.close,initialClose);assert.equal(stats.fullRender,0,'speaking updates must not rebuild the full UI');assert.equal(stats.indicator,501);
 ctx.onRemoteVoicePresence('other',{...state,session:'connection-b',memberId:'sdk-b'});assert.equal(stats.reconcile,2);assert.equal(stats.close,initialClose+1);
 ctx.onRemoteVoicePresence('other',null);assert.equal(ctx.voiceRemoteStates.size,0);assert.equal(stats.gates,1);
 let writes=0;const param=()=>({setTargetAtTime(value){this.value=value;writes++;}});
 const panner={positionX:param(),positionY:param(),positionZ:param()};
 const spatial={setVoiceSpatialParam:createVoiceSpatialParamUpdater(),voiceContext:{currentTime:0,listener:Object.fromEntries(['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ'].map(k=>[k,param()]))},
  game:{phase:'lobby'},voiceDistanceProfile:()=>({range:20,fade:5,reference:8}),document:{getElementById:()=>null},voicePositionOverride:null,position:{x:0,z:0},lobbyFacingYaw:0,players:{other:{x:4,z:5,online:true}},voicePeers:new Map([['other',{panner}]]),voiceSabotageActive:()=>false,voiceIsImpostor:()=>false,uid:'self'};
 vm.createContext(spatial);const a=html.indexOf('    function updateVoiceSpatialAudio(){'),b=html.indexOf('    function voiceDoorLeakGain',a);vm.runInContext(html.slice(a,b),spatial);
 for(let i=0;i<100;i++){spatial.voiceContext.currentTime=i/10;spatial.updateVoiceSpatialAudio();}
 assert.equal(writes,12,'stationary listener and peer must each enqueue their initial parameters only');
 spatial.players.other.x=7;spatial.updateVoiceSpatialAudio();assert.equal(writes,13);assert.equal(panner.positionX.value,7);assert.equal(panner.rolloffFactor,0);
 console.log('PASS',entry,'500 speaking updates without UI rebuild/re-subscription; reconnect cleanup; stationary AudioParam deduplication and movement');
}
