// Invitations remain durable in Firebase. This short-lived reliable channel
// provides a second delivery route, including recipients outside the host room.
// Only SDP discovery uses notificationSignals; no room subscription is needed.
export class InviteDirectDelivery {
  constructor({uid,write,watch,validate,onInvite,PeerConnection=globalThis.RTCPeerConnection,rtcConfiguration,clock=()=>Date.now()}={}){
    Object.assign(this,{uid,write,watch,validate,onInvite,PeerConnection,clock});
    this.config=rtcConfiguration||{iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}]};
    this.links=new Map();this.delivered=new Map();this.closed=false;this.stopWatch=watch(signal=>{void this.receive(signal).catch(()=>{});});
  }
  make(peer,id){
    if(this.closed||!this.PeerConnection||this.links.size>=24)return null;
    const old=this.links.get(peer);if(old)this.close(old);
    const link={peer,id,pc:new this.PeerConnection(this.config),closed:false};this.links.set(peer,link);
    link.timer=setTimeout(()=>this.close(link),20000);
    link.pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(link.pc.connectionState))this.close(link);};
    return link;
  }
  async gather(link){
    if(link.pc.iceGatheringState==='complete')return;
    await new Promise(resolve=>{
      const check=()=>{if(link.closed||link.pc.iceGatheringState==='complete')finish();};
      const finish=()=>{clearTimeout(timer);link.pc.removeEventListener('icegatheringstatechange',check);resolve();};
      const timer=setTimeout(finish,2500);link.pc.addEventListener('icegatheringstatechange',check);check();
    });
  }
  channel(link,channel){
    if(channel.label!=='ss-invitation-v1'){channel.close();return;}
    link.channel=channel;
    channel.onmessage=event=>{
      if(link.closed||typeof event.data!=='string'||event.data.length>4096)return;
      try{const packet=JSON.parse(event.data);if(packet.id!==link.id)return;
        if(packet.type==='ack'){this.close(link);return;}
        if(packet.type==='invite'&&link.invite&&packet.inviteId===link.inviteId&&this.sameInvite(packet.invite,link.invite)){
          this.deliver(packet.inviteId,link.invite);channel.send(JSON.stringify({type:'ack',id:link.id}));
        }
      }catch{}
    };
    channel.onopen=()=>{if(!link.closed&&link.outgoing)channel.send(JSON.stringify({type:'invite',id:link.id,inviteId:link.inviteId,invite:link.invite}));};
  }
  sameInvite(a,b){
    if(!a||!b||typeof a!=='object')return false;
    const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>a[key]===b[key]);
  }
  deliver(id,invite){
    if(typeof id!=='string'||!id||id.length>256)return;
    const at=this.clock();
    for(const [key,stamp] of this.delivered)if(at-stamp>300000)this.delivered.delete(key);
    const key=invite.hostId+':'+id;
    if(this.delivered.has(key))return;
    this.delivered.set(key,at);
    if(this.delivered.size>256)this.delivered.delete(this.delivered.keys().next().value);
    this.onInvite(id,invite);
  }
  async send(peer,inviteId,invite){
    const link=this.make(peer,crypto.randomUUID());if(!link)return false;
    link.outgoing=true;link.inviteId=inviteId;link.invite=invite;
    try{
      this.channel(link,link.pc.createDataChannel('ss-invitation-v1'));
      await link.pc.setLocalDescription(await link.pc.createOffer());await this.gather(link);
      if(link.closed)return false;
      await this.write(peer,{kind:'offer',id:link.id,sdp:link.pc.localDescription.sdp,inviteId,invite,createdAt:this.clock()});return true;
    }catch{this.close(link);return false;}
  }
  async receive({from,value}={}){
    if(this.closed||!from||from===this.uid||!value||Math.abs(this.clock()-value.createdAt)>30000||typeof value.sdp!=='string'||value.sdp.length>32768)return;
    if(value.kind==='answer'){
      const link=this.links.get(from);if(link?.outgoing&&link.id===value.id&&!link.answered){link.answered=true;await link.pc.setRemoteDescription({type:'answer',sdp:value.sdp});}return;
    }
    if(value.kind!=='offer'||value.invite?.hostId!==from||!await this.validate(value.invite)||this.closed)return;
    // A validated offer is a delivery receipt too. Notifications must not wait
    // for a data channel, which can be unavailable behind a restrictive NAT.
    this.deliver(value.inviteId,value.invite);
    if(this.links.get(from)?.id===value.id)return;
    const link=this.make(from,value.id);if(!link)return;
    link.invite=value.invite;link.inviteId=value.inviteId;
    try{
      link.pc.ondatachannel=event=>this.channel(link,event.channel);
      await link.pc.setRemoteDescription({type:'offer',sdp:value.sdp});
      await link.pc.setLocalDescription(await link.pc.createAnswer());await this.gather(link);
      if(!link.closed)await this.write(from,{kind:'answer',id:link.id,sdp:link.pc.localDescription.sdp,createdAt:this.clock()});
    }catch{this.close(link);}
  }
  close(link){
    if(link.closed)return;link.closed=true;clearTimeout(link.timer);link.pc.close();
    if(this.links.get(link.peer)===link)this.links.delete(link.peer);
    // Remove only this session's signal, not a newer invitation to the same peer.
    void this.write(link.peer,null,link.id).catch(()=>{});
  }
  stop(){this.closed=true;this.stopWatch?.();for(const link of [...this.links.values()])this.close(link);this.delivered.clear();}
}
