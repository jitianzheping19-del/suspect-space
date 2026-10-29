// Host-side role rules. No DOM, timers, network writes or rendering decisions.
import {SELECTED_ROLES,SELECTED_SETTINGS,createSelectedRoleRules} from './selected-roles.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const numeric=(settings,key,fallback,min=0,max=180)=>{const v=settings?.[key];return clamp(v!==undefined&&v!==null&&Number.isFinite(Number(v))?Number(v):fallback,min,max);};
const cooldown=(g,role)=>numeric(g.settings,role+'CooldownSeconds',30,5,120)*1000;
const living=p=>p?.alive===true&&!p.observer&&!p.disconnected;
export const JACKAL_RECRUITERS=Object.freeze(['jackal','teleportJackal','waveCannonJackal','jackalWaveCannon']);

export const EXPANSION_ROLES=Object.freeze({
 ...SELECTED_ROLES,
 overloader:{side:'impostor',name:'オーバーローダー',description:'能力で移動速度・キル距離を強化し、キル待ち時間を半減します。使用しても正体は公開されません。もう一度使うか会議開始で解除します。',action:'オーバーロード',color:'#ff8563',icon:'⚡'},
 cracker:{side:'impostor',name:'クラッカー',description:'近くの死体をクラックして通報できなくします。死体を消す設定も可能です。死亡の確認と痕跡は会議開始で処理されます。',action:'クラック',color:'#d08eff',icon:'⌁'},
 missionary:{side:'neutral',name:'ミッショナリー（宣教師）',description:'近くの相手に宣教し、10〜20秒後に自決させます。自分が倒れても宣教は残ります。自分以外の最後の生存者がクルーか無害な第三陣営なら勝利します。',action:'宣教',color:'#daa8f4',icon:'✟'},
 bodyguard:{side:'crew',name:'ボディーガード',description:'近くの相手を護衛します。通常キルされた時に身代わりで倒れ、対象を守ります。護衛は会議をまたいで続き、護衛者が倒れると解除されます。',action:'ガード',color:'#6fe6d4',icon:'⛨'},
 sandworm:{side:'impostor',name:'サンドワーム',description:'ベント内から近くの相手を強襲します。キル待ち時間はベント内か停電中だけ進みます。通常キルで待ち時間が増え、強襲・停電中のキルで短くなります。',action:'強襲',color:'#dcb87d',icon:'◒'},
 eater:{side:'neutral',name:'イーター',description:'近くの死体を喰らうか、生存者に接触し続けて丸呑みします。丸呑みは防御を貫通し、死体を残しません。合計3人を食べると単独勝利します。',action:'喰らう／丸呑み',color:'#becc79',icon:'◉'},
 freezer:{side:'crew',name:'フリーザー',description:'使用者を含む生存者全員を5秒間停止させます。停止中は移動とプレイ中の操作ができません。',action:'時間停止',color:'#84dcff',icon:'❄'},
 madJester:{side:'impostor',name:'マッドてるてる',description:'人狼陣営の協力者です。投票で追放されると人狼陣営を勝利させます。必要タスク数と人狼の認識を設定できます。個人タスクは全体タスクに加算されません。',action:'追放を狙う',color:'#ef91b4',icon:'☂'}
});
export const EXPANSION_LABELS=Object.freeze({...Object.fromEntries(Object.entries(EXPANSION_ROLES).map(([id,r])=>[id,[r.name,r.description]])),vampireDependent:['ヴァンパイアの眷属','ヴァンパイアに作られた人狼陣営の眷属です。通常キルを使えます。親の死亡・追放で後追いします。']});
export const EXPANSION_OPTIONS=Object.freeze(Object.entries(EXPANSION_ROLES).map(([id,r])=>({id,side:r.side,count:0})));
export const EXPANSION_LOOKS=Object.freeze(Object.fromEntries(Object.entries(EXPANSION_ROLES).map(([id,r])=>[id,{color:r.color,icon:r.icon,action:r.action,theme:r.side==='impostor'?'danger':r.side==='neutral'?'wave':'halo'}])));
export const EXPANSION_DEFINITIONS=Object.freeze({...Object.fromEntries(Object.entries(EXPANSION_ROLES).map(([id,r])=>[id,{side:r.side,humanOnly:true}])),vampire:{side:'impostor',humanOnly:true}});
export const EXPANSION_COOLDOWNS=Object.freeze(Object.fromEntries(Object.keys(EXPANSION_ROLES).filter(id=>id!=='madJester'&&!EXPANSION_ROLES[id].passive).map(id=>[id+'CooldownSeconds',{roles:[id],label:id==='sandworm'?'強襲クールダウン':'能力クールダウン',default:30,min:5,max:120,step:5}])));
export const EXPANSION_SETTINGS=Object.freeze({
 ...SELECTED_SETTINGS,
 vampireCanCreateDependent:{roles:['vampire'],label:'眷属を作成できる',default:true,type:'checkbox'},
 vampireDependentCooldownSeconds:{roles:['vampire'],label:'眷属のキルクールダウン',default:30,min:5,max:120,step:5,unit:'秒'},
 vampireDependentCanVent:{roles:['vampire'],label:'眷属はベントを使える',default:true,type:'checkbox'},
 jackalPromotedCanRecruit:{roles:JACKAL_RECRUITERS,label:'昇格後のジャッカルもサイドキックを作れる',default:false,type:'checkbox'},
 overloaderSpeedMultiplier:{roles:['overloader'],label:'公開中の移動速度',default:1.5,min:1,max:3,step:.1,unit:'倍'},
 crackerRemoveBody:{roles:['cracker'],label:'クラックした死体を消す',default:false,type:'checkbox'},
 bodyguardMaxUses:{roles:['bodyguard'],label:'ガードできる回数',default:1,min:1,max:5,step:1,unit:'回'},
 missionaryMinSeconds:{roles:['missionary'],label:'宣教後の最短時間',default:10,min:1,max:60,step:1,unit:'秒'},
 missionaryMaxSeconds:{roles:['missionary'],label:'宣教後の最長時間',default:20,min:1,max:90,step:1,unit:'秒'},
 eaterRequiredMeals:{roles:['eater'],label:'勝利に必要な回数',default:3,min:1,max:10,step:1,unit:'人'},
 eaterSwallowSeconds:{roles:['eater'],label:'丸呑みの接触時間',default:3,min:1,max:15,step:.5,unit:'秒'},
 madJesterRequiresTasks:{roles:['madJester'],label:'追放勝利にタスク完了が必要',default:false,type:'checkbox'},
 madJesterRequiredTasks:{roles:['madJester'],label:'追放勝利に必要なタスク',default:2,min:1,max:5,step:1,unit:'個'},
 madJesterRecognizeImpostors:{roles:['madJester'],label:'人狼を認識できる',default:false,type:'checkbox'},
 madJesterRecognizeTasks:{roles:['madJester'],label:'人狼認識に必要なタスク',default:0,min:0,max:5,step:1,unit:'個'}
});

