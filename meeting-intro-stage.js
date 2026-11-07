// A small set of shared meshes and contact shadows, without a post-processing pass.
export function createMeetingIntroStage(T,{scene,report,geometries,materials,textures}){
 const color=report?0xff657b:0xffbd69;
 const ownGeometry=g=>(geometries.add(g),g),ownMaterial=m=>(materials.add(m),m);
 const metal=ownMaterial(new T.MeshStandardMaterial({color:0x22384a,metalness:.7,roughness:.3}));
 const deck=ownMaterial(new T.MeshStandardMaterial({color:0x142433,metalness:.45,roughness:.62}));
 const edge=ownMaterial(new T.MeshStandardMaterial({color:0x536d80,metalness:.8,roughness:.24}));
 const glow=ownMaterial(new T.MeshBasicMaterial({color,toneMapped:false,transparent:true,opacity:.7}));
 const cool=ownMaterial(new T.MeshBasicMaterial({color:0x7bd2e0,toneMapped:false,transparent:true,opacity:.5}));
 const mesh=(geometry,material,x=0,y=0,z=0)=>{const o=new T.Mesh(ownGeometry(geometry),material);o.position.set(x,y,z);scene.add(o);return o;};
 mesh(new T.CylinderGeometry(4.65,4.85,.22,64),metal,0,-.18,0);
 mesh(new T.CylinderGeometry(4.5,4.5,.07,64),deck,0,-.035,0);
 for(const [radius,material]of [[4.55,edge],[4.69,glow],[3.65,cool]]){
  const ring=mesh(new T.TorusGeometry(radius,.018,5,80),material,0,.008,0);ring.rotation.x=-Math.PI/2;
 }
 // Repeated warning segments share a single draw call and one geometry.
 const segments=new T.InstancedMesh(ownGeometry(new T.BoxGeometry(.24,.018,.06)),glow,32),dummy=new T.Object3D();
 for(let i=0;i<32;i++){const angle=i*Math.PI/16;dummy.position.set(Math.sin(angle)*4.35,.015,Math.cos(angle)*4.35);dummy.rotation.y=angle;dummy.updateMatrix();segments.setMatrixAt(i,dummy.matrix);}scene.add(segments);
 const fixtures=new T.Group();fixtures.name='meeting-stage-lighting';scene.add(fixtures);
 const cube=ownGeometry(new T.BoxGeometry(1,1,1));
 for(const side of [-1,1]){
  const post=new T.Mesh(cube,metal);post.position.set(side*3.65,.8,-2.2);post.scale.set(.28,1.8,.32);post.rotation.z=-side*.17;fixtures.add(post);
  const strip=new T.Mesh(cube,cool);strip.position.copy(post.position);strip.position.z+=.18;strip.scale.set(.055,1.5,.018);strip.rotation.copy(post.rotation);fixtures.add(strip);
 }
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,63);
 gradient.addColorStop(0,'rgba(0,0,0,.65)');gradient.addColorStop(.38,'rgba(0,0,0,.32)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const map=new T.CanvasTexture(shadowCanvas);textures.add(map);
 const shadowMaterial=ownMaterial(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
 const shadowGeometry=ownGeometry(new T.PlaneGeometry(1,1));
 const shadow=(x,z,w,h)=>{const m=new T.Mesh(shadowGeometry,shadowMaterial);m.position.set(x,.012,z);m.rotation.x=-Math.PI/2;m.scale.set(w,h,1);scene.add(m);return m;};
 const actorShadow=shadow(-.5,0,1.8,1.4);if(report)shadow(.6,.18,2.8,1.7);else shadow(.22,0,2,1.7);
 const light=new T.PointLight(color,0,8,2);light.position.set(report?1:.22,1.25,.7);scene.add(light);
 const target=mesh(new T.RingGeometry(report?.92:.78,report?.96:.81,48),glow,report?.7:.22,.025,report?.18:0);target.rotation.x=-Math.PI/2;
 return {update({time,impactAt,actor,reduced}){
  const elapsed=Math.max(0,time-impactAt),reveal=Math.min(1,elapsed/.22),pulse=elapsed>0?Math.exp(-elapsed*5):0;
  glow.opacity=.25+reveal*.42+pulse*.25;cool.opacity=.42+reveal*.12;light.intensity=reveal*2+pulse*5;
  actorShadow.position.x=actor.position.x;actorShadow.position.z=actor.position.z;
  const size=1+Math.max(0,actor.position.y)*.25;actorShadow.scale.set(1.8*size,1.4*size,1);
  target.visible=time>=impactAt;target.scale.setScalar(reduced?1:1+pulse*.22);
 }};
}

export function createMeetingIntroChrome(host,{report,reduced,duration,elapsed}){
 const overlay=host.closest('#meetingIntro');
 const rail=document.createElement('div');rail.className='meetingIntroRail';rail.setAttribute('aria-hidden','true');
 const signal=document.createElement('span');signal.className='meetingIntroSignal';signal.textContent=report?'BODY REPORTED':'EMERGENCY MEETING';
 const channel=document.createElement('span');channel.textContent='SPACE SUSPECT';rail.append(signal,channel);
 const footer=document.createElement('div');footer.className='meetingIntroFooter';footer.setAttribute('aria-hidden','true');
 const caption=document.createElement('span');caption.textContent=report?'現場を確認中':'緊急通信を送信中';
 const progress=document.createElement('span');progress.className='meetingIntroProgress';const fill=document.createElement('i');progress.append(fill);footer.append(caption,progress);
 host.prepend(rail);host.append(footer);host.dataset.introActive='true';host.dataset.introReduced=String(reduced);
 if(overlay){overlay.dataset.cinematic='true';overlay.style.setProperty('--intro-accent',report?'#ff8192':'#ffd191');}
 let previousBeat='';
 return {resizeHeight(){const other=[...host.children].filter(n=>!n.matches('canvas')).reduce((sum,n)=>sum+n.getBoundingClientRect().height,0);return Math.max(80,Math.min(innerHeight*.65,host.clientHeight-other-18));},
  update(time,impactAt){
   const beat=time<impactAt?'approach':time<2.25?'impact':'handoff';
   if(previousBeat!==beat){previousBeat=beat;host.dataset.introBeat=beat;caption.textContent=beat==='handoff'?'会議室へ':beat==='impact'?(report?'通報を受信しました':'招集を受信しました'):(report?'現場を確認中':'緊急通信を送信中');}
   const entry=reduced?1:Math.min(1,Math.max(0,time/.35)),impact=time>=impactAt?Math.exp(-(time-impactAt)*7):0;
   host.style.setProperty('--intro-entry',entry.toFixed(3));host.style.setProperty('--intro-impact',(reduced?0:impact).toFixed(3));
   fill.style.transform=`scaleX(${Math.min(1,Math.max(0,time*1000/duration))})`;
  },
  dispose(){rail.remove();footer.remove();delete host.dataset.introActive;delete host.dataset.introReduced;delete host.dataset.introBeat;host.style.removeProperty('--intro-entry');host.style.removeProperty('--intro-impact');if(overlay){delete overlay.dataset.cinematic;overlay.style.removeProperty('--intro-accent');}}
 };
}
