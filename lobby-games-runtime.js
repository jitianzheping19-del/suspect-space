import {createSoccerGuide} from './lobby-soccer-guide.js';
import './lobby-soccer-match.css';
import {createSoccerDefenseControls} from './lobby-soccer-defense-ui.js';
import {createSoccerFeedback} from './lobby-soccer-feedback.js';
import {createSoccerGoalPresentation} from './lobby-soccer-goal-ui.js';
import {createLobbyGamesRules} from './lobby-games-rules.js';
import {createSoccerFlickControls} from './lobby-soccer-flick.js';
import './lobby-games.css';

export function createLobbyGamesRuntime({context,db,ref,update,set,frame,transport,toast,onAreaChange=()=>{},onPhoto=()=>{},clock=Date.now}){
  const rules=createLobbyGamesRules(),goalPresentation=createSoccerGoalPresentation({document,clock});
  let roomKey='',state=null,ownHost=false,lastWrite=0,lastSend=0,lastStep=0,busy=false,dirty=false,action={},localArea='lobby',lastError=0;
  let pending=null,sequence=0,lastFrame='',menuOpen=false,lastRequestId='',reportedResult='',feedback='',feedbackUntil=0;
  let pressSerial=0,pressWrite=Promise.resolve(),dashWrite=Promise.resolve();
  const guide=createSoccerGuide({document,window,onOpen:open=>{if(open){requestPress(false);requestDash(false);}frame()?.postMessage({type:'lobby-studio-state',open},'*');render();}});
  const soccerFeedback=createSoccerFeedback({document,window,clock,visible:()=>context().enabled&&localArea==='soccer'&&!rules.active(state?.tag)});
  function soccerControlContext(){
    const base=context(),c={...base,players:rules.soccerRoster(state?.soccer,base.players)},g=state?.soccer,t=clock(),press=g?.presses?.[c.uid],target=rules.pressTarget(g,c.uid,c.players,t),owner=g?.ball?.dribbler;
    const reception=rules.reception(state,c.uid,c.players,t),airAction=rules.airAction(state,c.uid,c.players,t);
    const recovering=!!press?.outcome&&t<press.recoverUntil;
    const duel=Object.entries(g?.presses||{}).filter(([id,p])=>(id===c.uid||p.target===c.uid)&&p.contact&&t-p.contact.at<1400).sort((a,b)=>b[1].contact.at-a[1].contact.at)[0];
    const feedback=duel?{at:duel[1].contact.at,result:duel[1].result,text:duel[0]===c.uid?({won:'ボール奪取！',evaded:'かわされた',shielded:'身体でブロックされた',miss:'届かなかった'}[duel[1].result]):({won:'ボールを奪われた',evaded:'フェイント成功',shielded:'ボールをキープ',miss:'プレスを回避'}[duel[1].result])}:null;
    const defending=!!g&&!!owner&&owner!==c.uid&&!(owner&&g.status==='playing'&&g.members?.[owner]===g.members?.[c.uid])&&['idle','playing'].includes(g.status);
    return {defending,canSlide:!pending&&rules.canSlide(state,c.uid,c.players,t),visible:c.enabled&&!guide.open&&localArea==='soccer'&&!rules.active(state?.tag),volleyReady:airAction==='volley',overheadReady:airAction==='overhead',headerReady:airAction==='header',canTrap:reception.trap,enabled:(!!action.enabled||!!airAction)&&(!pending||pending.kind==='soccer-dash'),resolveLobAim:yaw=>{const target=state?rules.passTarget(state,c.uid,c.players,yaw):'',p=c.players[c.uid],q=c.players[target];return q?{mode:'lob',target,yaw:Math.atan2(q.x-p.x,q.z-p.z),x:q.x,z:q.z}:null;},resolveAim:(yaw,forceShot)=>rules.kickAim(state,c.uid,c.players,yaw,forceShot),canSkill:!!action.canSkill,canDash:rules.canDash(state,c.uid,c.players,t)&&!pending,dashing:t<Number(g?.dashes?.[c.uid]?.until||0),hasBall:owner===c.uid,canPress:!!target&&!recovering,press:press?.held?press:null,recovering,duel:feedback,teammateBall:!!owner&&owner!==c.uid&&g?.status==='playing'&&g.members?.[owner]===g.members?.[c.uid],pending:!!pending,yaw:action.yaw||0,rightX:action.rightX??1,rightZ:action.rightZ??0,forwardX:action.forwardX??0,forwardZ:action.forwardZ??1};
  }
  const defenseControls=createSoccerDefenseControls({document,window,context:soccerControlContext,sendPress:requestPress,sendSlide:yaw=>requestSoccerAction('soccer-slide',{yaw})});
  const flickControls=createSoccerFlickControls({document,window,context:()=>{const c=soccerControlContext();return c;},send:requestSoccerAction,onAim:value=>frame()?.postMessage({type:'lobby-soccer-aim',...value},'*'),sendDash:requestDash});
  const panel=document.createElement('section');panel.id='lobbyMiniGamePanel';panel.className='hidden';panel.setAttribute('aria-label','ロビーの遊び');
  const title=document.createElement('strong'),status=document.createElement('div'),buttons=document.createElement('div');buttons.className='miniGameButtons';panel.append(title,status,buttons);document.body.append(panel);
  const start=document.createElement('button'),stop=document.createElement('button'),exit=document.createElement('button');
  start.id='lobbyMiniGameStart';start.textContent='開始';stop.textContent='終了';start.hidden=stop.hidden=true;stop.id='lobbyMiniGameStop';exit.textContent='ロビーへ戻る';buttons.append(start,stop,exit);
  const toggle=document.createElement('button');toggle.id='lobbyMiniGameToggle';toggle.textContent='遊び';toggle.className='secondary hidden';document.body.append(toggle);
  const touch=document.createElement('button');touch.id='lobbyTagTouchBtn';touch.textContent='タッチ';touch.className='hidden';document.body.append(touch);
  const countdown=document.createElement('div');countdown.id='lobbyMiniGameCountdown';countdown.hidden=true;countdown.setAttribute('role','status');countdown.setAttribute('aria-live','polite');countdown.setAttribute('aria-atomic','true');
  const countdownLabel=document.createElement('span'),countdownNumber=document.createElement('strong');countdown.append(countdownLabel,countdownNumber);document.body.append(countdown);
  const scoreActions=document.createElement('div');scoreActions.id='lobbySoccerActions';scoreActions.className='soccerScoreActions';scoreActions.hidden=true;document.body.append(scoreActions);
  toggle.onclick=()=>{menuOpen=!menuOpen;render();};
  const setup=document.createElement('fieldset');setup.id='soccerMatchSetup';setup.innerHTML='<label>フィールドのボット<input id="soccerBotsEnabled" type="checkbox" checked></label><label data-team="blue">青チームのボット<input id="soccerBlueBots" aria-label="青チームのボット数" type="number" min="0" max="10" value="1"></label><label data-team="red">赤チームのボット<input id="soccerRedBots" aria-label="赤チームのボット数" type="number" min="0" max="10" value="1"></label><small></small>';panel.insertBefore(setup,buttons);
  const botEnabled=setup.querySelector('#soccerBotsEnabled'),blueBots=setup.querySelector('#soccerBlueBots'),redBots=setup.querySelector('#soccerRedBots');
  for(const input of [botEnabled,blueBots,redBots])input.addEventListener('change',()=>{if(input.type==='number')input.value=String(Math.max(0,Math.min(10,Math.floor(Number(input.value)||0))));render();});
  start.onclick=()=>request('start-'+(localArea==='lobby'?'tag':localArea),localArea==='soccer'?{bots:{enabled:botEnabled.checked,blue:Number(blueBots.value),red:Number(redBots.value)}}:{});
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
  const worldRoster=c=>rules.soccerRoster(state?.soccer,c.players);
  function waitForPending(){return pending?new Promise(resolve=>{const old=pending.resolve;pending.resolve=value=>{old(value);resolve();};}):Promise.resolve();}
  async function requestSoccerAction(kind,data){
    const key=roomKey;
    while(roomKey===key&&pending?.kind==='soccer-dash')await waitForPending();
    if(roomKey===key&&context().enabled)return request(kind,data);
  }
  function requestDash(held){
    const c=context(),key=c.room+':'+c.host;
    frame()?.postMessage({type:'lobby-soccer-dash-intent',held},'*');
    // Preserve release order even if the initial dash is awaiting its host ack.
    dashWrite=dashWrite.catch(()=>{}).then(async()=>{
      if(roomKey!==key)return;
      while(roomKey===key&&pending)await waitForPending();
      if(roomKey===key&&context().enabled)return request('soccer-dash',{held});
    });
    return dashWrite;
  }
  function acceptPress(command){
    const c=context();if(!ownHost||!state||!c.enabled||command.owner!==c.host||!rules.live(c.players[command.uid]))return;
    if(rules.pressInput(state.soccer,command,worldRoster(c),clock())){state.at=clock();state.revision++;dirty=true;}
  }
  function requestPress(held,mode='press'){
    const c=context();frame()?.postMessage({type:'lobby-soccer-press-intent',held},'*');
    if(!c.enabled||!c.uid||!c.room)return;
    const command={uid:c.uid,owner:c.host,held,mode,serial:pressSerial=Math.max(pressSerial+1,Math.floor(clock())),at:clock()};
    if(ownHost){acceptPress(command);return;}
    try{transport()?.publishEphemeral({kind:'lobby-games-press',command},[c.host],{latest:true});}catch{}
    // Ordered fallback writes ensure release cannot be overwritten by an older heartbeat.
    const path=`rooms/${c.room}/players/${c.uid}`;
    pressWrite=pressWrite.catch(()=>{}).then(()=>update(ref(db(),path),{lobbyPressCommand:command})).catch(()=>{});
  }
  function error(message){feedback=message;feedbackUntil=clock()+6000;render();if(clock()-lastError>2500){lastError=clock();toast(message);}}
  async function request(kind,extra={}){
    const c=context();if(!c.enabled||!c.uid||pending)return {ok:false,message:"接続を確認してもう一度お試しください。"};
    const command={kind,...extra,id:c.uid+':'+clock()+':'+(++sequence),uid:c.uid,owner:c.host,at:clock()};
    let resolve;const completion=new Promise(done=>resolve=done);
    lastRequestId=command.id;pending={id:command.id,kind,until:clock()+6000,resolve};feedback='';render();
    if(ownHost){accept(command);return completion;}
    try{transport()?.publishEphemeral({kind:'lobby-games-command',command},[c.host]);}catch{ /* The Firebase fallback still delivers commands when RTC is unavailable. */ }
    try{Promise.resolve(update(ref(db(),`rooms/${c.room}/players/${c.uid}`),{lobbyGameCommand:command})).catch(()=>acknowledge({id:command.id,ok:false,message:'遊びの操作を送れませんでした。接続を確認してください。'}));}
    catch{acknowledge({id:command.id,ok:false,message:'遊びの操作を送れませんでした。接続を確認してください。'});}
    return completion;
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
    reportedResult=result.id;pending?.resolve(result);pending=null;if(result.message)error(result.message);else render();
  }
  function receive(payload,meta){
    if(!payload?.kind?.startsWith('lobby-games-'))return false;
    const c=context();if(!c.enabled)return true;
    if(payload.kind==='lobby-games-command'&&ownHost&&payload.command?.uid===meta.from)accept(payload.command);
    if(payload.kind==='lobby-games-press'&&ownHost&&payload.command?.uid===meta.from)acceptPress(payload.command);
    if(payload.kind==='lobby-games-state'&&meta.from===c.host&&!ownHost&&payload.state?.owner===c.host&&Number(payload.state.at)>=Number(state?.at||0))state=payload.state;
    if(payload.kind==='lobby-games-result'&&meta.from===c.host)acknowledge(payload);
    return true;
  }
  function handleFrame(data){
    if(!data?.type?.startsWith('lobby-games-'))return false;
    const c=context();if(!c.enabled)return true;
    if(data.type==='lobby-games-action'&&['lobby','survival','soccer'].includes(data.area)){
      action={enabled:data.enabled===true,canSkill:data.canSkill===true,target:typeof data.target==='string'?data.target:'',yaw:Number.isFinite(data.yaw)?data.yaw:0,passTarget:typeof data.passTarget==='string'?data.passTarget:'',...Object.fromEntries(['rightX','rightZ','forwardX','forwardZ'].filter(k=>Number.isFinite(data[k])).map(k=>[k,data[k]]))};const changed=localArea!==data.area;localArea=data.area;if(changed)onAreaChange();decorateAction();render();
    }else if(data.type==='lobby-games-command'&&['kick','tag','soccer-skill'].includes(data.kind))request(data.kind,{yaw:Number(data.yaw)||0,target:String(data.target||''),...(data.kind==='soccer-skill'?{skill:data.skill,side:data.side}:{})});
    return true;
  }
  function decorateAction(){
    const button=document.getElementById('lobbyUseBtn');if(!button||!context().enabled||localArea!=='soccer')return;
    button.textContent=action.passTarget?'パス':'シュート';button.title=(action.passTarget?(context().players[action.passTarget]?.name||'味方')+'へパス':'シュート')+' [F]';button.setAttribute('aria-label',button.title);button.dataset.actionIcon='kick';button.disabled=!action.enabled||!!pending;button.classList.toggle('armed',!!action.enabled);
  }
  function use(){const c=context();if(!c.enabled||localArea!=='soccer')return false;if(rules.canOverhead(state,c.uid,c.players,clock()))request('soccer-overhead');else if(action.enabled)request('kick',{yaw:action.yaw});return true;}
  function render(){
    rules.setSoccerPitch(state?.soccer);soccerFeedback.update(state?.soccer);
    flickControls.update();defenseControls.update();
    const c=context();onPhoto(c.enabled?state?.photo:null,state?.photoBackground||'aurora');const enabled=c.enabled,tag=state?.tag,tagPlaying=rules.active(tag),game=tagPlaying?tag:state?.[localArea==='lobby'?'tag':localArea];
    const participation=enabled&&rules.live(c.players[c.uid])&&Object.entries({tag:state?.tag,survival:state?.survival,soccer:state?.soccer}).find(([,g])=>rules.active(g)&&Object.hasOwn(g.members||{},c.uid));
    if(participation){if(document.body.dataset.lobbyMinigame!==participation[0])document.body.dataset.lobbyMinigame=participation[0];}
    else if(document.body.hasAttribute('data-lobby-minigame'))delete document.body.dataset.lobbyMinigame;
    const soccerVisible=enabled&&localArea==='soccer'&&!tagPlaying;guide.update(soccerVisible);
    document.body.classList.toggle('lobbySoccerRoom',soccerVisible);
    goalPresentation.update(state?.soccer,soccerVisible);
    const playing=rules.active(game),canStart=!!c.uid&&c.uid===c.host,inRoom=localArea!=='lobby';
    setup.hidden=!soccerVisible||!canStart||playing;setup.disabled=!!pending;blueBots.disabled=redBots.disabled=!botEnabled.checked;
    const humans=Object.values(c.players||{}).filter(p=>rules.live(p)&&rules.area(p)==='soccer').length,total=humans+(botEnabled.checked?Number(blueBots.value)+Number(redBots.value):0);
    setup.querySelector('small').textContent=`人 ${humans}人 ＋ ボット ${total-humans}体 · `+(total>=16?'特大コート':total>=10?'大コート':'標準コート')+'（開始時に決定）'+(botEnabled.checked?' · キーパーは各1体':'');
    const soccerPlaying=localArea==='soccer'&&!tagPlaying&&playing;
    scoreActions.hidden=!soccerVisible||!soccerPlaying;
    const actionsParent=soccerPlaying?scoreActions:buttons;if(stop.parentNode!==actionsParent)actionsParent.append(stop,exit);
    if(!canStart)menuOpen=false;
    panel.classList.toggle('hidden',!enabled||soccerPlaying||!inRoom&&!rules.active(tag)&&!menuOpen);
    toggle.classList.toggle('hidden',!enabled||!canStart||inRoom||rules.active(tag));
    document.body.classList.toggle('lobbyMiniGameOpen',enabled&&(inRoom||rules.active(tag)||menuOpen));
    document.body.classList.toggle('lobbyTagPlaying',enabled&&tagPlaying);
    title.textContent=tagPlaying?'鬼ごっこ':localArea==='survival'?'消える床サバイバル':localArea==='soccer'?'フットサル':'鬼ごっこ';
    const t=clock(),remaining=game?.startAt>t?Math.ceil((game.startAt-t)/1000):0;
    const starting=participation&&t<participation[1].startAt+650&&participation;
    countdown.hidden=!starting;
    if(starting){const [name,g]=starting,label={tag:'鬼ごっこ',survival:'消える床サバイバル',soccer:'フットサル'}[name],number=t<g.startAt?String(Math.ceil((g.startAt-t)/1000)):'START!';if(countdownLabel.textContent!==label)countdownLabel.textContent=label;if(countdownNumber.textContent!==number)countdownNumber.textContent=number;}
    if(remaining)status.textContent=`開始まで ${remaining}`;
    else if(localArea==='soccer'&&!tagPlaying){
      const team=game?.members?.[c.uid];
      const result=game?.status==='finished'?(game.cancelled?'参加者不足で終了':game.winner===-1?'引き分け':(game.winner===0?'青':'赤')+'チームの勝ち'):'';
      status.textContent=result|| (playing?(team===0?'あなたは青チーム':team===1?'あなたは赤チーム':'観戦中'):'3分間 · 得点と時間はコート横の得点板へ');
      if(playing&&game?.bots&&Object.keys(game.bots).length)status.textContent+=' · BOT '+Object.keys(game.bots).length+'体参加';
    }else if(localArea==='survival'&&!tagPlaying)status.textContent=playing?`残り ${Object.values(game.members).filter(m=>m.alive).length}人`+(game.members?.[c.uid]?.alive?'':' · 2階で観戦できます'):game?.status==='finished'?'終了 · '+(game.winners?.length?game.winners.map(id=>c.players[id]?.name||'クルー').join('・')+' の勝ち':'勝者なし'):'参加希望の枠に入って待機';
    else status.textContent=playing?`鬼：${c.players[tag.oni]?.name||'クルー'}`+(tag.oni===c.uid?(t<tag.frozenUntil?' · 1秒停止中':tag.practice?' · 自由に移動できます':' · 近づいてタッチ'):(tag.immune?.[c.uid]>t?` · 無敵 ${Math.ceil((tag.immune[c.uid]-t)/1000)}秒`:'')):'ロビー全員参加 · 1人でも練習できます';
    if(playing&&game?.practice)status.textContent='1人練習 · '+status.textContent;
    const tagPlayers=Object.values(c.players||{}).filter(p=>rules.live(p)&&rules.area(p)==='lobby'&&!p.lobbyCircuit&&!p.lobbyKart).length;
    const otherGameActive=localArea==='lobby'&&!playing&&(rules.active(state?.survival)||rules.active(state?.soccer));
    const own=c.players?.[c.uid],riding=localArea==='lobby'&&!playing&&(own?.lobbyCircuit||own?.lobbyKart);
    if(!playing&&localArea==='lobby'){
      if(otherGameActive)status.textContent='進行中の遊びが終わると開始できます';
      else if(riding)status.textContent='乗り物から降りて開始してください';
      else status.textContent=`参加者 ${tagPlayers}人 · `+(tagPlayers===1?'1人で練習できます':'最初の鬼はランダム');
    }
    if(!playing&&feedback&&t<feedbackUntil)status.textContent=feedback;
    start.hidden=!canStart||playing;start.disabled=!!pending||localArea!=='lobby'&&rules.active(tag)||!!otherGameActive||!!riding||localArea==='lobby'&&tagPlayers===0;
    start.textContent=pending?'開始を送信中…':localArea==='lobby'?(tagPlayers===1?'1人で練習開始':'鬼ごっこ開始'):'スタート';
    start.title=otherGameActive?'進行中の遊びが終わってから開始できます。':riding?'乗り物から降りて開始してください。':'';
    stop.hidden=!canStart||!playing;exit.hidden=!inRoom;
    touch.classList.toggle('hidden',!enabled||!tagPlaying||tag.oni!==c.uid);
    touch.disabled=!action.target||!!pending;touch.classList.toggle('armed',!!action.target);
  }
  async function tick(){
    const c=context(),t=clock();
    if(!c.enabled){
      pending?.resolve({ok:false,message:'部屋を退出しました。'});
      if(roomKey){send({type:'lobby-games-state',enabled:false,state:null});roomKey='';state=null;pending=null;localArea='lobby';action={};}
      render();lastStep=t;return;
    }
    const key=c.room+':'+c.host;
    if(key!==roomKey){pending?.resolve({ok:false,message:'部屋の接続が変わりました。'});roomKey=key;ownHost=c.uid===c.host;state=ownHost?rules.fresh(c.uid,t):null;if(ownHost&&['aurora','sunset','moon','rose'].includes(c.snapshot?.photoBackground))state.photoBackground=c.snapshot.photoBackground;lastWrite=lastSend=0;lastFrame='';dirty=ownHost;pending=null;lastRequestId=reportedResult=feedback='';feedbackUntil=0;lastStep=t;}
    if(!ownHost&&c.snapshot?.owner===c.host&&Number(c.snapshot.at)>=Number(state?.at||0))state=c.snapshot;
    acknowledge(state?.results?.[c.uid]);
    if(pending&&state?.seen?.[c.uid]===pending.id)acknowledge(state.results?.[c.uid]||{id:pending.id,ok:true});
    if(pending&&t>pending.until)acknowledge({id:pending.id,ok:false,message:'操作の返答がありません。もう一度お試しください。'});
    if(ownHost){
      for(const [id,p]of Object.entries(c.players)){
        if(p.lobbyGameCommand?.uid===id&&state.seen[id]!==p.lobbyGameCommand.id)accept(p.lobbyGameCommand);
        if(p.lobbyPressCommand?.uid===id)acceptPress(p.lobbyPressCommand);
      }
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
  return {handleFrame,receive,use,decorateAction,get area(){return localArea;},rules,request,requestPress,requestDash};
}
