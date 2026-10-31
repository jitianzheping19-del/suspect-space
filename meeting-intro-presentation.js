import {createRenderBudget} from './render-performance.js';
import './meeting-intro-presentation.css';

// A short, local presentation. It never advances the meeting or writes game state.
export function createMeetingIntroPresentation(THREE,{host,createCrew,disposeCrew}){
 let stop=()=>{},renderer=null;const warmed=[],preparations=new Map();
 function play({reporter,body,report,duration=3000,elapsed=0,preparing=false}){
  if(!preparing)stop();
  const budget=createRenderBudget(),gate=budget.gate(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,60);
  renderer ||= new THREE.WebGLRenderer({alpha:true,antialias:!budget.mobile,powerPreference:'low-power'});
  if(budget.syncRenderer)budget.syncRenderer(renderer,1);else renderer.setPixelRatio(budget.pixelRatio(1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);
  renderer.domElement.className='meetingIntroCanvas';
  if(!preparing)host.insertBefore(renderer.domElement,host.querySelector('.effectSub'));
  const geometries=new Set(),materials=new Set(),textures=new Set(),actors=[];
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  function mat(c,glow=false){const m=glow?new THREE.MeshBasicMaterial({color:c,toneMapped:false}):new THREE.MeshStandardMaterial({color:c,metalness:.55,roughness:.4});materials.add(m);return m;}
  function mesh(g,m,x=0,y=0,z=0,parent=scene){geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
  function nameTag(text,color=0xf4f8ff){
   const c=document.createElement('canvas');c.width=768;c.height=96;const g=c.getContext('2d');g.font='800 58px sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=10;g.strokeStyle='#07121b';g.strokeText(text,384,48,738);g.fillStyle='#'+new THREE.Color(color).getHexString();g.fillText(text,384,48,738);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
   const material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false});materials.add(material);
   const s=new THREE.Sprite(material);s.scale.set(2.65,.331,1);s.renderOrder=30;scene.add(s);return s;
  }
  scene.add(new THREE.HemisphereLight(0xceeafa,0x26384c,2.6));
  const light=new THREE.DirectionalLight(0xffdfcb,3.5);light.position.set(-4,7,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0xff516a,3);rim.position.set(4,3,-3);scene.add(rim);
  function ownCompanion(crew){const pet=crew.userData.petFollower;if(pet){crew.add(pet);pet.position.set(-.65,.15,-.35);pet.rotation.set(0,0,0);}}
  const actor=createCrew(reporter);actors.push(actor);ownCompanion(actor);actor.traverse(o=>{if(o.isSprite)o.visible=false;});scene.add(actor);actor.scale.multiplyScalar(1.16);
  const tag=nameTag(reporter.name||'クルー'),dark=mat(0x152b3d),steel=mat(0x879aa7),red=mat(0xd93c58),shine=mat(0xffc29a,true);
  const platform=mesh(new THREE.CylinderGeometry(4.8,4.8,.10,48),dark,0,-.08,0);
  const rings=[0,1,2].map(i=>{
   const m=mat(i===1?0xffcf9e:0xff586e,true);m.transparent=true;m.depthWrite=false;
   const o=mesh(new THREE.TorusGeometry(1,.035,6,48),m,0,.018+i*.006,0);o.rotation.x=-Math.PI/2;return o;
  });
  let corpse,corpseTag,button,alarm,hand;
  if(report){
   corpse=createCrew(body||{});actors.push(corpse);ownCompanion(corpse);if(corpse.userData.petFollower)corpse.userData.petFollower.visible=false;corpse.traverse(o=>{if(o.isSprite)o.visible=false;});corpse.rotation.set(0,.2,-Math.PI/2);corpse.position.set(.55,.42,.18);scene.add(corpse);
   corpseTag=nameTag(body?.name||'クルー',0xffb8c3);corpseTag.position.set(1.5,1.45,.18);
   mesh(new THREE.CylinderGeometry(.11,.095,.42,12),actor.userData.suit||steel,0,-.21,0,actor.userData.arms?.[1]||actor);
   hand=mesh(new THREE.SphereGeometry(.18,16,12),actor.userData.suit||steel,0,-.42,0,actor.userData.arms?.[1]||actor);hand.scale.set(1,.7,1.15);
   alarm=nameTag('!',0xffdf81);alarm.scale.set(.95,1.15,1);alarm.visible=false;
  }else{
   // Large button, guard corners and a visible depressible red cap.
   mesh(new THREE.CylinderGeometry(.70,.88,.52,32),steel,.22,.26,0);
   mesh(new THREE.CylinderGeometry(.65,.65,.10,32),dark,.22,.57,0);
   button=mesh(new THREE.CylinderGeometry(.46,.50,.25,32),red,.22,.75,0);
   mesh(new THREE.TorusGeometry(.57,.045,6,40),shine,.22,.65,0).rotation.x=Math.PI/2;
   for(const side of[-1,1])for(const end of[-1,1])mesh(new THREE.BoxGeometry(.12,.12,.12),shine,.22+side*.49,.63,end*.49);
   mesh(new THREE.CylinderGeometry(.11,.095,.42,12),actor.userData.suit||steel,0,-.21,0,actor.userData.arms?.[1]||actor);
   hand=mesh(new THREE.SphereGeometry(.18,16,12),actor.userData.suit||steel,0,-.42,0,actor.userData.arms?.[1]||actor);hand.scale.set(1,.7,1.15);
  }
  const sparkPositions=new Float32Array(28*3),sparkGeo=new THREE.BufferGeometry();geometries.add(sparkGeo);sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3).setUsage(THREE.DynamicDrawUsage));
  const sparkMat=new THREE.PointsMaterial({color:0xffd19b,size:.065,transparent:true,depthWrite:false,toneMapped:false});materials.add(sparkMat);
  const sparks=new THREE.Points(sparkGeo,sparkMat);sparks.frustumCulled=false;scene.add(sparks);
  const down=new THREE.Vector3(0,-1,0),aim=new THREE.Vector3(),hit=new THREE.Vector3(),quaternion=new THREE.Quaternion();
  const shoulder=actor.userData.arms?.[1],shoulderRest=shoulder?.quaternion.clone(),shoulderRestScale=shoulder?.scale.clone();
  // Use actual costume bounds so tall hats do not crop or cover the name.
  actor.updateMatrixWorld(true);
  const actorBounds=new THREE.Box3().setFromObject(actor),tagHeight=Math.max(2.55,Math.min(4.2,actorBounds.max.y+.20));
  const framingHeight=tagHeight+(report?1.5:.45);
  const focus=new THREE.Vector3(report?.10:-.1,framingHeight*.5-.05,0);
  let cameraDistance=8,raf=0,finished=false;
  function resize(){
   const w=preparing?256:Math.max(1,host.clientWidth),h=preparing?160:Math.max(1,Math.min(innerHeight*.62,500));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
   // Dolly toward the actors, with a fit bound on narrow windows.
   cameraDistance=Math.max(framingHeight/(2*Math.tan(16*Math.PI/180)),(report?6.8:4.6)/(2*Math.tan(16*Math.PI/180)*camera.aspect));
  }
  resize();if(!preparing)window.addEventListener('resize',resize);
  const started=performance.now()-Math.max(0,Number(elapsed)||0),impactAt=report?1.02:.92;
  const cleanup=()=>{
   if(finished)return;finished=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',resume);window.removeEventListener('resize',resize);
   for(const actor of actors){actor.removeFromParent();disposeCrew(actor);}
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());if(!preparing)renderer?.domElement.remove();
  };
  function resume(){if(!finished&&!document.hidden&&!raf){gate.reset();raf=requestAnimationFrame(tick);}}
  if(!preparing)document.addEventListener('visibilitychange',resume);
  function tick(stamp){
   raf=0;if(finished||(!preparing&&document.hidden))return;
   const t=(stamp-started)/1000;if(t>duration/1000){cleanup();return;}
   if(!preparing)raf=requestAnimationFrame(tick);if(!gate.due(stamp))return;
   const impact=Math.max(0,t-impactAt),reveal=smooth((t-impactAt)/.16),decay=Math.exp(-impact*10);
   if(report){
    // Fast approach, planted stop, backward recoil, then a clear pointing pose.
    const walk=smooth(t/.88),point=smooth((t-1.35)/.35),stride=reduced?0:Math.sin(t*27)*(1-walk);
    actor.position.set(-3.55+2.90*walk,.11*Math.abs(stride),0);actor.rotation.set(0,Math.PI/2-.25*smooth((t-1.3)/.4),0);
    for(const[i,leg]of(actor.userData.legs||[]).entries())leg.rotation.x=(i?1:-1)*stride*.65;
    const recoil=smooth((t-.96)/.16)*(1-smooth((t-1.24)/.35));
    actor.position.x-=recoil*.48;actor.position.y+=recoil*(reduced?0:.23)-point*.11;actor.rotation.x=-recoil*.32;actor.rotation.z=recoil*.17-point*.13;
    for(const[i,leg]of(actor.userData.legs||[]).entries())leg.rotation.x+=(i?.35:-.28)*point;
    if(shoulder)shoulder.scale.copy(shoulderRestScale);
    for(const[i,arm]of(actor.userData.arms||[]).entries()){arm.rotation.x=-recoil*(i?2:1.2)-(i?smooth((t-1.35)/.3)*1.1:0);arm.rotation.z=(i?-1:1)*recoil*.45;}
    if(shoulder&&point>0){
     actor.updateMatrixWorld(true);aim.set(.60,.72,.18);actor.worldToLocal(aim);aim.sub(shoulder.position);const reach=aim.length();aim.normalize();quaternion.setFromUnitVectors(down,aim);
     shoulder.quaternion.slerp(quaternion,point);shoulder.scale.y=shoulderRestScale.y+(reach/.42-shoulderRestScale.y)*point;hand.scale.y=.7/Math.max(.01,shoulder.scale.y);
    }
    alarm.visible=t>.98;const pop=reduced?1:1+.27*Math.exp(-Math.max(0,t-1.04)*8);alarm.scale.set(.95*pop,1.15*pop,1);alarm.position.set(actor.position.x-.10,tagHeight+.65,0);
   }else{
    actor.position.set(-.48-.30*(1-smooth(t/.30)),0,.04);actor.rotation.set(0,Math.PI/2,0);
    // Hold the fist clearly above the head, then accelerate into contact.
    const windup=smooth((t-.10)/.42),strike=Math.pow(smooth((t-.72)/.20),2),recover=smooth((t-1.22)/.38);
    const raised=windup*(1-strike),press=smooth((t-impactAt)/.065)*(1-recover);
    actor.position.x+=strike*(1-recover)*.20-raised*.12;actor.position.y=raised*.12-press*.07;
    actor.rotation.z=raised*.16-strike*(1-recover)*.16;
    if(shoulder){
     shoulder.quaternion.copy(shoulderRest);shoulder.scale.copy(shoulderRestScale);actor.updateMatrixWorld(true);
     const lift=new THREE.Vector3(actor.position.x-.30,2.25+raised*.22,.02);
     hit.set(.22,.75+.125-press*.19+.126,0);
     // The palm's lower surface meets the cap, including its depressed height.
     const target=new THREE.Vector3().lerpVectors(lift,hit,strike);
     if(t<.72){const rest=shoulder.localToWorld(new THREE.Vector3(0,-.42,0));target.lerpVectors(rest,lift,windup);}
     if(recover>0)target.lerp(new THREE.Vector3(actor.position.x+.18,1.25,.04),recover);
     actor.worldToLocal(aim.copy(target));aim.sub(shoulder.position);const reach=aim.length();aim.normalize();quaternion.setFromUnitVectors(down,aim);
     shoulder.quaternion.copy(quaternion);shoulder.scale.y=reach/.42;
     // Keep the glove solid while its arm reaches the button.
     hand.scale.y=.7/Math.max(.01,shoulder.scale.y);
    }
    const rebound=reduced?0:(t>1.22?Math.sin((t-1.22)*22)*Math.exp(-(t-1.22)*9)*.026:0);
    button.position.y=.75-press*.19+rebound;button.material.color.setHex(t>impactAt?0xff667b:0xd93c58);
    for(const[i,leg]of(actor.userData.legs||[]).entries())leg.rotation.x=(i?-.1:.12)*press;
   }
   actor.updateMatrixWorld(true);tag.position.set(actor.position.x,tagHeight+actor.position.y,actor.position.z);tag.scale.x=2.65;
   const centerX=report?1.1:.22;
   rings.forEach((ring,i)=>{const u=(impact-i*.10)/.70;ring.visible=u>=0&&u<1&&!reduced;if(ring.visible){ring.position.x=centerX;ring.scale.setScalar(.50+u*3.7);ring.material.opacity=(1-u)*.80;}});
   sparks.visible=!reduced&&t>=impactAt&&impact<.68;sparkMat.opacity=Math.max(0,1-impact/.68);
   if(sparks.visible){for(let i=0;i<28;i++){const a=i*2.39996,speed=1.3+i%4*.55,k=i*3;sparkPositions[k]=centerX+Math.cos(a)*speed*impact;sparkPositions[k+1]=(report?.3:.7)+(.6+i%5*.3)*impact-2.8*impact*impact;sparkPositions[k+2]=Math.sin(a)*speed*impact;}sparkGeo.attributes.position.needsUpdate=true;}
   // One directional impact, not a repeated screen shake or strobe.
   const kick=!reduced&&t>=impactAt?decay*.10:0,dolly=reduced?0:smooth(t/.75)*.16+reveal*.24;
   const arc=reduced?0:(1-smooth(t/1.15))*(report?.55:-.45);
   camera.position.set((report?-.20:.15)+arc,focus.y+2.0+kick,cameraDistance+.9-dolly);camera.lookAt(report?aim.copy(focus).add(new THREE.Vector3(smooth((t-1.3)/.5)*.18,-smooth((t-1.3)/.5)*.12,0)):focus);budget.syncRenderer?.(renderer);renderer.render(scene,camera);
  }
  if(preparing){
   warmed.push(cleanup);
   return Promise.resolve().then(()=>renderer?.compileAsync?.(scene,camera)).then(()=>{if(!finished&&!renderer.domElement.isConnected)tick(started);}).catch(error=>{cleanup();const index=warmed.indexOf(cleanup);if(index>=0)warmed.splice(index,1);throw error;});
  }
  stop=cleanup;raf=requestAnimationFrame(tick);return cleanup;
 }
 return{play,prepare(options){const key=Boolean(options.report);if(!preparations.has(key))preparations.set(key,play({...options,preparing:true}).catch(error=>{preparations.delete(key);throw error;}));return preparations.get(key);},stop:()=>stop(),dispose(){stop();preparations.clear();warmed.splice(0).forEach(cleanup=>cleanup());renderer?.dispose();renderer?.forceContextLoss();renderer=null;}};
}
