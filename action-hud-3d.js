// The DOM owns text, focus and touch input. This scene draws only the physical
// controls into the game's existing renderer after the world/visibility pass.
// There is no extra WebGL context, readback, or animation loop.
const ACTIONS = {
  taskBtn: {kind:'use', color:0x68dddc, faceColor:0x07584e}, jumpBtn: {kind:'jump', color:0x87cefa, faceColor:0x124b70},
  killBtn: {kind:'knife', color:0xff526a, faceColor:0x81162d}, killSecondBtn: {kind:'ability', color:0xff7984, faceColor:0x74182b},
  sabotageBtn: {kind:'bolt', color:0xbe94ff, faceColor:0x4b1b70}, abilityBtn: {kind:'ability', color:0x72e7cf, faceColor:0x075747},
  reportBtn: {kind:'report', color:0xffbe6d, faceColor:0x71410e}, rocketLaunchBtn: {kind:'rocket', color:0xffac72, faceColor:0x763316},
  waveHawkBtn: {kind:'eye', color:0x8fe8f7, faceColor:0x124b58},
  roundRoleBtn: {kind:'roles', color:0x78e0d9, utility:true},
  mapBtn: {kind:'map', color:0x8ac9ef, utility:true},
  titleInputSettingsBtn: {kind:'gear', color:0x9bb9d2, utility:true, symbolOnly:true},
  voiceToggleBtn: {kind:'mic', color:0x6cdeb5, utility:true, symbolOnly:true}
};

