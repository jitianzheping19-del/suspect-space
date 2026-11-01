export function createPoseReconnectState({timeoutMs=15000,lossDelayMs=1200}={}){
 let key='',pending=null,fastFallback=false,triedInitial=false,seenHealthy=false,lostAt=null,retriedLoss=false;
 const snapshot=event=>({event,pending:!!pending,manual:pending?.manual===true,fastFallback});
 const reset=nextKey=>{key=nextKey;pending=null;fastFallback=false;triedInitial=false;seenHealthy=false;lostAt=null;retriedLoss=false;};
 return{
  retry(nextKey,stamp){if(nextKey!==key)reset(nextKey);triedInitial=true;retriedLoss=true;pending={at:stamp,manual:true};return snapshot(null);},
  update({key:nextKey,active,hasPeers,direct,healthy=direct,stamp}){
   if(!active||nextKey!==key)reset(active?nextKey:'');
   if(!active)return snapshot(null);
   if(!hasPeers){reset(nextKey);return snapshot(null);}
   if(healthy){
    const event=pending?.manual||retriedLoss||fastFallback&&!seenHealthy?'restored':null;
    pending=null;triedInitial=true;seenHealthy=true;lostAt=null;retriedLoss=false;
    // A healthy guest can still need Firebase to reach a different disconnected
    // guest. That does not make this guest's own WebRTC connection unhealthy.
    fastFallback=!direct;return snapshot(event);
   }
   if(seenHealthy){
    fastFallback=true;lostAt??=stamp;
    if(!pending&&!retriedLoss&&stamp-lostAt>=lossDelayMs){
     retriedLoss=true;pending={at:stamp,manual:false};return snapshot('retry');
    }
   }else if(!triedInitial){triedInitial=true;pending={at:stamp,manual:false};}
   if(pending&&stamp-pending.at>=timeoutMs){pending=null;fastFallback=true;return snapshot('failed');}
   return snapshot(null);
  },
  get state(){return snapshot(null);}
 };
}
