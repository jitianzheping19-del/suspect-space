// Authoritative rules for the six roles selected from the ExtremeRoles catalogue.
export const SELECTED_ROLES={
 fencer:{side:'crew',name:'フェンサー',description:'カウンター中は通常キルを防ぎ、攻撃を受けると短時間だけ反撃キルを使えます。',action:'カウンター',color:'#78e7ee',icon:'⚔'},
 bait:{side:'crew',name:'ベイト',description:'殺されると、少し後に犯人が自分の死体を強制通報します。犯人が死亡・退出した場合や死体が消された場合は発動しません。',action:'強制通報',color:'#edbfa0',icon:'◈',passive:true},
 evolver:{side:'impostor',name:'エボルバー',description:'近くの死体を捕食するとキルクールが永続的に短くなります。捕食中は死体の近くにいる必要があります。',action:'捕食',color:'#b7e981',icon:'⬡'},
 carrier:{side:'impostor',name:'キャリアー',description:'近くの死体を抱えて運び、もう一度押すとその場所に置きます。運搬中は通報できず、死体は他の人に見えなくなります。',action:'運ぶ',color:'#d8aa7e',icon:'⇄'},
 bomber:{side:'impostor',name:'ボマー',description:'近くの相手に時限爆弾を仕込みます。爆発時、範囲内の市民は設定確率で死亡します。他の人狼は無傷ですが、ボマー本人は巻き込まれます。',action:'爆弾設置',color:'#ff9b65',icon:'✹'},
 boxer:{side:'impostor',name:'ボクサー',description:'能力を押してチャージし、もう一度押すと近くの相手をパンチで飛ばします。十分な速度で壁に衝突すると死亡します。',action:'チャージ',color:'#f48c97',icon:'✊'}
};
const setting=(roles,label,value,min,max,step=1,unit='秒')=>({roles:[roles],label,default:value,min,max,step,unit});
export const SELECTED_SETTINGS={
 fencerDurationSeconds:setting('fencer','カウンター持続時間',5,1,15),
 fencerCounterSeconds:setting('fencer','反撃できる時間',8,2,20),
 baitReportDelaySeconds:setting('bait','強制通報までの時間',1,0,10,.5),
 evolverConsumeSeconds:setting('evolver','捕食にかかる時間',2,0,10,.5),
 evolverReductionPercent:setting('evolver','捕食ごとのキルクール短縮',15,5,40,5,'％'),
 carrierDurationSeconds:setting('carrier','運搬できる時間',20,5,60),
 bomberMinSeconds:setting('bomber','爆発までの最短時間',10,2,45),
 bomberMaxSeconds:setting('bomber','爆発までの最長時間',15,2,60),
 bomberRadius:setting('bomber','爆発範囲',4,1,10,.5,'m'),
 bomberKillChance:setting('bomber','爆発で死亡する確率',50,10,100,10,'％'),
 boxerChargeSeconds:setting('boxer','最大チャージまでの時間',2,1,5,.5),
 boxerMaxDistance:setting('boxer','最大吹き飛ばし距離',12,4,20,1,'m')
};
const num=(g,key,fallback)=>{const n=g.settings?.[key],s=SELECTED_SETTINGS[key];return Math.max(s?.min??0,Math.min(s?.max??120,n!=null&&Number.isFinite(Number(n))?Number(n):fallback));};
const live=p=>!!p?.alive&&!p.observer&&!p.disconnected;
export const fencerCanKill=(p,t)=>p?.subrole==='fencer'&&live(p)&&Number(p.fencerCounterUntil)>t;
export function boxerPose(flight,stamp){const t=Math.max(0,Math.min(1,((flight.pausedAt?Math.min(stamp,flight.pausedAt):stamp)-flight.at)/Math.max(1,flight.until-flight.at)));return{x:flight.x+(flight.toX-flight.x)*t,z:flight.z+(flight.toZ-flight.z)*t,y:Math.sin(t*Math.PI)*.55};}