export function createActionHud3D({THREE,renderer,root,isActive,isObscured=()=>false,reducedMotion=()=>false,actions=ACTIONS,stateAttribute="threeActions"}) {
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1,1,0,.1,1000);
  camera.position.z=600;
  scene.add(new THREE.HemisphereLight(0xc5efff,0x101928,1.65));
  const light=new THREE.DirectionalLight(0xffffff,2.1);light.position.set(-150,240,400);scene.add(light);
  const fill=new THREE.DirectionalLight(0x80bfff,.7);fill.position.set(220,-120,250);scene.add(fill);
  const size=new THREE.Vector2(),viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
  const textCanvas=document.createElement('canvas'),textContext=textCanvas.getContext('2d');
  const records=new Map(),geometries=new Set(),materials=new Set(),geometryCache=new Map();
  let dirty=true,active=false,disposed=false,failed=false,obscured=false,lastLayoutAt=-Infinity,lastDrawAt=0,draws=0;
  const geometry=(key,build)=>{if(!geometryCache.has(key)){const g=build();geometryCache.set(key,g);geometries.add(g);}return geometryCache.get(key);};
  const material=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.48,toneMapped:false,...options});materials.add(m);return m;};
  const basic=(color,options={})=>{const m=new THREE.MeshBasicMaterial({color,toneMapped:false,...options});materials.add(m);return m;};
  const polygon=(points,depth=.12)=>{
    const key='icon:'+depth+':'+points.map(p=>p.join(',')).join('/');
    return geometry(key,()=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:4});});
  };
  function tileGeometry(w,h,depth,radius=8) {
    const key='tile:'+[w,h,depth,radius].join(':');
    return geometry(key,()=>{
      const x=-w/2,y=-h/2,r=Math.min(radius,h/4),s=new THREE.Shape();
      s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
      s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
      s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();
      return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:1.2,bevelThickness:1.3,bevelSegments:2,curveSegments:4,steps:1});
    });
  }
  const cube=geometry('cube',()=>new THREE.BoxGeometry(1,1,1));
  const ring=geometry('ring',()=>new THREE.RingGeometry(.67,.72,48,1,Math.PI/2));
  const crystal=geometry('crystal',()=>new THREE.OctahedronGeometry(.48));
  function mesh(parent,g,m,x=0,y=0,z=0,scale){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);parent.add(o);return o;}
  function icon(kind,accent) {
    const group=new THREE.Group(),metal=material(0xdbedf4,{metalness:.7,roughness:.25}),tint=material(accent,{emissive:accent,emissiveIntensity:.2});
    if(kind==='outfit'){
      mesh(group,polygon([[-.65,.42],[-.3,.65],[-.16,.5],[.16,.5],[.3,.65],[.65,.42],[.44,.14],[.27,.25],[.27,-.6],[-.27,-.6],[-.27,.25],[-.44,.14]]),metal);mesh(group,cube,tint,0,-.05,.18,[.16,.75,.07]);
    }else if(kind==='capsule'){
      mesh(group,geometry('capsule-top',()=>new THREE.SphereGeometry(.56,18,10,0,Math.PI*2,0,Math.PI/2)),tint,0,0,.02);mesh(group,geometry('capsule-bottom',()=>new THREE.SphereGeometry(.56,18,10,0,Math.PI*2,Math.PI/2,Math.PI/2)),metal,0,0,.02);const seam=mesh(group,geometry('capsule-seam',()=>new THREE.TorusGeometry(.56,.025,6,22)),metal);seam.rotation.x=Math.PI/2;
    }else if(kind==='seat'){
      mesh(group,cube,tint,0,.25,0,[.8,.85,.18]);mesh(group,cube,metal,0,-.18,.24,[.85,.15,.62]);for(const side of[-1,1])mesh(group,cube,metal,side*.3,-.48,.18,[.1,.5,.1]);
    }else if(kind==='monitor'){
      mesh(group,cube,metal,0,.15,0,[1.2,.85,.16]);mesh(group,cube,tint,0,.15,.12,[1,.65,.09]);mesh(group,cube,metal,0,-.42,0,[.16,.35,.12]);mesh(group,cube,metal,0,-.6,0,[.65,.12,.28]);
    }else if(kind==='car'){
      mesh(group,cube,tint,0,-.05,.1,[1.1,.4,.5]);mesh(group,cube,metal,0,.25,.07,[.65,.3,.4]);for(const side of[-1,1])mesh(group,geometry('wheel',()=>new THREE.CylinderGeometry(.18,.18,.12,12)),metal,side*.38,-.28,.32).rotation.x=Math.PI/2;
    }else if(kind==='knife'){
      mesh(group,polygon([[-.11,-.12],[.36,.52],[.36,.85],[.02,.68],[-.3,.08]]),metal);
      const grip=mesh(group,cube,tint,-.26,-.31,.04,[.18,.47,.2]);grip.rotation.z=-.56;
      const guard=mesh(group,cube,metal,-.14,-.1,.05,[.49,.1,.24]);guard.rotation.z=-.56;
    }else if(kind==='bolt'){
      mesh(group,polygon([[-.04,.72],[.47,.72],[.08,.08],[.4,.08],[-.42,-.73],[-.13,-.08],[-.48,-.08]]),tint);
    }else if(kind==='jump'){
      mesh(group,polygon([[-.53,.08],[0,.69],[.53,.08],[.19,.08],[.19,-.48],[-.19,-.48],[-.19,.08]]),metal);
      mesh(group,cube,tint,0,-.66,.03,[.65,.08,.12]);
    }else if(kind==='report'){
      mesh(group,polygon([[-.55,-.2],[-.55,.2],[-.22,.2],[.46,.58],[.46,-.48],[-.22,-.2]]),metal);
      mesh(group,cube,tint,-.18,-.45,.03,[.18,.42,.18]);mesh(group,cube,tint,.52,.04,.08,[.08,1.12,.18]);
    }else if(kind==='vent'){
      mesh(group,cube,metal,0,0,.04,[1.3,.92,.18]);for(let i=0;i<5;i++)mesh(group,cube,tint,0,-.30+i*.15,.16,[1.05,.07,.08]);
    }else if(kind==='door'){
      mesh(group,cube,metal,0,0,.04,[1.12,1.45,.15]);mesh(group,cube,tint,0,0,.15,[.83,1.15,.1]);mesh(group,crystal,metal,.25,-.05,.25,[.14,.14,.14]);
    }else if(kind==='meeting'){
      mesh(group,cube,metal,0,-.43,.03,[1.2,.24,.22]);mesh(group,geometry('meeting-cap',()=>new THREE.CylinderGeometry(.42,.48,.23,20)),tint,0,-.17,.08);for(const side of[-1,1]){const ray=mesh(group,cube,tint,side*.52,.48,.06,[.07,.42,.1]);ray.rotation.z=side*-.5;}
    }else if(kind==='use'){
      mesh(group,polygon([[-.36,-.56],[-.52,-.1],[-.47,.08],[-.3,.05],[-.18,-.12],[-.18,.67],[-.02,.75],[.13,.67],[.13,.11],[.39,.16],[.5,.02],[.36,-.56]]),metal);
      mesh(group,cube,tint,-.03,-.68,.04,[.76,.16,.2]);
    }else if(kind==='rocket'){
      mesh(group,polygon([[-.23,-.4],[-.23,.35],[0,.78],[.23,.35],[.23,-.4]]),metal);
      mesh(group,polygon([[-.23,-.04],[-.49,-.47],[-.23,-.38]]),tint);
      mesh(group,polygon([[.23,-.04],[.49,-.47],[.23,-.38]]),tint);
      mesh(group,polygon([[-.12,-.48],[0,-.78],[.12,-.48]]),tint);
    }else if(kind==='gear'){
      mesh(group,geometry('gear-ring',()=>new THREE.RingGeometry(.31,.53,20)),metal,0,0,.13);
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,tooth=mesh(group,cube,metal,Math.sin(angle)*.56,Math.cos(angle)*.56,.08,[.24,.28,.2]);tooth.rotation.z=-angle;
      }
      mesh(group,crystal,tint,0,0,.17,[.4,.4,.4]);
    }else if(kind==='mic'){
      mesh(group,polygon([[-.22,-.04],[-.22,.48],[-.13,.63],[.13,.63],[.22,.48],[.22,-.04],[.12,-.19],[-.12,-.19]]),metal);
      mesh(group,polygon([[-.42,.02],[-.33,.02],[-.28,-.23],[0,-.35],[.28,-.23],[.33,.02],[.42,.02],[.35,-.35],[.07,-.47],[.07,-.63],[.31,-.63],[.31,-.73],[-.31,-.73],[-.31,-.63],[-.07,-.63],[-.07,-.47],[-.35,-.35]]),tint);
    }else if(kind==='headphones'){
      const arch=mesh(group,geometry('headset-arch',()=>new THREE.TorusGeometry(.50,.075,6,28,Math.PI)),metal,0,.02,.02);for(const side of[-1,1])mesh(group,cube,tint,side*.50,-.20,.04,[.20,.48,.22]);
      for(const a of[-Math.PI/4,Math.PI/4]){const cross=mesh(group,cube,basic(0xff667b),0,-.03,.22,[.62,.10,.10]);cross.rotation.z=a;}
    }else if(kind==='map'){
      for(let i=0;i<3;i++){
        const leaf=mesh(group,cube,i===1?tint:metal,(i-1)*.4,0,.08,[.38,.95,.1]);leaf.rotation.y=i===1?-.4:.4;
      }
    }else if(kind==='roles'){
      for(let i=0;i<3;i++){
        mesh(group,cube,tint,-.48,.4-i*.4,.04,[.17,.17,.16]);
        mesh(group,cube,metal,.13,.4-i*.4,.04,[.76,.12,.12]);
      }
    }else if(kind==='eye'){
      mesh(group,polygon([[-.75,0],[-.36,.36],[.36,.36],[.75,0],[.36,-.36],[-.36,-.36]]),metal);
      mesh(group,crystal,tint,0,0,.19,[.58,.58,.58]);
    }else{
      const core=mesh(group,crystal,tint,0,0,.13);core.rotation.set(.35,.3,.25);
      mesh(group,polygon([[-.73,0],[-.49,.24],[-.49,-.24]]),metal);
      mesh(group,polygon([[.73,0],[.49,-.24],[.49,.24]]),metal);
    }
    return group;
  }
  function build(button,spec) {
    const group=new THREE.Group(),cap=new THREE.Group();group.name='action:'+button.id;group.add(cap);scene.add(group);
    const shellMat=material(0x172534,{roughness:.48}),edgeMat=material(spec.color,{emissive:spec.color,emissiveIntensity:.34}),faceMat=material(spec.faceColor||0x102130,{metalness:.3,roughness:.46});
    const shell=mesh(group,cube,shellMat),edge=mesh(cap,cube,edgeMat,0,0,2),face=mesh(cap,cube,faceMat,0,0,4);
    const symbol=icon(spec.kind,spec.color);cap.add(symbol);const headset=spec.kind==='mic'?icon('headphones',spec.color):null;if(headset){headset.visible=false;cap.add(headset);}
    const arcGeometry=ring.clone();geometries.add(arcGeometry);
    const arc=mesh(cap,arcGeometry,basic(spec.color,{transparent:true,opacity:.88}),0,0,23);arc.visible=false;
    // A spent ability gets a physical red X over its icon, not another panel.
    const spent=new THREE.Group(),red=basic(0xff4d64);cap.add(spent);
    for(const angle of [-Math.PI/4,Math.PI/4]){const m=mesh(spent,cube,red,0,0,28,[31,4,2]);m.rotation.z=angle;}
    spent.visible=false;
    const muteSlash=spec.kind==='mic'?mesh(cap,cube,red,0,0,29,[32,3,2]):null;
    if(muteSlash){muteSlash.rotation.z=-Math.PI/4;muteSlash.visible=false;}
    const record={button,spec,group,cap,shell,edge,face,shellMat,edgeMat,faceMat,symbol,headset,arc,spent,muteSlash,w:0,h:0,press:0,pressUntil:0,hover:false,cooling:0,disabled:false};
    records.set(button.id,record);button.dataset.threeAction='true';return record;
  }
  for(const [id,spec] of Object.entries(actions)){const b=spec.utility||spec.external?document.getElementById(id):root?.querySelector('#'+id);if(b)build(b,spec);}
  const invalidate=()=>{dirty=true;if(active&&(!isActive()||isObscured()))setActive(false);};
  const lost=()=>setActive(false);
  renderer.domElement.addEventListener('webglcontextlost',lost);
  renderer.domElement.addEventListener('webglcontextrestored',invalidate);
  const watchedDialogs=new WeakSet();
  const observer=new MutationObserver(changes=>{if(changes.some(c=>c.type==='childList'&&c.target===document.body))watchDialogs();invalidate();});
  function watchDialogs(){for(const dialog of document.querySelectorAll('[aria-modal="true"]'))if(!watchedDialogs.has(dialog)){watchedDialogs.add(dialog);observer.observe(dialog,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden','aria-modal']});}}
  if(root)observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','data-exhausted','data-action-icon']});
  const controls=root?.closest('#controls'),holder=root?.parentElement;
  if(controls)observer.observe(controls,{attributes:true,attributeFilter:['class','style','hidden']});
  if(holder)observer.observe(holder,{attributes:true,attributeFilter:['class','style','hidden']});
  observer.observe(document.body,{attributes:true,childList:true,attributeFilter:['data-phase','data-controls-countdown','data-space-launch-backdrop','data-spectator']});
  watchDialogs();
  for(const r of records.values())if(r.spec.utility)observer.observe(r.button,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','data-state','data-speaking']});
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;
  if(root)resize?.observe(root);for(const r of records.values())if(r.spec.utility)resize?.observe(r.button);
  window.addEventListener('resize',invalidate);window.visualViewport?.addEventListener('resize',invalidate);
  const hit=event=>records.get(event.target?.closest?.('button')?.id);
  const press=event=>{const r=hit(event);if(r&&!r.button.disabled)r.pressUntil=performance.now()+135;};
  const over=event=>{const r=hit(event);if(r)r.hover=event.pointerType==='mouse';};
  const out=event=>{const r=hit(event);if(r)r.hover=false;};
  document.addEventListener('pointerdown',press,{capture:true,passive:true});
  document.addEventListener('pointerover',over,{passive:true});document.addEventListener('pointerout',out,{passive:true});
  function setActive(value){if(active===value)return;active=value;document.body.dataset[stateAttribute]=String(value);if(value)dirty=true;}
  function layout(stamp) {
    dirty=false;lastLayoutAt=stamp;const canvas=renderer.domElement.getBoundingClientRect();
    renderer.getSize(size);camera.left=0;camera.right=size.x;camera.top=size.y;camera.bottom=0;camera.updateProjectionMatrix();
    const sx=size.x/Math.max(1,canvas.width),sy=size.y/Math.max(1,canvas.height);
    for(const r of records.values()){
      const b=r.button,box=b.getBoundingClientRect(),style=getComputedStyle(b);
      r.group.visible=box.width>0&&box.height>0&&!b.closest('.hidden')&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
      if(!r.group.visible)continue;
      const w=Math.round(box.width*sx),h=Math.round(box.height*sy),roomy=!r.spec.symbolOnly&&(w>=82||!r.spec.utility&&w>=66&&h>=48)&&h>=(r.spec.utility?40:38),symbolOnly=!!r.spec.symbolOnly;
      if(b.dataset.threeActionLayout!==(symbolOnly?'symbol':roomy?'icon':'compact'))b.dataset.threeActionLayout=symbolOnly?'symbol':roomy?'icon':'compact';
      const inset=Math.round(box.width*(r.spec.utility ? .28 : .38))+'px';if(b.style.getPropertyValue('--three-action-label-inset')!==inset)b.style.setProperty('--three-action-label-inset',inset);
      const caption=b.querySelector('#abilityCaption,#rocketLaunchCaption'),text=(caption||b).textContent;
      if(b.id==='taskBtn'||b.id==='lobbyUseBtn'){
        const kind=b.id==='lobbyUseBtn'?(b.dataset.actionIcon||'use'):/ベント|出る/.test(text)?'vent':/ドア|扉|開く/.test(text)?'door':/会議/.test(text)?'meeting':'use';
        if(kind!==(r.useKind||'use')){r.useSymbols||=new Map([['use',r.symbol]]);r.symbol.visible=false;if(!r.useSymbols.has(kind)){const next=icon(kind,r.spec.color);r.cap.add(next);r.useSymbols.set(kind,next);}r.symbol=r.useSymbols.get(kind);r.useKind=kind;}
      }

      const padding=roomy?parseFloat(inset)+7:12,available=Math.max(1,box.width-padding-3),maximum=Math.min(r.spec.utility?18:22,box.height*(r.spec.utility ? .3 : .25));
      if(textContext&&!symbolOnly){textContext.font=style.fontWeight+' '+maximum+'px '+style.fontFamily;const measured=textContext.measureText(text).width;
        const font=(Math.max(9,Math.min(maximum,maximum*available/Math.max(1,measured)))).toFixed(1)+'px';
        if(b.style.getPropertyValue('font-size')!==font)b.style.setProperty('font-size',font,'important');}
      r.group.position.set((box.left+box.width/2-canvas.left)*sx,(canvas.bottom-box.top-box.height/2)*sy,0);
      r.group.rotation.set(r.spec.utility ? .09 : .16,-.055,0);
      if(r.w!==w||r.h!==h){r.w=w;r.h=h;r.shell.geometry=tileGeometry(w-5,h-6,4,9);r.edge.geometry=tileGeometry(w-9,h-10,2,8);r.face.geometry=tileGeometry(w-12,h-13,2,7);}
      const iconScale=Math.min(24,h*.29),iconX=roomy?-w*(r.spec.utility ? .35 : .29):0;
      r.symbol.position.set(iconX,1,20);r.symbol.scale.setScalar(iconScale);r.symbol.visible=roomy||symbolOnly;
      r.spent.position.x=iconX;r.arc.position.x=iconX;r.arc.scale.setScalar(iconScale*1.17);
      r.cooling=Math.max(0,Math.min(1,(parseFloat(b.style.getPropertyValue('--cooldown'))||0)/360));
      r.disabled=b.disabled;r.speaking=b.dataset.speaking==='true';r.spent.visible=b.dataset.exhausted==='true';
      if(r.muteSlash){
        const deafened=b.dataset.state==='deafened',muted=b.dataset.state!=='on';r.muteSlash.visible=muted&&!deafened;if(r.headset){r.headset.visible=deafened;r.symbol.visible=!deafened;r.headset.position.copy(r.symbol.position);r.headset.scale.copy(r.symbol.scale);}
        r.spec.color=muted?0xe2b96d:0x6cdeb5;
        r.muteSlash.scale.set(Math.min(w,h)*.62,3,2);
      }
      r.shellMat.color.setHex(r.disabled?0x172432:0x273e51);
      r.edgeMat.color.setHex(r.disabled?0x425363:r.spec.color);r.edgeMat.emissive.setHex(r.disabled?0x152333:r.spec.color);r.edgeMat.emissiveIntensity=r.disabled?.12:.34;
      r.faceMat.color.setHex(r.disabled?0x152333:(r.spec.faceColor||0x142c3e));
    }
    // A window resize replaces tile sizes; retain only geometry still in use.
    const used=new Set();for(const r of records.values())for(const m of [r.shell,r.edge,r.face])used.add(m.geometry);
    for(const [key,g] of geometryCache)if(key.startsWith('tile:')&&!used.has(g)){geometryCache.delete(key);geometries.delete(g);g.dispose();}
  }
  function draw(stamp=performance.now()) {
    if(disposed)return;
    const wanted=!failed&&!!root&&isActive();
    if(!wanted){setActive(false);return;}
    if(dirty||stamp-lastLayoutAt>500){obscured=isObscured();if(!obscured)layout(stamp);else{dirty=false;lastLayoutAt=stamp;}}
    setActive(!obscured);if(!active)return;
    let visible=0;const dt=Math.min(.05,Math.max(0,(stamp-lastDrawAt)/1000));lastDrawAt=stamp;
    for(const r of records.values())if(r.group.visible){
      visible++;
      const pressed=stamp<r.pressUntil&&!r.disabled?1:0;
      r.press=reducedMotion()?pressed:r.press+(pressed-r.press)*(1-Math.exp(-dt*32));
      r.cap.position.z=-r.press*3;r.cap.scale.setScalar(1-r.press*.018);
      r.faceMat.emissive.setHex(r.spec.color);r.faceMat.emissiveIntensity=r.disabled?0:r.speaking?.2:r.hover?.13:.035;
      r.arc.visible=r.cooling>0;
      r.arc.material.opacity=r.disabled?.48:.88;
      r.arc.geometry.setDrawRange(0,Math.ceil(r.cooling*48)*6);
    }
    if(!visible)return;
    const previousTarget=renderer.getRenderTarget();if(previousTarget)return;
    const autoClear=renderer.autoClear,autoReset=renderer.info.autoReset,scissorTest=renderer.getScissorTest();
    // The HUD has no shadow casters. Don't regenerate or consume the world's
    // shadow atlas for this second scene rendered through the same renderer.
    const shadowAutoUpdate=renderer.shadowMap.autoUpdate,shadowNeedsUpdate=renderer.shadowMap.needsUpdate;
    renderer.getViewport(viewport);renderer.getScissor(scissor);
    try{
      renderer.autoClear=false;renderer.info.autoReset=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setViewport(0,0,size.x,size.y);renderer.setScissorTest(false);
      renderer.clearDepth();renderer.render(scene,camera);draws++;
    }catch(error){failed=true;setActive(false);console.warn('3D操作ボタンを通常表示へ切り替えました',error);
    }finally{renderer.shadowMap.autoUpdate=shadowAutoUpdate;renderer.shadowMap.needsUpdate=shadowNeedsUpdate;renderer.autoClear=autoClear;renderer.info.autoReset=autoReset;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
  }
  function dispose(){if(disposed)return;disposed=true;setActive(false);observer.disconnect();resize?.disconnect();window.removeEventListener('resize',invalidate);window.visualViewport?.removeEventListener('resize',invalidate);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',invalidate);document.removeEventListener('pointerdown',press,true);document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);for(const r of records.values()){delete r.button.dataset.threeAction;delete r.button.dataset.threeActionLayout;}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();scene.clear();records.clear();}
  return {draw,dispose,invalidate,getStats:()=>({active,failed,draws,objects:records.size,geometries:geometries.size,materials:materials.size,
    visible:[...records.values()].filter(r=>r.group.visible).map(r=>({id:r.button.id,width:r.w,height:r.h,disabled:r.disabled,cooldown:r.cooling,cooldownIndices:r.arc.geometry.drawRange.count,spent:r.spent.visible,icon:r.useKind||r.spec.kind,pressed:r.press}))})};
}