export function isTimeFrozen(g,stamp){return g?.phase==='play'&&Number(g.freeze?.until)>stamp;}
export function expansionKillRange(p){return p?.subrole==='overloader'&&p.overloaded?5:3.6;}
export function expansionKillCooldown(p,settings,base){
 if(p?.subrole==='evolver')return Math.max(1000,base*Math.max(.2,Math.min(1,Number(p.evolverFactor)||1)));
 if(p?.subrole==='vampireDependent')return numeric(settings,'vampireDependentCooldownSeconds',30,5,120)*1000;
 if(p?.subrole==='overloader'&&p.overloaded)return Math.max(2500,base*.5);
 if(p?.subrole==='sandworm')return Math.max(5000,base+(Number(p.sandwormCooldownAdjustmentMs)||0));
 return base;
}
export function madJesterKnowsImpostors(p,settings){return p?.subrole==='madJester'&&settings?.madJesterRecognizeImpostors===true&&(p.assignedTasks||[]).filter(id=>p.tasks?.[id]).length>=numeric(settings,'madJesterRecognizeTasks',0,0,5);}
export function madJesterVoteWin(g,p){return p?.subrole==='madJester'&&(g.settings?.madJesterRequiresTasks!==true||(p.assignedTasks||[]).filter(id=>p.tasks?.[id]).length>=numeric(g.settings,'madJesterRequiredTasks',2,1,5));}

