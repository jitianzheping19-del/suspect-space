import {SKELD_EXTRA_HINTS} from './skeld-task-rules.js';
import {taskInstructions} from './frost-task-rules.js';
import {taskExample} from './practice-lab.js';
import './room-experience.css';

export function taskHelpText(task){return SKELD_EXTRA_HINTS[task.mode]||taskInstructions[task.mode]||taskExample(task)[1];}
export function installRoomExperience(THREE,api){
 const root=new THREE.Group();root.name='部屋の案内と設備';api.scene.add(root);let map='',scope='',done=new Set(),previous=null,walk=0,lastStep=0,audio=null,help=null;const signs=[];
 const hash=s=>[...String(s)].reduce((v,c)=>(v*31+c.codePointAt(0))>>>0,0);
 function tone(frequency,duration=.16,gain=.1,echo=0){
  if(document.hidden||api.volume()<=0)return;
  try{audio||=new (window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running'){void audio.resume();return;}
   const t=audio.currentTime,osc=audio.createOscillator(),amp=audio.createGain(),level=gain*api.volume();osc.type='sine';osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.62,t+duration);amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,level),t+.008);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(amp).connect(audio.destination);
   let delay,tail;if(echo){delay=audio.createDelay(.4);delay.delayTime.value=echo;tail=audio.createGain();tail.gain.value=.32;amp.connect(delay).connect(tail).connect(audio.destination);}osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>setTimeout(()=>{osc.disconnect();amp.disconnect();delay?.disconnect();tail?.disconnect();},400);
  }catch{}
 }
 const unlock=()=>{try{audio||=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();}catch{}};document.addEventListener('pointerdown',unlock,{once:true});
 function completed(task){const n=hash(task.id);tone(440+(n%14)*32,.24,.14);setTimeout(()=>tone(660+(n%9)*38,.3,.09),100);}
 function rebuild(c){
  root.traverse(n=>{n.geometry?.dispose();n.material?.map?.dispose();n.material?.dispose();});root.clear();signs.length=0;
  for(const [i,room]of c.rooms.entries()){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;const ctx=canvas.getContext('2d'),symbols=['◈','✚','⚙','⌁','◉','▦','⬡','⌂'];const label=String(room.label||room.name||room.id),icon=/医|med|lab/i.test(label)?'✚':/電|elect/i.test(label)?'⚡':/酸素|oxygen|O2/i.test(label)?'O₂':/ナビ|操縦|nav|cockpit/i.test(label)?'⌖':/通信|comm/i.test(label)?'⌁':/シールド|shield/i.test(label)?'⬡':/武器|weapon/i.test(label)?'◎':/監視|security/i.test(label)?'◉':/食堂|caf/i.test(label)?'☕':symbols[i%symbols.length];ctx.fillStyle='#0d2334';ctx.fillRect(0,0,512,144);ctx.strokeStyle=room.color||'#9ce4e7';ctx.lineWidth=7;ctx.strokeRect(4,4,504,136);ctx.fillStyle='#e7f8fa';ctx.textAlign='center';ctx.font='bold 31px sans-serif';ctx.fillText(icon+' '+(room.label||room.name),256,55);ctx.font='22px sans-serif';ctx.fillText('設備 '+(i+1)+'  '+(c.tasks.some(t=>api.contains(t.x,t.z,room))?'▣ タスク':'→ 通路'),256,108);
   const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:true});const sign=new THREE.Sprite(material);const center={x:room.x,z:room.z};const door=c.doors.filter(d=>Math.hypot(d.x-center.x,d.z-center.z)<Math.max(room.w||4,room.d||4)).sort((a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z))[0];
   sign.position.set(door?.x??center.x,2.65,door?.z??center.z);sign.scale.set(2.8,.79,1);sign.userData.roomId=room.id;root.add(sign);
   // An overhead room marker leaves walking and interaction geometry untouched.
   const geo=[()=>new THREE.OctahedronGeometry(.27),()=>new THREE.TorusGeometry(.25,.08,6,12),()=>new THREE.BoxGeometry(.4,.4,.4),()=>new THREE.ConeGeometry(.27,.5,5)][i%4]();
   const light=new THREE.MeshStandardMaterial({color:room.color||'#83c9ca',emissive:room.color||'#83c9ca',emissiveIntensity:.45,roughness:.6});const marker=new THREE.Mesh(geo,light);marker.position.set(center.x,2.6,center.z);root.add(marker);signs.push({sign,marker,room,index:i});
  }
 }
 function sync(){
  const c=api.context(),active=c.phase==='play';root.visible=active;if(!active){previous=null;walk=0;if(help){help.remove();help=null;}return;}
  if(map!==c.map){map=c.map;rebuild(c);}
  for(const item of signs){const powered=api.power(item.room);item.sign.material.opacity=powered?1:.3;item.marker.material.emissiveIntensity=powered?.45:0;item.marker.material.color.set(powered?(item.room.color||'#83c9ca'):'#293c48');if(powered&&!api.reduced())item.marker.rotation.y+=.016;}
  const key=c.room+':'+c.round;if(scope!==key){scope=key;done=new Set(Object.keys(c.done||{}).filter(id=>c.done[id]));}else for(const [id,value]of Object.entries(c.done||{}))if(value&&!done.has(id)){done.add(id);completed(c.tasks.find(t=>t.id===id)||{id});}
  if(previous&&c.alive&&!c.blocked){const d=Math.hypot(c.position.x-previous.x,c.position.z-previous.z);if(d<1.5)walk+=d;if(walk>.7&&performance.now()-lastStep>240){walk=0;lastStep=performance.now();const room=c.rooms.find(r=>api.contains(c.position.x,c.position.z,r));tone(room?105+hash(room.id)%45:170,.055,.045,room?.065:.15);}}
  previous={...c.position};
 }
 function showHelp(task,host){
  const key='space-task-first-v1:'+api.uid()+':'+task.id;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch{}
  help?.remove();help=document.createElement('section');help.className='firstTaskHelp';help.setAttribute('aria-label','初めての操作案内');const title=document.createElement('strong');title.textContent='操作の例：'+task.name;const text=document.createElement('p');text.textContent=taskHelpText(task);const demo=document.createElement('div');demo.className='taskMiniDemo';demo.innerHTML='<span>押す</span><i></i><span>動かす・離す</span>';const close=document.createElement('button');close.type='button';close.textContent='やってみる';close.onclick=()=>{help?.remove();help=null;};help.append(title,text,demo,close);host.append(help);
 }
 document.addEventListener('pointerdown',event=>{const stage=event.target.closest?.('#taskMachineStage,#practiceLab [data-stage]');if(!stage||api.reduced())return;const r=stage.getBoundingClientRect(),dot=document.createElement('i');dot.className='taskTouchGlow';dot.style.left=event.clientX-r.left+'px';dot.style.top=event.clientY-r.top+'px';stage.append(dot);setTimeout(()=>dot.remove(),280);},{passive:true});
 return{sync,completed,showHelp};
}
