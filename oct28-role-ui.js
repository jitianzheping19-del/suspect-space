import {EXPANSION_ROLES,JACKAL_RECRUITERS,isTimeFrozen} from './oct28-role-rules.js';

export function createExpansionRoleUI({getGame,getSelf,getId,getPosition,pose,clock,connected,canPlay,blocked,show,send,toast,panel}){
 const $=id=>document.getElementById(id);
 const active=()=>{const p=getSelf(),g=getGame();return !!p?.alive&&!p.observer&&!p.disconnected&&connected()&&!blocked()&&!isTimeFrozen(g,clock())&&g.phase==='play'&&clock()>=Math.max(Number(g.playStartsAt||g.countdownEndsAt)||0,Number(p.meetingActionReadyAt)||0);};
 function targets(list,{body=false,players=true,range=2.9,filter=()=>true,action,bodyAction}={}){
  const g=getGame(),id=getId(),at=getPosition(),distance=b=>Math.hypot(at.x-b.x,at.z-b.z);
  const add=(text,payload)=>{const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>{send('ability',payload);show('abilityTargetSelect',false);};list.append(button);};
  if(body)for(const[bodyId,b]of Object.entries(g.bodies||{}))if(b&&!b.fake&&!b.removed&&!b.dissolved&&distance(b)<3&&filter(b,true))add('死体：'+(b.name||'プレイヤー'),{ability:bodyAction||action,bodyId});
  if(players)for(const[target,p]of Object.entries(g.players||{})){const loc=pose(g,target);if(target!==id&&p?.alive&&!p.observer&&!p.disconnected&&!p.ventId&&loc&&distance(loc)<range&&filter(p,false,target))add(p.name||'プレイヤー',{ability:action,target});}
  if(!list.children.length){const empty=document.createElement('p');empty.textContent='使える対象が近くにいません。';list.append(empty);}
 }
 function useAbility(){
  const p=getSelf(),role=p?.subrole;
  if(!EXPANSION_ROLES[role]||role==='madJester')return false;
  if(!active())return true;
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
  const wait=vampire?Math.max(0,Math.ceil((Math.max(Number(p.dependentReadyAt)||0,(Number(g.playStartsAt)||0)+30000)-stamp)/1000)):0;recruit.disabled=!active()||!!(vampire?p?.vampireDependentId:p?.sidekickCreated)||!!p?.ventId||wait>0;recruit.textContent=(vampire?p?.vampireDependentId:p?.sidekickCreated)?'作成済み':wait?`眷属 ${wait}秒`:vampire?'眷属を作成':'サイドキック';
  if(role==='jackalSidekick')for(const id of ['killBtn','killSecondBtn']){show(id,false);if($(id))$(id).disabled=true;}
  if(EXPANSION_ROLES[role]&&role!=='madJester'){
   const button=$('abilityBtn');show('abilityBtn',g.phase==='play'&&p?.alive===true);
   const readyAt=role==='overloader'&&p.overloaded?Number(p.overloadedAt||0)+3000:Math.max(Number(p.abilityReadyAt)||0,role==='sandworm'?Number(p.readyAt)||0:0),left=Math.max(0,Math.ceil((readyAt-stamp)/1000));
   $('abilityIcon').textContent=EXPANSION_ROLES[role].icon;
   $('abilityCaption').textContent=left?left+'秒':role==='overloader'&&p.overloaded?'ダウンロード':p.eaterSwallow?'丸呑み中':EXPANSION_ROLES[role].action;
   button.disabled=!active()||left>0||!!p.eaterSwallow||role==='sandworm'&&!p.ventId||role==='bodyguard'&&Number(p.guardUses||0)>=Number(g.settings?.bodyguardMaxUses??1);
  }
  const frozen=isTimeFrozen(g,stamp)&&p?.alive===true;
  let status=$('timeFreezeStatus');
  if(!status){status=document.createElement('div');status.id='timeFreezeStatus';status.setAttribute('role','status');status.style.cssText='position:fixed;left:50%;top:22%;transform:translateX(-50%);pointer-events:none;padding:10px 16px;border:1px solid #a0eaff99;border-radius:12px;background:#0b2b45df;color:#d9f6ff;font-weight:800;z-index:60';document.body.append(status);}
  status.hidden=!frozen;if(frozen){status.textContent='時間停止 '+Math.ceil((g.freeze.until-stamp)/1000)+'秒';for(const id of ['killBtn','killSecondBtn','abilityBtn','taskBtn','reportBtn','sabotageBtn'])if($(id))$(id).disabled=true;}
 }
 return{useAbility,createSidekick,sync};
}
