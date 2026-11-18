// Authoritative hit dimensions and propagation timing, also used for beam travel.
export const WAVE_CANNON_HALF_WIDTH=3.4;
export const WAVE_CANNON_RANGE=80;
export const WAVE_CANNON_DEVICE_FORWARD=2.1;
export const WAVE_CANNON_START=WAVE_CANNON_DEVICE_FORWARD+.5;
export const WAVE_CANNON_GROW_MS=450;
export const WAVE_CANNON_FIRE_MS=5000;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function waveCannonSegments(wave){
 const angle=Number(wave?.yaw)||0,segments=[{x:Number(wave?.x)||0,z:Number(wave?.z)||0,yaw:angle,length:WAVE_CANNON_RANGE,start:WAVE_CANNON_START}];
 const r=wave?.reflection;if(r&&Number.isFinite(Number(r.x))&&Number.isFinite(Number(r.z))){const along=(Number(r.x)-segments[0].x)*Math.sin(angle)+(Number(r.z)-segments[0].z)*Math.cos(angle);segments[0].length=clamp(along,0,WAVE_CANNON_RANGE);segments.push({x:Number(r.x),z:Number(r.z),yaw:Number(r.yaw)||0,length:WAVE_CANNON_RANGE,start:.5});}
 return segments;
}
export function waveCannonVisibleSegments(wave,progress=1){let remaining=WAVE_CANNON_RANGE*clamp(Number(progress)||0);return waveCannonSegments(wave).map(s=>{const length=Math.min(s.length,remaining);remaining=Math.max(0,remaining-s.length);return{...s,length};});}
export function waveCannonTargetOnBeam(wave,loc,progress=1){
 if(!wave||!loc||!Number.isFinite(Number(loc.x))||!Number.isFinite(Number(loc.z)))return false;
 return waveCannonVisibleSegments(wave,progress).some(s=>{const x=Number(loc.x)-s.x,z=Number(loc.z)-s.z,along=x*Math.sin(s.yaw)+z*Math.cos(s.yaw),side=Math.abs(x*Math.cos(s.yaw)-z*Math.sin(s.yaw));return along>=s.start&&along<=s.length&&side<=WAVE_CANNON_HALF_WIDTH;});
}
export function waveCannonMovementLock(game,id,stamp){
 const p=game?.players?.[id];if(game?.phase!=='play'||!p?.alive||p.disconnected||p.observer)return null;
 const events=game.waveEvents&&typeof game.waveEvents==='object'?Object.values(game.waveEvents):game.waveEvent?[game.waveEvent]:[];
 const event=events.filter(w=>w?.by===id&&Number(w.startedAt)<=stamp&&Number(w.endsAt)>stamp).sort((a,b)=>Number(b.endsAt)-Number(a.endsAt))[0];
 const until=Math.max(Number(p.waveStationaryUntil)||0,Number(event?.endsAt)||0);if(until<=stamp)return null;
 const x=Number(event?.x??p.waveStationaryX),z=Number(event?.z??p.waveStationaryZ);if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 return{x,z,yaw:Number(event?.yaw??p.yaw)||0,until};
}

