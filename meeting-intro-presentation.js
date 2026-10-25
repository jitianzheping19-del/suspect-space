import {createRenderBudget} from './render-performance.js';
import './meeting-intro-presentation.css';

// A short, local presentation. It never advances the meeting or writes game state.
export function createMeetingIntroPresentation(THREE,{host,createCrew,disposeCrew}){
 let stop=()=>{};
 return{play({reporter,body,report,duration=3000}){
  stop();
  const budget=createRenderBudget(),gate=budget.gate(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,60);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:!budget.mobile,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);
  renderer.domElement.className='meetingIntroCanvas';
  host.insertBefore(renderer.domElement,host.querySelector('.effectSub'));
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
  let corpse,corpseTag,button,alarm;
  if(report){
   corpse=createCrew(body||{});actors.push(corpse);ownCompanion(corpse);if(corpse.userData.petFollower)corpse.userData.petFollower.visible=false;corpse.traverse(o=>{if(o.isSprite)o.visible=false;});corpse.rotation.set(0,.2,-Math.PI/2);corpse.position.set(.55,.42,.18);scene.add(corpse);
   corpseTag=nameTag(body?.name||'クルー',0xffb8c3);corpseTag.position.set(1.5,1.45,.18);
   alarm=nameTag('!',0xffdf81);alarm.scale.set(.95,1.15,1);alarm.visible=false;
  }else{
   // Large button, guard corners and a visible depressible red cap.
   mesh(new THREE.CylinderGeometry(.70,.88,.52,32),steel,.22,.26,0);
   mesh(new THREE.CylinderGeometry(.65,.65,.10,32),dark,.22,.57,0);
   button=mesh(new THREE.CylinderGeometry(.46,.50,.25,32),red,.22,.75,0);
   mesh(new THREE.TorusGeometry(.57,.045,6,40),shine,.22,.65,0).rotation.x=Math.PI/2;
   for(const side of[-1,1])for(const end of[-1,1])mesh(new THREE.BoxGeometry(.12,.12,.12),shine,.22+side*.49,.63,end*.49);
   const hand=mesh(new THREE.SphereGeometry(.135,12,8),actor.userData.suit||steel,0,-.43,0,actor.userData.arms?.[1]||actor);
  }
  const sparkPositions=new Float32Array(28*3),sparkGeo=new THREE.BufferGeometry();geometries.add(sparkGeo);sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3).setUsage(THREE.DynamicDrawUsage));
  const sparkMat=new THREE.PointsMaterial({color:0xffd19b,size:.065,transparent:true,depthWrite:false,toneMapped:false});materials.add(sparkMat);
  const sparks=new THREE.Points(sparkGeo,sparkMat);sparks.frustumCulled=false;scene.add(sparks);
  const down=new THREE.Vector3(0,-1,0),aim=new THREE.Vector3(),hit=new THREE.Vector3(),quaternion=new THREE.Quaternion();
  const shoulder=actor.userData.arms?.[1],shoulderRest=shoulder?.quaternion.clone();
  // Use actual costume bounds so tall hats do not crop or cover the name.
  actor.updateMatrixWorld(true);
  const actorBounds=new THREE.Box3().setFromObject(actor),tagHeight=Math.max(2.55,Math.min(4.2,actorBounds.max.y+.20));
  const framingHeight=tagHeight+(report?1.5:.45);
  const focus=new THREE.Vector3(report?.10:-.1,framingHeight*.5-.05,0);
  let cameraDistance=8,raf=0,finished=false;
  function resize(){
   const w=Math.max(1,host.clientWidth),h=Math.max(1,Math.min(innerHeight*.62,500));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
   // Dolly toward the actors, with a fit bound on narrow windows.
   cameraDistance=Math.max(framingHeight/(2*Math.tan(16*Math.PI/180)),(report?6.8:4.6)/(2*Math.tan(16*Math.PI/180)*camera.aspect));
  }
  resize();window.addEventListener('resize',resize);
  const started=performance.now(),impactAt=report?1.02:.86;
  stop=()=>{
   if(finished)return;finished=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',resume);window.removeEventListener('resize',resize);
   for(const actor of actors){actor.removeFromParent();disposeCrew(actor);}
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  };
  function resume(){if(!finished&&!document.hidden&&!raf){gate.reset();raf=requestAnimationFrame(tick);}}
  document.addEventListener('visibilitychange',resume);
  function tick(stamp){
   raf=0;if(finished||document.hidden)return;
   const t=(stamp-started)/1000;if(t>duration/1000){stop();return;}
   raf=requestAnimationFrame(tick);if(!gate.due(stamp))return;
   const impact=Math.max(0,t-impactAt),reveal=smooth((t-impactAt)/.16),decay=Math.exp(-impact*10);
   if(report){
    // Fast approach, planted stop, backward recoil, then a clear pointing pose.
    const walk=smooth(t/.94),stride=reduced?0:Math.sin(t*23)*(1-walk);
    actor.position.set(-3.3+2.65*walk,.06*Math.abs(stride),0);actor.rotation.set(0,Math.PI/2-.25*smooth((t-1.3)/.4),0);
    for(const[i,leg]of(actor.userData.legs||[]).entries())leg.rotation.x=(i?1:-1)*stride*.65;
    const recoil=smooth((t-.96)/.16)*(1-smooth((t-1.24)/.35));
    actor.position.x-=recoil*.32;actor.position.y+=recoil*(reduced?0:.16);actor.rotation.x=-recoil*.20;
    for(const[i,arm]of(actor.userData.arms||[]).entries()){arm.rotation.x=-recoil*(i?2:1.2)-(i?smooth((t-1.35)/.3)*1.1:0);arm.rotation.z=(i?-1:1)*recoil*.45;}
    alarm.visible=t>.98;const pop=reduced?1:1+.27*Math.exp(-Math.max(0,t-1.04)*8);alarm.scale.set(.95*pop,1.15*pop,1);alarm.position.set(actor.position.x-.10,tagHeight+.65,0);
   }else{
    actor.position.set(-.65-.22*(1-smooth(t/.26)),0,.04);actor.rotation.set(0,Math.PI/2,0);
    const windup=smooth((t-.1)/.3)*(1-smooth((t-.60)/.22)),press=smooth((t-.66)/.20)*(1-smooth((t-1.12)/.35));
    actor.position.x+=press*.14;actor.rotation.x=-press*.12;
    if(shoulder){
     shoulder.quaternion.copy(shoulderRest);shoulder.rotation.x=windup*2.4;actor.updateMatrixWorld(true);
     hit.set(-.10,.76-press*.14,-.12);actor.worldToLocal(aim.copy(hit));aim.sub(shoulder.position);const reach=aim.length();aim.normalize();quaternion.setFromUnitVectors(down,aim);shoulder.quaternion.slerp(quaternion,press);shoulder.scale.y=1+press*Math.max(0,Math.min(.45,reach/.46-1));
    }
    const rebound=reduced?0:(t>1.12?Math.sin((t-1.12)*18)*Math.exp(-(t-1.12)*8)*.035:0);
    button.position.y=.75-press*.16+rebound;button.material.color.setHex(t>impactAt?0xff667b:0xd93c58);
    for(const[i,leg]of(actor.userData.legs||[]).entries())leg.rotation.x=(i?-.1:.12)*press;
   }
   actor.updateMatrixWorld(true);tag.position.set(actor.position.x,tagHeight+actor.position.y,actor.position.z);tag.scale.x=2.65;
   const centerX=report?1.1:.22;
   rings.forEach((ring,i)=>{const u=(impact-i*.10)/.70;ring.visible=u>=0&&u<1&&!reduced;if(ring.visible){ring.position.x=centerX;ring.scale.setScalar(.50+u*3.7);ring.material.opacity=(1-u)*.80;}});
   sparks.visible=!reduced&&t>=impactAt&&impact<.68;sparkMat.opacity=Math.max(0,1-impact/.68);
   if(sparks.visible){for(let i=0;i<28;i++){const a=i*2.39996,speed=1.3+i%4*.55,k=i*3;sparkPositions[k]=centerX+Math.cos(a)*speed*impact;sparkPositions[k+1]=(report?.3:.7)+(.6+i%5*.3)*impact-2.8*impact*impact;sparkPositions[k+2]=Math.sin(a)*speed*impact;}sparkGeo.attributes.position.needsUpdate=true;}
   // One directional impact, not a repeated screen shake or strobe.
   const kick=!reduced&&t>=impactAt?decay*.10:0,dolly=reduced?0:smooth(t/.75)*.16+reveal*.24;
   camera.position.set(report?-.20:.15,focus.y+2.0+kick,cameraDistance+.9-dolly);camera.lookAt(focus);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);return stop;
 },dispose(){stop();}};
}
