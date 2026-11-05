// Contact sounds are derived from confirmed match events, never speculative taps.
export function soccerContactEvents(g){
 const events=[];
 for(const [id,k]of Object.entries(g?.kicks||{}))if(k.connected&&k.contact)events.push({id:'kick:'+id+':'+k.id,at:k.contact.at,power:k.power??.5,type:'kick'});
 for(const [id,p]of Object.entries(g?.presses||{}))if(p.contact&&['won','shielded'].includes(p.result))events.push({id:'press:'+id+':'+p.contact.at,at:p.contact.at,power:.3,type:'kick'});
 for(const [id,s]of Object.entries(g?.slides||{}))if(s.contact)events.push({id:'slide:'+id+':'+s.contact.at,at:s.contact.at,power:.45,type:'kick'});
 for(const [id,f]of Object.entries(g?.finishes||{}))if(f.connected)events.push({id:'finish:'+id+':'+f.contactAt,at:f.contactAt,power:1,type:'kick'});
 if(g?.lastSave)events.push({id:'save:'+g.lastSave.at,at:g.lastSave.at,power:.45,type:'save'});
 if(g?.lastGoal)events.push({id:'goal:'+g.lastGoal.at,at:g.lastGoal.at,power:.5,type:'goal'});
 return events;
}
export function createSoccerFeedback({document,window,visible,clock=Date.now}){
 let audio=null,noise=null;const seen=new Map();
 function level(){
  const slider=document.getElementById('audioEffectsVolume');let raw=slider?.value;
  if(raw===undefined)try{raw=window.localStorage.getItem('space-suspect-volume-effects');}catch{}
  const value=raw===null||raw===undefined?70:Number(raw);return Number.isFinite(value)?Math.max(0,Math.min(100,value))/100:0;
 }
 function unlock(event){
  if(!event.isTrusted||!visible()||document.hidden||!level())return;
  try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audio||=new Context();if(audio.state==='suspended')void audio.resume().catch(()=>{});}catch{}
 }
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});document.addEventListener('keydown',unlock,{capture:true});
 function play(event){
  const volume=level();if(!volume||audio?.state!=='running')return;
  const at=audio.currentTime,duration=event.type==='goal'?.24:.13,gain=audio.createGain(),tone=audio.createOscillator();
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*(event.type==='goal'?.025:.04+.035*event.power),at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  tone.type='sine';tone.frequency.setValueAtTime(event.type==='goal'?1850:event.type==='save'?125:170+event.power*45,at);tone.frequency.exponentialRampToValueAtTime(event.type==='goal'?1450:55,at+duration);
  tone.connect(gain);gain.connect(audio.destination);tone.start(at);tone.stop(at+duration);tone.onended=()=>{tone.disconnect();gain.disconnect();};
  if(event.type==='goal')return;
  if(!noise){noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.08),audio.sampleRate);const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);}
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),hit=audio.createGain();source.buffer=noise;filter.type='lowpass';filter.frequency.value=event.type==='save'?650:1300;hit.gain.value=volume*.035;
  source.connect(filter).connect(hit).connect(audio.destination);source.start(at);source.onended=()=>{source.disconnect();filter.disconnect();hit.disconnect();};
 }
 function dispose(){document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);void audio?.close().catch(()=>{});audio=null;noise=null;seen.clear();}
 window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
 return {update(g){
  const time=clock(),audible=visible()&&!document.hidden;
  for(const event of soccerContactEvents(g)){
   if(time<event.at)continue;
   if(seen.has(event.id))continue;seen.set(event.id,time);
   if(audible&&time>=event.at&&time-event.at<400)play(event);
  }
  for(const [id,at]of seen)if(time-at>10000)seen.delete(id);
 },dispose};
}
