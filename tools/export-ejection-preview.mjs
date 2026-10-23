import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {patchMeetingRuntime} from '../meeting-scene-ejections.js';
const source=await readFile('space-suspect-complete.html','utf8'),m=source.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(m[1]).join(''),'base64')));
let html=patchMeetingRuntime(assets.MEETING_3D_SRCDOC);
const bridge=`
window.__ejectionPreviewPaused=false;let previewStart=0,previewMode='gravity';
function previewStartMode(mode){
 previewMode=mode;window.__ejectionPreviewPaused=false;
 libCostumeSource=${JSON.stringify(assets.COSTUME_LIB_SRC)};
 libCostume=new Function('THREE','clamp',libCostumeSource+';return {buildLightCostume};')(THREE,clamp);
 const names=['レモン','研究員','クルー','航海士','エンジニア','観測員'];
 applyState({meetingId:'preview-'+Date.now(),me:'demo0',seats:names.map((name,i)=>({id:'demo'+i,name,hue:i/6,alive:true,voted:false,costume:i===0?'custom-dragon-pack-dragon-none-none-none':'standard'})),voting:false,allVoted:true,scalesTargets:mode==='balance'?['demo0','demo3']:[]});
 chatPanel.style.display='none';timerBar.style.display='none';abilityBar.style.display='none';
 const result={id:'preview-result',ejected:'demo0',ejecteds:mode==='balance'||mode==='cat'?['demo0','demo3']:['demo0'],catDrag:mode==='cat'?{cat:'demo0',target:'demo3'}:null,outcome:'ejected',revealMode:'role',ejectedDisclosure:[{id:'demo0',label:'インポスター',impostor:true},{id:'demo3',label:'クルーメイト',impostor:false}],remainingImpostors:1,showImpostorCount:true,counts:{demo0:5,demo3:3}};
 previewStart=NOW;previewMeetingEjection(mode,result.ejecteds,result);
}
addEventListener('message',event=>{if(event.source!==parent)return;const d=event.data||{};if(d.type==='ejection-preview-mode')previewStartMode(d.mode);if(d.type==='ejection-preview-pause')window.__ejectionPreviewPaused=!!d.paused;if(d.type==='ejection-preview-seek'){previewStartMode(previewMode);NOW=previewStart+Math.max(0,Number(d.time)||0);getLiveMeetingEjections().tick(.016);window.__ejectionPreviewPaused=true;}});
setInterval(()=>{const s=getLiveMeetingEjections().getState();parent.postMessage({type:'ejection-preview-state',...s},'*');},100);
parent.postMessage({type:'ejection-preview-ready'},'*');
`;
html=html.replace('window.meetingScene={',()=>bridge+'\nwindow.meetingScene={').replace('NOW+=dt;updateMeetingAbilityView();','NOW+=window.__ejectionPreviewPaused?0:dt;updateMeetingAbilityView();');
await mkdir('public',{recursive:true});await writeFile('public/ejection-meeting-preview.html',html);
console.log('Exported live meeting ejection preview');
