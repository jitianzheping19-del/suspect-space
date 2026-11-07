const buses=new WeakMap();
export function connectEffectLimiter(context,node){
 let limiter=buses.get(context);if(!limiter){limiter=context.createDynamicsCompressor();limiter.threshold.value=-15;limiter.knee.value=10;limiter.ratio.value=6;limiter.attack.value=.004;limiter.release.value=.18;limiter.connect(context.destination);buses.set(context,limiter);}
 node.connect(limiter);return limiter;
}
const defaults={meeting:65,ending:65,play:100},levels={...defaults};
function save(key,value){try{localStorage.setItem('space-scene-audio-'+key,String(value));}catch{}}
export function sceneEffectGain(doc){
 const visible=id=>{const node=doc.getElementById(id);return node&&!node.hidden&&!node.classList.contains('hidden');};
 const scene=visible('ending')?'ending':visible('meetingIntro')||visible('meeting')||visible('voteResult')?'meeting':'play';
 return levels[scene]/100;
}
export function installSceneAudio(){
 const parent=document.querySelector('[data-settings-section="audio"]');if(!parent||document.getElementById('sceneAudioSettings'))return;
 const section=document.createElement('section');section.id='sceneAudioSettings';section.className='sceneAudioSettings';const title=document.createElement('h3');title.textContent='場面ごとの効果音';section.append(title);
 for(const [key,label]of Object.entries({play:'通常の操作・演出',meeting:'会議・投票の演出',ending:'勝利・敗北の演出'})){
  try{const saved=localStorage.getItem('space-scene-audio-'+key);if(saved!==null&&Number.isFinite(Number(saved)))levels[key]=Math.max(0,Math.min(100,Number(saved)));}catch{}
  const row=document.createElement('label'),input=document.createElement('input'),out=document.createElement('output');input.type='range';input.min='0';input.max='100';input.value=levels[key];input.id='sceneAudio-'+key;row.htmlFor=input.id;row.append(label,input,out);
  const sync=()=>{levels[key]=Number(input.value);out.value=out.textContent=levels[key]+'%';save(key,levels[key]);};input.oninput=sync;sync();section.append(row);
 }
 const note=document.createElement('p');note.textContent='効果音全体の音量に掛け合わせます。通話の音量は別に調整できます。';section.append(note);parent.append(section);
}
