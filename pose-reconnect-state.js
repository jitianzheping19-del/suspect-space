export function createPoseReconnectState({timeoutMs=15000}={}){
 let key='',pending=null,fastFallback=false,triedInitial=false;
 const snapshot=event=>({event,pending:!!pending,manual:pending?.manual===true,fastFallback});
 return{
  retry(nextKey,stamp){if(nextKey!==key){key=nextKey;fastFallback=false;}triedInitial=true;pending={at:stamp,manual:true};return snapshot(null);},
  update({key:nextKey,active,hasPeers,direct,stamp}){
   if(!active||nextKey!==key){key=active?nextKey:'';pending=null;fastFallback=false;triedInitial=false;}
   if(!active)return snapshot(null);
   if(!hasPeers){pending=null;fastFallback=false;triedInitial=false;return snapshot(null);}
   if(direct){const event=fastFallback||pending?.manual?'restored':null;pending=null;fastFallback=false;triedInitial=true;return snapshot(event);}
   if(!triedInitial){triedInitial=true;pending={at:stamp,manual:false};}
   if(pending&&stamp-pending.at>=timeoutMs){pending=null;fastFallback=true;return snapshot('failed');}
   return snapshot(null);
  },
  get state(){return snapshot(null);}
 };
}
