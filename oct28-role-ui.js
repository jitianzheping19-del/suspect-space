import {EXPANSION_ROLES,JACKAL_RECRUITERS,isTimeFrozen} from './oct28-role-rules.js';
import './time-freeze-ui.css';
import {SELECTED_ROLES} from './selected-roles.js';

export function createExpansionRoleUI({getGame,getSelf,getId,getPosition,pose,clock,connected,canPlay,blocked,show,send,toast,panel,wallBetween=()=>false}){
 const $=id=>document.getElementById(id);
 const actionReadyAt=(g,p)=>Math.max(Number(g.playStartsAt)||0,Number(g.countdownEndsAt)||0,Number(p?.meetingActionReadyAt)||0);
 const abilityReadyAt=(g,p)=>Math.max(actionReadyAt(g,p),p?.subrole==='overloader'&&p.overloaded?Number(p.overloadedAt||0)+3000:Math.max(Number(p?.abilityReadyAt)||0,p?.subrole==='sandworm'?Number(p.readyAt)||0:0));
 function selectedTarget(body=false){const g=getGame(),at=getPosition(),self=getId();return Object.entries(body?g.bodies||{}:g.players||{}).map(([id,p])=>({id,p,at:body?p:pose(g,id)})).filter(x=>x.at&&(body?!x.p.fake&&!x.p.removed&&!x.p.dissolved&&!x.p.carriedBy:x.id!==self&&x.p.alive&&!x.p.observer&&!x.p.disconnected&&!x.p.ventId&&!x.p.boxerFlight&&x.p.role!=='impostor')&&Math.hypot(x.at.x-at.x,x.at.z-at.z)<(body?3:2.9)&&!wallBetween(at,x.at)).sort((a,b)=>Math.hypot(a.at.x-at.x,a.at.z-at.z)-Math.hypot(b.at.x-at.x,b.at.z-at.z))[0]?.id;}
 const active=()=>{const p=getSelf(),g=getGame();return !!p?.alive&&!p.observer&&!p.disconnected&&connected()&&!blocked()&&!isTimeFrozen(g,clock())&&g.phase==='play'&&clock()>=actionReadyAt(g,p);};
 function targets(list,{body=false,players=true,range=2.9,filter=()=>true,action,bodyAction}={}){
  const g=getGame(),id=getId(),at=getPosition(),distance=b=>Math.hypot(at.x-b.x,at.z-b.z);
  const add=(text,payload)=>{const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>{send('ability',payload);show('abilityTargetSelect',false);};list.append(button);};
  if(body)for(const[bodyId,b]of Object.entries(g.bodies||{}))if(b&&!b.fake&&!b.removed&&!b.dissolved&&distance(b)<3&&filter(b,true))add('死体：'+(b.name||'プレイヤー'),{ability:bodyAction||action,bodyId});
  if(players)for(const[target,p]of Object.entries(g.players||{})){const loc=pose(g,target);if(target!==id&&p?.alive&&!p.observer&&!p.disconnected&&!p.ventId&&loc&&distance(loc)<range&&filter(p,false,target))add(p.name||'プレイヤー',{ability:action,target});}
  if(!list.children.length){const empty=document.createElement('p');empty.textContent='使える対象が近くにいません。';list.append(empty);}
 }
 function useAbility(){
  const p=getSelf(),role=p?.subrole;
  if(!EXPANSION_ROLES[role]||role==='madJester'||EXPANSION_ROLES[role].passive)return false;
  if(!active()||clock()<abilityReadyAt(getGame(),p))return true;
  if(SELECTED_ROLES[role]){
   if(p.boxerFlight)return true;
   const body=['evolver','carrier'].includes(role)&&!p.carrierBodyId,target=['bomber','boxer'].includes(role)&&(role!=='boxer'||p.boxerCharge);
   const id=body?selectedTarget(true):target?selectedTarget():'';
   if((body||target)&&!id)return true;
   send('ability',{ability:role,...(body?{bodyId:id}:target?{target:id}:{})});return true;
  }
  if(role==='overloader'||role==='freezer'){send('ability',{ability:role});return true;}
  const title=EXPANSION_ROLES[role].name;
  if(role==='cracker')targets(panel(title,'通報できなくする死体を選んでください。'),{body:true,players:false,action:'crackBody',filter:b=>!b.unreportable});
  if(role==='bodyguard')targets(panel(title,'通常キルの身代わりで守る相手を選んでください。'),{range:5,action:'bodyguard',filter:(_p,_b,id)=>!p.guardedTargets?.[id]});
  if(role==='missionary')targets(panel(title,'宣教する相手を選んでください。'),{action:'missionary',filter:p=>!p.missionaryDoom});
  if(role==='sandworm'){
   if(!p.ventId){toast('ベント内から強襲してください。');return true;}
   targets(panel(title,'強襲する相手を選んでください。'),{range:3.6,action:'sandwormAmbush',filter:p=>p.role!=='impostor'});
  }
  if(role==='eater')targets(panel(title,'死体を喰らうか、生存者を丸呑みします。'),{body:true,action:'eaterSwallow',bodyAction:'eaterCorpse'});
  return true;
 }
 function createSidekick(){
  const p=getSelf();if(p?.subrole==='vampire'){if(!active()||p.vampireDependentId)return;targets(panel('眷属作成','眷属にする相手を選んでください。'),{action:'createVampireDependent',filter:target=>target.role!=='impostor'});return;}if(!JACKAL_RECRUITERS.includes(p?.subrole)||p.sidekickCreated||p.jackalLeaderId||!active()||!canPlay())return;
  targets(panel('サイドキック作成','1試合に1人を味方にします。ジャッカルが全員死亡すると昇格し、キルできるようになります。'),{action:'createSidekick',filter:p=>p.role!=='jackal'});
 }
 function sync(){
  const p=getSelf(),g=getGame(),role=p?.subrole,stamp=clock();
  let recruit=$('jackalSidekickBtn');
  if(!recruit){recruit=document.createElement('button');recruit.id='jackalSidekickBtn';recruit.type='button';recruit.className='actionButton';recruit.textContent='サイドキック';recruit.setAttribute('aria-label','サイドキックを作る');recruit.onclick=createSidekick;recruit.hidden=true;$('buttons').append(recruit);}
  const vampire=role==='vampire'&&g.settings?.vampireCanCreateDependent!==false;
  recruit.hidden=!(g.phase==='play'&&p?.alive&&(vampire||JACKAL_RECRUITERS.includes(role)&&!p.jackalLeaderId));
  // Action-button layout rules can override the browser's default [hidden] style.
  recruit.style.setProperty('display',recruit.hidden?'none':'','important');
  const wait=vampire?Math.max(0,Math.ceil((Math.max(Number(p.dependentReadyAt)||0,(Number(g.playStartsAt)||0)+30000)-stamp)/1000)):0;recruit.disabled=!active()||!!(vampire?p?.vampireDependentId:p?.sidekickCreated)||!!p?.ventId||wait>0;recruit.textContent=(vampire?p?.vampireDependentId:p?.sidekickCreated)?'作成済み':wait?`眷属 ${wait}秒`:vampire?'眷属を作成':'サイドキック';
  if(role==='jackalSidekick')for(const id of ['killBtn','killSecondBtn']){show(id,false);if($(id))$(id).disabled=true;}
  if(SELECTED_ROLES[role]){
   const passive=SELECTED_ROLES[role].passive,button=$('abilityBtn');show('abilityBtn',!passive&&g.phase==='play'&&p?.alive===true);
   const left=Math.max(0,Math.ceil((abilityReadyAt(g,p)-stamp)/1000));let caption=left?left+'秒':SELECTED_ROLES[role].action;
   const counter=Math.max(Number(p?.fencerShieldUntil)||0,Number(p?.fencerCounterUntil)||0)>stamp;
   if(counter)caption=(Number(p.fencerCounterUntil)>stamp?'反撃可能 ':'防御中 ')+Math.ceil((Math.max(Number(p.fencerShieldUntil)||0,Number(p.fencerCounterUntil)||0)-stamp)/1000)+'秒';
   if(p?.carrierBodyId)caption='死体を置く';if(p?.evolverMeal)caption='捕食 '+Math.max(0,Math.ceil((p.evolverMeal.until-stamp)/1000))+'秒';
   if(p?.bomberBomb)caption='爆発まで '+Math.max(0,Math.ceil((p.bomberBomb.until-stamp)/1000))+'秒';
   if(p?.boxerCharge)caption='パンチ '+Math.min(100,Math.floor((stamp-p.boxerCharge.at)/(Math.max(1,Number(g.settings?.boxerChargeSeconds)||2)*10)))+'%';
   $('abilityIcon').textContent=SELECTED_ROLES[role].icon;$('abilityCaption').textContent=caption;
   const needsBody=['evolver','carrier'].includes(role)&&!p?.carrierBodyId,needsPlayer=role==='bomber'||role==='boxer'&&!!p?.boxerCharge;
   button.disabled=!!passive||!active()||!!p?.boxerFlight||left>0&&!p?.carrierBodyId||counter||!!p?.evolverMeal||!!p?.bomberBomb||needsBody&&!selectedTarget(true)||needsPlayer&&!selectedTarget();
   button.style.setProperty('--cooldown',Math.min(1,left/Math.max(5,Number(g.settings?.[role+'CooldownSeconds'])||30))*360+'deg');
  }else if(EXPANSION_ROLES[role]&&role!=='madJester'){
   const button=$('abilityBtn');show('abilityBtn',g.phase==='play'&&p?.alive===true);
   const readyAt=abilityReadyAt(g,p),remaining=Math.max(0,readyAt-stamp),left=Math.ceil(remaining/1000);
   const setting=g.settings?.[role+'CooldownSeconds'],configured=setting!=null&&Number.isFinite(Number(setting))?Math.max(5,Math.min(120,Number(setting))):30;
   const duration=role==='overloader'&&p.overloaded?3000:configured*1000+(role==='eater'?Number(p.eaterCooldownExtraMs)||0:role==='freezer'?5000:0);
   button.style.setProperty('--cooldown',Math.min(1,remaining/Math.max(1,duration))*360+'deg');
   $('abilityIcon').textContent=EXPANSION_ROLES[role].icon;
   $('abilityCaption').textContent=left?left+'秒':role==='overloader'&&p.overloaded?'ダウンロード':p.eaterSwallow?'丸呑み中':EXPANSION_ROLES[role].action;
   button.disabled=!active()||left>0||!!p.eaterSwallow||role==='sandworm'&&!p.ventId||role==='bodyguard'&&Number(p.guardUses||0)>=Number(g.settings?.bodyguardMaxUses??1);
  }
  const frozen=isTimeFrozen(g,stamp)&&p?.alive===true;
  let status=$('timeFreezeStatus');
  if(!status){status=document.createElement('div');status.id='timeFreezeStatus';status.setAttribute('role','status');status.innerHTML='<span class="freezeEmblem" aria-hidden="true">❄</span><span class="freezeTitle">時間停止</span><span class="freezeSeconds"></span><span class="freezeTrack" aria-hidden="true"><i></i></span>';document.body.append(status);}
  status.hidden=!frozen;if(frozen){const left=Math.max(0,g.freeze.until-stamp),span=Math.max(1,g.freeze.until-(g.freeze.startedAt||g.freeze.until-5000));status.querySelector('.freezeSeconds').textContent=Math.ceil(left/1000)+'s';status.style.setProperty('--freeze-left',Math.min(1,left/span));for(const id of ['killBtn','killSecondBtn','abilityBtn','taskBtn','reportBtn','sabotageBtn'])if($(id))$(id).disabled=true;}
 }
 return{useAbility,createSidekick,sync};
}