export function createSelectedRoleRules({clock,token,pose,wallBetween,canStand=()=>true,kill,killCooldown,emit,report,random=Math.random}){
 const cd=(g,role)=>Math.max(5,Math.min(120,Number(g.settings?.[role+'CooldownSeconds'])||30))*1000;
 const near=(g,by,id,r=2.9)=>{const a=pose(g,by),b=pose(g,id),p=g.players?.[id];return by!==id&&live(p)&&!p.ventId&&!p.boxerFlight&&a&&b&&Math.hypot(a.x-b.x,a.z-b.z)<r&&!wallBetween(a,b);};
 const corpse=(g,by,id)=>{const b=g.bodies?.[id],a=pose(g,by);return b&&!b.fake&&!b.removed&&!b.dissolved&&!b.carriedBy&&a&&Math.hypot(a.x-b.x,a.z-b.z)<3&&!wallBetween(a,b);};
 function drop(g,p,by){const body=g.bodies?.[p.carrierBodyId],at=pose(g,by)||p;if(body?.carriedBy===by){body.x=Number(at.x)||0;body.z=Number(at.z)||0;delete body.carriedBy;}delete p.carrierBodyId;delete p.carrierUntil;}
 function ability(ctx){
  const{g,p,actor,cmd,setResult}=ctx,role=p?.subrole;if(!SELECTED_ROLES[role]||role==='bait')return false;
  const t=clock(),fail=message=>{setResult(false,message);return true;};
  if(!live(p)||g.phase!=='play'||p.ventId||p.boxerFlight||Number(g.freeze?.until)>t||t<Math.max(Number(g.playStartsAt)||0,Number(g.countdownEndsAt)||0,Number(p.meetingActionReadyAt)||0))return fail('今は能力を使えません。');
  if(cmd.ability!==role)return fail('この役職の能力ではありません。');
  if(role==='carrier'&&p.carrierBodyId){drop(g,p,actor);p.abilityReadyAt=t+cd(g,role);setResult(true,'死体を置きました。');return true;}
  if(Number(p.abilityReadyAt)>t)return fail('能力のクールダウン中です。');
  if(role==='fencer'){
   if(Number(p.fencerShieldUntil)>t||fencerCanKill(p,t))return fail('カウンター中です。');
   p.fencerShieldUntil=t+num(g,'fencerDurationSeconds',5)*1000;p.abilityReadyAt=p.fencerShieldUntil+cd(g,role);emit(g,'fencer',actor,{...pose(g,actor),until:p.fencerShieldUntil});
  }else if(role==='evolver'){
   if(p.evolverMeal)return fail('捕食中です。');if(!corpse(g,actor,cmd.bodyId))return fail('捕食できる死体が近くにありません。');
   p.evolverMeal={bodyId:cmd.bodyId,until:t+num(g,'evolverConsumeSeconds',2)*1000};
   emit(g,'evolverFeed',actor,{x:g.bodies[cmd.bodyId].x,z:g.bodies[cmd.bodyId].z,bodyId:cmd.bodyId,until:p.evolverMeal.until});
  }else if(role==='carrier'){
   if(!corpse(g,actor,cmd.bodyId))return fail('運べる死体が近くにありません。');
   p.carrierBodyId=cmd.bodyId;p.carrierUntil=t+num(g,'carrierDurationSeconds',20)*1000;g.bodies[cmd.bodyId].carriedBy=actor;
  }else if(role==='bomber'){
   if(p.bomberBomb)return fail('設置した爆弾が残っています。');if(!near(g,actor,cmd.target)||g.players[cmd.target].role==='impostor')return fail('爆弾を仕込める相手が近くにいません。');
   const min=num(g,'bomberMinSeconds',10),max=Math.max(min,num(g,'bomberMaxSeconds',15));
   p.bomberBomb={target:cmd.target,until:t+(min+random()*(max-min))*1000};p.abilityReadyAt=t+cd(g,role);
   emit(g,'bomberArmed',actor,{...pose(g,cmd.target),target:cmd.target,visibleTo:[actor]});
  }else if(role==='boxer'){
   if(!p.boxerCharge){p.boxerCharge={at:t};emit(g,'boxerCharge',actor,{...pose(g,actor),at:t});setResult(true,'チャージ開始。もう一度押すとパンチします。');return true;}
   if(!near(g,actor,cmd.target))return fail('パンチできる相手が近くにいません。');
   const target=g.players[cmd.target],origin=pose(g,actor),start=pose(g,cmd.target),power=Math.max(.1,Math.min(1,(t-p.boxerCharge.at)/(num(g,'boxerChargeSeconds',2)*1000)));
   const length=Math.hypot(start.x-origin.x,start.z-origin.z)||1,dx=(start.x-origin.x)/length,dz=(start.z-origin.z)/length,max=3+power*(num(g,'boxerMaxDistance',12)-3),steps=Math.ceil(max/.12);
   let end={x:start.x,z:start.z},impact=false;for(let i=1;i<=steps;i++){const next={x:start.x+dx*max*i/steps,z:start.z+dz*max*i/steps};if(wallBetween(end,next)){impact=true;break;}if(!canStand(next)){impact=wallBetween(end,{x:next.x+dx*.65,z:next.z+dz*.65});break;}end=next;}
   const duration=Math.max(120,Math.min(650,Math.hypot(end.x-start.x,end.z-start.z)/(6+power*18)*1000));
   target.boxerFlight={by:actor,at:t,until:t+duration,x:start.x,z:start.z,toX:end.x,toZ:end.z,hitWall:impact,lethal:impact&&power>=.35};
   delete p.boxerCharge;p.abilityReadyAt=t+cd(g,role);emit(g,'boxer',actor,{...origin,target:cmd.target,power,...target.boxerFlight});
  }
  p.abilityEvent=token();setResult(true,'能力を使用しました。');return true;
 }
 function beforeDeath({g,victimId,killerId,victim,location,cause,options={}}){
  if(victimId===killerId||options.ignoreDefenses||!['killed','viper'].includes(cause)||victim.subrole!=='fencer'||!(Number(victim.fencerShieldUntil)>clock()))return;
  victim.fencerCounterUntil=clock()+num(g,'fencerCounterSeconds',8)*1000;victim.readyAt=clock();emit(g,'fencerBlocked',victimId,{...location,attacker:killerId,until:victim.fencerCounterUntil});return{blocked:true};
 }
 function afterKill({g,victimId,killerId,victim,killer,cause,location}){
  if(killer?.subrole==='fencer'&&cause==='killed'){delete killer.fencerCounterUntil;emit(g,'fencerRiposte',killerId,{...location,target:victimId});}
  if(killer?.subrole==='evolver'&&cause==='killed')emit(g,'evolverSlash',killerId,{...location,target:victimId});
  if(victim?.subrole==='bait'&&killerId!==victimId&&live(killer)&&g.phase==='play'&&!['loverFollow','suicide','切断による離脱'].includes(cause)){
   (g.baitReports||={})[victimId]={by:killerId,at:clock()+num(g,'baitReportDelaySeconds',1)*1000};
   emit(g,'baitTrigger',killerId,{...location,target:victimId,visibleTo:[killerId]});
  }
 }
 function tick({g}){
  const t=clock(),frozen=Number(g.freeze?.until)>t,landings={};let changed=false;
  for(const[id,p]of Object.entries(g.players||{})){
   if(p.carrierBodyId&&(!live(p)||p.subrole!=='carrier'||g.phase!=='play'||t>=p.carrierUntil||!g.bodies?.[p.carrierBodyId])){drop(g,p,id);p.abilityReadyAt=t+cd(g,'carrier');changed=true;}
   for(const key of ['fencerShieldUntil','fencerCounterUntil'])if(p[key]&&(!live(p)||p.subrole!=='fencer'||t>=p[key])){delete p[key];changed=true;}
   if(p.evolverMeal){const meal=p.evolverMeal;if(!live(p)||p.subrole!=='evolver'||g.phase!=='play'||p.ventId||!corpse(g,id,meal.bodyId)){delete p.evolverMeal;changed=true;}else if(!frozen&&t>=meal.until){const b=g.bodies[meal.bodyId];delete g.bodies[meal.bodyId];delete p.evolverMeal;p.evolverFactor=Math.max(.2,(Number(p.evolverFactor)||1)*(1-num(g,'evolverReductionPercent',15)/100));p.readyAt=t+killCooldown(p,g.settings);p.abilityReadyAt=t+cd(g,'evolver');emit(g,'evolver',id,{x:b.x,z:b.z});changed=true;}}
   if(p.boxerCharge&&(!live(p)||p.subrole!=='boxer'||g.phase!=='play')){delete p.boxerCharge;changed=true;}
   if(p.boxerFlight&&g.phase==='play'&&live(p)){const f=p.boxerFlight;if(frozen&&!f.pausedAt){f.pausedAt=t;changed=true;}else if(!frozen&&f.pausedAt){const paused=t-f.pausedAt;f.at+=paused;f.until+=paused;delete f.pausedAt;changed=true;}}
   if(p.boxerFlight&&(g.phase!=='play'||!live(p)||!frozen&&t>=p.boxerFlight.until)){
    const f=p.boxerFlight;delete p.boxerFlight;
    if(g.phase==='play'&&live(p)){p.x=f.toX;p.z=f.toZ;landings[id]={x:f.toX,z:f.toZ};if(f.hitWall)emit(g,'boxerImpact',f.by,{x:f.toX,z:f.toZ,target:id,lethal:f.lethal});if(f.lethal)kill(g,id,f.by,{x:f.toX,z:f.toZ},{moveKiller:false,cause:'boxer'});}
    changed=true;
   }
   if(p.bomberBomb){const bomb=p.bomberBomb,target=g.players[bomb.target];
    if(!live(p)||p.subrole!=='bomber'||!live(target)||!['play','meeting'].includes(g.phase)){delete p.bomberBomb;changed=true;}
    else if(g.phase==='play'&&!frozen&&t>=Math.max(bomb.until,Number(g.playStartsAt)||0,Number(g.countdownEndsAt)||0)){delete p.bomberBomb;const center=pose(g,bomb.target)||target,radius=num(g,'bomberRadius',4),hits=[];
     // Decide all blast victims before applying any death/lover chains.
     for(const[otherId,other]of Object.entries(g.players)){const at=pose(g,otherId);if(!live(other)||!at||other.ventId||Math.hypot(at.x-center.x,at.z-center.z)>radius||(other.role==='impostor'&&otherId!==id))continue;if(otherId===id||random()<num(g,'bomberKillChance',50)/100)hits.push({id:otherId,at});}
     emit(g,'bomber',id,{x:center.x,z:center.z,radius,targets:hits.map(hit=>hit.id)});for(const hit of hits)kill(g,hit.id,id,hit.at,{moveKiller:false,cause:'bomber'});changed=true;
    }
   }
  }
  if(Object.keys(landings).length)g.teleportEvent={id:token(),by:'boxer',at:t,positions:landings};
  for(const[id,pending]of Object.entries(g.baitReports||{})){
   if(g.phase!=='play'||!live(g.players[pending.by])||!g.bodies?.[id]||g.bodies[id].carriedBy||g.bodies[id].unreportable){delete g.baitReports[id];changed=true;}
   else if(!frozen&&t>=pending.at&&report(g,pending.by,id)){delete g.baitReports[id];changed=true;}
  }
  return changed;
 }
 function meeting({g}){delete g.baitReports;for(const[id,p]of Object.entries(g.players||{})){if(p.carrierBodyId)drop(g,p,id);for(const key of ['fencerShieldUntil','fencerCounterUntil','evolverMeal','boxerCharge','boxerFlight'])delete p[key];}}
 return{ability,beforeDeath,afterKill,tick,meeting};
}
