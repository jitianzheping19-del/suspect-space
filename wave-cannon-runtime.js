// The hit test and the visible corridor share these dimensions and timing.
export const WAVE_CANNON_HALF_WIDTH=3.4;
export const WAVE_CANNON_RANGE=80;
export const WAVE_CANNON_START=.5;
export const WAVE_CANNON_GROW_MS=450;
export const WAVE_CANNON_FIRE_MS=5000;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function waveCannonSegments(wave){
 const angle=Number(wave?.yaw)||0,segments=[{x:Number(wave?.x)||0,z:Number(wave?.z)||0,yaw:angle,length:WAVE_CANNON_RANGE}];
 const r=wave?.reflection;if(r&&Number.isFinite(Number(r.x))&&Number.isFinite(Number(r.z))){const along=(Number(r.x)-segments[0].x)*Math.sin(angle)+(Number(r.z)-segments[0].z)*Math.cos(angle);segments[0].length=clamp(along,0,WAVE_CANNON_RANGE);segments.push({x:Number(r.x),z:Number(r.z),yaw:Number(r.yaw)||0,length:WAVE_CANNON_RANGE});}
 return segments;
}
export function waveCannonVisibleSegments(wave,progress=1){let remaining=WAVE_CANNON_RANGE*clamp(Number(progress)||0);return waveCannonSegments(wave).map(s=>{const length=Math.min(s.length,remaining);remaining=Math.max(0,remaining-s.length);return{...s,length};});}
export function waveCannonTargetOnBeam(wave,loc,progress=1){
 if(!wave||!loc||!Number.isFinite(Number(loc.x))||!Number.isFinite(Number(loc.z)))return false;
 return waveCannonVisibleSegments(wave,progress).some(s=>{const x=Number(loc.x)-s.x,z=Number(loc.z)-s.z,along=x*Math.sin(s.yaw)+z*Math.cos(s.yaw),side=Math.abs(x*Math.cos(s.yaw)-z*Math.sin(s.yaw));return along>=WAVE_CANNON_START&&along<=s.length&&side<=WAVE_CANNON_HALF_WIDTH;});
}
export function waveCannonMovementLock(game,id,stamp){
 const p=game?.players?.[id];if(game?.phase!=='play'||!p?.alive||p.disconnected||p.observer)return null;
 const events=game.waveEvents&&typeof game.waveEvents==='object'?Object.values(game.waveEvents):game.waveEvent?[game.waveEvent]:[];
 const event=events.filter(w=>w?.by===id&&Number(w.startedAt)<=stamp&&Number(w.endsAt)>stamp).sort((a,b)=>Number(b.endsAt)-Number(a.endsAt))[0];
 const until=Math.max(Number(p.waveStationaryUntil)||0,Number(event?.endsAt)||0);if(until<=stamp)return null;
 const x=Number(event?.x??p.waveStationaryX),z=Number(event?.z??p.waveStationaryZ);if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 return{x,z,yaw:Number(event?.yaw??p.yaw)||0,until};
}

