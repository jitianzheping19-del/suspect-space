import {SOCCER_SKILLS,sampleSoccerSkill} from './lobby-soccer-skills.js';
// Shared by the host simulation and the embedded lobby. No browser globals.
export function createLobbyGamesRules(){
  const SURVIVAL={minX:-36,maxX:-12,minZ:-5,maxZ:14,cols:8,rows:7,tile:2,x:-34,z:-3,top:3,delay:700};
  const SOCCER={minX:12,maxX:34,minZ:-3.5,maxZ:24,left:15,right:31,near:-1,far:21,goal:5,goalHeight:2.2,postRadius:.075,radius:.3};
  const QUEUE={minX:-17.2,maxX:-13,minZ:-3,maxZ:1.6};
  const inside=(p,b,pad=0)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b.minX+pad&&p.x<=b.maxX-pad&&p.z>=b.minZ+pad&&p.z<=b.maxZ-pad;
  const area=p=>p?.lobbyCircuit||p?.lobbyKart?'lobby':inside(p,SURVIVAL)?'survival':inside(p,SOCCER)&&p.z> -3.5?'soccer':'lobby';
  const live=p=>p?.online===true&&!p.bot&&!p.observer;
  const active=g=>g&&['countdown','playing'].includes(g.status);
  const ball=(time)=>({x:23,y:.3,z:10,vx:0,vy:0,vz:0,at:time,resetUntil:0});
  const fresh=(owner,time)=>({owner,at:time,revision:0,survival:null,soccer:{status:'idle',ball:ball(time),score:[0,0],members:{},kicks:{}},tag:null,photo:null,photoBackground:'aurora',seen:{}});
  const tileAt=p=>{const x=Math.floor((p.x-SURVIVAL.x)/2),z=Math.floor((p.z-SURVIVAL.z)/2);return x>=0&&x<8&&z>=0&&z<7?z*8+x:-1;};
  const tilePoint=i=>({x:SURVIVAL.x+(i%8+.5)*2,z:SURVIVAL.z+(Math.floor(i/8)+.5)*2,y:3});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const canKick=(s,id,roster,time)=>{
    const p=roster[id],g=s.soccer,b=g?.ball;
    return live(p)&&area(p)==='soccer'&&b&&g.status!=='finished'&&(!active(g)||g.status==='playing'&&g.members?.[id]!==undefined)&&time>=Number(b.resetUntil||0)&&distance(p,b)<=1.85&&Math.abs((p.lobbyY||0)+.4-b.y)<1.3&&time-Number(g.kicks?.[id]?.at||0)>=450&&!(g.skills?.[id]&&!g.skills[id].cancelled&&time<g.skills[id].at+SOCCER_SKILLS[g.skills[id].kind]?.duration);
  };
  const canSkill=(s,id,roster,time)=>canKick(s,id,roster,time)&&s.soccer.ball.y<.5&&Math.abs(s.soccer.ball.vy)<1&&(!s.soccer.ball.dribbler||s.soccer.ball.dribbler===id)&&distance(roster[id],s.soccer.ball)<1.2&&time>=Number(s.soccer.skills?.[id]?.cooldownUntil||0);
  function passTarget(s,id,roster,yaw){
    const g=s.soccer,p=roster[id],team=g?.members?.[id];
    if(!p||team===undefined||!active(g)||!Number.isFinite(yaw))return '';
    const sx=Math.sin(yaw),sz=Math.cos(yaw);
    return Object.keys(g.members).filter(other=>{
      const q=roster[other];if(other===id||g.members[other]!==team||!live(q)||area(q)!=='soccer'||Math.abs((q.lobbyY||0)-(p.lobbyY||0))>.8)return false;
      const d=distance(p,q);return d>=2&&d<=20&&((q.x-p.x)*sx+(q.z-p.z)*sz)/d>=Math.cos(Math.PI/6);
    }).sort((a,b)=>{
      const score=q=>1-((q.x-p.x)*sx+(q.z-p.z)*sz)/distance(p,q)+distance(p,q)*.004;
      return score(roster[a])-score(roster[b])||a.localeCompare(b);
    })[0]||'';
  }
  function tagTarget(s,id,roster,time){
    const g=s.tag,p=roster[id];if(!active(g)||g.status!=='playing'||g.oni!==id||time<g.frozenUntil||!live(p)||p.lobbyCircuit||p.lobbyKart)return '';
    return Object.keys(g.members).filter(other=>other!==id&&live(roster[other])&&area(roster[other])===area(p)&&!roster[other].lobbyCircuit&&!roster[other].lobbyKart&&time>=Number(g.immune?.[other]||0)&&Math.abs((p.lobbyY||0)-(roster[other].lobbyY||0))<1.2&&distance(p,roster[other])<=1.65).sort((a,b)=>distance(p,roster[a])-distance(p,roster[b])||a.localeCompare(b))[0]||'';
  }
  function command(state,request,roster,host,admins,time,random=Math.random){
    const id=request?.uid,p=roster[id],kind=request?.kind;
    if(!live(p)||typeof request.id!=='string'||request.id.length>100||!Number.isFinite(request.at)||Math.abs(time-request.at)>10000||state.seen[id]===request.id)return {state,ok:false};
    const s=JSON.parse(JSON.stringify(state));s.seen[id]=request.id;
    const allowed=id===host,room=area(p),fail=message=>({state:s,ok:false,message});
    if(kind==='photo-background'){
      if(!allowed)return fail('背景はホストだけが変更できます。');
      if(!['aurora','sunset','moon','rose'].includes(request.background))return fail('この背景は選べません。');
      if(s.photo&&time<s.photo.at+1000)return fail('撮影が終わってから背景を変更してください。');
      s.photoBackground=request.background;
    }else if(kind==='photo-start'){
      const near=q=>live(q)&&!q.lobbyCircuit&&!q.lobbyKart&&Math.abs(q.x)<4.15&&q.z>9.1&&q.z<13&&Number(q.lobbyY||0)<1.8;
      const atCamera=!p.lobbyCircuit&&!p.lobbyKart&&Math.hypot(p.x+4.1,p.z-8.0)<1.2&&Number(p.lobbyY||0)<1;
      if(!near(p)&&!atCamera)return fail('写真のステージかカメラの近くで撮影してください。');
      if(s.photo&&time<s.photo.at+1000)return fail('撮影中です。カウントダウンをお待ちください。');
      s.photo={id:request.id,from:id,background:s.photoBackground||'aurora',at:time+5000,expiresAt:time+65000,members:Object.fromEntries(Object.entries(roster).filter(([uid,q])=>uid===id||near(q)).map(([uid])=>[uid,true]))};
    }else if(kind==='start-survival'||kind==='start-soccer'){
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
    }else if(kind==='soccer-skill'){
      const skill=Object.hasOwn(SOCCER_SKILLS,request.skill)?SOCCER_SKILLS[request.skill]:null;
      if(!skill||!Number.isFinite(request.yaw)||![1,-1].includes(request.side))return fail('フェイントの入力を確認してください。');
      if(!canSkill(s,id,roster,time))return fail('ボールを足元でキープしてからフェイントしてください。');
      const b=s.soccer.ball;s.soccer.skills||={};
      s.soccer.skills[id]={id:request.id,kind:request.skill,side:request.side,yaw:request.yaw,at:time,cooldownUntil:time+skill.cooldown,released:false,cancelled:false};
      b.dribbler=id;b.lastTouch=id;s.soccer.dribble={uid:id,at:time};
    }else if(kind==='kick'){
      if(!canKick(s,id,roster,time)||!Number.isFinite(request.yaw))return fail('ボールの近くで蹴ってください。');
      if(request.mode!==undefined&&!['pass','shot','through'].includes(request.mode)||request.power!==undefined&&!Number.isFinite(request.power))return fail('キックの入力を確認してください。');
      const target=request.mode==='shot'?'':passTarget(s,id,roster,request.yaw),mode=request.mode||(target?'pass':'shot'),power=Math.max(.12,Math.min(1,request.power??.55));
      s.soccer.kicks[id]={id:request.id,at:time,yaw:request.yaw,mode,power,target,applied:false};
    }else return fail('不明な操作です。');
    s.revision++;s.at=time;return {state:s,ok:true};
  }
  const goalSegments=()=>[SOCCER.near,SOCCER.far].flatMap(z=>{
    const l=23-SOCCER.goal/2,r=23+SOCCER.goal/2,h=SOCCER.goalHeight;
    return [[l,0,z,l,h,z],[r,0,z,r,h,z],[l,h,z,r,h,z]];
  });
  function goalContact(x,y,z,radius){
    for(const [ax,ay,az,bx,by,bz]of goalSegments()){
      const dx=bx-ax,dy=by-ay,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy+(z-az)*dz)/(dx*dx+dy*dy+dz*dz)));
      const nx=x-ax-dx*t,ny=y-ay-dy*t,nz=z-az-dz*t,d=Math.hypot(nx,ny,nz),limit=radius+SOCCER.postRadius;
      if(d<limit)return d<1e-8?{nx:0,ny:0,nz:az===SOCCER.near?1:-1,depth:limit}:{nx:nx/d,ny:ny/d,nz:nz/d,depth:limit-d};
    }return null;
  }
  function step(s,roster,time,dt){
    let changed=false;
    if(s.photo&&time>=s.photo.expiresAt){s.photo=null;changed=true;}
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
      if(game.status==='countdown'||game.status==='finished'){b.vx=b.vy=b.vz=0;b.dribbler='';game.skills={};}
      else if(time>=b.resetUntil){
        const eligible=id=>live(roster[id])&&area(roster[id])==='soccer'&&(!active(game)||game.members[id]!==undefined);
        for(const [id,k]of Object.entries(game.kicks||{}))if(!k.applied&&time>=k.at+120){
          k.applied=true;changed=true;const p=roster[id];
          if(eligible(id)&&distance(p,b)<2.1&&Math.abs((p.lobbyY||0)+.4-b.y)<1.3){
            const q=k.mode!=='shot'&&eligible(k.target)&&game.members[k.target]===game.members[id]?roster[k.target]:null;
            const power=k.power??.55,lead=k.mode==='through'?2.4+power*2:(q?.walking ? .45 : 0);
            const tx=q?q.x+Math.sin(Number(q.yaw)||0)*lead:0,tz=q?q.z+Math.cos(Number(q.yaw)||0)*lead:0;
            const yaw=q?Math.atan2(tx-b.x,tz-b.z):k.yaw,speed=k.mode==='shot'?10+power*7:q?Math.min(16,5+Math.hypot(tx-b.x,tz-b.z)*.65+power*2):6+power*9;
            b.vx=Math.sin(yaw)*speed;b.vz=Math.cos(yaw)*speed;b.vy=k.mode==='shot'?1.5+power*3.5:.45;
            b.dribbler='';b.lastTouch=id;b.releaseUntil=time+300;b.freeUntil=time+140;
          }
        }
        let owner=b.dribbler,ownerPlayer=roster[owner];
        if(!eligible(owner)||Math.abs(ownerPlayer?.lobbyY||0)>.2||distance(ownerPlayer,b)>2||b.y>.65){owner='';b.dribbler='';}
        for(const [id,k]of Object.entries(game.skills||{}))if(!k.released&&!k.cancelled){
          const spec=SOCCER_SKILLS[k.kind],p=roster[id];
          if(!spec||!eligible(id)||b.dribbler!==id||distance(p,b)>2||Math.abs(p.lobbyY||0)>.2){k.cancelled=true;changed=true;continue;}
          if(time>=k.at+spec.release){
            k.released=true;owner='';b.dribbler='';b.vx=Math.sin(k.yaw)*spec.speed;b.vz=Math.cos(k.yaw)*spec.speed;b.vy=spec.lift;b.freeUntil=time+140;b.releaseUntil=time+(k.kind==='heelLift'?430:200);changed=true;
          }
        }
        if(time>=Number(b.freeUntil||0)&&b.y<.65&&Math.abs(b.vy)<1.5){
          const candidates=Object.keys(roster).filter(id=>eligible(id)&&Math.abs(roster[id].lobbyY||0)<.2&&distance(roster[id],b)<1.05&&!(b.lastTouch===id&&time<Number(b.releaseUntil||0)));
          candidates.sort((a,bid)=>distance(roster[a],b)-distance(roster[bid],b)||a.localeCompare(bid));
          const nearest=candidates[0];
          if(nearest&&(!owner||nearest!==owner&&distance(roster[nearest],b)+.18<distance(roster[owner],b))){owner=nearest;b.dribbler=owner;b.lastTouch=owner;game.dribble={uid:owner,at:time};changed=true;}
        }
        if(owner){
          const p=roster[owner],skill=game.skills?.[owner],sample=skill&&!skill.cancelled&&!skill.released?sampleSoccerSkill(skill.kind,time-skill.at,skill.side):null,yaw=sample?skill.yaw:Number(p.yaw)||0,phase=(time-Number(game.dribble?.at||time))/1000*12;
          const reach=.87+(p.walking ? .09*Math.sin(phase) : 0),tx=p.x+Math.sin(yaw)*reach,tz=p.z+Math.cos(yaw)*reach;
          // A damped touch keeps the ball ahead of the feet without teleporting through posts.
          const sx=sample?p.x+Math.sin(yaw)*sample.z+Math.cos(yaw)*sample.x:tx,sz=sample?p.z+Math.cos(yaw)*sample.z-Math.sin(yaw)*sample.x:tz;
          b.vx=(sx-b.x)*(sample?28:18);b.vz=(sz-b.z)*(sample?28:18);b.vy=sample?(sample.y-b.y)*22:0;
          const speed=Math.hypot(b.vx,b.vz);if(speed>15){b.vx*=15/speed;b.vz*=15/speed;}
        }
        const moving=Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)>.015||b.y>.301;
        if(moving){
          // Small physics steps also cover a late network tick and fast diagonal post impacts.
          const steps=Math.max(1,Math.ceil(Math.min(.1,dt)*180)),h=Math.min(.1,dt)/steps;
          for(let j=0;j<steps;j++){
            const old={x:b.x,y:b.y,z:b.z};b.vy-=9.8*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
            if(b.y<.3){b.y=.3;b.vy=Math.abs(b.vy)>.8?-b.vy*.48:0;}
            const drag=Math.exp(-(b.y<=.301 ? .45 : .18)*h);b.vx*=drag;b.vz*=drag;
            if(b.y<1.5)for(const [id,p]of Object.entries(roster)){
              if(!eligible(id)||id===b.dribbler||Math.abs((p.lobbyY||0)+.4-b.y)>1.1||b.lastTouch===id&&time<Number(b.releaseUntil||0))continue;
              const d=distance(p,b);if(d>=.72)continue;
              const nx=d>.001?(b.x-p.x)/d:Math.sin(Number(p.yaw)||0),nz=d>.001?(b.z-p.z)/d:Math.cos(Number(p.yaw)||0);
              b.x=p.x+nx*.72;b.z=p.z+nz*.72;
              const incoming=b.vx*nx+b.vz*nz;if(incoming<0){b.vx-=1.3*incoming*nx;b.vz-=1.3*incoming*nz;}
              b.dribbler='';b.lastTouch=id;changed=true;
            }
            const contact=goalContact(b.x,b.y,b.z,SOCCER.radius);
            if(contact){
              const {nx,ny,nz,depth}=contact;b.x+=nx*depth;b.y+=ny*depth;b.z+=nz*depth;
              const incoming=b.vx*nx+b.vy*ny+b.vz*nz;
              if(incoming<0){b.vx-=1.78*incoming*nx;b.vy-=1.78*incoming*ny;b.vz-=1.78*incoming*nz;}
              b.dribbler='';
            }
            // Score only after the entire ball crosses the line, at the interpolated crossing height.
            let scored=false;
            for(const [line,dir,team]of [[SOCCER.near,-1,1],[SOCCER.far,1,0]]){
              const boundary=line+dir*SOCCER.radius;
              if((old.z-boundary)*dir<=0&&(b.z-boundary)*dir>0){
                const f=(boundary-old.z)/(b.z-old.z),x=old.x+(b.x-old.x)*f,y=old.y+(b.y-old.y)*f;
                if(!contact&&Math.abs(x-23)<SOCCER.goal/2-SOCCER.postRadius-SOCCER.radius&&y+SOCCER.radius<SOCCER.goalHeight-SOCCER.postRadius){
                  game.score[team]++;game.lastGoal={team,at:time,scorer:b.lastTouch||''};game.ball={...ball(time),resetUntil:time+2000};scored=true;break;
                }
              }
            }
            if(scored)break;
            if(b.x<SOCCER.left+.3||b.x>SOCCER.right-.3){b.x=Math.max(SOCCER.left+.3,Math.min(SOCCER.right-.3,b.x));b.vx*=-.7;b.dribbler='';}
            const aperture=Math.abs(b.x-23)<SOCCER.goal/2-SOCCER.postRadius-SOCCER.radius&&b.y+SOCCER.radius<SOCCER.goalHeight-SOCCER.postRadius;
            if(!aperture&&(b.z<SOCCER.near+.3||b.z>SOCCER.far-.3)){b.z=Math.max(SOCCER.near+.3,Math.min(SOCCER.far-.3,b.z));b.vz*=-.7;b.dribbler='';}
          }
          changed=true;
        }

        b.vx=Math.max(-16,Math.min(16,b.vx));b.vz=Math.max(-16,Math.min(16,b.vz));b.at=time;
      }
    }
    if(changed){s.at=time;s.revision++;}return changed;
  }
  return {SURVIVAL,SOCCER,QUEUE,inside,area,live,active,ball,fresh,tileAt,tilePoint,distance,canKick,canSkill,passTarget,tagTarget,command,step,goalContact,goalSegments};
}
