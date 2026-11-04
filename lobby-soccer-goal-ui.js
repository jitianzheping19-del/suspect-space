import './lobby-soccer-goal-ui.css';
export function createSoccerGoalPresentation({document,clock=Date.now}){
 const root=document.createElement('section');root.id='soccerGoalCelebration';root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');
 root.innerHTML='<div class="goalHalo"></div><div class="goalStreaks" aria-hidden="true"></div><div class="goalCard"><div class="goalEyebrow">FUTSAL ARENA</div><div class="goalWord" aria-hidden="true">GOAL!</div><div class="goalTeam"></div><div class="goalScore" aria-hidden="true"><div class="goalSide blue"><span>BLUE</span><div class="goalDigits"><b class="old"></b><b class="next"></b></div></div><div class="goalDash">:</div><div class="goalSide red"><span>RED</span><div class="goalDigits"><b class="old"></b><b class="next"></b></div></div></div><div class="goalRestart"></div></div>';
 document.body.append(root);let shown='';
 const sides=[root.querySelector('.blue'),root.querySelector('.red')];
 for(let i=0;i<16;i++){const ray=document.createElement('i');ray.style.setProperty('--angle',i*22.5+'deg');ray.style.setProperty('--delay',(i%4)*45+'ms');root.querySelector('.goalStreaks').append(ray);}
 return {update(g,visible){
  const goal=g?.lastGoal,age=clock()-Number(goal?.at||0),key=goal?g.id+':'+goal.at+':'+goal.team:'';
  if(!visible||!goal||age<0||age>=3400||g.status==='finished'){root.hidden=true;return;}
  if(key!==shown){
   shown=key;root.hidden=false;root.dataset.team=String(goal.team);root.classList.remove('playing');
   const next=goal.score||g.score,old=goal.beforeScore||next.map((n,i)=>Math.max(0,n-Number(i===goal.team)));
   sides.forEach((side,i)=>{side.classList.toggle('scored',i===goal.team);side.querySelector('.old').textContent=old[i];side.querySelector('.next').textContent=next[i];});
   root.querySelector('.goalTeam').textContent=(goal.team===0?'青':'赤')+'チームのゴール';
   root.setAttribute('aria-label',`${goal.team===0?'青':'赤'}チームが得点。青 ${next[0]}、赤 ${next[1]}。${goal.team===0?'赤':'青'}チームのボールで再開。`);
   void root.offsetWidth;root.classList.add('playing');
   for(const animation of root.getAnimations({subtree:true}))animation.currentTime=age;
  }
  root.hidden=false;
  const seconds=Math.max(1,Math.ceil(((g.kickoff?.readyAt||goal.at+3400)-clock())/1000));
  root.querySelector('.goalRestart').textContent=`${goal.team===0?'赤':'青'}チームのボールで再開 · ${seconds}`;
 },root};
}
