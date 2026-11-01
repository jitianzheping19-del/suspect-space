// Run preparation only after the lobby is visible. The banner reports completed
// jobs, not a fabricated byte percentage, and never blocks room controls.
export function createLobbyGamePreloader({tasks,isActive=()=>document.body.dataset.phase==='lobby'}){
 const banner=document.createElement('div');banner.id='lobbyGameDownload';banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');document.body.append(banner);
 const done=new Set();let running=false,controller=null,finishTimer=0,disposed=false,lastActive=false;
 const paint=()=>{banner.hidden=!isActive();banner.textContent=`ゲームデータをダウンロード中… ${done.size}/${tasks.length}`;};
 async function start(){
  if(disposed||running||!isActive()||done.size===tasks.length)return;
  running=true;controller=new AbortController();const {signal}=controller;clearTimeout(finishTimer);paint();
  try{
   // Yield before expensive preparation so the loading notice paints first.
   await new Promise(resolve=>setTimeout(resolve,80));
   for(const [i,task]of tasks.entries()){
    if(signal.aborted||!isActive())return;if(done.has(i))continue;
    await task(signal);if(signal.aborted)return;done.add(i);paint();
    await new Promise(resolve=>setTimeout(resolve,30));
   }
   banner.textContent='ゲームデータの準備完了';finishTimer=setTimeout(()=>banner.hidden=true,1800);
  }catch(error){
   if(!signal.aborted){banner.textContent='一部のゲームデータは開始時に読み込みます';finishTimer=setTimeout(()=>banner.hidden=true,3500);console.warn('Lobby game preparation:',error);}
  }finally{running=false;controller=null;if(signal.aborted&&isActive()&&!disposed)queueMicrotask(start);}
 }
 const sync=()=>{const active=isActive();if(active&&!lastActive)void start();else if(!active){controller?.abort();banner.hidden=true;clearTimeout(finishTimer);}lastActive=active;};
 const observer=new MutationObserver(sync);observer.observe(document.body,{attributes:true,attributeFilter:['data-phase']});sync();
 return{start,dispose(){disposed=true;controller?.abort();observer.disconnect();clearTimeout(finishTimer);banner.remove();},state:()=>({completed:done.size,total:tasks.length,running})};
}
