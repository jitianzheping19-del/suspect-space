// Network files are cached separately; these jobs recreate the GPU resources
// needed by this page. Completion counts represent real preparation stages.
export function createLobbyGamePreloader({tasks,isActive=()=>document.body.dataset.phase==='lobby',frame=null}){
 const banner=document.createElement('div');banner.id='lobbyGameDownload';banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');document.body.append(banner);
 const loading=document.createElement('section');loading.id='lobbyLoadingScreen';loading.hidden=true;loading.setAttribute('role','dialog');loading.setAttribute('aria-modal','true');loading.setAttribute('aria-labelledby','lobbyLoadingTitle');
 loading.innerHTML='<div class="lobbyLoadingCard"><span class="lobbyLoadingOrbit" aria-hidden="true">✦</span><small>SPACE SUSPECT</small><h2 id="lobbyLoadingTitle">ゲームデータをロード中…</h2><p role="status" aria-live="polite">ロビーを準備しています</p><progress></progress><div class="lobbyLoadingActions" hidden><button type="button" data-loading-reload>再読み込み</button><button type="button" data-loading-continue hidden>ロビーへ進む</button></div></div>';
 document.body.append(loading);const progress=loading.querySelector('progress'),status=loading.querySelector('[role="status"]'),actions=loading.querySelector('.lobbyLoadingActions'),proceed=loading.querySelector('[data-loading-continue]');
 const done=new Set();let running=false,controller=null,finishTimer=0,slowTimer=0,disposed=false,lastActive=false,sceneReady=!frame,initialDone=!frame,preparationFailed=false,boundFrame=null;
 function showLoading(visible){loading.hidden=!visible;loading.dataset.spaceUiVisible=String(visible);loading.inert=!visible;loading.setAttribute('aria-hidden',String(!visible));}
 function paint(){
  const active=isActive(),finished=done.size===tasks.length||preparationFailed;
  if(sceneReady&&finished){initialDone=true;clearTimeout(slowTimer);}
  showLoading(active&&!initialDone);
  progress.max=tasks.length+1;progress.value=done.size+(sceneReady?1:0);
  status.textContent=!sceneReady?'ロビーの3D表示を準備しています':`演出データを準備しています ${done.size}/${tasks.length}`;
  proceed.hidden=!sceneReady;banner.hidden=!active||!initialDone||finished;banner.textContent=`ゲームデータをロード中… ${done.size}/${tasks.length}`;
 }
 function sceneLoaded(){sceneReady=false;boundFrame?.contentWindow?.postMessage({type:'lobby-render-query'},'*');paint();}
 function bindFrame(){const current=frame?.();if(current===boundFrame)return;boundFrame?.removeEventListener('load',sceneLoaded);boundFrame=current;boundFrame?.addEventListener('load',sceneLoaded);boundFrame?.contentWindow?.postMessage({type:'lobby-render-query'},'*');}
 function message(event){if(event.source!==frame?.()?.contentWindow||event.data?.type!=='lobby-rendered')return;sceneReady=true;paint();}
 window.addEventListener('message',message);
 async function start(){
  if(disposed||running||!isActive()||done.size===tasks.length)return;
  bindFrame();running=true;preparationFailed=false;controller=new AbortController();const {signal}=controller;clearTimeout(finishTimer);clearTimeout(slowTimer);actions.hidden=true;paint();
  if(!initialDone)slowTimer=setTimeout(()=>{if(!initialDone&&isActive()){actions.hidden=false;proceed.hidden=!sceneReady;status.textContent='準備に時間がかかっています。接続状況をご確認ください。';}},20000);
  try{
   await new Promise(resolve=>setTimeout(resolve,80));
   for(const [i,task]of tasks.entries()){
    if(signal.aborted||!isActive())return;if(done.has(i))continue;
    await task(signal);if(signal.aborted)return;done.add(i);paint();
    await new Promise(resolve=>setTimeout(resolve,30));
   }
   banner.hidden=!isActive();banner.textContent='ゲームデータの準備完了';finishTimer=setTimeout(()=>banner.hidden=true,1800);
  }catch(error){
   if(!signal.aborted){preparationFailed=true;paint();if(initialDone){banner.hidden=false;banner.textContent='一部のゲームデータは開始時に読み込みます';finishTimer=setTimeout(()=>banner.hidden=true,3500);}console.warn('Lobby game preparation:',error);}
  }finally{running=false;controller=null;if(signal.aborted&&isActive()&&!disposed)queueMicrotask(start);}
 }
 loading.querySelector('[data-loading-reload]').onclick=()=>window.location.reload();
 proceed.onclick=()=>{if(!sceneReady)return;initialDone=true;clearTimeout(slowTimer);paint();};
 const sync=()=>{const active=isActive();bindFrame();if(active){paint();if(!lastActive)void start();}else{controller?.abort();banner.hidden=true;showLoading(false);clearTimeout(finishTimer);clearTimeout(slowTimer);}lastActive=active;};
 const observer=new MutationObserver(sync);observer.observe(document.body,{attributes:true,attributeFilter:['data-phase']});sync();
 return{start,dispose(){disposed=true;controller?.abort();observer.disconnect();boundFrame?.removeEventListener('load',sceneLoaded);window.removeEventListener('message',message);clearTimeout(finishTimer);clearTimeout(slowTimer);banner.remove();loading.remove();},state:()=>({completed:done.size,total:tasks.length,running,sceneReady,initialDone})};
}