export function createWaveCannonEffect({THREE,scene,event,currentEvent=()=>event,getAvatar=()=>null,observable=()=>true,phase=()=> 'play',reducedMotion=()=>false}){
 const geometries=new Set(),materials=new Set(),textures=new Set(),gs=g=>(geometries.add(g),g),ms=m=>(materials.add(m),m);
 let disposed=false,holder=null,rest=null;
 const team=String(event.team||'').toUpperCase(),color=team==='RED'||team==='A'?0xff5066:team==='BLUE'||team==='B'?0x4d9dff:event.faction==='jackal'?0x73f1c4:0x69d9ff;
 const standard=(color,roughness=.3,metalness=.7)=>ms(new THREE.MeshStandardMaterial({color,roughness,metalness}));
 const glow=(color,opacity=1,extra={})=>ms(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,...extra}));
 const steel=standard(0x829ead),dark=standard(0x162c3a,.42),edge=standard(0xc3d0d1,.24,.85),rubber=standard(0x091722,.8,.04),gold=standard(0xd4b37b,.35),light=glow(color),white=glow(0xe7faff);
 const root=new THREE.Group();root.name='wave-cannon-effect';scene.add(root);
 const gun=new THREE.Group();gun.name='wave-cannon-heavy-device';root.add(gun);
 const shell=new THREE.Group(),barrel=new THREE.Group(),rotor=new THREE.Group();gun.add(shell,barrel,rotor);
 const mesh=(geo,mat,parent=shell,x=0,y=0,z=0)=>{const o=new THREE.Mesh(gs(geo),mat);o.position.set(x,y,z);parent.add(o);return o;};
 const box=(m,x,y,z,w,h,d,p=shell)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const tube=(m,x,y,z,r,length,p=shell)=>{const o=mesh(new THREE.CylinderGeometry(r,r,length,24,1,true),m,p,x,y,z);o.rotation.x=Math.PI/2;return o;};
 const ring=(m,x,y,z,r,thick=.025,p=shell)=>mesh(new THREE.TorusGeometry(r,thick,6,40),m,p,x,y,z);
 // The barrel ends at +0.5m: the same start plane as the hit corridor.
 tube(dark,0,-.08,-.65,.43,1.7);tube(steel,0,-.08,-.92,.46,.75);tube(edge,0,-.08,-1.52,.48,.13);
 mesh(new THREE.CylinderGeometry(.40,.46,.14,24),rubber,shell,0,-.08,-1.61).rotation.x=Math.PI/2;
 box(dark,0,.04,-.42,.89,.56,1.17);box(steel,0,.35,-.45,.63,.09,1.13);box(gold,0,.405,-.52,.34,.035,.46);
 for(const side of[-1,1]){box(steel,side*.49,-.07,-.66,.15,.49,.96);box(rubber,side*.575,-.04,-.70,.03,.32,.68);for(let i=0;i<5;i++)box(edge,side*.60,-.07,-1.02+i*.145,.026,.24,.025);for(const z of[-1.07,-.30])mesh(new THREE.SphereGeometry(.034,8,6),gold,shell,side*.50,.22,z);box(dark,side*.38,.21,-.20,.11,.25,.15);box(rubber,side*.38,.28,-.20,.15,.12,.20);}
 box(dark,0,-.48,-.98,.56,.23,.48);box(steel,0,-.61,-.98,.49,.07,.43);for(let i=0;i<4;i++)box(light,-.16+i*.11,-.49,-.728,.055,.13,.014);
 tube(steel,0,0,-.04,.31,.86,barrel);tube(rubber,0,0,.30,.35,.20,barrel);tube(edge,0,0,.46,.37,.08,barrel);ring(gold,0,0,.50,.35,.035,barrel);tube(rubber,0,0,.49,.26,.06,barrel);
 for(const z of[-.36,-.15,.06]){ring(dark,0,0,z,.35,.06,rotor);ring(light,0,0,z,.372,.019,rotor);}
 for(let i=0;i<6;i++){const a=i*Math.PI/3,g=new THREE.Group();g.rotation.z=a;rotor.add(g);box(edge,0,.365,-.13,.07,.065,.67,g);box(light,0,.407,-.15,.025,.018,.30,g);}
 const hatch=box(dark,.48,.06,-.30,.07,.29,.43);box(light,.52,.08,-.30,.012,.11,.26);for(const y of[-.01,.06,.13])box(white,.529,y,-.30,.006,.015,.16);
 const muzzle=new THREE.Object3D();muzzle.name='wave-cannon-muzzle';muzzle.position.z=.5;gun.add(muzzle);
 // Merge the static mechanical parts by material while leaving the coil/recoil
 // assemblies articulated. No per-frame geometry generation.
 function batch(parent){for(const child of parent.children.filter(c=>c.isGroup))batch(child);const groups=new Map();for(const o of parent.children)if(o.isMesh){const list=groups.get(o.material)||[];list.push(o);groups.set(o.material,list);}for(const [mat,list]of groups){if(list.length<2)continue;const parts=list.map(o=>{o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);}),n=parts.reduce((sum,g)=>sum+g.attributes.position.count,0),g=gs(new THREE.BufferGeometry());for(const [attr,size]of[['position',3],['normal',3],['uv',2]]){const a=new Float32Array(n*size);let at=0;for(const p of parts){if(p.attributes[attr])a.set(p.attributes[attr].array,at);at+=p.attributes.position.count*size;}g.setAttribute(attr,new THREE.BufferAttribute(a,size));}g.computeBoundingSphere();parent.add(new THREE.Mesh(g,mat));list.forEach(o=>o.removeFromParent());parts.forEach(p=>p.dispose());}}
 rotor.updateWorldMatrix(true,true);for(const g of [...rotor.children])if(g.isGroup){for(const o of [...g.children])rotor.attach(o);g.removeFromParent();}batch(shell);batch(barrel);batch(rotor);
 const dotData=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,d=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);dotData.set([255,255,255,Math.round(Math.max(0,1-d)**2*255)],i);}const dot=new THREE.DataTexture(dotData,32,32);dot.needsUpdate=true;textures.add(dot);
 const orb=mesh(new THREE.SphereGeometry(1,24,16),glow(0xebffff,.9),gun,0,0,.5);
 const halo=new THREE.Sprite(ms(new THREE.SpriteMaterial({color,map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));halo.position.z=.5;gun.add(halo);
 const chargeGeo=gs(new THREE.BufferGeometry()),chargeArray=new Float32Array(96*3);chargeGeo.setAttribute('position',new THREE.BufferAttribute(chargeArray,3));const motes=new THREE.Points(chargeGeo,ms(new THREE.PointsMaterial({color,map:dot,size:.085,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));motes.frustumCulled=false;gun.add(motes);
 const lamp=new THREE.PointLight(color,0,9,2);lamp.position.z=.5;gun.add(lamp);
 const arcGeo=gs(new THREE.BufferGeometry()),arcArray=new Float32Array(6*8*6);arcGeo.setAttribute('position',new THREE.BufferAttribute(arcArray,3));const arcs=new THREE.LineSegments(arcGeo,ms(new THREE.LineBasicMaterial({color:0xc6f5ff,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})));arcs.frustumCulled=false;gun.add(arcs);
 const chargeRings=[0,1].map(i=>mesh(new THREE.TorusGeometry(.43+i*.13,.015,6,48,Math.PI*1.55),glow(color,.7,{blending:THREE.AdditiveBlending}),gun,0,0,.55+i*.09));
 const flash=new THREE.Sprite(ms(new THREE.SpriteMaterial({map:dot,color:0xebffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));flash.position.z=.52;gun.add(flash);
 const smokeGeo=gs(new THREE.BufferGeometry()),smokeArray=new Float32Array(24*3);smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokeArray,3));const steam=new THREE.Points(smokeGeo,ms(new THREE.PointsMaterial({color:0xa7c6d3,map:dot,size:.18,transparent:true,opacity:.26,depthWrite:false})));steam.frustumCulled=false;gun.add(steam);

 const beamGeo=gs(new THREE.CylinderGeometry(1,1,1,40,1,true));beamGeo.translate(0,.5,0);beamGeo.rotateX(Math.PI/2);
 const beamMaterial=()=>ms(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{time:{value:0},opacity:{value:0},tint:{value:new THREE.Color(color)}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time,opacity;uniform vec3 tint;void main(){float stream=pow(.5+.5*sin(p.y*90.-time*21.+p.x*12.566),5.);float filament=pow(.5+.5*sin(p.x*50.265+p.y*17.-time*4.),16.);float edge=pow(sin(p.x*3.14159),.4);gl_FragColor=vec4(mix(tint,vec3(1.),stream*.45),(.07+stream*.10+filament*.12)*opacity*edge);}'}));
 const plane=gs(new THREE.PlaneGeometry(1,1));
 function corridor(name){
  const group=new THREE.Group();group.name=name;root.add(group);
  const floor=new THREE.Mesh(plane,glow(color,.12,{side:THREE.DoubleSide,depthTest:false}));floor.rotation.x=-Math.PI/2;floor.renderOrder=700;group.add(floor);
  const sides=[-1,1].map(side=>{const o=new THREE.Mesh(plane,glow(color,.95,{side:THREE.DoubleSide,depthTest:false}));o.rotation.x=-Math.PI/2;o.position.x=side*WAVE_CANNON_HALF_WIDTH;o.renderOrder=702;group.add(o);return o;});
  const caps=[0,1].map(()=>{const o=new THREE.Mesh(plane,glow(0xe0faff,.95,{side:THREE.DoubleSide,depthTest:false}));o.rotation.x=-Math.PI/2;o.renderOrder=703;group.add(o);return o;});
  const lineGeo=gs(new THREE.BufferGeometry()),lineData=new Float32Array(24);lineGeo.setAttribute('position',new THREE.BufferAttribute(lineData,3));const dashed=new THREE.LineSegments(lineGeo,ms(new THREE.LineDashedMaterial({color,dashSize:.55,gapSize:.35,transparent:true,opacity:.7,depthTest:false})));dashed.renderOrder=703;group.add(dashed);const dashes=new THREE.InstancedMesh(plane,glow(color,.92,{side:THREE.DoubleSide,depthTest:false}),104);dashes.frustumCulled=false;dashes.renderOrder=704;group.add(dashes);
  const outer=new THREE.Mesh(beamGeo,beamMaterial()),core=new THREE.Mesh(beamGeo,glow(0xd7f5ff,.30,{side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));group.add(outer,core);
  const arrowShape=new THREE.Shape();arrowShape.moveTo(-.21,0);arrowShape.lineTo(0,.24);arrowShape.lineTo(.21,0);arrowShape.lineTo(0,.48);arrowShape.closePath();const arrows=new THREE.InstancedMesh(gs(new THREE.ShapeGeometry(arrowShape)),glow(0xdffaff,.55,{side:THREE.DoubleSide,depthTest:false}),24);arrows.frustumCulled=false;arrows.renderOrder=701;group.add(arrows);
  const pulse=new THREE.Mesh(gs(new THREE.TorusGeometry(WAVE_CANNON_HALF_WIDTH,.045,6,64)),glow(color,.7));group.add(pulse);const streakGeo=gs(new THREE.BufferGeometry()),streakArray=new Float32Array(36*3);streakGeo.setAttribute('position',new THREE.BufferAttribute(streakArray,3));const streaks=new THREE.Points(streakGeo,ms(new THREE.PointsMaterial({color:0xddfaff,map:dot,size:.11,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));streaks.frustumCulled=false;group.add(streaks);
  return{group,floor,sides,caps,dashed,dashes,lineData,outer,core,arrows,pulse,streaks,streakArray};
 }
 const paths=[corridor('wave-cannon-visual'),corridor('wave-cannon-reflection')],dummy=new THREE.Object3D();
 function updatePath(path,segment,charging,stamp,fade){
  const length=segment?.length||0,span=Math.max(0,length-WAVE_CANNON_START);path.group.visible=span>0;if(span<=0)return;
  path.group.position.set(segment.x,0,segment.z);path.group.rotation.y=segment.yaw;
  path.floor.position.set(0,.048,WAVE_CANNON_START+span/2);path.floor.scale.set(WAVE_CANNON_HALF_WIDTH*2,span,1);path.floor.material.opacity=charging?.055:.18;
  path.sides.forEach(o=>{o.visible=!charging;o.position.y=.055;o.position.z=WAVE_CANNON_START+span/2;o.scale.set(.075,span,1);});
  path.caps.forEach((o,i)=>{o.visible=!charging;o.position.set(0,.057,i?length:WAVE_CANNON_START);o.scale.set(WAVE_CANNON_HALF_WIDTH*2,.075,1);});
  const w=WAVE_CANNON_HALF_WIDTH,b=WAVE_CANNON_START;path.lineData.set([-w,.06,b,-w,.06,length,w,.06,b,w,.06,length,-w,.06,b,w,.06,b,-w,.06,length,w,.06,length]);path.dashed.geometry.attributes.position.needsUpdate=true;path.dashed.computeLineDistances();path.dashed.visible=charging;path.dashes.visible=charging;let dashCount=0;if(charging)for(const side of[-1,1])for(let z=b;z<length;z+=1.6){const len=Math.min(.90,length-z);dummy.position.set(side*w,.062,z+len/2);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(.10,len,1);dummy.updateMatrix();path.dashes.setMatrixAt(dashCount++,dummy.matrix);}path.dashes.count=dashCount;path.dashes.instanceMatrix.needsUpdate=true;
  path.outer.visible=path.core.visible=path.pulse.visible=!charging;
  path.outer.position.set(0,.48,b);path.outer.scale.set(w,w,span);path.outer.material.uniforms.time.value=stamp*.001;path.outer.material.uniforms.opacity.value=fade;
  path.core.position.set(0,.48,b);path.core.scale.set(w*.30,w*.30,span);path.core.material.opacity=.30*fade;
  path.pulse.position.set(0,.48,Math.min(length,b+((stamp-Number(event.fireAt||0))*.035)%Math.max(.001,span)));path.pulse.material.opacity=.40*fade;path.streaks.visible=!charging;path.streaks.material.opacity=fade;for(let i=0;i<36;i++){const u=(stamp*.001*(.7+i%4*.12)+i*.37)%1,a=i*2.39996+stamp*.0004,r=(i%7)/7*WAVE_CANNON_HALF_WIDTH*.72;path.streakArray[i*3]=Math.cos(a)*r;path.streakArray[i*3+1]=.48+Math.sin(a)*r;path.streakArray[i*3+2]=b+u*span;}path.streaks.geometry.attributes.position.needsUpdate=true;
  const n=Math.min(24,Math.floor(span/2.8));path.arrows.count=n;for(let i=0;i<n;i++){dummy.position.set(0,.065,b+((i*2.8+stamp*.002)%Math.max(.001,span)));dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(charging?.65:.85);dummy.updateMatrix();path.arrows.setMatrixAt(i,dummy.matrix);}path.arrows.instanceMatrix.needsUpdate=true;
 }
 function updateWeapon(stamp){
  if(disposed)return false;const wave=currentEvent()||event,fire=Number(wave.fireAt),end=Number(wave.endsAt),start=Number(wave.startedAt),charging=stamp<fire,progress=clamp((stamp-start)/Math.max(1,fire-start));
  gun.position.set(Number(wave.x)||0,.48,Number(wave.z)||0);gun.rotation.y=Number(wave.yaw)||0;gun.visible=stamp>=start&&stamp<end&&observable(gun.position);
  const actor=getAvatar(wave.by),arms=actor?.userData.arms;
  if(actor&&arms?.length){if(holder!==actor){holder=actor;rest=arms.map(a=>a.rotation.clone());}actor.userData.waveCannonPose=event.id;arms.forEach((a,i)=>{a.rotation.set(-1.20,0,(i?1:-1)*.38);});}
  rotor.rotation.z=reducedMotion()?0:(stamp-start)*.001*(charging?.35+progress*2:2.8);barrel.position.z=charging?0:-.075*Math.exp(-(stamp-fire)/180)-.025*(.5+.5*Math.sin((stamp-fire)*.12));
  orb.visible=halo.visible=charging;orb.scale.setScalar(.06+progress*.35);halo.scale.setScalar(.15+progress*1.8);halo.material.opacity=.35+progress*.5;
  motes.visible=charging;for(let i=0;i<96;i++){const u=(stamp*.00035+i/96)%1,a=i*2.39996+stamp*.0005,r=(1-u)*(1+progress*.65);chargeArray[i*3]=Math.cos(a)*r;chargeArray[i*3+1]=Math.sin(a)*r;chargeArray[i*3+2]=.5+(1-u)*(.5+i%3*.25);}chargeGeo.attributes.position.needsUpdate=true;
  const shotAge=Math.max(0,stamp-fire),ignition=charging?0:Math.exp(-shotAge/110),surge=charging?0:(.35+.15*Math.sin(shotAge*.032));flash.visible=!charging;flash.scale.setScalar(.65+ignition*1.5);flash.material.opacity=ignition*.85+surge*.25;
  chargeRings.forEach((o,i)=>{o.visible=charging||shotAge<160;o.rotation.z=(reducedMotion()?0:stamp*.003)*(i?1:-1);o.scale.setScalar(charging?.55+progress*.45:Math.max(.04,1-shotAge/160));o.material.opacity=charging?progress*.75:Math.max(0,1-shotAge/160);});
  arcs.visible=charging&&progress>.15;arcs.material.opacity=progress*(.5+.3*Math.sin(stamp*.019)**2);for(let i=0;i<6;i++)for(let j=0;j<8;j++)for(let end=0;end<2;end++){const u=(j+end)/8,a=i*Math.PI/3,r=(1-u)*.42,wiggle=Math.sin(j*12.7+stamp*.032+i)*.035*Math.sin(u*Math.PI),k=(i*8+j)*6+end*3;arcArray[k]=Math.cos(a)*r+wiggle;arcArray[k+1]=Math.sin(a)*r-wiggle;arcArray[k+2]=-.25+u*.75;}arcGeo.attributes.position.needsUpdate=true;
  steam.visible=!charging;for(let i=0;i<24;i++){const u=(shotAge*.0008+i/24)%1,k=i*3;smokeArray[k]=(i%2?1:-1)*(.52+u*.16)+Math.sin(i*3.7)*u*.06;smokeArray[k+1]=.15+u*.65;smokeArray[k+2]=-.8+Math.sin(i*2.4)*.2+u*.12;}smokeGeo.attributes.position.needsUpdate=true;
  light.opacity=.35+progress*.65;lamp.intensity=gun.visible?(charging?progress*4:7):0;return stamp<end;
 }
 function update(stamp){
  if(disposed||!['play','ended'].includes(phase()))return false;const wave=currentEvent()||event,start=Number(wave.startedAt),fire=Number(wave.fireAt),end=Number(wave.endsAt);if(stamp>=end)return false;
  root.visible=stamp>=start;if(!root.visible)return true;const charging=stamp<fire,progress=charging?1:clamp((stamp-fire)/WAVE_CANNON_GROW_MS),segments=waveCannonVisibleSegments(wave,progress),fade=charging?0:Math.min(1,Math.max(.35,(end-stamp)/120));
  paths.forEach((path,i)=>updatePath(path,segments[i],charging,stamp,fade));updateWeapon(stamp);return true;
 }
 function dispose(){if(disposed)return;disposed=true;if(holder?.userData.waveCannonPose===event.id){delete holder.userData.waveCannonPose;holder.userData.arms?.forEach((a,i)=>{if(rest?.[i])a.rotation.copy(rest[i]);});}root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
 return{root,group:paths[0].group,bounceGroup:paths[1].group,gun,muzzle,update,updateWeapon,dispose};
}