export function createExpansionRoleRules({clock,token,pose,wallBetween,canStand,kill,killCooldown,emit,report=()=>false,random=Math.random}){
 const selected=createSelectedRoleRules({clock,token,pose,wallBetween,canStand,kill,killCooldown,emit,report,random});
 const distance=(a,b)=>Math.hypot(Number(a.x)-Number(b.x),Number(a.z)-Number(b.z));
 const near=(g,actor,id,range=2.9,{allowVent=false}={})=>{const target=g.players?.[id],a=pose(g,actor),b=pose(g,id);return actor!==id&&living(target)&&(allowVent||!target.ventId)&&a&&b&&distance(a,b)<range&&!wallBetween(a,b);};
 const bodyNear=(g,actor,id)=>{const at=pose(g,actor),b=g.bodies?.[id];return b&&!b.carriedBy&&!b.fake&&!b.removed&&!b.dissolved&&at&&distance(at,b)<3&&!wallBetween(at,b);};
 const event=(g,type,actor,data={})=>emit(g,type,actor,data);
 function ability(ctx){
  if(selected.ability(ctx))return true;
  const {g,actor,cmd,p,setResult}=ctx,role=p?.subrole;
  const dependent=role==='vampire'&&cmd.ability==='createVampireDependent';
  const recruiting=JACKAL_RECRUITERS.includes(role)&&cmd.ability==='createSidekick';
  if((!EXPANSION_ROLES[role]||role==='madJester')&&!recruiting&&!dependent)return false;
  const stamp=clock(),fail=text=>{setResult(false,text);return true;};
  if(!living(p)||g.phase!=='play'||stamp<Math.max(Number(g.playStartsAt)||0,Number(g.countdownEndsAt)||0,Number(p.meetingActionReadyAt)||0)||!pose(g,actor)||p.ventId&&role!=='sandworm')return fail('生存中のプレイ時間にだけ使えます。');
  if(isTimeFrozen(g,stamp))return fail('時間停止中です。');
  const allowed={overloader:['overloader'],cracker:['crackBody'],missionary:['missionary'],bodyguard:['bodyguard'],sandworm:['sandwormAmbush'],eater:['eaterCorpse','eaterSwallow'],freezer:['freezer']};
  if(!dependent&&!recruiting&&!allowed[role]?.includes(cmd.ability))return fail('この役職はその能力を使えません。');
  if(!dependent&&!recruiting&&!(role==='overloader'&&p.overloaded)&&(Number(p.abilityReadyAt)||0)>stamp)return fail('能力のクールダウン中です。');
  const at=pose(g,actor);
  if(dependent){
   if(g.settings?.vampireCanCreateDependent===false||p.vampireDependentId)return fail('眷属は1試合に1人までです。');
   if(stamp<Math.max(Number(p.dependentReadyAt)||0,(Number(g.playStartsAt)||0)+30000))return fail('眷属作成のクールダウン中です。');
   if(!near(g,actor,cmd.target)||g.players[cmd.target].role==='impostor')return fail('眷属にできる相手が近くにいません。');
   const old=g.players[cmd.target],ready=stamp+numeric(g.settings,'vampireDependentCooldownSeconds',30,5,120)*1000;
   g.players[cmd.target]={name:old.name,hue:old.hue??0,costume:old.costume||'standard',x:old.x||0,z:old.z||0,alive:true,role:'impostor',subrole:'vampireDependent',vampireMasterId:actor,assignedTasks:[],tasks:{},readyAt:ready,abilityReadyAt:ready};
   p.vampireDependentId=cmd.target;event(g,'vampireDependentCreated',actor,{...pose(g,cmd.target),target:cmd.target,visibleTo:[actor,cmd.target]});
  }else if(role==='overloader'){
   if(p.overloaded&&stamp-Number(p.overloadedAt)<3000)return fail('強化から3秒経つと解除できます。');
   p.overloaded=!p.overloaded;
   if(p.overloaded)p.overloadedAt=stamp;else p.abilityReadyAt=stamp+cooldown(g,role);
   event(g,'overloader',actor,{...at,active:p.overloaded});
  }else if(role==='cracker'){
   if(!bodyNear(g,actor,cmd.bodyId)||g.bodies[cmd.bodyId].unreportable)return fail('クラックできる死体が近くにありません。');
   const body=g.bodies[cmd.bodyId];body.unreportable=true;body.crackedBy=actor;
   if(g.settings?.crackerRemoveBody===true){(g.crackTraces||={})[cmd.bodyId]={x:body.x,z:body.z,by:actor,at:stamp};delete g.bodies[cmd.bodyId];}
   p.abilityReadyAt=stamp+cooldown(g,role);event(g,'cracker',actor,{x:body.x,z:body.z});
  }else if(role==='bodyguard'){
   if(!near(g,actor,cmd.target,5))return fail('護衛できる相手が近くにいません。');
   if(Number(p.guardUses||0)>=numeric(g.settings,'bodyguardMaxUses',1,1,5)||p.guardedTargets?.[cmd.target])return fail('この相手への護衛か、使用回数を使い切っています。');
   (g.players[cmd.target].bodyguards||={})[actor]=true;(p.guardedTargets||={})[cmd.target]=true;
   p.guardUses=(Number(p.guardUses)||0)+1;p.abilityReadyAt=stamp+cooldown(g,role);
   event(g,'bodyguard',actor,{...pose(g,cmd.target),target:cmd.target,visibleTo:[actor]});
  }else if(role==='missionary'){
   if(!near(g,actor,cmd.target)||g.players[cmd.target].missionaryDoom)return fail('宣教できる相手が近くにいません。');
   const min=numeric(g.settings,'missionaryMinSeconds',10,1,60),max=Math.max(min,numeric(g.settings,'missionaryMaxSeconds',20,1,90));
   g.players[cmd.target].missionaryDoom={by:actor,at:stamp+(min+random()*(max-min))*1000};
   p.abilityReadyAt=stamp+cooldown(g,role);event(g,'missionary',actor,{...pose(g,cmd.target),target:cmd.target,visibleTo:[actor]});
  }else if(role==='sandworm'){
   if(!p.ventId)return fail('ベント内から強襲してください。');
   if((Number(p.readyAt)||0)>stamp||!near(g,actor,cmd.target,3.6)||g.players[cmd.target].role==='impostor')return fail('強襲できる相手が近くにいないか、キル待ち時間中です。');
   const accepted=kill(g,cmd.target,actor,pose(g,cmd.target),{moveKiller:false,cause:'sandworm'});
   if(!accepted&&g.players[cmd.target].alive!==true)return fail('相手はすでに倒れています。');
   p.readyAt=stamp+killCooldown(p,g.settings);p.abilityReadyAt=p.readyAt;
   event(g,'sandworm',actor,{...at,target:cmd.target});
  }else if(recruiting){
   if(p.sidekickCreated||p.jackalLeaderId)return fail('サイドキックは1試合に1人までです。');
   if(!near(g,actor,cmd.target)||g.players[cmd.target].role==='jackal')return fail('サイドキックにできる相手が近くにいません。');
   const target=g.players[cmd.target];target.previousSubrole=target.subrole;target.role='jackal';target.subrole='jackalSidekick';target.jackalLeaderId=actor;target.jackalTeam=true;target.assignedTasks=[];target.tasks={};target.readyAt=stamp+killCooldown(target,g.settings);target.abilityReadyAt=target.readyAt;
   // Delayed attacks and crew-only defenses cannot transfer into the new role.
   for(const key of ['bodyguards','shielded','shieldedBy','shieldUntil','sageShieldUntil','medicShieldUsed','vampireDeathAt','vampireBiteBy','missionaryDoom','eaterSwallow','drone','mini'])delete target[key];
   p.sidekickCreated=cmd.target;
   event(g,'sidekickCreated',actor,{...pose(g,cmd.target),target:cmd.target,visibleTo:[actor,cmd.target]});
  }else if(role==='eater'){
   if(p.eaterSwallow)return fail('丸呑み中です。');
   if(cmd.ability==='eaterCorpse'){
    if(!bodyNear(g,actor,cmd.bodyId))return fail('食べられる死体が近くにありません。');
    const body=g.bodies[cmd.bodyId];delete g.bodies[cmd.bodyId];p.eaterMeals=(Number(p.eaterMeals)||0)+1;p.eaterSwallowExtraMs=(Number(p.eaterSwallowExtraMs)||0)+500;p.eaterUsedSinceMeeting=true;
    p.abilityReadyAt=stamp+cooldown(g,role)+(Number(p.eaterCooldownExtraMs)||0);event(g,'eater',actor,{x:body.x,z:body.z});
   }else{
    if(!near(g,actor,cmd.target))return fail('丸呑みできる相手が近くにいません。');
    p.eaterSwallow={target:cmd.target,endsAt:stamp+Math.max(500,numeric(g.settings,'eaterSwallowSeconds',3,1,15)*1000+(Number(p.eaterSwallowExtraMs)||0))};
   }
  }else if(role==='freezer'){
   g.freeze={id:token(),by:actor,startedAt:stamp,until:stamp+5000};p.abilityReadyAt=stamp+5000+cooldown(g,role);event(g,'freezer',actor,{...at,until:stamp+5000});
  }
  p.abilityEvent=token();setResult(true,dependent?'眷属を作りました。':role==='freezer'?'全員を5秒間停止しました。':recruiting?'サイドキックを作りました。':role==='overloader'?(p.overloaded?'能力を強化しました。':'強化を解除しました。'):'能力を使用しました。');return true;
 }
 function beforeDeath({g,victimId,killerId,victim,killer,location,options={},cause}){
  const counter=selected.beforeDeath({g,victimId,killerId,victim,killer,location,options,cause});if(counter)return counter;
  if(options.ignoreDefenses||victimId===killerId||['suicide','serialKillerSuicide','sheriffMisfire','loverFollow','missionary','切断による離脱'].includes(cause))return;
  if(victim.subrole==='fox'&&killer?.role==='impostor'){
   const stamp=clock();g.shieldBreakEvent={id:token(),attacker:killerId,target:victimId,kind:'fox',visibleTo:[killerId,victimId],at:stamp};
   (g.foxShields||={})[victimId]={attacker:killerId,at:stamp,until:stamp+1800};
   event(g,'foxShield',killerId,{...location,target:victimId,visibleTo:[killerId,victimId]});return{blocked:true};
  }
  if(options.skipBodyguards||!['killed','sandworm','bomber'].includes(cause))return;
  for(const id of Object.keys(victim.bodyguards||{})){
   const guard=g.players?.[id];if(id===victimId||!living(guard)||guard.subrole!=='bodyguard')continue;
   delete victim.bodyguards[id];const guardAt=pose(g,id)||location;
   if(kill(g,id,killerId,guardAt,{moveKiller:false,skipBodyguards:true,ignoreDefenses:true,cause:'bodyguardSacrifice'})){
    event(g,'bodyguardSacrifice',id,{...location,target:victimId});return{blocked:true};
   }
  }
 }
 function afterKill(ctx){
  selected.afterKill(ctx);const {g,killer,cause}=ctx;
  if(killer?.subrole==='vampireDependent'){const master=g.players[killer.vampireMasterId];if(master?.alive){master.readyAt=clock()+killCooldown(master,g.settings);master.abilityReadyAt=master.readyAt;}}
  if(killer?.subrole!=='sandworm'||!['killed','sandworm'].includes(cause))return;
  const bonus=cause==='sandworm'||g.sabotage?.type==='lights'&&Number(g.sabotage.endsAt)>clock();
  killer.sandwormCooldownAdjustmentMs=clamp((Number(killer.sandwormCooldownAdjustmentMs)||0)+(bonus?-5000:5000),-30000,60000);
  killer.sandwormClockAt=clock();
 }
 function tick({g}){
  const stamp=clock();let changed=selected.tick({g});
  if(g.freeze&&stamp>=g.freeze.until){delete g.freeze;changed=true;}
  for(const[id,shield]of Object.entries(g.foxShields||{}))if(stamp>=shield.until){delete g.foxShields[id];changed=true;}
  const leaders=Object.values(g.players||{}).some(p=>p?.alive===true&&!p.observer&&p.role==='jackal'&&p.subrole!=='jackalSidekick');
  if(!leaders)for(const[id,p]of Object.entries(g.players||{})){
   if(!living(p)||p.subrole!=='jackalSidekick')continue;
   p.subrole='jackal';p.promotedFromSidekick=true;delete p.jackalLeaderId;
   if(g.settings?.jackalPromotedCanRecruit===true)delete p.sidekickCreated;else p.sidekickCreated=true;
   p.readyAt=stamp+killCooldown(p,g.settings);p.abilityReadyAt=p.readyAt;event(g,'sidekickPromoted',id,{...pose(g,id),visibleTo:[id]});changed=true;
  }
  for(const [id,p]of Object.entries(g.players||{})){
   if(p.alive&&p.subrole==='vampireDependent'&&g.players[p.vampireMasterId]?.alive===false){kill(g,id,p.vampireMasterId,pose(g,id)||p,{moveKiller:false,ignoreDefenses:true,cause:'vampireFollow'});if(g.phase==='meeting')delete g.bodies?.[id];changed=true;}
   const doom=p.missionaryDoom;
   if(doom&&(!p.alive||p.observer)){delete p.missionaryDoom;changed=true;}
   else if(doom&&stamp>=doom.at&&['play','meeting'].includes(g.phase)){
    delete p.missionaryDoom;kill(g,id,doom.by,pose(g,id)||p,{moveKiller:false,ignoreDefenses:true,cause:'missionary'});changed=true;
   }
   if(p.eaterSwallow){
    const pending=p.eaterSwallow;
    if(g.phase!=='play'||!living(p)||!near(g,id,pending.target)){delete p.eaterSwallow;changed=true;}
    else if(stamp>=pending.endsAt&&!isTimeFrozen(g,stamp)){
     delete p.eaterSwallow;
     if(kill(g,pending.target,id,pose(g,pending.target),{moveKiller:false,ignoreDefenses:true,cause:'eater'})){delete g.bodies?.[pending.target];p.eaterMeals=(Number(p.eaterMeals)||0)+1;p.eaterCooldownExtraMs=(Number(p.eaterCooldownExtraMs)||0)+2000;p.eaterUsedSinceMeeting=true;event(g,'eater',id,{...pose(g,id)});}
     p.abilityReadyAt=stamp+cooldown(g,'eater')+(Number(p.eaterCooldownExtraMs)||0);changed=true;
    }
   }
   if(p.subrole==='sandworm'&&living(p)&&g.phase==='play'){
    const previous=Number(p.sandwormClockAt)||stamp;
    if(Number(p.readyAt)>previous&&!p.ventId&&!(g.sabotage?.type==='lights'&&Number(g.sabotage.endsAt)>stamp))p.readyAt+=Math.max(0,stamp-previous);
    p.abilityReadyAt=p.readyAt;p.sandwormClockAt=stamp;changed=true;
   }else if(p.sandwormClockAt){delete p.sandwormClockAt;changed=true;}
   if(p.bodyguards){for(const guardId of Object.keys(p.bodyguards))if(!living(g.players?.[guardId])||g.players[guardId].subrole!=='bodyguard'){delete p.bodyguards[guardId];changed=true;}}
  }
  return changed;
 }
 function meeting({g}){
  selected.meeting({g});
  delete g.freeze;delete g.crackTraces;
  for(const p of Object.values(g.players||{})){
   if(p.subrole==='eater'&&!p.eaterUsedSinceMeeting)p.eaterSwallowExtraMs=Math.max(-14500,(Number(p.eaterSwallowExtraMs)||0)-500);
   delete p.eaterUsedSinceMeeting;delete p.overloaded;delete p.overloadedAt;delete p.eaterSwallow;delete p.sandwormClockAt;
  }
 }
 function win({g}){
  if(g.madJesterWinner){g.winner='impostor';g.reason='マッドてるてるが投票で追放され、人狼陣営の勝利です。';return true;}
  const alive=Object.entries(g.players||{}).filter(([,p])=>living(p));
  for(const [id,p]of alive){
   if(p.subrole==='eater'&&Number(p.eaterMeals)>=numeric(g.settings,'eaterRequiredMeals',3,1,10)){
    g.winner='eater';g.expansionWinnerId=id;g.reason=p.name+'が必要な人数を食べ、イーターの勝利です。';return true;
   }
   if(['eater','missionary'].includes(p.subrole)&&alive.length<=2){
    const other=alive.find(([otherId])=>otherId!==id)?.[1],harmless=!other||other.role==='crew'&&!['madmate','blackCat','madJester'].includes(other.subrole)||['jester','vulture','god','fox','cupid'].includes(other.subrole);
    if(harmless){g.winner=p.subrole;g.expansionWinnerId=id;g.reason=p.name+'が最後まで生存し、'+EXPANSION_ROLES[p.subrole].name+'の勝利です。';return true;}
   }
  }
  return false;
 }
 return{ability,beforeDeath,afterKill,tick,meeting,win,near,bodyNear};
}