// Shared immutable texels. Each effect owns its small GPU texture and releases it on exit.
let diffractionPixels;
function makeDiffractionTexture(THREE){
 const size=64;
 if(!diffractionPixels){
  diffractionPixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=(2*x+1)/size-1,dy=(2*y+1)/size-1,r=Math.hypot(dx,dy),i=(y*size+x)*4;
   const core=Math.exp(-r*r*78),halo=Math.exp(-r*r*8);
   const rays=.62*Math.exp(-Math.abs(dy)*60-Math.abs(dx)*4.1)+.21*Math.exp(-Math.abs(dx)*52-Math.abs(dy)*5.2);
   const edge=clamp((1-r)*6),alpha=clamp(core+.38*halo+rays)*edge;
   diffractionPixels[i]=145+Math.round(110*core);diffractionPixels[i+1]=207+Math.round(48*core);
   diffractionPixels[i+2]=255;diffractionPixels[i+3]=Math.round(alpha*255);
  }
 }
 const texture=new THREE.DataTexture(diffractionPixels,size,size);
 texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
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
 // Local muzzle is +0.5m; the entire device sits ahead of the character.
 // The visible beam and hit corridor begin at that world-space muzzle.
 tube(dark,0,-.08,-.65,.43,1.7);tube(steel,0,-.08,-.92,.46,.75);tube(edge,0,-.08,-1.52,.48,.13);
 mesh(new THREE.CylinderGeometry(.40,.46,.14,24),rubber,shell,0,-.08,-1.61).rotation.x=Math.PI/2;
 box(dark,0,.04,-.42,.89,.56,1.17);box(steel,0,.35,-.45,.63,.09,1.13);box(gold,0,.405,-.52,.34,.035,.46);
 for(const side of[-1,1]){box(steel,side*.49,-.07,-.66,.15,.49,.96);box(rubber,side*.575,-.04,-.70,.03,.32,.68);for(let i=0;i<5;i++)box(edge,side*.60,-.07,-1.02+i*.145,.026,.24,.025);for(const z of[-1.07,-.30])mesh(new THREE.SphereGeometry(.034,8,6),gold,shell,side*.50,.22,z);box(dark,side*.38,.21,-.20,.11,.25,.15);box(rubber,side*.38,.28,-.20,.15,.12,.20);}
 box(dark,0,-.48,-.98,.56,.23,.48);box(steel,0,-.61,-.98,.49,.07,.43);for(let i=0;i<4;i++)box(light,-.16+i*.11,-.49,-.728,.055,.13,.014);
 tube(steel,0,0,-.04,.31,.86,barrel);tube(rubber,0,0,.30,.35,.20,barrel);tube(edge,0,0,.46,.37,.08,barrel);ring(gold,0,0,.50,.35,.035,barrel);tube(rubber,0,0,.49,.26,.06,barrel);
 for(const z of[-.36,-.15,.06]){ring(dark,0,0,z,.35,.06,rotor);ring(light,0,0,z,.372,.019,rotor);}
 for(let i=0;i<6;i++){const a=i*Math.PI/3,g=new THREE.Group();g.rotation.z=a;rotor.add(g);box(edge,0,.365,-.13,.07,.065,.67,g);box(light,0,.407,-.15,.025,.018,.30,g);}
 box(dark,.48,.06,-.30,.07,.29,.43);box(light,.52,.08,-.30,.012,.11,.26);for(const y of[-.01,.06,.13])box(white,.529,y,-.30,.006,.015,.16);
 const muzzle=new THREE.Object3D();muzzle.name='wave-cannon-muzzle';muzzle.position.z=.5;gun.add(muzzle);
 // Merge the static mechanical parts by material while leaving the coil/recoil
 // assemblies articulated. No per-frame geometry generation.
 function batch(parent){for(const child of parent.children.filter(c=>c.isGroup))batch(child);const groups=new Map();for(const o of parent.children)if(o.isMesh){const list=groups.get(o.material)||[];list.push(o);groups.set(o.material,list);}for(const [mat,list]of groups){if(list.length<2)continue;const parts=list.map(o=>{o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);}),n=parts.reduce((sum,g)=>sum+g.attributes.position.count,0),g=gs(new THREE.BufferGeometry());for(const [attr,size]of[['position',3],['normal',3],['uv',2]]){const a=new Float32Array(n*size);let at=0;for(const p of parts){if(p.attributes[attr])a.set(p.attributes[attr].array,at);at+=p.attributes.position.count*size;}g.setAttribute(attr,new THREE.BufferAttribute(a,size));}g.computeBoundingSphere();parent.add(new THREE.Mesh(g,mat));list.forEach(o=>o.removeFromParent());parts.forEach(p=>p.dispose());}}
 rotor.updateWorldMatrix(true,true);for(const g of [...rotor.children])if(g.isGroup){for(const o of [...g.children])rotor.attach(o);g.removeFromParent();}batch(shell);batch(barrel);batch(rotor);
 const dotData=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,d=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);dotData.set([255,255,255,Math.round(Math.max(0,1-d)**2*255)],i);}const dot=new THREE.DataTexture(dotData,32,32);dot.magFilter=dot.minFilter=THREE.LinearFilter;dot.needsUpdate=true;textures.add(dot);
 const diffraction=makeDiffractionTexture(THREE);textures.add(diffraction);
 const orb=mesh(new THREE.SphereGeometry(1,24,16),glow(0xebffff,.9),gun,0,0,.5);
 const halo=new THREE.Sprite(ms(new THREE.SpriteMaterial({color,map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));halo.position.z=.5;gun.add(halo);
 const chargeGeo=gs(new THREE.BufferGeometry()),chargeArray=new Float32Array(96*3);chargeGeo.setAttribute('position',new THREE.BufferAttribute(chargeArray,3));const motes=new THREE.Points(chargeGeo,ms(new THREE.PointsMaterial({color,map:dot,size:.085,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));motes.frustumCulled=false;gun.add(motes);
 // A soft spill confined to the muzzle keeps the surrounding map's light count stable.
 const spill=mesh(new THREE.PlaneGeometry(1,1),glow(color,0,{map:dot,blending:THREE.AdditiveBlending}),gun,0,-.45,.62);
 spill.name='muzzle-light-spill';spill.rotation.x=-Math.PI/2;
 const arcGeo=gs(new THREE.BufferGeometry()),arcArray=new Float32Array(6*8*6);arcGeo.setAttribute('position',new THREE.BufferAttribute(arcArray,3));const arcs=new THREE.LineSegments(arcGeo,ms(new THREE.LineBasicMaterial({color:0xc6f5ff,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})));arcs.frustumCulled=false;gun.add(arcs);
 const chargeRings=[0,1].map(i=>mesh(new THREE.TorusGeometry(.43+i*.13,.015,6,48,Math.PI*1.55),glow(color,.7,{blending:THREE.AdditiveBlending}),gun,0,0,.55+i*.09));
 const iris=new THREE.InstancedMesh(gs(new THREE.TorusGeometry(1,.022,5,12,Math.PI/5)),glow(color,.75,{blending:THREE.AdditiveBlending}),8);iris.frustumCulled=false;gun.add(iris);
 const ignitionRings=new THREE.InstancedMesh(gs(new THREE.TorusGeometry(1,.026,5,48)),glow(0xc9faff,.8,{blending:THREE.AdditiveBlending}),3);ignitionRings.frustumCulled=false;gun.add(ignitionRings);
 const flash=new THREE.Sprite(ms(new THREE.SpriteMaterial({map:diffraction,color:0xebffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));flash.position.z=.52;gun.add(flash);
 const smokeGeo=gs(new THREE.BufferGeometry()),smokeArray=new Float32Array(24*3);smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokeArray,3));const steam=new THREE.Points(smokeGeo,ms(new THREE.PointsMaterial({color:0xa7c6d3,map:dot,size:.18,transparent:true,opacity:.26,depthWrite:false})));steam.frustumCulled=false;gun.add(steam);

 // Allocate eight cross sections to the short muzzle opening, even for an 80 m shot.
 // Distance along the rest of the shaft only affects the light travelling inside it.
 const beamGeo=gs(new THREE.CylinderGeometry(1,1,1,48,32,true));
 beamGeo.translate(0,.5,0);beamGeo.rotateX(Math.PI/2);
 const profileGLSL=`
   const float openingLength=.65;
   float axialDistance(float u,float span){
     float opening=min(span,openingLength);
     return opening*min(u*4.,1.)+(span-opening)*max((u-.25)/.75,0.);
   }
   float jetRadius(float z,float inlet){
     return mix(inlet,1.,smoothstep(0.,openingLength,z));
   }`;
 function plasmaMaterial(core){
  return ms(new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
   uniforms:{time:{value:0},strength:{value:0},span:{value:1},inlet:{value:.10},distanceAtInlet:{value:0},tint:{value:new THREE.Color(color)}},
   vertexShader:`
    varying float angle,z,facing;
    uniform float span,inlet;
    ${profileGLSL}
    void main(){
     angle=uv.x*6.2831853;
     z=axialDistance(uv.y,span);
     vec3 pos=vec3(position.xy*jetRadius(z,inlet),z/span);
     vec4 eye=modelViewMatrix*vec4(pos,1.);
     vec3 axis=normalize(modelViewMatrix[2].xyz);
     vec3 viewDir=isOrthographic?vec3(0.,0.,1.):normalize(-eye.xyz);
     vec3 crossView=viewDir-axis*dot(viewDir,axis);
     facing=abs(dot(normalize(normalMatrix*normal),crossView))/max(.04,length(crossView));
     gl_Position=projectionMatrix*eye;
    }`,
   fragmentShader:`
    varying float angle,z,facing;
    uniform float time,span,strength,distanceAtInlet;uniform vec3 tint;
    void main(){
     float distanceZ=z+distanceAtInlet, drift=distanceZ-time*7.;
     float eddy=.47*sin(drift*.49+angle*2.)+.21*sin(drift*.91-angle);
     float fibres=.5+.5*cos(angle*19.+eddy*2.1);
     float sheets=.5+.5*cos(angle*5.+eddy+.12*z);
     float packets=pow(.5+.5*cos(drift*1.3+angle+.62*sin(drift*.61)),5.);
     float chord=clamp(facing,0.,1.);
     float column=chord*chord;
     float rim=4.*column*(1.-column);
     vec3 deep=tint*tint*tint;
     float tip=1.-smoothstep(0.,.75,span-z);
     ${core ? `
       float spine=column*column,heat=.16+.64*spine+.10*packets;
       vec3 hue=mix(tint,vec3(1.,.985,.90),heat);
       float energy=(.11+.62*spine+.13*sheets+.18*packets+.15*pow(fibres,9.))*smoothstep(0.,.65,chord);
     ` : `
       float veil=pow(sheets,4.)*(.35+.65*packets);
       float threads=pow(fibres,15.)*(.24+.76*sheets);
       float forward=distanceZ-time*11.;
       float current=pow(.5+.5*cos(7.*angle+.35*sin(forward*.7+angle)),18.)*
                     pow(.5+.5*cos(forward*.51+angle),4.);
       vec3 hue=mix(deep,vec3(.56,.88,1.),.08+.32*threads+.28*current+.14*tip);
       float density=.12*column+.16*veil+.16*threads+.31*current+.07*rim+.12*tip;
       float energy=density*smoothstep(0.,.39,chord);
     `}
     gl_FragColor=vec4(hue,energy*strength);
     #include <colorspace_fragment>
    }`
  }));
 }
 // Internal strands stay inside the straight sheath. The light moves along each strand.
 const ribbonGeo=gs(new THREE.BufferGeometry()),ribbonCoords=[],ribbonIndices=[];
 const strands=5,slices=128;
 for(let strand=0;strand<strands;strand++)for(let j=0;j<=slices;j++){
  const index=ribbonCoords.length/3;
  for(const side of [-1,1])ribbonCoords.push(j/slices,strand*2*Math.PI/strands,side);
  if(j<slices)ribbonIndices.push(index,index+1,index+2,index+1,index+3,index+2);
 }
 ribbonGeo.setAttribute('position',new THREE.Float32BufferAttribute(ribbonCoords,3));ribbonGeo.setIndex(ribbonIndices);

 // Finite streaks share one instanced draw. Their seed, speed and depth are fixed
 // at construction so firing doesn't stream new geometry to the GPU.
 const streakGeo=gs(new THREE.InstancedBufferGeometry());
 streakGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,-1,0,1,-1,0,0,1,0,1,1,0],3));
 streakGeo.setIndex([0,1,2,2,1,3]);
 const seeds=[];
 for(let i=0;i<36;i++)seeds.push((i*.618034)%1,i*2.39996,.38+.49*((i*.75488)%1),.8+.62*((i*.56984)%1));
 streakGeo.setAttribute('seed',new THREE.InstancedBufferAttribute(new Float32Array(seeds),4));
 streakGeo.instanceCount=seeds.length/4;
 function makePath(name){
  const group=new THREE.Group();group.name=name;root.add(group);
  const outer=new THREE.Mesh(beamGeo,plasmaMaterial(false)),core=new THREE.Mesh(beamGeo,plasmaMaterial(true));
  outer.name='plasma-sheath';core.name='plasma-core';group.add(outer,core);
  const uniforms=outer.material.uniforms;
  const ribbonMaterial=ms(new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,toneMapped:false,uniforms,
   vertexShader:`
    uniform float time,span,inlet;varying float edge,z,lane;
    ${profileGLSL}
    void main(){
     edge=position.z;lane=position.y;z=axialDistance(position.x,span);
     float a=lane+z*.12+.22*sin(z*.44-time*3.+lane);
     float r=jetRadius(z,inlet)*(.57+.13*sin(lane+z*.26-time*1.8));
     a+=edge*.048;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(r*cos(a),r*sin(a),z/span,1.);
    }`,
   fragmentShader:`
    uniform vec3 tint;uniform float strength,time,distanceAtInlet;varying float edge,z,lane;
    void main(){
     float line=clamp(1.-abs(edge),0.,1.),crest=pow(.5+.5*cos((z+distanceAtInlet)*.96-time*9.8+lane),4.);
     vec3 hue=mix(tint,vec3(.96,.99,1.),.30+.65*line);
     gl_FragColor=vec4(hue,line*(.26+.64*crest)*strength);
     #include <colorspace_fragment>
    }`
  }));
  const streakMaterial=ms(new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,toneMapped:false,uniforms,
   vertexShader:`
    attribute vec4 seed;uniform float time,span,inlet;varying vec2 local;varying float envelope;
    ${profileGLSL}
    void main(){
     local=position.xy;
     float period=min(span,14.);
     float lengthZ=min(period*.35,.65+1.6*seed.w);
     // Distribute across the visible length; metres per second stay constant as the front grows.
     float head=mod(seed.x*(span+lengthZ)+time*9.*seed.w,span+lengthZ);
     float z=clamp(head-lengthZ*(1.-local.x),0.,span);
     float a=seed.y+local.y*.016, r=seed.z*jetRadius(z,inlet);
     envelope=smoothstep(0.,.08,head)*(1.-smoothstep(span,span+lengthZ,head));
     gl_Position=projectionMatrix*modelViewMatrix*vec4(r*cos(a),r*sin(a),z/span,1.);
    }`,
   fragmentShader:`
    uniform vec3 tint;uniform float strength;varying vec2 local;varying float envelope;
    void main(){
     float head=smoothstep(0.,.86,local.x)*(1.-smoothstep(.86,1.,local.x));
     float edge=1.-abs(local.y);
     gl_FragColor=vec4(mix(tint,vec3(.98,1.,1.),head*.87),head*edge*envelope*strength);
     #include <colorspace_fragment>
    }`
  }));
  const ribbons=new THREE.Mesh(ribbonGeo,ribbonMaterial),streaks=new THREE.Mesh(streakGeo,streakMaterial);
  ribbons.frustumCulled=streaks.frustumCulled=false;group.add(ribbons,streaks);
  const crown=new THREE.Sprite(ms(new THREE.SpriteMaterial({map:dot,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));
  group.add(crown);
  return {group,outer,core,ribbons,streaks,crown};
 }
 const bendFlare=new THREE.Sprite(ms(new THREE.SpriteMaterial({map:diffraction,color:0xe0fbff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));
 bendFlare.name='plasma-reflection-flare';root.add(bendFlare);
 const paths=[makePath('wave-cannon-visual'),makePath('wave-cannon-reflection')],dummy=new THREE.Object3D();
 function updatePath(path,segment,charging,stamp,fade,fireAt,distanceBeforeSegment){
  const start=segment?.start??0,span=(segment?.length??0)-start;
  path.group.visible=!charging&&span>0;if(!path.group.visible)return;
  const motion=reducedMotion()?0:(stamp-fireAt)*.001,w=WAVE_CANNON_HALF_WIDTH;
  path.group.position.set(segment.x,0,segment.z);path.group.rotation.y=segment.yaw;
  const inlet=path===paths[1]?1:.10;
  for(const u of [path.outer.material.uniforms,path.core.material.uniforms]){
   u.time.value=motion;u.span.value=span;u.strength.value=fade;u.inlet.value=inlet;u.distanceAtInlet.value=distanceBeforeSegment+start;
  }
  for(const beam of [path.outer,path.core,path.ribbons,path.streaks]){
   const radius=beam===path.core?w*.28:w;
   beam.position.set(0,.48,start);beam.scale.set(radius,radius,span);
  }
  path.crown.position.set(0,.48,segment.length);path.crown.scale.setScalar(w*2.15);path.crown.material.opacity=.50*fade;
 }
 function updateWeapon(stamp){
  if(disposed)return false;const wave=currentEvent()||event,fire=Number(wave.fireAt),end=Number(wave.endsAt),start=Number(wave.startedAt),charging=stamp<fire,progress=clamp((stamp-start)/Math.max(1,fire-start));
  const yaw=Number(wave.yaw)||0;
  gun.position.set((Number(wave.x)||0)+Math.sin(yaw)*WAVE_CANNON_DEVICE_FORWARD,.48,(Number(wave.z)||0)+Math.cos(yaw)*WAVE_CANNON_DEVICE_FORWARD);gun.rotation.y=yaw;gun.visible=stamp>=start&&stamp<end&&observable(gun.position);
  const actor=getAvatar(wave.by),arms=actor?.userData.arms;
  if(actor&&arms?.length){if(holder!==actor){holder=actor;rest=arms.map(a=>a.rotation.clone());}actor.userData.waveCannonPose=event.id;arms.forEach((a,i)=>{a.rotation.set(-1.20,0,(i?1:-1)*.38);});}
  rotor.rotation.z=reducedMotion()?0:(stamp-start)*.001*(charging?.35+progress*2:2.8);barrel.position.z=charging?0:-.24*Math.exp(-(stamp-fire)/125)-.018*(reducedMotion()?0:.5+.5*Math.sin((stamp-fire)*.055));
  const focus=clamp((progress-.78)/.22),chargeRadius=(.06+progress*.35)*(1-focus*.38);
  orb.visible=halo.visible=charging;orb.scale.setScalar(chargeRadius);halo.scale.setScalar((.15+progress*1.8)*(1-focus*.30));halo.material.opacity=.35+progress*.5;
  iris.visible=charging;iris.material.opacity=.2+progress*.65;
  if(charging){for(let i=0;i<8;i++){const r=(1.25-progress*.55)*(1-focus*.35),a=i*Math.PI/4+(reducedMotion()?0:progress*2.5);dummy.position.set(0,0,.53+(i%2)*.12);dummy.rotation.set(0,0,a);dummy.scale.setScalar(r);dummy.updateMatrix();iris.setMatrixAt(i,dummy.matrix);}iris.instanceMatrix.needsUpdate=true;}
  motes.visible=charging;if(charging){for(let i=0;i<96;i++){const u=(stamp*.00035+i/96)%1,a=i*2.39996+stamp*.0005,r=(1-u)*(1+progress*.65);chargeArray[i*3]=Math.cos(a)*r;chargeArray[i*3+1]=Math.sin(a)*r;chargeArray[i*3+2]=.5+(1-u)*(.22+i%3*.15);}chargeGeo.attributes.position.needsUpdate=true;}
  const shotAge=Math.max(0,stamp-fire),ignition=charging?0:Math.exp(-shotAge/160),surge=charging?0:(reducedMotion()?.35:.35+.10*Math.sin(shotAge*.008));flash.visible=!charging;flash.scale.set(1.05+ignition*2.6,.78+ignition*1.65,1);flash.material.opacity=ignition*.70+surge*.50;
  ignitionRings.visible=!charging&&shotAge<270&&!reducedMotion();ignitionRings.material.opacity=.58*(1-clamp(shotAge/270))**2;
  if(ignitionRings.visible){for(let i=0;i<3;i++){const u=clamp((shotAge-i*28)/235),r=.36+u*WAVE_CANNON_HALF_WIDTH*.82;dummy.position.set(0,0,.52+u*(.26+i*.12));dummy.rotation.set(0,0,0);dummy.scale.setScalar(r);dummy.updateMatrix();ignitionRings.setMatrixAt(i,dummy.matrix);}ignitionRings.instanceMatrix.needsUpdate=true;}
  chargeRings.forEach((o,i)=>{o.visible=charging||shotAge<160;o.rotation.z=(reducedMotion()?0:stamp*.003)*(i?1:-1);o.scale.setScalar(charging?.55+progress*.45:Math.max(.04,1-shotAge/160));o.material.opacity=charging?progress*.75:Math.max(0,1-shotAge/160);});
  arcs.visible=charging&&progress>.15;arcs.material.opacity=progress*(reducedMotion()?.72:.55+.25*Math.sin(stamp*.009)**2);if(arcs.visible){for(let i=0;i<6;i++)for(let j=0;j<8;j++)for(let end=0;end<2;end++){const u=(j+end)/8,a=i*Math.PI/3+u*(1.35+progress*.9)+(reducedMotion()?0:(stamp-start)*.00065),
   r=(1-u)*(.52+progress*.95),wiggle=Math.sin(u*24+i*1.7+(reducedMotion()?0:(stamp-start)*.008))*.045*Math.sin(u*Math.PI),k=(i*8+j)*6+end*3;
   arcArray[k]=Math.cos(a)*(r+wiggle);arcArray[k+1]=Math.sin(a)*(r+wiggle);arcArray[k+2]=.5+(1-u)*(.22+i%3*.12)-u*(1-u)*1.35;}arcGeo.attributes.position.needsUpdate=true;}
  steam.visible=!charging;if(steam.visible){for(let i=0;i<24;i++){const u=(shotAge*.0008+i/24)%1,k=i*3;smokeArray[k]=(i%2?1:-1)*(.52+u*.16)+Math.sin(i*3.7)*u*.06;smokeArray[k+1]=.15+u*.65;smokeArray[k+2]=-.8+Math.sin(i*2.4)*.2+u*.12;}smokeGeo.attributes.position.needsUpdate=true;}
  light.opacity=.35+progress*.65;spill.scale.set(1.4+progress*1.6,2.4+progress*2,1);spill.material.opacity=charging?progress*.44:.38+ignition*.25;return stamp<end;
 }
 function update(stamp){
  if(disposed||!['play','ended'].includes(phase()))return false;const wave=currentEvent()||event,start=Number(wave.startedAt),fire=Number(wave.fireAt),end=Number(wave.endsAt);if(stamp>=end)return false;
  root.visible=stamp>=start;if(!root.visible)return true;const charging=stamp<fire,progress=charging?1:clamp((stamp-fire)/WAVE_CANNON_GROW_MS),segments=charging?[]:waveCannonVisibleSegments(wave,progress),fade=clamp((end-stamp)/320);
  paths.forEach((path,i)=>updatePath(path,segments[i],charging,stamp,fade,fire,i===1?(segments[0]?.length??0):0));
  const bend=segments[1];bendFlare.visible=!!bend&&bend.length>bend.start;
  paths[0].crown.visible=!bendFlare.visible;
  if(bendFlare.visible){
   const arrival=fire+segments[0].length/WAVE_CANNON_RANGE*WAVE_CANNON_GROW_MS;
   const impulse=Math.exp(-Math.max(0,stamp-arrival)/200);
   bendFlare.position.set(bend.x,.48,bend.z);bendFlare.scale.set(2.7+impulse*3.4,2.1+impulse*2.2,1);
   bendFlare.material.opacity=(.34+impulse*.6)*fade;
  }
  updateWeapon(stamp);return true;
 }
 function dispose(){if(disposed)return;disposed=true;if(holder?.userData.waveCannonPose===event.id){delete holder.userData.waveCannonPose;holder.userData.arms?.forEach((a,i)=>{if(rest?.[i])a.rotation.copy(rest[i]);});}root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
 return{root,group:paths[0].group,bounceGroup:paths[1].group,gun,muzzle,update,updateWeapon,dispose};
}
