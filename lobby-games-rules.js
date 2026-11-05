import {soccerKickContact,soccerKickFoot,advanceSoccerBall} from './lobby-soccer-kick.js';
import {soccerPassLane} from './lobby-soccer-tactics.js';
import {soccerSlideActive,canSoccerSlide,beginSoccerSlide,stepSoccerSlides} from './lobby-soccer-slide.js';
import {soccerKickoffBlocks,prepareSoccerKickoff,stepSoccerKickoff} from './lobby-soccer-kickoff.js';
import {soccerRoster,soccerLive,createSoccerBots,stepSoccerBots} from './lobby-soccer-bots.js';
import {canSoccerOverhead,beginSoccerOverhead,stepSoccerFinishes} from './lobby-soccer-finishes.js';
import {soccerReception,beginSoccerReceive,stepSoccerReceives,stepSoccerKeepers,collideSoccerKeeper} from './lobby-soccer-air.js';
import {SOCCER_SKILLS,sampleSoccerSkill,sampleSoccerDribble,updateSoccerDribble} from './lobby-soccer-skills.js';
import {SOCCER_PRESS,soccerPressTarget,soccerPressActive,soccerPressThreat,applySoccerPress,stepSoccerPress} from './lobby-soccer-press.js';
// Shared by the host simulation and the embedded lobby. No browser globals.
export function createLobbyGamesRules(){
  const SURVIVAL={minX:-36,maxX:-12,minZ:-5,maxZ:14,cols:8,rows:7,tile:2,x:-34,z:-3,top:3,delay:700};
  const SOCCER={minX:12,maxX:37,minZ:-5.5,maxZ:26,left:14,right:32,near:-3,far:23,goal:5,goalHeight:2.2,goalDepth:1.2,postRadius:.075,radius:.3};
  const QUEUE={minX:-17.2,maxX:-13,minZ:-3,maxZ:1.6};
  const inside=(p,b,pad=0)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b.minX+pad&&p.x<=b.maxX-pad&&p.z>=b.minZ+pad&&p.z<=b.maxZ-pad;
  const area=p=>p?.lobbyCircuit||p?.lobbyKart?'lobby':inside(p,SURVIVAL)?'survival':inside(p,SOCCER)&&p.z>SOCCER.minZ?'soccer':'lobby';
  const live=p=>p?.online===true&&!p.bot&&!p.observer;
  const active=g=>g&&['countdown','playing'].includes(g.status);
  const ball=(time)=>({x:23,y:.3,z:10,vx:0,vy:0,vz:0,at:time,resetUntil:0});
  const fresh=(owner,time)=>({owner,at:time,revision:0,survival:null,soccer:{status:'idle',ball:ball(time),score:[0,0],members:{},kicks:{}},tag:null,photo:null,photoBackground:'aurora',seen:{}});
  const tileAt=p=>{const x=Math.floor((p.x-SURVIVAL.x)/2),z=Math.floor((p.z-SURVIVAL.z)/2);return x>=0&&x<8&&z>=0&&z<7?z*8+x:-1;};
  const tilePoint=i=>({x:SURVIVAL.x+(i%8+.5)*2,z:SURVIVAL.z+(Math.floor(i/8)+.5)*2,y:3});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const canKick=(s,id,roster,time)=>{
    const p=roster[id],g=s.soccer,b=g?.ball;
    return !soccerSlideActive(g,id,time)&&soccerLive(p)&&!soccerKickoffBlocks(g,id,time)&&!(g.finishes?.[id]&&time<g.finishes[id].until)&&area(p)==='soccer'&&b&&(!b.dribbler||b.dribbler===id)&&b.keeperOwner===undefined&&!(g.receives?.[id]&&time<g.receives[id].until)&&g.status!=='finished'&&(!active(g)||g.status==='playing'&&g.members?.[id]!==undefined)&&time>=Number(b.resetUntil||0)&&distance(p,b)<=1.85&&Math.abs((p.lobbyY||0)+.4-b.y)<1.3&&time-Number(g.kicks?.[id]?.at||0)>=450&&!(g.skills?.[id]&&!g.skills[id].cancelled&&time<g.skills[id].at+SOCCER_SKILLS[g.skills[id].kind]?.duration);
  };
  const canSkill=(s,id,roster,time)=>canKick(s,id,roster,time)&&s.soccer.ball.y<.5&&Math.abs(s.soccer.ball.vy)<1&&(!s.soccer.ball.dribbler||s.soccer.ball.dribbler===id)&&distance(roster[id],s.soccer.ball)<1.2&&time>=Number(s.soccer.skills?.[id]?.cooldownUntil||0);
  const canDash=(s,id,roster,time,renew=false)=>{
    const g=s?.soccer,p=roster[id],skill=g?.skills?.[id];
    return !!(g&&!soccerSlideActive(g,id,time)&&time>=Number(g.ball?.resetUntil||0)&&!(g.finishes?.[id]&&time<g.finishes[id].until)&&!(g.receives?.[id]&&time<g.receives[id].until)&&['idle','playing'].includes(g.status)&&live(p)&&area(p)==='soccer'&&Math.abs(p.lobbyY||0)<.2&&(g.status==='idle'||g.members?.[id]!==undefined)&&(time>=Number(g.dashes?.[id]?.readyAt||0)||renew&&g.dashes?.[id]?.held&&time<g.dashes[id].until)&&!soccerPressActive(g,id,time)&&!(skill&&!skill.cancelled&&time<skill.at+SOCCER_SKILLS[skill.kind]?.duration));
  };
  function passTarget(s,id,roster,yaw){
    const g=s.soccer,p=roster[id],team=g?.members?.[id];
    if(!p||team===undefined||!active(g)||!Number.isFinite(yaw))return '';
    const sx=Math.sin(yaw),sz=Math.cos(yaw);
    return Object.keys(g.members).filter(other=>{
      const q=roster[other];if(other===id||g.members[other]!==team||!soccerLive(q)||area(q)!=='soccer'||Math.abs((q.lobbyY||0)-(p.lobbyY||0))>.8)return false;
      const d=distance(p,q);return d>=2&&d<=25&&((q.x-p.x)*sx+(q.z-p.z)*sz)/d>=Math.cos(Math.PI/6);
    }).sort((a,b)=>{
      const score=q=>1-((q.x-p.x)*sx+(q.z-p.z)*sz)/distance(p,q)+distance(p,q)*.004+soccerPassLane(p,q,g,roster,team)*.32;
      return score(roster[a])-score(roster[b])||a.localeCompare(b);
    })[0]||'';
  }
  // The preview and the host use the same target selection. A line into the
  // attacking goal takes priority; otherwise a nearby teammate is assisted.
  function kickAim(s,id,roster,yaw,forceShot=false){
    const p=roster[id],g=s?.soccer,sx=Math.sin(yaw),sz=Math.cos(yaw);
    if(!p||!Number.isFinite(yaw))return {mode:'shot',target:'',yaw:0,x:23,z:10};
    const team=g?.members?.[id],goals=team===0?[SOCCER.far]:team===1?[SOCCER.near]:[SOCCER.near,SOCCER.far];
    for(const z of goals){
      const reach=Math.abs(sz)>.001?(z-p.z)/sz:-1,x=p.x+sx*reach;
      if(reach>.5&&reach<36&&Math.abs(x-23)<=SOCCER.goal/2+.65){
        const goalX=Math.max(23-SOCCER.goal/2+.4,Math.min(23+SOCCER.goal/2-.4,x));
        return {mode:'shot',target:'',yaw:Math.atan2(goalX-p.x,z-p.z),x:goalX,z,goal:true};
      }
    }
    const target=g&&!forceShot?passTarget(s,id,roster,yaw):'',q=roster[target];
    if(q)return {mode:'pass',target,yaw:Math.atan2(q.x-p.x,q.z-p.z),x:q.x,z:q.z};
    // Keep unassisted shots inside the pitch when drawing the guide.
    let reach=12;
    for(const [coordinate,velocity,low,high]of [[p.x,sx,SOCCER.left,SOCCER.right],[p.z,sz,SOCCER.near,SOCCER.far]]){
      if(Math.abs(velocity)>.001){const edge=((velocity>0?high:low)-coordinate)/velocity;if(edge>0)reach=Math.min(reach,edge);}
    }
    return {mode:'shot',target:'',yaw,x:p.x+sx*reach,z:p.z+sz*reach};
  }
  function tagTarget(s,id,roster,time){
    const g=s.tag,p=roster[id];if(!active(g)||g.status!=='playing'||g.oni!==id||time<g.frozenUntil||!live(p)||p.lobbyCircuit||p.lobbyKart)return '';
    return Object.keys(g.members).filter(other=>other!==id&&live(roster[other])&&area(roster[other])===area(p)&&!roster[other].lobbyCircuit&&!roster[other].lobbyKart&&time>=Number(g.immune?.[other]||0)&&Math.abs((p.lobbyY||0)-(roster[other].lobbyY||0))<1.2&&distance(p,roster[other])<=1.65).sort((a,b)=>distance(p,roster[a])-distance(p,roster[b])||a.localeCompare(b))[0]||'';
  }
  function command(state,request,roster,host,admins,time,random=Math.random){
    const id=request?.uid,p=roster[id],kind=request?.kind;
    if(!live(p)||typeof request.id!=='string'||request.id.length>100||!Number.isFinite(request.at)||Math.abs(time-request.at)>10000||state.seen[id]===request.id)return {state,ok:false};
    const s=JSON.parse(JSON.stringify(state));s.seen[id]=request.id;roster=soccerRoster(s.soccer,roster);
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
      if(name==='soccer'){if(ids.length===1)createSoccerBots(s.soccer,ids[0]);prepareSoccerKickoff(s.soccer,soccerRoster(s.soccer,roster),time,0,s.soccer.startAt,request.id+':kickoff');}
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
    }else if(kind==='soccer-slide'){
      if(!Number.isFinite(request.yaw)||!canSoccerSlide(s.soccer,id,roster,time))return fail('体勢を整えてからスライディングできます。');
      beginSoccerSlide(s.soccer,id,p,Math.atan2(Math.sin(request.yaw),Math.cos(request.yaw)),time);
    }else if(kind==='soccer-dash'){
      if(request.held!==undefined&&typeof request.held!=='boolean')return fail('ダッシュの入力を確認してください。');
      if(request.held===false){
        if(s.soccer?.dashes?.[id])Object.assign(s.soccer.dashes[id],{held:false,until:time,readyAt:time+300});
      }else{
        if(!canDash(s,id,roster,time,request.held===true))return fail('体勢を整えてからダッシュできます。');
        s.soccer.dashes||={};s.soccer.dashes[id]={at:time,until:time+650,readyAt:time+950,held:request.held===true};
      }
    }else if(kind==='soccer-skill'){
      const skill=Object.hasOwn(SOCCER_SKILLS,request.skill)?SOCCER_SKILLS[request.skill]:null;
      if(!skill||!Number.isFinite(request.yaw)||![1,-1].includes(request.side))return fail('フェイントの入力を確認してください。');
      if(!canSkill(s,id,roster,time))return fail('ボールを足元でキープしてからフェイントしてください。');
      const b=s.soccer.ball;s.soccer.skills||={};
      s.soccer.skills[id]={id:request.id,kind:request.skill,side:request.side,yaw:request.yaw,at:time,cooldownUntil:time+skill.cooldown,released:false,cancelled:false};
      b.dribbler=id;b.lastTouch=id;s.soccer.dribble={uid:id,at:time};
    }else if(kind==='soccer-overhead'){
      if(!canSoccerOverhead(s.soccer,id,roster,SOCCER,time))return fail('ヒールリフト中にシュートを押してください。');
      beginSoccerOverhead(s.soccer,id,p,SOCCER,time);
    }else if(kind==='soccer-header'||kind==='soccer-trap'){
      const options=soccerReception(s.soccer,id,roster,SOCCER,time),action=kind==='soccer-header'?'header':'trap';
      if(!options[action])return fail(action==='header'?'ゴール近くで浮いたパスに合わせて押してください。':'浮いたパスの近くでトラップできます。');
      beginSoccerReceive(s.soccer,id,action,p,time,SOCCER);
    }else if(kind==='kick'){
      if(!canKick(s,id,roster,time)||!Number.isFinite(request.yaw))return fail('ボールの近くで蹴ってください。');
      if(request.mode!==undefined&&!['pass','shot','through','lob'].includes(request.mode)||request.power!==undefined&&!Number.isFinite(request.power)||request.spin!==undefined&&(!Number.isFinite(request.spin)||Math.abs(request.spin)>1))return fail('キックの入力を確認してください。');
      const aim=kickAim(s,id,roster,request.yaw),target=request.mode==='shot'?'':request.mode?passTarget(s,id,roster,request.yaw):aim.target,mode=request.mode||aim.mode,power=Math.max(.12,Math.min(1,request.power??.55));
      if(mode==='lob'&&!target)return fail('味方を狙ってからボタンへ戻してください。');
      const yaw=request.mode?request.yaw:aim.yaw;
      s.soccer.kicks[id]={id:request.id,at:time,yaw,mode,power,target,foot:soccerKickFoot(p,s.soccer.ball,yaw),spin:mode==='shot'?(request.spin||0):0,applied:false};
    }else return fail('不明な操作です。');
    s.revision++;s.at=time;return {state:s,ok:true};
  }
  const goalSegments=()=>[SOCCER.near,SOCCER.far].flatMap(z=>{
    const l=23-SOCCER.goal/2,r=23+SOCCER.goal/2,h=SOCCER.goalHeight;
    const back=z+(z===SOCCER.near?-1:1)*SOCCER.goalDepth;
    return [[l,0,z,l,h,z],[r,0,z,r,h,z],[l,h,z,r,h,z],[l,0,back,l,h,back],[r,0,back,r,h,back],[l,h,back,r,h,back],[l,0,back,r,0,back],...[l,r].flatMap(x=>[[x,h,z,x,h,back],[x,0,z,x,0,back]])];
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
      if(game.status==='finished'&&time>game.endedAt+5000){game.status='idle';game.members={};game.kicks={};game.bots={};game.finishes={};game.slides={};game.kickoff=null;game.ball=ball(time);changed=true;}
      if(game.status==='countdown'&&time>=game.startAt){game.status='playing';changed=true;}
      if(game.status==='playing'&&time>=game.endAt){game.status='finished';game.endedAt=time;game.winner=game.score[0]===game.score[1]?-1:game.score[0]>game.score[1]?0:1;changed=true;}
      roster=soccerRoster(game,roster);
      if(active(game)){
        for(const id of Object.keys(game.members))if(!soccerLive(roster[id])||area(roster[id])!=='soccer'){delete game.members[id];changed=true;}
        if(game.status==='playing'&&(game.practice?!Object.keys(game.members).some(id=>live(roster[id])):new Set(Object.values(game.members)).size<2)){game.status='finished';game.endedAt=time;game.cancelled=true;changed=true;}
      }
      changed=stepSoccerKickoff(game,roster,time)||changed;
      changed=stepSoccerBots(game,roster,SOCCER,time,dt)||changed;
      const b=game.ball;
      const keeperControl=stepSoccerKeepers(game,SOCCER,time,dt,roster);changed=keeperControl.changed||changed;
      if(game.status==='countdown'||game.status==='finished'){b.vx=b.vy=b.vz=0;b.dribbler='';game.skills={};game.presses={};game.dashes={};game.flight=null;game.receives={};game.finishes={};game.slides={};}
      else if(time>=b.resetUntil&&!keeperControl.controlled){
        const eligible=id=>soccerLive(roster[id])&&area(roster[id])==='soccer'&&(!active(game)||game.members[id]!==undefined);
        for(const [id,k]of Object.entries(game.kicks||{}))if(!k.applied&&time>=soccerKickContact(k)){
          k.applied=true;changed=true;const p=roster[id];
          if(eligible(id)&&!soccerKickoffBlocks(game,id,time)&&(!b.dribbler||b.dribbler===id)&&!soccerSlideActive(game,id,time)&&distance(p,b)<2.1&&Math.abs((p.lobbyY||0)+.4-b.y)<1.3){
            const q=k.mode!=='shot'&&eligible(k.target)&&game.members[k.target]===game.members[id]?roster[k.target]:null;
            const power=k.power??.55,lead=k.mode==='through'?2.4+power*2:(q?.walking ? .45 : 0);
            const tx=q?q.x+Math.sin(Number(q.yaw)||0)*lead:0,tz=q?q.z+Math.cos(Number(q.yaw)||0)*lead:0;
            const yaw=q?Math.atan2(tx-b.x,tz-b.z):k.yaw,speed=k.mode==='shot'?10+power*7:q?Math.min(22,(5+Math.hypot(tx-b.x,tz-b.z)*.65)*(.75+power*.65)):6+power*9;
            k.yaw=yaw;k.contact={x:b.x,y:b.y,z:b.z,at:time};k.connected=true;
            b.spin=k.mode==='shot'?(k.spin||0):0;b.vx=Math.sin(yaw)*speed;b.vz=Math.cos(yaw)*speed;b.vy=k.mode==='shot'?1.5+power*3.5:.45;
            if(k.mode==='lob'&&q){
              const travel=Math.max(.85,Math.min(1.8,Math.hypot(tx-b.x,tz-b.z)/(8+power*6))),factor=.18/(1-Math.exp(-.18*travel));
              b.vx=(tx-b.x)*factor;b.vz=(tz-b.z)*factor;b.vy=(1.45-b.y)/travel+4.9*travel;
              game.flight={from:id,target:k.target,at:time,arrivalAt:time+travel*1000,x:tx,z:tz};
            }else game.flight=null;
            if(game.kickoff?.kicker===id)game.kickoff.released=true;
            b.dribbler='';b.lastTouch=id;b.releaseUntil=time+300;b.freeUntil=time+140;
          }else k.cancelled=true;
        }
        const reception=stepSoccerReceives(game,roster,SOCCER,time,eligible);changed=reception.changed||changed;
        let owner=b.dribbler,ownerPlayer=roster[owner];
        if(!eligible(owner)||Math.abs(ownerPlayer?.lobbyY||0)>.2||distance(ownerPlayer,b)>2||b.y>.65){owner='';b.dribbler='';}
        for(const [id,k]of Object.entries(game.skills||{}))if(!k.released&&!k.cancelled){
          const spec=SOCCER_SKILLS[k.kind],p=roster[id];
          if(!spec||!eligible(id)||b.dribbler!==id||distance(p,b)>2||Math.abs(p.lobbyY||0)>.2){k.cancelled=true;changed=true;continue;}
          if(time>=k.at+spec.release){
            k.released=true;changed=true;
            if(k.kind==='heelLift'){owner='';b.dribbler='';b.spin=0;b.vx=Math.sin(k.yaw)*spec.speed;b.vz=Math.cos(k.yaw)*spec.speed;b.vy=spec.lift;b.freeUntil=time+140;b.releaseUntil=time+430;}
            else game.dribble={uid:id,at:time};
          }
        }
        if(stepSoccerFinishes(game,roster,time,eligible)){changed=true;owner=b.dribbler;}
        if(stepSoccerSlides(game,roster,time)){changed=true;owner=b.dribbler;}
        if(stepSoccerPress(game,roster,time)){changed=true;owner=b.dribbler;}
        if(!reception.controlled&&!owner&&time>=Number(b.freeUntil||0)&&b.y<.65&&Math.abs(b.vy)<1.5){
          const candidates=Object.keys(roster).filter(id=>eligible(id)&&!soccerKickoffBlocks(game,id,time)&&!soccerSlideActive(game,id,time)&&Math.abs(roster[id].lobbyY||0)<.2&&distance(roster[id],b)<1.05&&(time>=Number(b.contestUntil||0)||id===b.contestOwner)&&!(b.lastTouch===id&&time<Number(b.releaseUntil||0)));
          candidates.sort((a,bid)=>distance(roster[a],b)-distance(roster[bid],b)||a.localeCompare(bid));
          const nearest=candidates[0];
          if(nearest&&(!owner||nearest!==owner&&distance(roster[nearest],b)+.18<distance(roster[owner],b))){
            const incoming=Math.hypot(b.vx,b.vz),receiver=roster[nearest],yaw=Number(receiver.yaw)||0,lateral=(b.x-receiver.x)*Math.cos(yaw)-(b.z-receiver.z)*Math.sin(yaw);
            owner=nearest;b.dribbler=owner;b.lastTouch=owner;game.dribble={uid:owner,at:time};
            if(incoming>2.5)Object.assign(game.dribble,{receiveAt:time,receiveDuration:240+Math.min(120,incoming*7),receiveSide:lateral<0?-1:1});
            changed=true;
          }
        }
        if(owner){
          b.spin=0;
          const p=roster[owner],skill=game.skills?.[owner],sample=skill&&!skill.cancelled&&!skill.released?sampleSoccerSkill(skill.kind,time-skill.at,skill.side):null,yaw=sample?skill.yaw:Number(p.yaw)||0;
          const control=game.dribble?.uid===owner?game.dribble:(game.dribble={uid:owner,at:time});
          const sprint=time<Number(game.dashes?.[owner]?.until||0);
          updateSoccerDribble(control,p,time,dt,sprint,!!sample);
          const touch=sampleSoccerDribble(time-Number(control.at??time),control.walking,control.rollAt===undefined?-1:time-control.rollAt,control.rollSide,sprint,control.phase,control),threat=soccerPressThreat(game,owner,time),challenger=threat?Object.entries(game.presses).find(([,v])=>v===threat)?.[0]:null,defender=roster[challenger];
          // Keep the ball on the far foot while shielding; a skill keeps its authored path.
          const protect=defender?Math.max(0,1-threat.distance/2.3)*.18:0,away=defender?Math.atan2(p.x-defender.x,p.z-defender.z):yaw;
          const tx=p.x+Math.sin(yaw)*touch.z+Math.cos(yaw)*touch.x+Math.sin(away)*protect,tz=p.z+Math.cos(yaw)*touch.z-Math.sin(yaw)*touch.x+Math.cos(away)*protect;
          // A damped touch keeps the ball ahead of the feet without teleporting through posts.
          const sx=sample?p.x+Math.sin(yaw)*sample.z+Math.cos(yaw)*sample.x:tx,sz=sample?p.z+Math.cos(yaw)*sample.z-Math.sin(yaw)*sample.x:tz;
          const step=Math.max(.001,Math.min(.1,dt)),follow=(1-Math.exp(-(sample?28:18)*step))/step;
          b.vx=(sx-b.x)*follow;b.vz=(sz-b.z)*follow;b.vy=sample?(sample.y-b.y)*22:0;
          const speed=Math.hypot(b.vx,b.vz);if(speed>15){b.vx*=15/speed;b.vz*=15/speed;}
        }
        const moving=!reception.controlled&&(Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)>.015||b.y>.301);
        if(moving){
          // Small physics steps also cover a late network tick and fast diagonal post impacts.
          const steps=Math.max(1,Math.ceil(Math.min(.1,dt)*180)),h=Math.min(.1,dt)/steps;
          for(let j=0;j<steps;j++){
            const old={x:b.x,y:b.y,z:b.z};advanceSoccerBall(b,h);
            if(b.y<1.5)for(const [id,p]of Object.entries(roster)){
              if(game.receives?.[id]?.kind==='header'&&time<game.receives[id].until&&b.y>.7||b.dribbler||game.flight&&game.flight.target===id||!eligible(id)||soccerKickoffBlocks(game,id,time)||Math.abs((p.lobbyY||0)+.4-b.y)>1.1||b.lastTouch===id&&time<Number(b.releaseUntil||0)||time<Number(b.contestUntil||0)&&id!==b.contestOwner)continue;
              const d=distance(p,b);if(d>=.72)continue;
              const nx=d>.001?(b.x-p.x)/d:Math.sin(Number(p.yaw)||0),nz=d>.001?(b.z-p.z)/d:Math.cos(Number(p.yaw)||0);
              b.x=p.x+nx*.72;b.z=p.z+nz*.72;
              const incoming=b.vx*nx+b.vz*nz;if(incoming<0){b.vx-=1.3*incoming*nx;b.vz-=1.3*incoming*nz;}
              b.dribbler='';b.spin=0;b.lastTouch=id;changed=true;
            }
            if(collideSoccerKeeper(game,SOCCER,time,old)&&b.keeperOwner!==undefined)break;
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
                  const beforeScore=[...game.score];game.score[team]++;game.lastGoal={team,at:time,beforeScore,score:[...game.score],scorer:b.lastTouch||'',x,y,z:boundary,speed:Math.hypot(b.vx,b.vy,b.vz)};prepareSoccerKickoff(game,roster,time,1-team,time+3400,(game.id||'practice')+':goal:'+time);scored=true;break;
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

        b.vx=Math.max(-24,Math.min(24,b.vx));b.vz=Math.max(-24,Math.min(24,b.vz));b.at=time;
      }
    }
    if(changed){s.at=time;s.revision++;}return changed;
  }
  return {canSlide:(s,id,players,time)=>canSoccerSlide(s?.soccer,id,soccerRoster(s?.soccer,players),time),soccerKickoffBlocks,prepareSoccerKickoff,soccerRoster,soccerLive,canOverhead:(s,id,roster,time)=>canSoccerOverhead(s?.soccer,id,soccerRoster(s?.soccer,roster),SOCCER,time),SURVIVAL,SOCCER,QUEUE,inside,area,live,active,ball,fresh,tileAt,tilePoint,distance,canKick,canSkill,canDash,reception:(s,id,roster,time)=>soccerReception(s?.soccer,id,roster,SOCCER,time),passTarget,kickAim,tagTarget,command,step,goalContact,goalSegments,pressTarget:soccerPressTarget,pressActive:soccerPressActive,pressThreat:soccerPressThreat,pressInput:applySoccerPress};
}
