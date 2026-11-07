// Opt-in, local-only diagnostics. Never store identities, room codes, chat or credentials.
const localStorageOrNull=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function createPlaytestRecorder({clock=()=>Date.now(),storage=localStorageOrNull()}={}){
 const key='space-suspect-playtest-v1';let record=null,lastAt=0,lastNetwork=null;
 const persist=()=>{try{storage?.setItem(key,JSON.stringify(record));}catch{}};
 const number=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null;
 return{
  start(label=''){this.lastMatch=null;record={schema:1,label:String(label).slice(0,80),startedAt:clock(),endedAt:null,activePlayMs:0,samples:[],matches:[],observations:[]};lastAt=clock();lastNetwork=null;persist();return record;},
  sample({phase='setup',visible=true,humans=0,diagnostics={},battery=null}={}){
   if(!record||record.endedAt)return;
   const at=clock(),dt=Math.min(15000,Math.max(0,at-lastAt));lastAt=at;
   if(visible&&['play','meeting','results'].includes(phase))record.activePlayMs+=dt;
   const pose=diagnostics.pose||{},total=Math.max(0,Number(pose.sentBytes)||0)+Math.max(0,Number(pose.receivedBytes)||0);
   const traffic=lastNetwork&&total>=lastNetwork.total&&at>lastNetwork.at?(total-lastNetwork.total)*1000/(at-lastNetwork.at):null;
   lastNetwork={at,total};
   record.samples.push({at,phase,visible:!!visible,humans:Math.max(0,Math.floor(Number(humans)||0)),fps:number(diagnostics.fps),frameMs:number(diagnostics.frameMs),pixelRatio:number(diagnostics.pixelRatio),drawCalls:number(diagnostics.drawCalls),triangles:number(diagnostics.triangles),posePayloadBytesPerSecond:traffic,batteryPercent:battery&&Number.isFinite(battery.level)?Math.round(battery.level*100):null,charging:battery?!!battery.charging:null});
   record.samples=record.samples.slice(-1440);if(record.samples.length%6===0)persist();
  },
  match({id,phase,winner,mapMode,settings,actors,startedAt,endedAt}={}){
   if(!record||record.endedAt||phase!=='ended'||!id)return;
   // The deduplication key is kept in memory only, not exported or persisted.
   if(this.lastMatch===id)return;this.lastMatch=id;
   const roster=Object.values(actors||{}).filter(p=>!p.observer);
   const roles={};for(const p of roster){const role=String(p.subrole||p.role||'unknown').slice(0,40);roles[role]=(roles[role]||0)+1;}
   record.matches.push({winner:String(winner||'').slice(0,40),map:String(mapMode||'').slice(0,30),durationSeconds:Math.max(0,Math.round((Number(endedAt)-Number(startedAt))/1000))||0,players:roster.length,disconnected:roster.filter(p=>p.disconnected).length,roles,settings:{killCooldownSeconds:number(settings?.killCooldownSeconds),meetingSeconds:number(settings?.meetingSeconds),taskCount:number(settings?.taskCount)}});
   record.matches=record.matches.slice(-100);persist();
  },
  observe(text){if(!record)return;record.observations.push({at:clock(),text:String(text).trim().slice(0,400)});record.observations=record.observations.slice(-100);persist();},
  stop(){if(record&&!record.endedAt){record.endedAt=clock();persist();}return record;},
  current(){return record;},
  saved(){if(record)return record;try{const value=JSON.parse(storage?.getItem(key)||'null');return value?.schema===1?value:null;}catch{return null;}},
  clear(){record=null;this.lastMatch=null;try{storage?.removeItem(key);}catch{}}
 };
}

export function installPlaytestRecorder(){
 const mount=document.querySelector('[data-settings-section="quality"]');if(!mount||document.getElementById('playtestControls'))return;
 const recorder=createPlaytestRecorder(),section=document.createElement('section');section.id='playtestControls';section.className='comfortSection';
 section.innerHTML='<h3>動作確認の記録</h3><p>プレイ時間・動作の重さ・通信量をこの端末に記録します。通話内容は記録しません。比較する版や端末名をメモして開始してください。</p><label for="playtestLabel">比較用メモ</label><input id="playtestLabel" maxlength="80" placeholder="例：iPad・更新後・標準画質"><div class="row"><button type="button" data-record-start>記録を開始</button><button type="button" data-record-stop disabled>記録を終了</button><button type="button" data-record-export>記録を保存</button></div><p data-record-status role="status" aria-live="polite"></p><label for="playtestObservation">迷った操作・不具合・温度など</label><textarea id="playtestObservation" maxlength="400" rows="2" placeholder="名前・PINは書かないでください"></textarea><button type="button" data-record-note>メモを追加</button>';
 mount.append(section);let state=null,battery=null,timer=0;
 const q=selector=>section.querySelector(selector),status=q('[data-record-status]');
 const refresh=()=>{const data=recorder.current(),running=!!data&&!data.endedAt;q('[data-record-start]').disabled=running;q('[data-record-stop]').disabled=!running;q('[data-record-export]').disabled=!recorder.saved();q('[data-record-note]').disabled=!data;
  const text=data?`${running?'記録中':'終了'} · 実プレイ ${Math.floor(data.activePlayMs/60000)}分 · 終了した試合 ${data.matches.length}回${battery?'':' · 電池残量は手動でメモできます'}`:'まだ記録していません。';if(status.textContent!==text)status.textContent=text;};
 const sample=()=>{recorder.sample({phase:state?.phase,visible:!document.hidden,humans:state?.roster,diagnostics:window.__spaceDiagnostics?.()||{},battery});refresh();};
 q('[data-record-start]').onclick=()=>{recorder.start(q('#playtestLabel').value);clearInterval(timer);timer=setInterval(sample,5000);sample();if(navigator.getBattery)void navigator.getBattery().then(value=>battery=value).catch(()=>{});};
 q('[data-record-stop]').onclick=()=>{sample();recorder.stop();clearInterval(timer);timer=0;refresh();};
 q('[data-record-note]').onclick=()=>{const input=q('#playtestObservation');if(input.value.trim()){recorder.observe(input.value);input.value='';status.textContent='メモを追加しました。';}};
 q('[data-record-export]').onclick=()=>{const data=recorder.saved();if(!data)return;const blob=new Blob([JSON.stringify({...data,scope:'Local browser measurements. Audio, transport overhead and temperature are not measured.'},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='space-suspect-playtest-'+new Date(data.startedAt).toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const previous=window.__ssxExperienceSync;window.__ssxExperienceSync=next=>{previous?.(next);state=next;recorder.match({...next,id:[next.sessionKey,next.round,next.startedAt].join(':')});};
 addEventListener('pagehide',()=>{if(timer){sample();recorder.stop();clearInterval(timer);timer=0;}});
 refresh();return recorder;
}
