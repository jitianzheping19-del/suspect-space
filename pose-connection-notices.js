// A notice describes loss of a previously working transport, not initial ICE
// negotiation, a phase change, or another player intentionally leaving.
export function createPoseConnectionNotices({delayMs=1200}={}){
 let roomKey='',states=new Map();
 return{
  update({key,active,peers=[],stamp}){
   if(!active||key!==roomKey){states.clear();roomKey=active?key:'';}
   if(!active)return [];
   const notices=[],wanted=new Set(peers.map(p=>p.id));
   for(const id of states.keys())if(!wanted.has(id))states.delete(id);
   for(const {id,healthy}of peers){
    let state=states.get(id);if(!state){state={seenHealthy:false,badSince:null,notified:false};states.set(id,state);}
    if(healthy){
     if(state.notified)notices.push({type:'restored',id});
     state.seenHealthy=true;state.badSince=null;state.notified=false;
    }else if(state.seenHealthy){
     state.badSince??=stamp;
     if(!state.notified&&stamp-state.badSince>=delayMs){state.notified=true;notices.push({type:'lost',id});}
    }
   }
   return notices;
  }
 };
}
