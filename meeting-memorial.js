import {createRenderBudget} from './render-performance.js';
import './meeting-memorial.css';
import {memorialCameraPose} from './meeting-memorial-layout.js';

// A local presentation on the host's existing timeline. No game-state writes.
export function createMeetingMemorial(THREE,{host,createCrew,disposeCrew}){
 let stop=()=>{};
 return{play({deaths=[],duration=1500,elapsed=0}){
  stop();
  const started=performance.now()-Math.max(0,Number(elapsed)||0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const budget=createRenderBudget(),gate=budget.gate();
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
  const panel=document.createElement('section');
  panel.className=deaths.length?'meetingMemorial':'meetingMemorial meetingMemorialEmpty';
  panel.dataset.presentation='ceremony';panel.setAttribute('aria-label','今回確認された死亡者');
  const header=document.createElement('header');header.className='meetingMemorialHeader';
  const heading=document.createElement('h2');heading.textContent=deaths.length?'死亡者':'死亡者なし';
  const count=document.createElement('span');count.className='meetingMemorialCount';count.textContent=deaths.length+'人';
  header.append(heading,count);
  const viewport=document.createElement('div');viewport.className='meetingMemorialView';
  const names=document.createElement('div');names.className='meetingMemorialNames';names.setAttribute('aria-label','死亡者を選択');
  const progress=document.createElement('div');progress.className='meetingMemorialProgress';
  progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','会議開始まで');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');
  const progressFill=document.createElement('span');progress.append(progressFill);
  panel.append(header,viewport,names,progress);
  const originalChildren=[...host.children];for(const node of originalChildren)node.classList.add('memorialCovered');
  host.append(panel);host.dataset.memorialActive='true';
  let raf=0,endTimer=0,finished=false,renderer=null,observer=null,scene=null,camera=null,key=null;
  let manual=null,follow=true,lastSelected=-1,lastSecond=-1,lastFrame=performance.now(),width=0,height=0,cameraPose=null;
  const geometries=new Set(),materials=new Set(),textures=new Set(),actors=[],items=[],buttons=[];
  const ownGeometry=g=>(geometries.add(g),g);
  function material(color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.46,metalness:.38,...extra});materials.add(m);return m;}
  function mesh(geometry,mat,parent,position=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geometry,mat);m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;}
  function hueColor(value){const h=Number(value)||0;return Math.abs(h-.999)<1e-6?'#f0f3f5':Math.abs(h-.998)<1e-6?'#535c68':'#'+new THREE.Color().setHSL(h,.58,.60).getHexString();}
  function releaseGpu(){
   observer?.disconnect();observer=null;window.removeEventListener('resize',resize);
   if(renderer)renderer.domElement.removeEventListener('webglcontextlost',contextLost);
   for(const actor of actors){actor.removeFromParent();disposeCrew(actor);}actors.length=0;
   for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
   geometries.clear();materials.clear();textures.clear();items.length=0;
   if(renderer){renderer.domElement.remove();renderer.dispose();renderer.forceContextLoss();renderer=null;}
   scene=null;camera=null;
  }
  stop=()=>{
   if(finished)return;finished=true;clearTimeout(endTimer);cancelAnimationFrame(raf);
   document.removeEventListener('visibilitychange',resume);reduced.removeEventListener('change',motionChanged);
   releaseGpu();panel.remove();delete host.dataset.memorialActive;
   for(const node of originalChildren)node.classList.remove('memorialCovered');
  };
  const finishOnTime=()=>{endTimer=setTimeout(stop,Math.max(0,duration-(performance.now()-started)));};
  if(!deaths.length){panel.replaceChildren(heading);finishOnTime();return stop;}

  for(const [index,person]of deaths.entries()){
   const button=document.createElement('button');button.type='button';button.textContent=person.name||'クルー';
   button.style.setProperty('--memorial-suit',hueColor(person.hue));button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>{manual=index;follow=true;lastSelected=-1;});
   names.append(button);buttons.push(button);
  }
  viewport.addEventListener('pointerdown',()=>{follow=false;},{passive:true});
  viewport.addEventListener('wheel',()=>{follow=false;},{passive:true});

  function showFallback(){
   releaseGpu();panel.dataset.memorialRenderer='2d';viewport.replaceChildren();lastSelected=-1;
   for(const person of deaths){
    const card=document.createElement('div');card.className='meetingMemorialPortrait';
    card.style.setProperty('--memorial-suit',hueColor(person.hue));
    const stone=document.createElement('span');stone.className='meetingMemorialStone';stone.setAttribute('aria-hidden','true');
    const name=document.createElement('strong');name.textContent=person.name||'クルー';card.append(stone,name);viewport.append(card);
   }
  }
  function contextLost(event){event.preventDefault();if(!finished)showFallback();}
  function roundedPlate(w,h,depth,radius){
   const s=new THREE.Shape(),x=-w/2,y=-h/2,r=radius;
   s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
   s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
   return ownGeometry(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.015,curveSegments:6,steps:1}));
  }
  function nameTag(person,parent){
   const c=document.createElement('canvas');c.width=640;c.height=104;const ctx=c.getContext('2d');
   ctx.fillStyle='#0b131ce8';ctx.strokeStyle='#d6c5a65c';ctx.lineWidth=2;ctx.beginPath();
   if(ctx.roundRect)ctx.roundRect(4,5,632,94,22);else ctx.rect(4,5,632,94);ctx.fill();ctx.stroke();
   ctx.fillStyle=hueColor(person.hue);ctx.beginPath();ctx.arc(37,52,8,0,Math.PI*2);ctx.fill();
   let text=String(person.name||'クルー'),size=44;
   do{ctx.font=`600 ${size}px system-ui,sans-serif`;if(ctx.measureText(text).width<=530)break;size-=2;}while(size>28);
   if(ctx.measureText(text).width>530){const chars=Array.from(text);while(chars.length&&ctx.measureText(chars.join('')+'…').width>530)chars.pop();text=chars.join('')+'…';}
   ctx.fillStyle='#f1ece2';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,340,53,530);
   const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);
   const mat=new THREE.SpriteMaterial({map,depthWrite:false,depthTest:false,transparent:true});materials.add(mat);
   const sprite=new THREE.Sprite(mat);sprite.position.set(0,2.55,-1.35);sprite.scale.set(2.4,.39,1);sprite.renderOrder=30;parent.add(sprite);return sprite;
  }
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:!budget.mobile,powerPreference:'low-power'});
   if(budget.syncRenderer)budget.syncRenderer(renderer,1);else renderer.setPixelRatio(budget.pixelRatio(1));
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);
   renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',contextLost);viewport.append(renderer.domElement);
   scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.1,160);
   scene.add(new THREE.HemisphereLight(0xc7d9ed,0x1d2532,2));
   key=new THREE.DirectionalLight(0xffe7bf,3);key.position.set(-4,8,6);scene.add(key);
   const rim=new THREE.DirectionalLight(0x829dc4,1.9);rim.position.set(3,5,-3);scene.add(rim);
   const stone=material(0x25303d),trim=material(0xb8a585,{metalness:.55,roughness:.34}),bed=material(0x111c28,{metalness:.12,roughness:.8});
   const box=ownGeometry(new THREE.BoxGeometry(1,1,1)),plane=ownGeometry(new THREE.PlaneGeometry(1,1));
   const base=roundedPlate(2.05,3.2,.14,.15),rimPlate=roundedPlate(1.94,3.08,.035,.13),inset=roundedPlate(1.76,2.90,.045,.11);
   const floor=mesh(plane,material(0x0c1420,{roughness:1,metalness:0}),scene,[0,-.15,0],[deaths.length*2.65+2,5.7,1]);floor.rotation.x=-Math.PI/2;
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');
   const gradient=ctx.createRadialGradient(64,64,12,64,64,63);gradient.addColorStop(0,'rgba(0,0,0,.7)');gradient.addColorStop(.5,'rgba(0,0,0,.32)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
   const shadowMap=new THREE.CanvasTexture(shadowCanvas);textures.add(shadowMap);
   const shadowMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,toneMapped:false});materials.add(shadowMat);
   const silhouette=new THREE.Shape();silhouette.moveTo(-.93,0);silhouette.lineTo(.93,0);silhouette.lineTo(.93,2.9);silhouette.quadraticCurveTo(.93,3.53,0,3.65);silhouette.quadraticCurveTo(-.93,3.53,-.93,2.9);silhouette.closePath();
   const slab=ownGeometry(new THREE.ExtrudeGeometry(silhouette,{depth:.18,bevelEnabled:true,bevelSegments:2,bevelSize:.04,bevelThickness:.03}));
   for(const [order,person]of deaths.entries()){
    const root=new THREE.Group();root.position.x=(order-(deaths.length-1)/2)*2.65;root.name='memorial-'+person.id;scene.add(root);
    const shadow=mesh(plane,shadowMat,scene,[root.position.x,-.14,0],[2.7,4.3,1]);shadow.rotation.x=-Math.PI/2;
    for(const [geometry,mat,y]of [[base,stone,-.06],[rimPlate,trim,.10],[inset,bed,.15]])mesh(geometry,mat,root,[0,y,0]).rotation.x=-Math.PI/2;
    mesh(slab,stone,root,[0,.2,-1.65],[1,.55,1]);
    const accent=material(0xe3d2ad,{emissive:0xcbb485,emissiveIntensity:.14,metalness:.25});
    for(const side of[-1,1]){
     mesh(box,trim,root,[side*.88,1.02,-1.44],[.045,1.55,.045]);mesh(box,accent,root,[side*.84,1.02,-1.41],[.018,1.48,.018]);
     mesh(box,accent,root,[side*.93,.15,0],[.018,.018,2.84]);
    }
    mesh(box,trim,root,[0,1.88,-1.44],[.60,.055,.06]);mesh(box,trim,root,[0,1.88,-1.44],[.055,.37,.07]);
    const actor=createCrew(person);actors.push(actor);actor.traverse(n=>{if(n.isSprite)n.visible=false;});
    if(actor.userData.petFollower)actor.userData.petFollower.visible=false;
    if(actor.userData.groundShadow)actor.userData.groundShadow.visible=false;
    const aura=actor.getObjectByName('signature-aura');if(aura)aura.visible=false;
    actor.rotation.set(-Math.PI/2,0,0);actor.updateMatrixWorld(true);const bounds=new THREE.Box3();
    actor.traverseVisible(n=>{if(!n.isMesh||!n.geometry)return;for(let parent=n;parent&&parent!==actor;parent=parent.parent)if(parent.name==='signature-aura')return;n.geometry.computeBoundingBox();const b=n.geometry.boundingBox?.clone().applyMatrix4(n.matrixWorld);if(b&&b.min.length()<12&&b.max.length()<12)bounds.union(b);});
    if(bounds.isEmpty())bounds.set(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,2,.5));
    const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=Math.min(1,1.58/Math.max(1,size.x),2.7/Math.max(1,size.z));
    actor.scale.multiplyScalar(scale);actor.position.set(-center.x*scale,.24-bounds.min.y*scale,-center.z*scale);root.add(actor);
    items.push({root,accent,label:nameTag(person,root),focus:0,actor,shadow});
   }
   resize();if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(viewport);}window.addEventListener('resize',resize);
  }catch(error){console.warn('死亡者の紹介を通常表示へ切り替えました',error);showFallback();}

  function resize(){
   if(!renderer)return;
   const w=Math.max(1,viewport.clientWidth,deaths.length*210),h=Math.max(1,viewport.clientHeight);
   if(w===width&&h===height)return;width=w;height=h;
   renderer.setSize(width,height,false);renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';
   camera.aspect=width/height;camera.updateProjectionMatrix();cameraPose=memorialCameraPose(deaths.length,camera.aspect,camera.fov);
   lastSelected=-1;
  }
  function draw(stamp){
   const age=Math.max(0,stamp-started),quiet=reduced.matches,entry=quiet?1:smooth(age/520),exit=quiet?1:smooth((duration-age)/220);
   panel.style.setProperty('--memorial-opacity',String(entry*exit));
   progressFill.style.transform=`scaleX(${Math.max(0,1-age/duration)})`;
   const seconds=Math.max(0,Math.ceil((duration-age)/1000));if(seconds!==lastSecond){lastSecond=seconds;progress.setAttribute('aria-valuenow',String(Math.max(0,Math.round(100*(1-age/duration)))));progress.setAttribute('aria-valuetext','残り'+seconds+'秒');}
   const lead=Math.min(500,duration*.16),tail=Math.min(260,duration*.08),span=Math.max(1,duration-lead-tail);
   const selected=manual??Math.min(deaths.length-1,Math.floor(Math.max(0,age-lead)/span*deaths.length));
   if(selected!==lastSelected){
    lastSelected=selected;
    for(const [i,button]of buttons.entries()){button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));}
    const portraits=[...viewport.querySelectorAll('.meetingMemorialPortrait')];portraits.forEach((card,i)=>card.classList.toggle('selected',i===selected));
    if(follow){const card=portraits[selected],left=card?card.offsetLeft+card.offsetWidth/2:(selected+.5)*width/deaths.length;viewport.scrollTo({left:Math.max(0,left-viewport.clientWidth/2),behavior:quiet?'instant':'smooth'});}
    const button=buttons[selected];names.scrollTo({left:Math.max(0,button.offsetLeft+button.offsetWidth/2-names.clientWidth/2),behavior:quiet?'instant':'smooth'});
   }
   const dt=Math.min(.1,Math.max(0,(stamp-lastFrame)/1000));lastFrame=stamp;
   if(!renderer)return;
   const pose=cameraPose,dolly=quiet?1:1+.035*(1-smooth(age/1000));
   camera.position.set(pose.target.x+(pose.x-pose.target.x)*dolly,pose.target.y+(pose.y-pose.target.y)*dolly,pose.target.z+(pose.z-pose.target.z)*dolly);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
   key.intensity=2.1+entry*.9;
   items.forEach((item,i)=>{
    const reveal=quiet?1:smooth((age-Math.min(i*85,340))/650);
    item.root.position.y=quiet?0:-.12*(1-reveal);item.focus+=((i===selected?1:0)-item.focus)*(quiet?1:1-Math.exp(-dt*7));
    item.accent.emissiveIntensity=.12+reveal*.10+item.focus*.48;
    item.shadow.visible=!budget.ultraLight&&globalThis.__spaceRenderShadowsEnabled!==false;
    item.label.material.opacity=(quiet?1:smooth((age-Math.min(i*85,340)-120)/400))*(.78+item.focus*.22);
    if(Math.abs(i-selected)<=1)item.actor.userData.costumeRoot?.userData.updateGiftSkin?.(stamp*.001,{moving:false,jumping:false});
   });
   budget.syncRenderer?.(renderer);renderer.render(scene,camera);
  }
  function tick(stamp){
   raf=0;if(finished||document.hidden)return;if(stamp-started>=duration){stop();return;}
   if(gate.due(stamp)){try{draw(stamp);}catch(error){console.warn('死亡者の紹介を通常表示へ切り替えました',error);showFallback();}}
   raf=requestAnimationFrame(tick);
  }
  function resume(){if(!finished&&!document.hidden&&!raf){gate.reset();lastFrame=performance.now();raf=requestAnimationFrame(tick);}}
  function motionChanged(){if(!finished){lastSelected=-1;resume();}}
  document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',motionChanged);
  // Paint immediately so short presentations do not spend their first beat blank.
  try{draw(performance.now());}catch{showFallback();}
  finishOnTime();resume();return stop;
 },dispose(){stop();}};
}
