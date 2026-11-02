import {createLobbyGamesRules} from './lobby-games-rules.js';
import './lobby-games.css';

export function createLobbyGamesRuntime({context,db,ref,update,set,frame,transport,toast,onAreaChange=()=>{},clock=Date.now}){
  const rules=createLobbyGamesRules();
  let roomKey='',state=null,ownHost=false,lastWrite=0,lastSend=0,lastStep=0,busy=false,dirty=false,action={},localArea='lobby',lastError=0;
  let pending=null,sequence=0,lastFrame='',menuOpen=false,lastRequestId='',reportedResult='';
  const panel=document.createElement('section');panel.id='lobbyMiniGamePanel';panel.className='hidden';panel.setAttribute('aria-label','ロビーの遊び');
  const title=document.createElement('strong'),status=document.createElement('div'),buttons=document.createElement('div');buttons.className='miniGameButtons';panel.append(title,status,buttons);document.body.append(panel);
  const start=document.createElement('button'),stop=document.createElement('button'),exit=document.createElement('button');
  start.textContent='開始';stop.textContent='終了';start.hidden=stop.hidden=true;stop.id='lobbyMiniGameStop';exit.textContent='ロビーへ戻る';buttons.append(start,stop,exit);
  const toggle=document.createElement('button');toggle.id='lobbyMiniGameToggle';toggle.textContent='遊び';toggle.className='secondary hidden';document.body.append(toggle);
  const touch=document.createElement('button');touch.id='lobbyTagTouchBtn';touch.textContent='タッチ';touch.className='hidden';document.body.append(touch);
  toggle.onclick=()=>{menuOpen=!menuOpen;render();};
  start.onclick=()=>request('start-'+(localArea==='lobby'?'tag':localArea));
  stop.onclick=()=>request('stop',{game:rules.active(state?.tag)||localArea==='lobby'?'tag':localArea});
  exit.onclick=()=>frame()?.postMessage({type:'lobby-games-exit'},'*');
  touch.onclick=()=>request('tag',{target:action.target});
  for(const button of [toggle,start,stop,exit,touch]){
    button.type='button';button.dataset.spacePointerAction='direct';let pointerAt=-Infinity;
    button.addEventListener('pointerdown',event=>{if(event.button!==0||button.disabled)return;event.preventDefault();event.stopPropagation();pointerAt=performance.now();button.click();},{passive:false});
    button.addEventListener('click',event=>{if(event.isTrusted&&event.detail>0&&performance.now()-pointerAt<1000){event.preventDefault();event.stopImmediatePropagation();}},true);
    button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')pointerAt=-Infinity;});
  }
  const send=value=>frame()?.postMessage(value,'*');
  const worldRoster=c=>c.players;
  function error(message){if(clock()-lastError>2500){lastError=clock();toast(message);}}
  async function request(kind,extra={}){
    const c=context();if(!c.enabled||!c.uid||pending)return;
    const command={kind,...extra,id:c.uid+':'+clock()+':'+(++sequence),uid:c.uid,owner:c.host,at:clock()};
    lastRequestId=command.id;pending={id:command.id,until:clock()+6000};
    if(ownHost){accept(command);return;}
    transport()?.publishEphemeral({kind:'lobby-games-command',command},[c.host]);
    try{await update(ref(db(),`rooms/${c.room}/players/${c.uid}`),{lobbyGameCommand:command});}
    catch{pending=null;error('遊びの操作を送れませんでした。接続を確認してください。');}
  }
  function accept(command){
    const c=context();if(!ownHost||!state||!c.enabled||state.owner!==c.uid||command.owner!==c.host)return;
    if(state.seen[command.uid]===command.id)return;
    const result=rules.command(state,command,worldRoster(c),c.host,c.admins,clock());
    const response={kind:'lobby-games-result',id:command.id,ok:result.ok,message:result.message||''};
    if(result.state!==state){state=result.state;state.results={...state.results,[command.uid]:response};state.revision++;state.at=clock();dirty=true;}
    if(command.uid===c.uid)acknowledge(response);
    else transport()?.publishEphemeral(response,[command.uid]);
  }
  function acknowledge(result){
    if(result?.id!==lastRequestId||reportedResult===result.id)return;
    reportedResult=result.id;pending=null;if(result.message)error(result.message);
  }
  function receive(payload,meta){
    if(!payload?.kind?.startsWith('lobby-games-'))return false;
    const c=context();if(!c.enabled)return true;
    if(payload.kind==='lobby-games-command'&&ownHost&&payload.command?.uid===meta.from)accept(payload.command);
    if(payload.kind==='lobby-games-state'&&meta.from===c.host&&!ownHost&&payload.state?.owner===c.host&&Number(payload.state.at)>=Number(state?.at||0))state=payload.state;
    if(payload.kind==='lobby-games-result'&&meta.from===c.host)acknowledge(payload);
    return true;
  }
  function handleFrame(data){
    if(!data?.type?.startsWith('lobby-games-'))return false;
    const c=context();if(!c.enabled)return true;
    if(data.type==='lobby-games-action'&&['lobby','survival','soccer'].includes(data.area)){
      action={enabled:data.enabled===true,target:typeof data.target==='string'?data.target:'',yaw:Number.isFinite(data.yaw)?data.yaw:0};const changed=localArea!==data.area;localArea=data.area;if(changed)onAreaChange();decorateAction();render();
    }else if(data.type==='lobby-games-command'&&['kick','tag'].includes(data.kind))request(data.kind,{yaw:Number(data.yaw)||0,target:String(data.target||'')});
    return true;
  }
  function decorateAction(){
    const button=document.getElementById('lobbyUseBtn');if(!button||!context().enabled||localArea!=='soccer')return;
    button.textContent='蹴る [F]';button.dataset.actionIcon='kick';button.disabled=!action.enabled||!!pending;button.classList.toggle('armed',!!action.enabled);
  }
  function use(){if(!context().enabled||localArea!=='soccer')return false;if(action.enabled)request('kick',{yaw:action.yaw});return true;}
  function render(){
    const c=context(),enabled=c.enabled,tag=state?.tag,tagPlaying=rules.active(tag),game=tagPlaying?tag:state?.[localArea==='lobby'?'tag':localArea];
    const playing=rules.active(game),canStart=!!c.uid&&c.uid===c.host,inRoom=localArea!=='lobby';
    if(!canStart)menuOpen=false;
    panel.classList.toggle('hidden',!enabled||!inRoom&&!rules.active(tag)&&!menuOpen);
    toggle.classList.toggle('hidden',!enabled||!canStart||inRoom||rules.active(tag));
    document.body.classList.toggle('lobbyMiniGameOpen',enabled&&(inRoom||rules.active(tag)||menuOpen));
    document.body.classList.toggle('lobbyTagPlaying',enabled&&tagPlaying);
    title.textContent=tagPlaying?'鬼ごっこ':localArea==='survival'?'消える床サバイバル':localArea==='soccer'?'フットサル':'鬼ごっこ';
    const t=clock(),remaining=game?.startAt>t?Math.ceil((game.startAt-t)/1000):0;
    if(remaining)status.textContent=`開始まで ${remaining}`;
    else if(localArea==='soccer'&&!tagPlaying){
      const team=game?.members?.[c.uid];
      const result=game?.status==='finished'?(game.cancelled?'参加者不足で終了':game.winner===-1?'引き分け':(game.winner===0?'青':'赤')+'チームの勝ち'):'';
      status.textContent=`青 ${game?.score?.[0]||0} − ${game?.score?.[1]||0} 赤`+(result?' · '+result:playing?` · 残り ${Math.max(0,Math.ceil((game.endAt-t)/1000))}秒`:' · 3分間')+(playing?(team===0?' · あなたは青':team===1?' · あなたは赤':' · 観戦中'):result?'':' · 近くで蹴る');
    }else if(localArea==='survival'&&!tagPlaying)status.textContent=playing?`残り ${Object.values(game.members).filter(m=>m.alive).length}人`+(game.members?.[c.uid]?.alive?'':' · 2階で観戦できます'):game?.status==='finished'?'終了 · '+(game.winners?.length?game.winners.map(id=>c.players[id]?.name||'クルー').join('・')+' の勝ち':'勝者なし'):'参加希望の枠に入って待機';
    else status.textContent=playing?`鬼：${c.players[tag.oni]?.name||'クルー'}`+(tag.oni===c.uid?(t<tag.frozenUntil?' · 1秒停止中':tag.practice?' · 自由に移動できます':' · 近づいてタッチ'):(tag.immune?.[c.uid]>t?` · 無敵 ${Math.ceil((tag.immune[c.uid]-t)/1000)}秒`:'')):'ロビー全員参加 · 1人でも練習できます';
    if(playing&&game?.practice)status.textContent='1人練習 · '+status.textContent;
    start.hidden=!canStart||playing;start.disabled=!!pending||localArea!=='lobby'&&rules.active(tag);start.textContent=localArea==='lobby'?'鬼ごっこ開始':'スタート';
    stop.hidden=!canStart||!playing;exit.hidden=!inRoom;
    touch.classList.toggle('hidden',!enabled||!tagPlaying||tag.oni!==c.uid);
    touch.disabled=!action.target||!!pending;touch.classList.toggle('armed',!!action.target);
  }
  async function tick(){
    const c=context(),t=clock();
    if(!c.enabled){
      if(roomKey){send({type:'lobby-games-state',enabled:false,state:null});roomKey='';state=null;pending=null;localArea='lobby';action={};}
      render();lastStep=t;return;
    }
    const key=c.room+':'+c.host;
    if(key!==roomKey){roomKey=key;ownHost=c.uid===c.host;state=ownHost?rules.fresh(c.uid,t):null;lastWrite=lastSend=0;lastFrame='';dirty=ownHost;pending=null;lastRequestId=reportedResult='';lastStep=t;}
    if(!ownHost&&c.snapshot?.owner===c.host&&Number(c.snapshot.at)>=Number(state?.at||0))state=c.snapshot;
    acknowledge(state?.results?.[c.uid]);
    if(pending&&state?.seen?.[c.uid]===pending.id)pending=null;
    if(pending&&t>pending.until){pending=null;error('操作の返答がありません。もう一度お試しください。');}
    if(ownHost){
      for(const [id,p]of Object.entries(c.players))if(p.lobbyGameCommand?.uid===id&&state.seen[id]!==p.lobbyGameCommand.id)accept(p.lobbyGameCommand);
      const dt=Math.min(.1,Math.max(0,(t-lastStep)/1000)),steps=Math.max(1,Math.ceil(dt/(1/60)));
      for(let i=0;i<steps;i++)dirty=rules.step(state,c.players,t-dt*1000+(i+1)*dt*1000/steps,dt/steps)||dirty;
      if(t-lastSend>=50&&(dirty||t-lastSend>=2000)){
        lastSend=t;
        const recipients=Object.keys(c.players).filter(id=>id!==c.uid&&rules.live(c.players[id]));
        const rtc=transport()?.publishEphemeral({kind:'lobby-games-state',state},recipients,{latest:true})===true;
        if(dirty&&!busy&&t-lastWrite>=(rtc?1000:100)){
          busy=true;lastWrite=t;dirty=false;const snapshot=JSON.parse(JSON.stringify(state)),targetKey=roomKey;
          void set(ref(db(),`rooms/${c.room}/game/lobbyGames`),snapshot)
            .catch(()=>{if(roomKey===targetKey)dirty=true;error('遊びの状態を同期できませんでした。');})
            .finally(()=>{busy=false;});
        }
      }
    }
    lastStep=t;
    const signature=roomKey+':'+(state?.revision||0)+':'+Math.floor(t/200);
    if(signature!==lastFrame){lastFrame=signature;send({type:'lobby-games-state',enabled:true,state,uid:c.uid,host:c.host,serverNow:t,players:c.players});render();decorateAction();}
  }
  const timer=setInterval(()=>void tick(),50);
  window.addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(timer);});
  return {handleFrame,receive,use,decorateAction,get area(){return localArea;},rules,request};
}
