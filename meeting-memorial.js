import {createRenderBudget} from './render-performance.js';
import './meeting-memorial.css';
import {memorialCameraPose} from './meeting-memorial-layout.js';

// A local, finite presentation; only the host chooses the deceased and duration.
export function createMeetingMemorial(THREE,{host,createCrew,disposeCrew}){
 let stop=()=>{};
 return{play({deaths=[],duration=1500,elapsed=0}){
  stop();
  const panel=document.createElement('section');panel.className=deaths.length?'meetingMemorial':'meetingMemorial meetingMemorialEmpty';panel.setAttribute('aria-label','今回確認された死亡者');
  const heading=document.createElement('h2');heading.textContent=deaths.length?'今回確認された死亡者':'死亡者なし';
  const viewport=document.createElement('div');viewport.className='meetingMemorialView';
  const names=document.createElement('div');names.className='meetingMemorialNames';
  const remaining=document.createElement('p');remaining.className='meetingMemorialTime';remaining.setAttribute('role','timer');
  panel.append(heading,viewport,names,remaining);host.append(panel);
  const originalChildren=[...host.children].filter(n=>n!==panel);for(const node of originalChildren)node.classList.add('memorialCovered');
  if(!deaths.length){
   panel.replaceChildren(heading);const timer=setTimeout(()=>stop(),Math.max(0,duration-elapsed));
   let done=false;stop=()=>{if(done)return;done=true;clearTimeout(timer);panel.remove();for(const n of originalChildren)n.classList.remove('memorialCovered');};return stop;
  }
  const budget=createRenderBudget(),gate=budget.gate(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:!budget.mobile,powerPreference:'low-power'});}catch{
   // A lost WebGL context must not block the meeting or hide the deceased.
   viewport.textContent=deaths.map(p=>p.name).join('　／　');remaining.textContent='会議へ進みます';
   const timer=setTimeout(()=>stop(),Math.max(0,duration-elapsed));let done=false;
   stop=()=>{if(done)return;done=true;clearTimeout(timer);panel.remove();for(const n of originalChildren)n.classList.remove('memorialCovered');};return stop;
  }
  renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);viewport.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,120),geometries=new Set(),materials=new Set(),textures=new Set(),actors=[],graveRoots=[];
  const ownGeometry=g=>(geometries.add(g),g),material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.4,...extra});materials.add(m);return m;};
  const stone=material(0x213548),trim=material(0xb8a879,{metalness:.85,roughness:.28}),glass=material(0x86e7ec,{transparent:true,opacity:.07,depthWrite:false,metalness:.05,side:THREE.DoubleSide}),glow=material(0x8eead7,{emissive:0x45bfa8,emissiveIntensity:.6});
  const box=ownGeometry(new THREE.BoxGeometry(1,1,1));
  const add=(g,m,x,y,z,sx=1,sy=1,sz=1,parent=scene)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;};
  scene.add(new THREE.HemisphereLight(0xd9f5ff,0x263941,2.7));const key=new THREE.DirectionalLight(0xffead5,3);key.position.set(-4,8,6);scene.add(key);const rim=new THREE.DirectionalLight(0x6da9ff,2.3);rim.position.set(3,5,-3);scene.add(rim);
  function nameTag(name,parent){
   const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='800 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#06111c';ctx.lineWidth=7;ctx.strokeText(name,256,48,490);ctx.fillStyle='#f2f9ff';ctx.fillText(name,256,48,490);
   const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);const mat=new THREE.SpriteMaterial({map,depthWrite:false,depthTest:false});materials.add(mat);const sprite=new THREE.Sprite(mat);sprite.position.set(0,2.55,-1.35);sprite.scale.set(2.4,.45,1);parent.add(sprite);
  }
  const silhouette=new THREE.Shape();silhouette.moveTo(-.93,0);silhouette.lineTo(.93,0);silhouette.lineTo(.93,2.9);silhouette.quadraticCurveTo(.93,3.53,0,3.65);silhouette.quadraticCurveTo(-.93,3.53,-.93,2.9);silhouette.closePath();
  const slab=ownGeometry(new THREE.ExtrudeGeometry(silhouette,{depth:.18,bevelEnabled:true,bevelSegments:2,bevelSize:.04,bevelThickness:.03}));
  for(const[order,p]of deaths.entries()){
   const root=new THREE.Group();root.position.x=(order-(deaths.length-1)/2)*2.65;root.name='memorial-'+p.id;scene.add(root);graveRoots.push(root);
   add(box,stone,0,.02,0,2.05,.2,3.2,root);add(box,trim,0,.15,0,1.94,.06,3.08,root);add(slab,stone,0,.2,-1.65,1,.55,1,root);
   for(const side of[-1,1]){add(box,trim,side*.88,1.02,-1.44,.045,1.55,.045,root);add(box,glow,side*.84,1.02,-1.41,.018,1.48,.018,root);}
   add(box,trim,0,1.88,-1.44,.60,.055,.06,root);add(box,trim,0,1.88,-1.44,.055,.37,.07,root);
   const actor=createCrew(p);actors.push(actor);actor.traverse(n=>{if(n.isSprite)n.visible=false;});
   if(actor.userData.petFollower)actor.userData.petFollower.visible=false;
   if(actor.userData.groundShadow)actor.userData.groundShadow.visible=false;
   const aura=actor.getObjectByName('signature-aura');if(aura)aura.visible=false;
   // The deceased rests horizontally on the grave, wearing their own costume.
   actor.rotation.set(-Math.PI/2,0,0);
   // Hidden particle pools can sit hundreds of units away. They are not part
   // of the clothing's dimensions, nor are the name and targeting helpers.
   actor.updateMatrixWorld(true);const bounds=new THREE.Box3();
   actor.traverseVisible(n=>{if(!n.isMesh||!n.geometry)return;for(let p=n;p&&p!==actor;p=p.parent)if(p.name==='signature-aura')return;n.geometry.computeBoundingBox();const b=n.geometry.boundingBox?.clone().applyMatrix4(n.matrixWorld);if(b&&b.min.length()<12&&b.max.length()<12)bounds.union(b);});
   if(bounds.isEmpty())bounds.set(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,2,.5));
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=Math.min(1,1.58/Math.max(1,size.x),2.7/Math.max(1,size.z));actor.scale.multiplyScalar(scale);actor.position.set(-center.x*scale,.22-bounds.min.y*scale,-center.z*scale);root.add(actor);
   nameTag(p.name,root);
   const button=document.createElement('button');button.type='button';button.textContent=p.name;button.onclick=()=>{manual=order;};names.append(button);
  }
  let raf=0,finished=false,manual=null,lastSelected=-1,width=1,height=1;const started=performance.now()-Math.max(0,elapsed);
  function resize(){width=Math.max(1,viewport.clientWidth,deaths.length*200);height=Math.max(1,viewport.clientHeight);renderer.setSize(width,height,false);renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';camera.aspect=width/height;camera.updateProjectionMatrix();const pose=memorialCameraPose(deaths.length,camera.aspect,camera.fov);camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);}
  resize();const observer=new ResizeObserver(resize);observer.observe(viewport);
  const endTimer=setTimeout(()=>stop(),Math.max(0,duration-elapsed));
  stop=()=>{if(finished)return;finished=true;clearTimeout(endTimer);cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',resume);for(const actor of actors){actor.removeFromParent();disposeCrew(actor);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();panel.remove();for(const n of originalChildren)n.classList.remove('memorialCovered');};
  function resume(){if(!finished&&!document.hidden&&!raf){gate.reset();raf=requestAnimationFrame(tick);}}
  function tick(stamp){
   raf=0;if(finished||document.hidden)return;
   const age=stamp-started;if(age>=duration){stop();return;}raf=requestAnimationFrame(tick);if(!gate.due(stamp))return;
   const current=Math.min(deaths.length-1,Math.floor(age/Math.max(1,duration/deaths.length))),selected=manual??current;
   // Keep every grave in the same horizontal row. Narrow screens scroll the
   // canvas instead of shrinking the skins or replacing the row with a carousel.

   if(selected!==lastSelected){lastSelected=selected;viewport.scrollTo({left:Math.max(0,(selected+.5)*width/deaths.length-viewport.clientWidth/2),behavior:reduced?'instant':'smooth'});}
   for(const[i,root]of graveRoots.entries())root.position.y=reduced?0:Math.sin(stamp*.0008+i)*.015;
   for(const actor of actors)actor.userData.costumeRoot?.userData.updateGiftSkin?.(stamp*.001,{moving:false,jumping:false});
   for(const[i,node]of [...names.children].entries()){node.classList.toggle('selected',i===selected);node.setAttribute('aria-pressed',String(i===selected));}
   remaining.textContent=deaths.length+'人 ／ あと'+Math.ceil((duration-age)/1000)+'秒';renderer.render(scene,camera);
  }
  document.addEventListener('visibilitychange',resume);raf=requestAnimationFrame(tick);return stop;
 },dispose(){stop();}};
}
