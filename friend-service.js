// Both users watch their own edge. The database rules enforce who may send,
// accept, decline or mark a request as read; paired changes are one write.
export function createFriendService({db,ref,get,update,onValue,query,orderByChild,equalTo,limitToFirst,uid,name,now=Date.now}){
 const reference=path=>ref(db(),path);
 const valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
 const owner=()=>{const id=uid();if(!valid(id))throw Error('ログインしてください。');return id;};
 const pair=(me,peer,value)=>({[`friendEdges/${me}/${peer}`]:value,[`friendEdges/${peer}/${me}`]:value});
 const read=async(me,peer)=>(await get(reference(`friendEdges/${me}/${peer}`))).val();
 return {
  watch(id,changed,error){return onValue(reference(`friendEdges/${id}`),s=>changed(s.val()||{}),error);},
  async find(text){owner();const value=text.trim();if(!value||value.length>16)throw Error('名前を入力してください。');const s=await get(query(reference('onlineUsers'),orderByChild('name'),equalTo(value),limitToFirst(20)));return Object.entries(s.val()||{}).filter(([id])=>id!==uid()).map(([id,p])=>({id,name:p.name}));},
  async send(peer){const me=owner();if(!valid(peer.id)||peer.id===me)throw Error('自分には申請できません。');const old=await read(me,peer.id);if(me!==uid())return;if(old&&old.state!=='declined')throw Error(old.state==='accepted'?'登録済みです。':'申請はすでに届いています。');const [self,other]=await Promise.all([get(reference(`onlineUsers/${me}`)),get(reference(`onlineUsers/${peer.id}`))]);if(me!==uid())return;if(!other.val()?.name)throw Error('相手が見つかりません。名前を確認してください。');const edge={from:me,to:peer.id,fromName:String(self.val()?.name||name()||'クルー').slice(0,16),toName:String(other.val().name).slice(0,16),at:now(),state:'pending',seen:false};await update(reference(),pair(me,peer.id,edge));},
  async respond(peer,accept){const me=owner(),edge=await read(me,peer);if(me!==uid())return;if(!edge||edge.to!==me)throw Error('申請が見つかりません。');if(edge.state!=='pending')return;await update(reference(),pair(me,peer,{...edge,state:accept?'accepted':'declined',seen:true}));},
  async seen(edges){const me=owner(),changes={};for(const [id,e]of Object.entries(edges))if(e.to===me&&e.state==='pending'&&!e.seen)changes[`friendEdges/${me}/${id}/seen`]=true;if(Object.keys(changes).length)await update(reference(),changes);},
  async remove(peer){const me=owner();if(!valid(peer)||peer===me)throw Error('相手を確認してください。');await update(reference(),pair(me,peer,null));}
 };
}
