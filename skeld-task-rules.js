export const SKELD_EXTRA_MODES=Object.freeze(['manifolds','garbage','asteroids','prime-shields','inspect-sample','steering','reactor-memory','chart-course']);
export const SKELD_COURSE=Object.freeze([[.12,.72],[.30,.26],[.50,.55],[.70,.18],[.88,.65]]);
export const SKELD_EXTRA_HINTS=Object.freeze({'chart-course':'船をつかんで航路に沿って終点まで運ぶ。',manifolds:'1から10まで順番に押す。間違えたら1からやり直し。',garbage:'レバーを下げて、ごみが全部出たら離す。',asteroids:'動く隕石を20個撃ち落とす。','prime-shields':'赤い六角形を押して、すべてのシールドを点灯。','inspect-sample':'分析を開始し、色と模様が異なる試料を選ぶ。',steering:'照準を中央に合わせて安定させる。','reactor-memory':'ボタンが光る順番を覚え、点灯後に同じボタンを同じ順で押す。全5段階。'});
export function createSkeldTaskRun(task,onComplete=()=>{},random=Math.random,clock=Date.now){
 const mode=task.mode;if(!SKELD_EXTRA_MODES.includes(mode))throw new Error('Unknown Skeld task '+mode);
 const int=n=>Math.min(n-1,Math.floor(random()*n)),s={mode,finished:false,accepting:true,progress:0,feedback:'',elapsed:0};
 const complete=()=>{if(s.finished)return;s.finished=true;s.accepting=false;s.progress=1;s.feedback='タスク完了';onComplete(task);};
 const newRock=serial=>({id:serial,x:.10+random()*.72,y:.16+random()*.62,speed:.035+random()*.035});
 if(mode==='manifolds'){s.order=Array.from({length:10},(_,i)=>i+1);for(let i=9;i>0;i--){const j=int(i+1);[s.order[i],s.order[j]]=[s.order[j],s.order[i]];}s.next=1;}
 if(mode==='garbage')Object.assign(s,{holding:false,emptied:0});
 if(mode==='asteroids')Object.assign(s,{hits:0,serial:5,rocks:Array.from({length:5},(_,i)=>newRock(i))});
 if(mode==='prime-shields')s.cells=[false,true,false,false,true,false,true];
 if(mode==='inspect-sample')Object.assign(s,{phase:'ready',analysis:0,analysisUntil:0,anomaly:int(5)});
 if(mode==='chart-course')Object.assign(s,{courseIndex:1,ship:[...SKELD_COURSE[0]]});
 if(mode==='steering')Object.assign(s,{x:.18,y:.77,steady:0});
 if(mode==='reactor-memory')Object.assign(s,{sequence:Array.from({length:5},()=>int(9)),round:1,input:0,phase:'show',playback:0,lit:-1});
 function release(cancel=false){s.holding=false;if(!cancel&&mode==='garbage'&&s.emptied>=1)complete();}
 function dispatch(e){
  if(!s.accepting||!e)return false;
  if(e.type==='release'){release();return true;}
  if(mode==='steering'&&e.type==='aim'&&Number.isFinite(e.x)&&Number.isFinite(e.y)){s.x=Math.max(0,Math.min(1,e.x));s.y=Math.max(0,Math.min(1,e.y));return true;}
  if(mode==='chart-course'&&e.type==='course'&&Number.isFinite(e.x)&&Number.isFinite(e.y)){
   const a=SKELD_COURSE[s.courseIndex-1],b=SKELD_COURSE[s.courseIndex],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((e.x-a[0])*dx+(e.y-a[1])*dy)/(dx*dx+dy*dy))),x=a[0]+dx*t,y=a[1]+dy*t;
   if(Math.hypot(x-e.x,y-e.y)>.075){s.feedback='航路に沿って船を動かす';return false;}
   s.ship=[x,y];s.feedback='';s.progress=(s.courseIndex-1+t)/4;if(t>.97&&++s.courseIndex===SKELD_COURSE.length)complete();return true;
  }
  if(e.type!=='press')return false;const n=Number(e.value);
  if(mode==='manifolds'&&Number.isInteger(n)&&n>=1&&n<=10){if(n===s.next){s.next++;s.feedback='';if(s.next===11)complete();}else{s.next=1;s.feedback='順番が違います。1からもう一度';}s.progress=(s.next-1)/10;}
  if(mode==='garbage'&&e.value==='lever')s.holding=true;
  if(mode==='asteroids'){const rock=s.rocks.find(r=>r.id===n);if(rock){s.hits++;s.rocks=s.rocks.filter(r=>r!==rock);s.progress=s.hits/20;if(s.hits===20)complete();else s.rocks.push(newRock(s.serial++));}}
  if(mode==='prime-shields'&&Number.isInteger(n)&&n>=0&&n<7){s.cells[n]=!s.cells[n];s.progress=s.cells.filter(Boolean).length/7;if(s.cells.every(Boolean))complete();}
  if(mode==='inspect-sample'){
   if(e.value==='start'&&s.phase==='ready'){s.phase='analyzing';s.analysisUntil=clock()+60000;s.feedback='分析中…';}
   else if(s.phase==='choose'&&Number.isInteger(n)&&n>=0&&n<5){if(n===s.anomaly)complete();else s.feedback='正常な試料です。色と模様を確認';}
  }
  if(mode==='reactor-memory'&&s.phase==='input'&&Number.isInteger(n)&&n>=0&&n<9){if(n===s.sequence[s.input]){s.input++;s.feedback='';if(s.input===s.round){s.progress=s.round/5;if(s.round===5)complete();else{s.round++;s.input=0;s.playback=0;s.phase='show';}}}else{s.round=1;s.progress=0;s.sequence=Array.from({length:5},()=>int(9));s.input=0;s.playback=0;s.phase='show';s.feedback='順番が違います。最初からもう一度';}}
  return true;
 }
 function tick(dt){if(!s.accepting)return;dt=Math.max(0,Math.min(.1,Number(dt)||0));s.elapsed+=dt;
  if(mode==='garbage'&&s.holding){s.emptied=Math.min(1,s.emptied+dt/1.8);s.progress=s.emptied;s.feedback=s.emptied>=1?'レバーを離す':'排出中…';}
  if(mode==='asteroids')for(const r of s.rocks){r.x+=dt*r.speed;if(r.x>.94){r.x=.06;r.y=.16+random()*.62;}}
  if(mode==='inspect-sample'&&s.phase==='analyzing'){s.analysis=Math.max(0,60-(s.analysisUntil-clock())/1000);s.feedback=`分析完了まで ${Math.max(0,Math.ceil(60-s.analysis))}秒（閉じて移動できます）`;s.progress=Math.min(.8,s.analysis/60*.8);if(s.analysis>=60){s.phase='choose';s.feedback='異常な試料を1つ選ぶ';}}
  if(mode==='steering'){s.steady=Math.hypot(s.x-.5,s.y-.5)<.045?s.steady+dt:0;s.progress=Math.min(1,s.steady/.8);if(s.steady>=.8)complete();}
  if(mode==='reactor-memory'&&s.phase==='show'){s.playback+=dt;const slot=Math.floor(s.playback/.85);s.lit=s.playback%.85<.58&&slot<s.round?s.sequence[slot]:-1;if(s.playback>=s.round*.85+.35){s.phase='input';s.lit=-1;}}
 }
 return{state:s,dispatch,tick,release,cancel:()=>release(true)};
}
