// Shared by the host simulation and the embedded lobby. No browser globals.
export function createLobbyGamesRules(){
  const SURVIVAL={minX:-36,maxX:-12,minZ:-5,maxZ:14,cols:8,rows:7,tile:2,x:-34,z:-3,top:3,delay:700};
  const SOCCER={minX:12,maxX:34,minZ:-3.5,maxZ:24,left:15,right:31,near:-1,far:21,goal:5,radius:.3};
  const QUEUE={minX:-17.2,maxX:-13,minZ:-3,maxZ:1.6};
  const inside=(p,b,pad=0)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b.minX+pad&&p.x<=b.maxX-pad&&p.z>=b.minZ+pad&&p.z<=b.maxZ-pad;
  const area=p=>p?.lobbyCircuit||p?.lobbyKart?'lobby':inside(p,SURVIVAL)?'survival':inside(p,SOCCER)&&p.z> -3.5?'soccer':'lobby';
  const live=p=>p?.online===true&&!p.bot&&!p.observer;
  const active=g=>g&&['countdown','playing'].includes(g.status);
  const ball=(time)=>({x:23,y:.3,z:10,vx:0,vy:0,vz:0,at:time,resetUntil:0});
  const fresh=(owner,time)=>({owner,at:time,revision:0,survival:null,soccer:{status:'idle',ball:ball(time),score:[0,0],members:{},kicks:{}},tag:null,seen:{}});
  const tileAt=p=>{const x=Math.floor((p.x-SURVIVAL.x)/2),z=Math.floor((p.z-SURVIVAL.z)/2);return x>=0&&x<8&&z>=0&&z<7?z*8+x:-1;};
  const tilePoint=i=>({x:SURVIVAL.x+(i%8+.5)*2,z:SURVIVAL.z+(Math.floor(i/8)+.5)*2,y:3});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const canKick=(s,id,roster,time)=>{
    const p=roster[id],g=s.soccer,b=g?.ball;
    return live(p)&&area(p)==='soccer'&&b&&g.status!=='finished'&&(!active(g)||g.status==='playing'&&g.members?.[id]!==undefined)&&time>=Number(b.resetUntil||0)&&distance(p,b)<=1.85&&Math.abs((p.lobbyY||0)+.4-b.y)<1.3&&time-Number(g.kicks?.[id]?.at||0)>=450;
  };
  function tagTarget(s,id,roster,time){
    const g=s.tag,p=roster[id];if(!active(g)||g.status!=='playing'||g.oni!==id||time<g.frozenUntil||!live(p)||p.lobbyCircuit||p.lobbyKart)return '';
    return Object.keys(g.members).filter(other=>other!==id&&live(roster[other])&&area(roster[other])===area(p)&&!roster[other].lobbyCircuit&&!roster[other].lobbyKart&&time>=Number(g.immune?.[other]||0)&&Math.abs((p.lobbyY||0)-(roster[other].lobbyY||0))<1.2&&distance(p,roster[other])<=1.65).sort((a,b)=>distance(p,roster[a])-distance(p,roster[b])||a.localeCompare(b))[0]||'';
  }
  function command(state,request,roster,host,admins,time,random=Math.random){
    const id=request?.uid,p=roster[id],kind=request?.kind;
    if(!live(p)||typeof request.id!=='string'||request.id.length>100||!Number.isFinite(request.at)||Math.abs(time-request.at)>10000||state.seen[id]===request.id)return {state,ok:false};
    const s=JSON.parse(JSON.stringify(state));s.seen[id]=request.id;
    const allowed=id===host,room=area(p),fail=message=>({state:s,ok:false,message});
    if(kind==='start-survival'||kind==='start-soccer'){
      const name=kind.slice(6);
      if(!allowed||room!==name)return fail('この部屋にいるホストが開始できます。');
      if(active(s.tag))return fail('鬼ごっこ中は開始できません。');
      if(active(s[name]))return fail('すでに進行中です。');
      let ids=Object.keys(roster).filter(uid=>live(roster[uid])&&area(roster[uid])===name&&(name==='soccer'||uid===id||inside(roster[uid],QUEUE)));
      if(!ids.length)return fail('部屋の中に入ってから開始してください。');
      // Randomize once on the host; clients consume the committed assignments.
      ids=ids.map(uid=>({uid,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.uid);
      const members={};ids.forEach((uid,i)=>members[uid]=name==='survival'?{slot:i,alive:true}:i%2);
      s[name]=name==='survival'?{id:request.id,status:'countdown',practice:ids.length===1,members,tiles:{},startAt:time+3000,endAt:time+93000,winners:[]}:{id:request.id,status:'countdown',practice:ids.length===1,members,ball:ball(time),score:[0,0],kicks:{},startAt:time+3000,endAt:time+183000};
    }else if(kind==='start-tag'){
      if(!allowed||room!=='lobby'||p.lobbyCircuit||p.lobbyKart)return fail('ロビーにいるホストが開始できます。');
      if(active(s.tag)||active(s.survival)||active(s.soccer))return fail('進行中の遊びが終わってから開始してください。');
      const ids=Object.keys(roster).filter(uid=>live(roster[uid])&&area(roster[uid])==='lobby'&&!roster[uid].lobbyCircuit&&!roster[uid].lobbyKart);
      if(!ids.length)return fail('ロビーに入ってから開始してください。');
      s.tag={id:request.id,status:'countdown',practice:ids.length===1,members:Object.fromEntries(ids.map(uid=>[uid,true])),oni:ids[Math.min(ids.length-1,Math.floor(random()*ids.length))],startAt:time+3000,frozenUntil:time+4000,immune:{},transfers:0};
    }else if(kind==='stop'){
      if(!allowed)return fail('ホストが終了できます。');
      const g=s[request.game];if(!g||!active(g))return fail('進行中ではありません。');g.status='finished';g.endedAt=time;
    }else if(kind==='tag'){
      const target=tagTarget(s,id,roster,time);
      if(!target||request.target!==target)return fail('タッチできる相手が近くにいません。');
      s.tag.oni=target;s.tag.frozenUntil=time+1000;s.tag.immune[id]=time+5000;s.tag.transfers++;s.tag.lastTouch={from:id,to:target,at:time};
    }else if(kind==='kick'){
      if(!canKick(s,id,roster,time)||!Number.isFinite(request.yaw))return fail('ボールの近くで蹴ってください。');
      s.soccer.kicks[id]={id:request.id,at:time,yaw:request.yaw,applied:false};
    }else return fail('不明な操作です。');
    s.revision++;s.at=time;return {state:s,ok:true};
  }
  function step(s,roster,time,dt){
    let changed=false;
    const g=s.survival;
    if(active(g)){
      if(g.status==='countdown'&&time>=g.startAt){g.status='playing';changed=true;}
      for(const [id,m]of Object.entries(g.members)){
        if(!m.alive)continue;const p=roster[id];
        if(!live(p)||area(p)!=='survival'||g.status==='playing'&&Number(p.lobbyY||0)<1){m.alive=false;changed=true;continue;}
        if(g.status==='playing'&&Math.abs(Number(p.lobbyY||0)-3)<.15){const tile=tileAt(p);if(tile>=0&&!g.tiles[tile]){g.tiles[tile]=time+SURVIVAL.delay;changed=true;}}
      }
      const alive=Object.keys(g.members).filter(id=>g.members[id].alive);
      if(g.status==='playing'&&(alive.length<=(g.practice?0:1)||time>=g.endAt)){g.status='finished';g.winners=alive;g.endedAt=time;changed=true;}
    }
    const tag=s.tag;
    if(active(tag)){
      if(tag.status==='countdown'&&time>=tag.startAt){tag.status='playing';changed=true;}
      for(const id of Object.keys(tag.members))if(!live(roster[id])||roster[id].lobbyCircuit||roster[id].lobbyKart){delete tag.members[id];changed=true;}
      const ids=Object.keys(tag.members);
      if(ids.length<(tag.practice?1:2)){tag.status='finished';tag.endedAt=time;changed=true;}
      else if(!tag.members[tag.oni]){tag.oni=ids[0];tag.frozenUntil=time+1000;changed=true;}
    }
    const game=s.soccer;
    if(game){
      if(game.status==='finished'&&time>game.endedAt+5000){game.status='idle';game.members={};game.kicks={};game.ball=ball(time);changed=true;}
      if(game.status==='countdown'&&time>=game.startAt){game.status='playing';changed=true;}
      if(game.status==='playing'&&time>=game.endAt){game.status='finished';game.endedAt=time;game.winner=game.score[0]===game.score[1]?-1:game.score[0]>game.score[1]?0:1;changed=true;}
      if(active(game)){
        for(const id of Object.keys(game.members))if(!live(roster[id])||area(roster[id])!=='soccer'){delete game.members[id];changed=true;}
        if(game.status==='playing'&&(game.practice?Object.keys(game.members).length===0:new Set(Object.values(game.members)).size<2)){game.status='finished';game.endedAt=time;game.cancelled=true;changed=true;}
      }
      const b=game.ball;
      if(game.status==='countdown'||game.status==='finished'){b.vx=b.vy=b.vz=0;}
      else if(time>=b.resetUntil){
        for(const [id,k]of Object.entries(game.kicks||{}))if(!k.applied&&time>=k.at+120){
          k.applied=true;const p=roster[id];
          if(live(p)&&area(p)==='soccer'&&distance(p,b)<2.1){b.vx=Math.sin(k.yaw)*12;b.vz=Math.cos(k.yaw)*12;b.vy=3;changed=true;}
        }
        const moving=Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)>.015||b.y>.301;
        if(moving){
          const oldZ=b.z;b.vy-=9.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
          if(b.y<.3){b.y=.3;b.vy=Math.abs(b.vy)>.8?-b.vy*.48:0;}
          const drag=Math.exp(-(b.y<=.301?1.1:.18)*dt);b.vx*=drag;b.vz*=drag;
          const goal=Math.abs(b.x-23)<(SOCCER.goal/2-.3)&&b.y<1.8;
          const crossedNear=oldZ>=SOCCER.near&&b.z<SOCCER.near,crossedFar=oldZ<=SOCCER.far&&b.z>SOCCER.far;
          if(goal&&(crossedNear||crossedFar)){
            const team=crossedFar?0:1;game.score[team]++;game.lastGoal={team,at:time};game.ball={...ball(time),resetUntil:time+2000};
          }else{
            if(b.x<SOCCER.left+.3||b.x>SOCCER.right-.3){b.x=Math.max(SOCCER.left+.3,Math.min(SOCCER.right-.3,b.x));b.vx*=-.7;}
            if(b.z<SOCCER.near+.3||b.z>SOCCER.far-.3){if(!goal){b.z=Math.max(SOCCER.near+.3,Math.min(SOCCER.far-.3,b.z));b.vz*=-.7;}}
          }
          changed=true;
        }
        if(b.y<1.5)for(const [id,p]of Object.entries(roster)){
          if(!live(p)||area(p)!=='soccer'||active(game)&&game.members[id]===undefined)continue;
          const d=distance(p,b);if(d>=.78||d<.001)continue;
          const nx=(b.x-p.x)/d,nz=(b.z-p.z)/d;b.x=p.x+nx*.78;b.z=p.z+nz*.78;
          const impulse=p.walking?2.4:.25;b.vx+=nx*impulse;b.vz+=nz*impulse;changed=true;
        }
        b.vx=Math.max(-16,Math.min(16,b.vx));b.vz=Math.max(-16,Math.min(16,b.vz));b.at=time;
      }
    }
    if(changed){s.at=time;s.revision++;}return changed;
  }
  return {SURVIVAL,SOCCER,QUEUE,inside,area,live,active,ball,fresh,tileAt,tilePoint,distance,canKick,tagTarget,command,step};
}
