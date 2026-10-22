// Serialized with the authored player: no second renderer, opaque stage, or video.
// The original role scenes still own their cues. These assets add articulated
// props, distance-based footsteps, readable framing and bounded GPU effects.
export function createCinematicArt(THREE) {
  const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const mix=(a,b,n)=>a+(b-a)*n;
  const pulse=(t,start,span)=>t<start?0:Math.exp(-(t-start)/span);
  const eased=(t,keys)=>{for(let i=1;i<keys.length;i++)if(t<keys[i][0])return mix(keys[i-1][1],keys[i][1],smooth((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));return keys.at(-1)[1];};
  let seed=721;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const metal=(color=0x556476,roughness=.29,metalness=.75)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const glow=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
  const mesh=(parent,geo,mat,pos=V(),rot=null)=>{const o=new THREE.Mesh(geo,mat);o.position.copy(pos);if(rot)o.rotation.set(...rot);parent.add(o);return o;};
  function rounded(w,h,d,r=.05){
    r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),x=-w/2+r,y=-h/2+r;
    s.moveTo(x+r,y);s.lineTo(x+w-3*r,y);s.quadraticCurveTo(x+w-2*r,y,x+w-2*r,y+r);s.lineTo(x+w-2*r,y+h-3*r);s.quadraticCurveTo(x+w-2*r,y+h-2*r,x+w-3*r,y+h-2*r);s.lineTo(x+r,y+h-2*r);s.quadraticCurveTo(x,y+h-2*r,x,y+h-3*r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r});g.translate(0,0,-d/2+r);return g;
  }
  function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.025){return mesh(parent,rounded(w,h,d,r),mat,V(x,y,z));}
  function rod(parent,a,b,r,mat,r2=r){const direction=b.clone().sub(a),o=mesh(parent,new THREE.CylinderGeometry(r2,r,direction.length(),12),mat,a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return o;}
  function tube(parent,pts,r,mat){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,r,8,false),mat);}
  function ring(parent,r,width,mat,pos=V(),rotation=[Math.PI/2,0,0]){return mesh(parent,new THREE.TorusGeometry(r,width,8,64),mat,pos,rotation);}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
  // The small fittings share one draw per material; they do not each cost a
  // separate draw on a phone. Animated limbs and identity materials stay intact.
  function compact(parent,keep=new Set()){
    parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),buckets=new Map(),removed=[];
    function visit(o){if(keep.has(o))return;if(o.isMesh&&!Array.isArray(o.material)){
      const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);removed.push(o);
    }for(const c of o.children)visit(c);}
    for(const c of [...parent.children])visit(c);
    for(const [mat,geometries]of buckets){
      const geometry=new THREE.BufferGeometry();
      for(const name of ['position','normal','uv']){
        if(!geometries.every(g=>g.getAttribute(name)))continue;const size=geometries[0].getAttribute(name).itemSize;
        const array=new Float32Array(geometries.reduce((n,g)=>n+g.getAttribute(name).array.length,0));let offset=0;
        for(const g of geometries){array.set(g.getAttribute(name).array,offset);offset+=g.getAttribute(name).array.length;}
        geometry.setAttribute(name,new THREE.BufferAttribute(array,size));
      }
      mesh(parent,geometry,mat);geometries.forEach(g=>g.dispose());
    }
    for(const o of removed){o.geometry.dispose();o.removeFromParent();}
  }
  const shineTexture=canvasTexture(256,128,(g,w,h)=>{const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#ffffff00');grad.addColorStop(.38,'#dfffff00');grad.addColorStop(.42,'#eeffffb0');grad.addColorStop(.49,'#efffff90');grad.addColorStop(.54,'#fff0');grad.addColorStop(.74,'#c2efff00');grad.addColorStop(.79,'#c2efff70');grad.addColorStop(.85,'#c2efff00');g.fillStyle=grad;g.fillRect(0,0,w,h);});
  const softTexture=canvasTexture(128,128,(g,w,h)=>{const a=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);a.addColorStop(0,'#fff');a.addColorStop(.15,'#ffffffd0');a.addColorStop(.45,'#ffffff35');a.addColorStop(1,'#fff0');g.fillStyle=a;g.fillRect(0,0,w,h);});

  function makeGameplayCrew(color,arms) {
    // Match makeAstronaut's capsule, visor and limb proportions. Keep the same
    // articulated pivots as the authored choreography and selected costumes.
    const root=new THREE.Group(),rig=new THREE.Group(),torso=new THREE.Group();root.add(rig);torso.position.y=.62;rig.add(torso);
    const suit=new THREE.MeshStandardMaterial({color,roughness:.65,side:THREE.DoubleSide});
    const visorM=new THREE.MeshStandardMaterial({color:0xa6e8ff,metalness:.45,roughness:.2});
    const body=mesh(torso,new THREE.CapsuleGeometry(.42,.48,5,10),suit,V(0,.38,0));
    const pack=mesh(torso,new THREE.BoxGeometry(.6,.68,.3),suit,V(0,.36,-.43));pack.visible=false;
    const visor=mesh(torso,new THREE.SphereGeometry(.35,12,8),visorM,V(0,.56,.37));visor.scale.set(1,.64,.48);
    const legs=[-1,1].map(side=>{const pivot=new THREE.Group();pivot.position.set(side*.24,.62,0);rig.add(pivot);mesh(pivot,new THREE.CapsuleGeometry(.17,.24,3,8),suit,V(0,-.37,0));return pivot;});
    const armsG=[-1,1].map(side=>{const pivot=new THREE.Group();pivot.position.set(side*.36,.46,.02);pivot.visible=arms;torso.add(pivot);const segment=mesh(pivot,new THREE.CapsuleGeometry(.105,.30,5,10),suit,V(0,-.04,0));segment.rotation.z=side*.08;const hand=new THREE.Group();hand.position.y=-.36;pivot.add(hand);pivot.userData.hand=hand;return pivot;});
    root.userData.gameplayCharacter=true;
    return {root,rig,torso,body,pack,visor,visorM,suit,legs,arms:armsG,hands:armsG.map(a=>a.userData.hand),mats:[suit,visorM]};
  }
  function makeCrew(color=0x44c8ff,{arms=false,gameplay=false}={}) {
    if(gameplay)return makeGameplayCrew(color,arms);
    const root=new THREE.Group(),rig=new THREE.Group(),torso=new THREE.Group();root.add(rig);torso.position.y=.62;rig.add(torso);
    const suit=new THREE.MeshPhysicalMaterial({color,roughness:.32,metalness:.16,clearcoat:.5,clearcoatRoughness:.3});
    const dark=metal(0x192939,.52,.35),trim=metal(0x4b6576,.3,.65);
    const body=mesh(torso,new THREE.CapsuleGeometry(.43,.55,12,40),suit,V(0,.43,0));
    const pack=mesh(torso,new THREE.CapsuleGeometry(.25,.42,8,24),suit,V(0,.4,-.4));pack.scale.z=.72;
    box(pack,.32,.42,.06,dark,0,.02,-.18,.03);
    for(let i=0;i<5;i++)box(pack,.22,.019,.018,trim,0,-.1+i*.06,-.22,.004);
    for(const s of [-1,1]){box(pack,.055,.5,.055,trim,s*.18,0,-.14,.014);mesh(pack,new THREE.SphereGeometry(.028,10,8),glow(0x8deaff,.8),V(s*.14,.29,-.14));}
    const bezel=mesh(torso,new THREE.SphereGeometry(1,40,24),dark,V(0,.61,.355));bezel.scale.set(.405,.265,.19);
    const visorM=new THREE.MeshPhysicalMaterial({color:0x8bd7ee,roughness:.12,metalness:.45,clearcoat:1,clearcoatRoughness:.09,emissive:0x143f58,emissiveIntensity:.4});
    const visor=mesh(torso,new THREE.SphereGeometry(1,40,24),visorM,V(0,.615,.385));visor.scale.set(.376,.23,.182);
    const reflection=mesh(torso,new THREE.SphereGeometry(1,32,20),new THREE.MeshBasicMaterial({map:shineTexture,transparent:true,opacity:.47,depthWrite:false}),V(0,.615,.386));reflection.scale.set(.379,.233,.184);
    const seal=ring(torso,.335,.014,dark,V(0,-.047,0));seal.scale.z=.91;
    // Fine seams and suit fittings follow the body instead of floating over it.
    for(const side of [-1,1]){
      tube(torso,[V(side*.315,.02,.26),V(side*.385,.2,.23),V(side*.397,.48,.15)],.009,trim);
      box(torso,.055,.08,.022,trim,side*.33,.02,.27,.01);
    }
    const legs=[-1,1].map(side=>{const p=new THREE.Group();p.position.set(side*.23,.62,0);rig.add(p);
      mesh(p,new THREE.CapsuleGeometry(.18,.26,8,24),suit,V(0,-.3,0));
      box(p,.34,.17,.42,dark,0,-.48,.035,.045);box(p,.35,.043,.43,trim,0,-.558,.039,.012);
      for(const z of [-.08,.04,.16])box(p,.28,.009,.022,dark,0,-.584,z,.003);
      ring(p,.17,.014,trim,V(0,-.39,0));return p;});
    const armsG=[-1,1].map(side=>{const p=new THREE.Group();p.position.set(side*.47,.62,.04);p.visible=arms;torso.add(p);
      mesh(p,new THREE.CapsuleGeometry(.105,.28,8,20),suit,V(0,-.23,0));
      ring(p,.103,.019,trim,V(0,-.37,0));
      const hand=new THREE.Group();hand.position.y=-.52;p.add(hand);
      const glove=mesh(hand,new THREE.SphereGeometry(1,20,14),dark,V(0,.03,.01));glove.scale.set(.116,.136,.108);
      for(let i=0;i<3;i++)box(hand,.022,.07,.025,trim,-.05+i*.05,.035,.095,.007);
      p.userData.hand=hand;return p;});
    compact(pack);for(const p of legs)compact(p);for(const a of armsG){compact(a.userData.hand);compact(a,new Set([a.userData.hand]));}
    compact(torso,new Set([body,pack,bezel,visor,reflection,...armsG]));
    const mats=new Set();root.traverse(o=>{if(o.isMesh){o.castShadow=false;mats.add(o.material);if(o.material.transparent){o.material.userData.cinematicTransparent=true;o.material.userData.cinematicOpacity=o.material.opacity;}}});
    return {root,rig,torso,body,pack,visor,visorM,suit,legs,arms:armsG,hands:armsG.map(a=>a.userData.hand),mats:[...mats]};
  }

  function blade(parent,{length=.78,katana=false,accent=0xa9e5ff}={}){
    const g=new THREE.Group();parent.add(g);const steel=metal(0xc8e0ec,.2,.9),edge=metal(0xf1fbff,.12,.85),grip=metal(0x142232,.65,.2),gold=metal(katana?0xcaa66a:0x7293a5,.27,.8);
    rod(g,V(0,.13,0),V(0,-.15,0),.045,grip);
    for(let i=0;i<7;i++){const band=ring(g,.045,.009,gold,V(0,.105-i*.034,0));if(katana)band.rotation.z=.12;}
    const guard=box(g,katana?.25:.2,.045,.115,gold,0,-.165,0,.014);
    if(katana){guard.rotation.y=.15;mesh(g,new THREE.SphereGeometry(.055,12,8),gold,V(0,.14,0));}
    const shape=new THREE.Shape();shape.moveTo(-.045,-.19);shape.lineTo(-.047,-length+.04);shape.quadraticCurveTo(-.02,-length-.14,.045,-length-.19);shape.lineTo(.059,-length+.06);shape.lineTo(.06,-.19);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.027,bevelEnabled:true,bevelThickness:.006,bevelSize:.007,bevelSegments:2,steps:1});geo.translate(0,0,-.013);mesh(g,geo,steel);
    rod(g,V(.06,-.21,.019),V(.046,-length+.035,.019),.006,edge);
    rod(g,V(-.028,-.23,.021),V(-.028,-length+.1,.021),.004,glow(accent,.42));
    g.userData.tip=V(0,-length-.18,0);g.userData.base=V(0,-.19,0);compact(g);return g;
  }
  function gun(parent,{machine=false,cannon=false}={}){
    const g=new THREE.Group();parent.add(g);g.rotation.x=Math.PI/2;
    const dark=metal(0x152332,.4,.68),steel=metal(0x6f91a5,.24,.88),black=metal(0x070e16,.42,.38),copper=metal(0xd0a264,.28,.8);
    box(g,.23,.25,machine?.73:.41,dark,0,.04,.15,.035);
    const barrelLength=machine?.73:.38,barrelStart=machine?.46:.34;
    rod(g,V(0,.08,barrelStart),V(0,.08,barrelStart+barrelLength),cannon?.12:.045,steel);
    for(let i=0;i<(machine?5:2);i++){
      const rr=ring(g,cannon?.13:.065,.014,dark,V(0,.08,barrelStart+.06+i*.11),[0,0,0]);rr.rotation.x=0;
      if(cannon){const coil=ring(g,.16,.017,glow(0x71f0ff,.8),V(0,.08,barrelStart+.08+i*.12),[0,0,0]);coil.rotation.x=0;}
    }
    const muzzle=new THREE.Group();muzzle.position.set(0,.08,barrelStart+barrelLength+.045);g.add(muzzle);
    rod(g,V(0,.08,barrelStart+barrelLength-.06),V(0,.08,barrelStart+barrelLength+.04),cannon?.145:.073,black);
    box(g,.11,.28,.13,black,0,-.18,.02,.025).rotation.x=-.18;
    box(g,.18,.055,.065,copper,0,.2,.25,.012);
    if(machine){
      box(g,.18,.33,.27,dark,0,-.2,.29,.022).rotation.x=.2;
      box(g,.2,.18,.35,black,0,.015,-.34,.035);
      for(let i=0;i<7;i++)box(g,.025,.04,.39,steel,-.09+i*.03,.19,.27,.005);
      for(let i=0;i<4;i++)rod(g,V(.14,-.14-i*.04,.18+i*.025),V(.14,-.14-i*.04,.26+i*.025),.021,copper);
    }else{
      const badge=mesh(g,new THREE.CylinderGeometry(.05,.05,.012,6),copper,V(.123,.03,.08),[0,0,Math.PI/2]);badge.rotation.y=.2;
      rod(g,V(0,.17,.44),V(0,.22,.44),.012,steel);
    }
    if(cannon){
      const energy=glow(0x62e7ff,.8),alloy=metal(0x3e596a,.27,.85);
      box(g,.38,.33,.55,dark,0,.035,.3,.05);
      rod(g,V(0,.08,.32),V(0,.08,.79),.205,black,.235);
      for(let i=0;i<5;i++){
        ring(g,.229,.021,alloy,V(0,.08,.35+i*.092),[0,0,0]);
        ring(g,.208,.014,energy,V(0,.08,.386+i*.092),[0,0,0]);
      }
      for(const s of [-1,1]){
        box(g,.075,.29,.58,alloy,s*.247,.08,.48,.022);
        box(g,.026,.15,.44,energy,s*.288,.08,.48,.006);
        rod(g,V(s*.29,.025,.12),V(s*.29,.025,.49),.074,dark);
        for(let i=0;i<3;i++)box(g,.032,.11,.027,copper,s*.292,.25,.13+i*.047,.006).rotation.x=-.3;
        for(let i=0;i<4;i++)box(g,.05,.035,.045,steel,s*.2,.23,.24+i*.07,.005);
      }
      const muzzleArmor=ring(g,.23,.045,alloy,V(0,.08,.805),[0,0,0]);muzzleArmor.scale.y=.9;
      ring(g,.166,.02,energy,V(0,.08,.85),[0,0,0]);muzzle.position.z=.87;
    }
    compact(g);return {root:g,muzzle};
  }
  function fan(parent){
    const g=new THREE.Group();parent.add(g);const paper=metal(0xfff2cd,.76,.03),wood=metal(0x895c3c,.8,.1);
    rod(g,V(0,.06,0),V(0,-.45,0),.04,wood);
    for(let i=0;i<9;i++){const fold=box(g,.07,.8,.035,paper,(i-4)*.057,-.79,(i%2)*.045,.008);fold.rotation.z=-(i-4)*.015;}
    box(g,.54,.07,.08,metal(0xc98651,.62,.15),0,-.45,.01,.015);compact(g);g.scale.setScalar(1.75);return g;
  }
  function bombCluster(parent){
    const group=new THREE.Group();parent.add(group);const casing=metal(0x243747,.34,.68),rim=metal(0x7d94a1),fuse=metal(0xb49363,.75,.08),led=glow(0xff392e,.85);
    for(let i=0;i<7;i++){
      const b=new THREE.Group();group.add(b);const a=i/6*Math.PI*2;
      b.position.set(i<6?Math.sin(a)*.55:0,i<6?.83+(i%2)*.32:1.18,i<6?Math.cos(a)*.5:.6);b.scale.setScalar(i<6?.8:1);
      mesh(b,new THREE.SphereGeometry(.24,24,18),casing);ring(b,.24,.015,rim,V(),[0,0,0]);
      box(b,.13,.1,.04,metal(0x0b1119),0,.02,.225,.01);box(b,.045,.045,.012,led,0,.02,.254,.004);
      tube(b,[V(0,.22,0),V(.01,.36,0),V(.1,.4,0),V(.14,.34,0)],.014,fuse);
    }
    compact(group);return {root:group,led};
  }
  function eraseFromFeetMaterial(original,uniforms){
    if(Array.isArray(original))return original.map(m=>eraseFromFeetMaterial(m,uniforms));
    const material=original.clone();material.customProgramCacheKey=()=> 'ssx-floor-erasure-1';
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEraseWorld;').replace('#include <project_vertex>',`#include <project_vertex>
        vec4 eraseWorld=vec4(transformed,1.);
        #ifdef USE_BATCHING
          eraseWorld=batchingMatrix*eraseWorld;
        #endif
        #ifdef USE_INSTANCING
          eraseWorld=instanceMatrix*eraseWorld;
        #endif
        vEraseWorld=(modelMatrix*eraseWorld).xyz;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEraseWorld;uniform float uEraseHeight;')
        .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vEraseWorld.y<uEraseHeight)discard;float eraseEdge=1.-smoothstep(0.,.075,vEraseWorld.y-uEraseHeight);')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.22,.12,.6)*eraseEdge;');
    };return material;
  }
  function newBurst(scene,{count=90,color=0xffbb69,shards=false,speed=3,gravity=3,life=.7}={}){
    const mat=shards?metal(color,.35,.55):glow(color,.85);
    const inst=new THREE.InstancedMesh(shards?new THREE.IcosahedronGeometry(1,0):new THREE.BoxGeometry(1,1,1),mat,count);inst.frustumCulled=false;inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(inst);inst.visible=false;
    const samples=Array.from({length:count},()=>{const az=random()*Math.PI*2,up=random()*1.6-.55,r=Math.sqrt(1-Math.min(1,up*up));return {v:V(Math.cos(az)*r,up,Math.sin(az)*r).normalize().multiplyScalar(speed*(.35+random()*.75)),life:life*(.65+random()*.5),size:(shards?.045:.011)*(1+random()),spin:random()*6,phase:random()*5};});
    const dummy=new THREE.Object3D(),dir=V(),origin=V();let start=-1;
    return {object:inst,fire(t,p){start=t;origin.copy(p);},update(t){const age=t-start;inst.visible=start>=0&&age>=0&&age<life*1.2;if(!inst.visible)return;for(let i=0;i<count;i++){const p=samples[i],f=clamp(age/p.life),fade=1-f;dummy.position.copy(origin).addScaledVector(p.v,age);dummy.position.y-=gravity*age*age*.5;
      dir.copy(p.v);dir.y-=gravity*age;dummy.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());dummy.rotateY(p.phase+age*p.spin);dummy.scale.set(p.size*fade,(shards?p.size:p.size*(5+7*fade))*fade,p.size*fade);if(f===1)dummy.scale.setScalar(0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}inst.instanceMatrix.needsUpdate=true;}};
  }
  function flame(parent,scale=1,phase=0){
    const uniforms={uTime:{value:0},uAlpha:{value:0},uPhase:{value:phase}};
    const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,
      vertexShader:'uniform float uTime,uPhase;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;float f=uv.y; p.x+=sin(f*9.-uTime*7.+uPhase)*f*.12; p.z+=sin(f*12.+uTime*5.+uPhase)*f*.06;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
      fragmentShader:'uniform float uTime,uAlpha,uPhase;varying vec2 vUv;void main(){float h=vUv.y;float w=(1.-h)*.43+.02;float sway=sin(h*13.-uTime*6.+uPhase)*.07*h;float a=(1.-smoothstep(w*.25,w,abs(vUv.x-.5+sway)))*smoothstep(0.,.12,h)*(1.-smoothstep(.73,1.,h));float ripple=.7+.3*sin(h*22.-uTime*12.+uPhase);vec3 c=mix(vec3(.85,.045,.003),vec3(1.,.58,.045),pow(1.-h,1.6));gl_FragColor=vec4(c,a*ripple*uAlpha*.8);}'
    });
    const o=mesh(parent,new THREE.PlaneGeometry(1,1.8,8,18),mat,V(0,.9*scale,0));o.scale.setScalar(scale);return {object:o,update(t,a){uniforms.uTime.value=t;uniforms.uAlpha.value=a;}};
  }

  // Corrode the real suit, glass and costume materials. Keeping their PBR
  // shading avoids replacing the player with a flat green procedural blob.
  function corrosionMaterial(original,uniforms){
    const material=original.clone();
    material.customProgramCacheKey=()=> 'ssx-venom-corrosion-2';
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      const shared='uniform float uT,uCrack,uTime;uniform vec3 uC;varying vec3 vVenomWorld;';
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+shared)
        .replace('#include <project_vertex>',`vec4 venomWorld=vec4(transformed,1.0);
          #ifdef USE_BATCHING
            venomWorld=batchingMatrix*venomWorld;
          #endif
          #ifdef USE_INSTANCING
            venomWorld=instanceMatrix*venomWorld;
          #endif
          venomWorld=modelMatrix*venomWorld;
          vVenomWorld=venomWorld.xyz;
          float settle=smoothstep(.08,.96,uT);
          venomWorld.y=mix(venomWorld.y,.026+max(venomWorld.y,0.)*.025,settle);
          venomWorld.xz=uC.xz+(venomWorld.xz-uC.xz)*(1.+settle*.16);
          vec4 mvPosition=viewMatrix*venomWorld;
          gl_Position=projectionMatrix*mvPosition;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        ${shared}
        float venomHash(vec3 p){p=fract(p*.3183099+.17);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
        float venomNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(venomHash(i),venomHash(i+vec3(1,0,0)),f.x),mix(venomHash(i+vec3(0,1,0)),venomHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(venomHash(i+vec3(0,0,1)),venomHash(i+vec3(1,0,1)),f.x),mix(venomHash(i+vec3(0,1,1)),venomHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
        float venomFbm(vec3 p){return venomNoise(p)*.6+venomNoise(p*2.13)*.27+venomNoise(p*4.31)*.13;}`)
        .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          float venomN=venomFbm(vVenomWorld*5.2);
          float venomCut=uT*1.17-.08;
          if(venomN<venomCut)discard;
          float venomRidge=abs(venomFbm(vVenomWorld*7.1)-.48);
          float venomCrack=(1.-smoothstep(.008,.023,venomRidge))*uCrack;
          float venomEdge=(1.-smoothstep(.006,.05,venomN-venomCut))*step(.005,uT);`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.032,.067,.05),uCrack*.12+uT*.3);`)
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          totalEmissiveRadiance+=vec3(.035,.33,.12)*(venomCrack*.5+venomEdge*.9);`);
    };
    return material;
  }

  function mount({scene,camera,renderer,role,attacker,victims,props={},payload={},duration=3}) {
    const primary=victims[0],all=[attacker,...victims],effects=new THREE.Group();scene.add(effects);
    if(role==='samurai')primary.root.position.z=.05;
    const accents={impostor:0xff9271,jackal:0xf0a154,sheriff:0xffd591,triggerHappy:0xffd591,samurai:0xaeeeff,slugger:0xffd879,vampire:0xc65dff,viper:0x9dff83,penguin:0x9ad8ed,rocket:0xffc365,arsonist:0xff9d38,conjurer:0xba9cff,waveCannon:0x68edff,suicideBomber:0xffb760};
    const accent=accents[role]||0xffae8c;
    const contacts={impostor:1.42,jackal:.7,sheriff:1,triggerHappy:.65,samurai:.32,slugger:.82,vampire:2.4,viper:.84,penguin:1.9,rocket:2.12,arsonist:.35,conjurer:.85,waveCannon:1.15,suicideBomber:1.1};
    const contact=contacts[role]||.8;
    const hitPoint=V(),world=V(),cameraTarget=V(),cameraPos=V();
    const subjectBounds=new THREE.Box3(),partBounds=new THREE.Box3(),corner=V();
    const sparks=newBurst(effects,{color:accent,count:110,speed:3.8,life:.65});
    const fragments=newBurst(effects,{color:0xb1c5d1,count:60,shards:true,speed:2.5,life:1.05});
    const glint=new THREE.Sprite(new THREE.SpriteMaterial({map:softTexture,color:accent,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glint.scale.set(1.1,1.1,1);effects.add(glint);
    const halo=ring(effects,.1,.007,glow(accent,0),V(),[0,0,0]);
    const light=new THREE.PointLight(accent,0,8,2);effects.add(light);
    // Reflection cards are an environment map only; the background stays alpha.
    const env=canvasTexture(512,256,(g,w,h)=>{const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#7391aa');grad.addColorStop(.38,'#b6d9e8');grad.addColorStop(.52,'#17283b');grad.addColorStop(1,'#080f19');g.fillStyle=grad;g.fillRect(0,0,w,h);g.fillStyle='#eaf9ff';g.fillRect(75,20,24,112);g.fillStyle='#6d9bd0';g.fillRect(355,40,65,85);g.fillStyle='#ffe2bf';g.fillRect(195,50,14,72);});env.mapping=THREE.EquirectangularReflectionMapping;
    const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);scene.environment=environment.texture;env.dispose();pmrem.dispose();
    scene.traverse(o=>{if(o.isLight&&o.castShadow)o.castShadow=false;if(o.isHemisphereLight)o.intensity=1.3;});
    const fill=new THREE.DirectionalLight(0xd2eeff,1.6);fill.position.set(1,3,6);scene.add(fill);
    const rim=new THREE.DirectionalLight(0x91c9ff,2.6);rim.position.set(3,3,-3);scene.add(rim);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=false;
    // Keep resource ownership explicit for the shared renderer's next scene.
    effects.userData.dispose=()=>environment.dispose();
    all.forEach((actor,index)=>{actor.userData={distance:0,lastX:actor.root.position.x,lastZ:actor.root.position.z};actor._identity=new THREE.Color(index===0?payload.killerColor||actor.suit.color:payload.victims?.[index-1]?.color||payload.victimColor||actor.suit.color);});
    const hideOld=group=>{if(group)for(const child of group.children)child.visible=false;};
    let heroWeapon=null,muzzle=null,beam=null,rocket=null,fireGroups=[],cannon=null,magic=null,bombs=null,poison=null,blood=null,erase=null;
    const slashTimes=[.32,.47,.62,.77,.92];
    const timedBursts=[],ribbons=[];
    const fired=new Set();
    const once=(key,yes,fn)=>{if(yes&&!fired.has(key)){fired.add(key);fn();}};

    if(role==='impostor'){
      for(const [name,old] of Object.entries(props.weapons||{})){
        hideOld(old);if(name!=='hammer'){const b=blade(old,{length:name==='sword'?1.65:.7,katana:name==='sword'});old.userData.tip=b.userData.tip;old.userData.base=b.userData.base;if(name==='knife')heroWeapon=b;}
        else {const m=metal(0x72869a,.22,.85);rod(old,V(0,.1,0),V(0,-1.1,0),.055,metal(0x192331,.6,.3));box(old,.73,.42,.38,m,0,-1.1,0,.06);}
      }
    }
    if(role==='jackal'||role==='samurai'||role==='sheriff'){
      heroWeapon=blade(attacker.hands[1],{length:role==='samurai'?1.38:.68,katana:role==='samurai',accent});
      if(props.gun)props.gun.visible=false;
      if(role==='samurai'){
        const sheath=new THREE.Group();attacker.torso.add(sheath);sheath.position.set(-.32,-.02,-.12);sheath.rotation.set(.5,0,-.7);rod(sheath,V(),V(0,-1.25,0),.062,metal(0x102030,.35,.6));ring(sheath,.063,.018,metal(0xd2b780),V(0,-.08,0));
      }
    }
    if(role==='triggerHappy'||role==='waveCannon'){
      if(props.gun)props.gun.visible=false;if(props.coreG)props.coreG.visible=false;
      cannon=gun(attacker.hands[1],{machine:role==='triggerHappy',cannon:role==='waveCannon'});muzzle=cannon.muzzle;
      if(role==='waveCannon'){
        cannon.root.scale.setScalar(1.45);
        const beamRoot=new THREE.Group();effects.add(beamRoot);const layers=[{r:.34,c:0xdfffff,a:.95},{r:.62,c:0x8af6ff,a:.6},{r:.92,c:0x39bddf,a:.2}];
        layers.forEach(l=>mesh(beamRoot,new THREE.CylinderGeometry(l.r,l.r,1,24,1,true),glow(l.c,l.a)));
        beam={root:beamRoot,charge:new THREE.Sprite(new THREE.SpriteMaterial({map:softTexture,color:0x98f8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}))};effects.add(beam.charge);
        if(props.floorLine)props.floorLine.visible=false;if(props.hitRip)props.hitRip.visible=false;
      }
    }
    if(role==='slugger'){if(props.hari)props.hari.visible=false;fan(attacker.hands[1]);}
    if(role==='rocket'){
      attacker.rig.visible=false;if(props.fin)props.fin.visible=false;if(props.pad)props.pad.visible=false;
      (props.smoke||[]).forEach(s=>s.visible=false);if(props.flame)props.flame.visible=false;
      rocket=new THREE.Group();effects.add(rocket);const white=metal(0xcedce4,.3,.56),red=metal(0xc7493c,.32,.52),dark=metal(0x223346,.3,.8);
      mesh(rocket,new THREE.CylinderGeometry(.38,.43,2.25,40),white,V(0,1.39,0));
      mesh(rocket,new THREE.ConeGeometry(.38,.85,40),red,V(0,2.94,0));
      for(const y of [.4,.72,2.38])ring(rocket,.421,.025,dark,V(0,y,0));
      for(let i=0;i<4;i++){const group=new THREE.Group();group.rotation.y=i*Math.PI/2;rocket.add(group);
        const sh=new THREE.Shape();sh.moveTo(.36,.32);sh.lineTo(.77,.1);sh.lineTo(.68,.85);sh.lineTo(.38,1.25);sh.closePath();
        const fin=mesh(group,new THREE.ExtrudeGeometry(sh,{depth:.055,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2,steps:1}),red);fin.position.z=-.027;
      }
      rod(rocket,V(0,.27,0),V(0,.02,0),.22,dark,.3);
      const port=mesh(rocket,new THREE.CylinderGeometry(.145,.145,.05,32),dark,V(0,2.2,.38),[Math.PI/2,0,0]);
      mesh(port,new THREE.CircleGeometry(.11,32),metal(0x60cfe2,.12,.4),V(0,.027,0),[-Math.PI/2,0,0]);
      // Harness is in front of the rocket so the actual victim remains visible.
      for(const y of [1.03,1.54]){const belt=box(rocket,.83,.06,.055,dark,0,y,1.025,.018);box(belt,.14,.105,.03,metal(0xc9ad70),0,0,.04,.014);}
      for(const x of [-.29,.29])box(rocket,.055,.68,.05,dark,x,1.31,1.025,.014);
      const exhaust=new THREE.Group();rocket.add(exhaust);exhaust.position.y=.05;exhaust.rotation.z=Math.PI;
      fireGroups=[flame(exhaust,1.6),flame(exhaust,1.25,2.8)];fireGroups[1].object.rotation.y=Math.PI/2;
      compact(rocket,new Set([exhaust]));
      for(let i=0;i<4;i++){const b=newBurst(effects,{count:80,color:[0xffca74,0x78e7ff,0xff84c1,0xbdadff][i],speed:2.7,life:.84,gravity:1.8});timedBursts.push(b);}
    }
    if(role==='arsonist'){
      // Replace the old single box with a formed fuel can, handle and nozzle.
      attacker.hands[1].children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry').forEach(o=>o.visible=false);
      const can=new THREE.Group();attacker.hands[1].add(can);can.position.y=-.22;
      const red=metal(0xb84426,.42,.42),steel=metal(0x4c6376,.3,.8);
      box(can,.35,.48,.25,red,0,-.12,0,.045);box(can,.22,.11,.14,steel,0,.17,0,.025);box(can,.12,.06,.2,red,0,.17,0,.02);
      const cap=rod(can,V(.13,.1,.02),V(.24,.22,.02),.041,steel);cap.rotation.z=-.4;
      for(const sign of [-1,1]){const line=rod(can,V(-.11,-.3,sign*.14),V(.11,.07,sign*.14),.012,steel);line.material=steel;rod(can,V(.11,-.3,sign*.14),V(-.11,.07,sign*.14),.012,steel);}
      for(let i=0;i<victims.length;i++){
        const group=new THREE.Group();effects.add(group);const tongues=Array.from({length:5},(_,k)=>{const f=flame(group,.76+(k%3)*.18,k*2.1);f.object.position.x=(k-2)*.17;f.object.position.z=.59+(k%2)*.09;return f;});fireGroups.push({root:group,tongues});
      }
    }
    if(role==='conjurer'){
      erase={uEraseHeight:{value:-1}};primary.root.traverse(o=>{if(o.isMesh)o.material=eraseFromFeetMaterial(o.material,erase);});
      magic=new THREE.Group();effects.add(magic);magic.position.copy(primary.root.position);const g=glow(0xab8aff,.75);
      for(const [i,r] of [1,1.22,1.36].entries()){const t=ring(magic,r,.012,g.clone(),V(0,.025+i*.008,0));t.userData.index=i;}
      for(let i=0;i<12;i++){const a=i*Math.PI/6,group=new THREE.Group();group.position.set(Math.sin(a)*1.22,.04,Math.cos(a)*1.22);group.rotation.y=a;magic.add(group);
        const s=.07;for(let k=0;k<3;k++)rod(group,V(-s,0,k*.06),V(s,0,k*.06+s*(k%2)),.007,g);
      }
      for(let i=0;i<3;i++){const a=i*2*Math.PI/3;const pillar=new THREE.Group();pillar.position.set(Math.sin(a)*1.1,0,Math.cos(a)*1.1);magic.add(pillar);tube(pillar,[V(0,.1,0),V(.08,.65,.03),V(-.06,1.3,-.03),V(0,1.95,0)],.018,g);}
    }
    if(role==='suicideBomber'){
      if(props.bomb)props.bomb.visible=false;if(props.fuse)props.fuse.visible=false;
      bombs=bombCluster(attacker.rig);attacker.root.position.x=-.9;
      if(payload.selfDestruct&&!payload.victims?.length)primary.root.visible=false;
      fireGroups=[flame(effects,2.2),flame(effects,1.9,2.2),flame(effects,1.5,4.2)];
      fireGroups.forEach((f,i)=>f.object.position.set(-.9+(i-1)*.45,1.1,0));
    }
    if(role==='vampire'){
      const group=new THREE.Group();effects.add(group);const mat=new THREE.MeshPhysicalMaterial({color:0x8b1238,roughness:.16,metalness:.2,clearcoat:1,emissive:0x4c0722,emissiveIntensity:.35});
      const cells=new THREE.InstancedMesh(new THREE.SphereGeometry(.025,12,10),mat,18);cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(cells);
      const positions=new Float32Array(84*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));const trail=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xb02552,transparent:true,opacity:.5}));group.add(trail);
      const veins=new THREE.Group();veins.matrixAutoUpdate=false;effects.add(veins);const veinMat=new THREE.MeshStandardMaterial({color:0x650c2d,emissive:0xa81743,emissiveIntensity:.6,roughness:.27,metalness:.15,transparent:true,opacity:0,depthWrite:false});
      for(let i=0;i<9;i++){
        const a=i*Math.PI*2/9,pts=[];
        for(let j=0;j<7;j++){const y=.08+j*.14,angle=a+Math.sin(j*2+i)*.08,r=.436*Math.sqrt(Math.max(.35,1-Math.pow(Math.max(0,y-.68)/.55,2)));pts.push(V(Math.sin(angle)*r,y,Math.cos(angle)*r));}
        tube(veins,pts,.006,veinMat);
        const p=pts[3];tube(veins,[p,p.clone().add(V(.04,.07,.015)),p.clone().add(V(.09,.12,.01))],.004,veinMat);
      }
      compact(veins);blood={root:group,cells,positions,trail,veins,veinMat,dummy:new THREE.Object3D()};
    }
    if(role==='viper'){
      if(props.needle)hideOld(props.needle);
      const injector=new THREE.Group();attacker.hands[1].add(injector);
      const black=metal(0x102b30,.33,.72),steel=metal(0x8ea9af,.2,.88),green=glow(0x63d98d,.65);
      box(injector,.16,.21,.17,black,0,.04,0,.03);
      rod(injector,V(0,-.06,0),V(0,-.12,0),.084,steel);rod(injector,V(0,-.38,0),V(0,-.43,0),.084,steel);
      // An enclosed glass reservoir with a visible moving dose, not a hat.
      const glass=new THREE.MeshPhysicalMaterial({color:0x92dfc5,roughness:.14,metalness:.12,clearcoat:1,transparent:true,opacity:.3,depthWrite:false});
      mesh(injector,new THREE.CylinderGeometry(.074,.074,.26,24),glass,V(0,-.245,0));
      const dose=mesh(injector,new THREE.CylinderGeometry(.051,.051,.21,20),new THREE.MeshStandardMaterial({color:0x25745a,emissive:0x3cdb77,emissiveIntensity:.5,roughness:.22,metalness:.15}),V(0,-.245,0));
      // The open side exposes the vial; the machined rails protect it.
      for(const s of [-1,1])rod(injector,V(s*.076,-.11,-.035),V(s*.076,-.38,-.035),.015,black);
      for(const y of [-.1,-.39])ring(injector,.083,.017,black,V(0,y,0));
      rod(injector,V(0,-.43,0),V(0,-.73,0),.011,steel,.002);
      mesh(injector,new THREE.ConeGeometry(.012,.08,12),steel,V(0,-.766,0),[Math.PI,0,0]);
      for(let i=0;i<3;i++)box(injector,.028,.018,.011,green,-.09,-.16-i*.056,.045,.004);
      tube(injector,[V(.06,.11,-.03),V(.15,.25,-.04),V(.18,.27,-.05),V(.13,-.1,-.045)],.012,black);
      const plunger=new THREE.Group();injector.add(plunger);rod(plunger,V(0,.04,0),V(0,.22,0),.023,steel);box(plunger,.14,.035,.085,black,0,.23,0,.01);
      compact(injector,new Set([dose,plunger]));compact(plunger);
      const veins=new THREE.Group();veins.matrixAutoUpdate=false;effects.add(veins);const veinMat=glow(0x62d99b,0);
      for(let i=0;i<11;i++){
        const angle=i/11*Math.PI*2,points=[];
        for(let j=0;j<7;j++){const y=.06+j*.14,a=angle+Math.sin(j*1.7+i)*.17,r=.437*Math.sqrt(Math.max(.25,1-Math.pow(Math.max(0,y-.68)/.55,2)));points.push(V(Math.sin(a)*r,y,Math.cos(a)*r));}
        tube(veins,points,.0055,veinMat);
        if(i%2===0){const p=points[3];tube(veins,[p,p.clone().add(V(.07,.045,.015)),p.clone().add(V(.1,.14,0))],.004,veinMat);}
      }
      compact(veins);
      const mist=Array.from({length:16},(_,i)=>{
        const s=new THREE.Sprite(new THREE.SpriteMaterial({map:softTexture,color:0x83bcac,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending,toneMapped:true}));effects.add(s);return {object:s,angle:i*2.399,phase:(i%8)/8};
      });
      const bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,10,8),new THREE.MeshPhysicalMaterial({color:0x61a97f,roughness:.2,metalness:.2,clearcoat:1,transparent:true,opacity:.55}),18);bubbles.frustumCulled=false;effects.add(bubbles);
      poison={injector,dose,plunger,veins,veinMat,mist,bubbles,dummy:new THREE.Object3D()};
    }
    // Thin spatial trails, not full-screen slashes. The blade tip is sampled in
    // world space and rendered with two transparent triangles per segment.
    if(heroWeapon){
      const vertices=new Float32Array(30*6*3),alphas=new Float32Array(30*6*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.BufferAttribute(alphas,3));
      const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
      const trail=mesh(effects,geometry,material);trail.frustumCulled=false;ribbons.push({object:trail,vertices,alphas,points:[],last:V(),color:new THREE.Color(accent)});
    }
    let elapsed=0;
    const basePositions=all.map(a=>a.root.position.clone());
    const shells=[];
    if(role==='triggerHappy')for(let i=0;i<8;i++){const s=mesh(effects,new THREE.CylinderGeometry(.018,.018,.085,8),metal(0xd4ae64));s.visible=false;shells.push(s);}
    const bullets=role==='triggerHappy'?Array.from({length:9},()=>{const b=mesh(effects,new THREE.CapsuleGeometry(.018,.14,3,8),glow(0xffe4a3));b.visible=false;return b;}):[];

    function update(dt,t) {
      elapsed=t;
      // The source's old random shake/camera rails are replaced below. Do not
      // let bloom sprites obscure the characters' faces or their costumes.
      if(props.bloom)props.bloom.strength=.12;
      if(props.pPts){props.pPts.material.size=.095;props.pPts.material.opacity=.7;}
      if(props.fxLight)props.fxLight.intensity=Math.min(props.fxLight.intensity,2);
      for(const a of all){
        const s=a.userData,dx=a.root.position.x-s.lastX,dz=a.root.position.z-s.lastZ,d=dt>0?Math.hypot(dx,dz):0;s.distance+=d;s.lastX=a.root.position.x;s.lastZ=a.root.position.z;
        if(t<contact-.2&&d>.0001&&role!=='rocket'){
          const stride=s.distance/1.1*Math.PI*2,swing=Math.sin(stride)*.4;
          a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
          a.rig.position.y=.014*(1-Math.cos(stride*2));
        }
      }
      // Preserve player identity; the specialized role reset routines used to
      // replace real suit colours with their original demo palette.
      attacker.suit.color.copy(attacker._identity);
      if(t<contact)victims.forEach(a=>a.suit.color.copy(a._identity));
      scene.updateMatrixWorld(true);
      primary.root.getWorldPosition(hitPoint);hitPoint.y+=1.04;
      once('impact',t>=contact,()=>{sparks.fire(contact,hitPoint);glint.position.copy(hitPoint);light.position.copy(hitPoint);});
      const strength=pulse(t,contact,.09);glint.material.opacity=strength*.45;glint.scale.setScalar(.48+strength*.35);light.intensity=strength*4;
      halo.position.copy(glint.position);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(1+clamp((t-contact)/.4)*9);halo.material.opacity=t>=contact&&t<contact+.4?.3*(1-(t-contact)/.4):0;

      if(role==='impostor'){
        if(t>contact){const r=t-contact;primary.legs[0].rotation.x=Math.sin(r*9)*.22*Math.exp(-r*3);primary.legs[1].rotation.x=-primary.legs[0].rotation.x;primary.rig.position.y=smooth((r-.25)/.7)*.43;primary.rig.scale.lerp(V(1,1,1),.75);}
        attacker.rig.scale.lerp(V(1,1,1),.72); // remove exaggerated rubber stretch
        attacker.torso.rotation.x=eased(t,[[0,.09],[.95,.08],[1.26,-.18],[1.42,.18],[2.1,.12],[2.8,0]]);
        if(t>=contact)primary.torso.rotation.x=-pulse(t,contact,.16)*.22;
      }
      if(role==='jackal'){
        attacker.arms[1].rotation.x=eased(t,[[0,-.4],[.38,-.6],[.57,-2.45],[.7,-1.65],[.91,-.95],[1.4,-.35]]);
        attacker.torso.rotation.y=eased(t,[[0,0],[.48,.4],[.7,-.3],[1.25,0]]);
        const fall=smooth((t-.73)/.55);primary.root.rotation.z=0;primary.rig.rotation.x=-fall*Math.PI*.48;primary.rig.position.y=fall*.43;
      }
      if(props.gun)props.gun.visible=false;
      if(role==='samurai'){
        attacker.arms[1].rotation.x=eased(t,[[0,-.4],[.18,-2.6],[.32,-1.57],[.39,-.45],[.43,-2.6],[.47,-1.57],[.54,-.45],[.58,-2.6],[.62,-1.57],[.69,-.45],[.73,-2.6],[.77,-1.57],[.84,-.45],[.88,-2.6],[.92,-1.57],[1.1,-.7],[1.7,-.35]]);
        attacker.torso.rotation.y=Math.sin(t*22)*.32*(t<1?1:Math.exp(-(t-1)*5));
        attacker.arms[0].rotation.x=-.7;
        slashTimes.forEach((at,i)=>once('cut'+i,t>=at,()=>{const b=newBurst(effects,{count:30,color:0xb8edff,speed:3.8,life:.35});b.fire(at,hitPoint);timedBursts.push(b);props.noise(.08,{type:'highpass',f0:5200,f1:1600,gain:.13});}));
        victims.forEach((v,i)=>{const fall=smooth((t-.99-i*.025)/.58);v.root.rotation.z=0;v.rig.rotation.x=-fall*Math.PI*.48;v.rig.position.y=fall*.43;v.torso.rotation.z=t<.99?Math.sin(t*32)*.035:0;});
      }
      if(role==='sheriff'){
        const reflect=payload.cause==='sheriffMisfire';
        attacker.root.position.x=eased(t,[[0,-2.6],[.3,-2.45],[.84,1.5],[1,1.75],[1.3,1.7],[2.1,1.6]]);
        attacker.torso.rotation.x=eased(t,[[0,.04],[.8,-.14],[1,.18],[1.3,.04]]);
        attacker.arms[1].rotation.x=eased(t,[[0,-.3],[.72,-2.5],[1,-1.57],[1.15,-1.5],[1.6,-.4]]);
        attacker.arms[0].rotation.x=eased(t,[[0,0],[.9,-.6],[1.15,-.35],[1.6,0]]);
        if(reflect){
          const fall=smooth((t-1.5)/.65);attacker.rig.rotation.x=fall*Math.PI*.48;attacker.rig.position.y=fall*.43;attacker.suit.color.copy(attacker._identity).multiplyScalar(1-fall*.25);
          primary.rig.rotation.set(0,0,0);primary.rig.position.set(0,0,0);primary.root.rotation.z=0;
          once('knifeReturn',t>=1.15,()=>{scene.updateMatrixWorld(true);effects.attach(heroWeapon);heroWeapon.rotateZ(Math.PI);});
          if(t>=1.15){const k=smooth((t-1.15)/.35);heroWeapon.position.set(mix(primary.root.position.x-.42,attacker.root.position.x+.22,k),1.12+Math.sin(k*Math.PI)*.22,-.24*(1-k));}
          once('misfire',t>=1.5,()=>{const b=newBurst(effects,{count:45,color:accent,speed:2.5,life:.4});b.fire(1.5,attacker.root.position.clone().add(V(0,1,0)));timedBursts.push(b);props.tone(150,45,.3,.25);});
        }else{const fall=smooth((t-1.08)/.72);primary.root.rotation.z=0;primary.rig.rotation.x=-fall*Math.PI*.48;primary.rig.position.y=fall*.43;}
        once('knifeHit',t>=1,()=>props.noise(.14,{type:'highpass',f0:3000,f1:800,gain:.22}));
      }
      if(role==='slugger'){
        attacker.root.position.x=eased(t,[[0,-2.4],[.3,-2.15],[.7,-1.05],[1.3,-1.05]]);
        attacker.arms[1].rotation.x=eased(t,[[0,-.3],[.43,-2.6],[.68,-2.6],[.82,-1.5],[.98,.35],[1.45,-.2]]);
        const fall=smooth((t-.86)/.52);primary.root.rotation.set(0,-Math.PI/2,0);primary.rig.rotation.x=-fall*Math.PI*.48;primary.rig.position.y=fall*.43+Math.sin(fall*Math.PI)*.14;primary.root.position.x=.8+fall*.88;
      }
      if(role==='triggerHappy'){
        const fireStart=role==='triggerHappy'?.65:.8;
        const age=t-fireStart,shot=role==='triggerHappy'?Math.floor(Math.max(0,age)/.1):0;
        const recoil=t>=fireStart&&t<(role==='triggerHappy'?1.32:1.12)?Math.exp(-((age%.1)/.1)*7):0;
        attacker.arms[1].rotation.x=-1.56+recoil*.12;
        if(t<.4)attacker.arms[1].rotation.x=mix(-.15,-1.56,smooth(t/.4));
        if(t>1.38)attacker.arms[1].rotation.x=mix(-1.56,-.45,smooth((t-1.38)/.28));
        attacker.arms[0].rotation.x=attacker.arms[1].rotation.x*.85;attacker.arms[0].rotation.z=-.18;
        cannon.root.position.z=-recoil*.06;scene.updateMatrixWorld(true);muzzle.getWorldPosition(world);
        if(t>=fireStart&&t<(role==='triggerHappy'?1.32:.98)){
          glint.position.copy(world);glint.material.opacity=recoil*.85;glint.scale.set(.42,.3,1);light.position.copy(world);light.intensity=recoil*5;
          once('shot'+shot,true,()=>{const b=newBurst(effects,{count:14,color:0xffd58b,speed:2,life:.22,gravity:1});b.fire(fireStart+shot*.1,world);timedBursts.push(b);if(role==='triggerHappy'){props.tone(155,60,.075,.17,'sawtooth');props.noise(.07,{type:'highpass',f0:4400,f1:1100,gain:.25});}});
        }
        for(let i=0;i<bullets.length;i++){const shotT=fireStart+i*.085,age=t-shotT,b=bullets[i];b.visible=age>=0&&age<.12;b.position.copy(world).lerp(hitPoint,clamp(age/.12));b.rotation.z=Math.PI/2;b.scale.y=1.8;}
        if(role==='triggerHappy'){
          for(let i=0;i<shells.length;i++){const age=t-(.65+i*.085),s=shells[i];s.visible=age>=0&&age<.8;s.position.copy(attacker.root.position).add(V(.15+age*.6,1.13+age*.9-age*age*2,.45+age*1.5));s.rotation.set(age*9,i,age*14);}
        }
        if(t>=contact){const a=primary,fall=smooth((t-contact-.05)/.65);a.root.position.copy(basePositions[1]).add(V(fall*.24,Math.sin(fall*Math.PI)*.08,0));a.rig.rotation.x=-fall*Math.PI*.48;a.rig.position.y=fall*.43;a.rig.position.z=-fall*.2;a.suit.color.copy(a._identity).multiplyScalar(1-fall*.22);}
      }
      if(role==='penguin'){
        const capture=smooth(t/.6),drag=smooth((t-.6)/.9),die=smooth((t-1.9)/.5);
        attacker.root.position.set(-1.6+drag*.35,0,0);primary.root.position.set(mix(-2.4,-.55,capture)+drag*.35,0,0);primary.root.visible=true;
        attacker.arms.forEach((a,i)=>{a.visible=true;a.rotation.x=-1.25+(i?.08:-.06);a.rotation.z=(i?1:-1)*.13;});
        primary.root.rotation.z=Math.sin(t*7)*.045*(1-die);primary.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*6+i*Math.PI)*.18*(1-die));primary.rig.position.y=Math.sin(t*6)*.012*(1-die);
        primary.rig.rotation.x=-die*Math.PI*.48;primary.rig.position.y+=die*.43;
      }
      if(role==='rocket'){
        const load=smooth(t/.65),lift=smooth((t-.93)/1.19),up=lift*4.3;
        attacker.root.visible=false;rocket.visible=t<2.12;rocket.position.set(0,up,0);
        rocket.rotation.z=t>.8&&t<1.12?Math.sin(t*43)*.008:0;
        primary.root.visible=t<2.12;primary.root.position.set(mix(-2.1,0,load),mix(0,.64,load)+up,mix(.1,.64,load));primary.root.rotation.set(0,mix(Math.PI/2,0,load),0);primary.rig.rotation.set(0,0,0);primary.rig.position.set(0,0,0);
        primary.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*9+i*Math.PI)*.12*(1-lift));
        primary.arms.forEach((a,i)=>{a.visible=true;a.rotation.set(-.12,0,(i?1:-1)*.1);});
        fireGroups.forEach(f=>f.update(t,t>.82&&t<2.12?clamp((t-.82)*5):0));
        once('firework',t>=2.12,()=>{const p=V(0,up+1.4,0);timedBursts.forEach((b,i)=>b.fire(2.12+i*.045,p.clone().add(V((i-1.5)*.15,(i%2)*.25,0))));sparks.fire(2.12,p);glint.position.copy(p);light.position.copy(p);props.noise(.3,{type:'highpass',f0:5200,f1:1800,gain:.3});props.tone(110,38,.3,.3);});
        if(t>2.12){glint.material.opacity=pulse(t,2.12,.16)*.65;glint.scale.setScalar(1.4);}
      }
      if(role==='arsonist'){
        attacker.root.position.set(-3.4,0,.25);attacker.arms[0].rotation.x=-.2;
        primary.root.position.x=-1.2;
        victims.forEach((a,i)=>{
          if(!a.root.visible)return;const st=.35+i*.5,k=smooth((t-st)/.65),burn=smooth((t-(1.1+i*.5))/.9);
          if(i>0)a.root.position.set(-1.2+i*1.48,0,(i%2)*-.35);
          a.mark?.removeFromParent();a.markGlow?.removeFromParent();
          if(a.fire)a.fire.forEach(f=>f.s.visible=false);
          a.suit.color.copy(a._identity).multiplyScalar(1-burn*.68);a.suit.emissive.set(0xbc3310);a.suit.emissiveIntensity=k*(1-burn)*.45;
          a.torso.rotation.z=Math.sin(t*6+i)*.022*k*(1-burn);a.rig.rotation.x=-smooth((burn-.72)/.28)*Math.PI*.48;a.rig.position.y=smooth((burn-.72)/.28)*.43;
          const fire=fireGroups[i];fire.root.position.copy(a.root.position);fire.tongues.forEach((f,j)=>{f.update(t,k*(1-smooth((t-(2.35+i*.4))/.8))*.85);f.object.rotation.y=Math.sin(j)*.4;});
          once('ember'+i,t>=st,()=>{const b=newBurst(effects,{color:0xffa943,count:60,speed:1.6,life:1.4,gravity:-.7});b.fire(st,a.root.position.clone().add(V(0,.9,0)));timedBursts.push(b);});
        });
        light.color.set(0xff761f);light.intensity=t>.35&&t<3.8?3+Math.sin(t*9)*.3:0;light.position.copy(primary.root.position).add(V(0,1.4,1));
      }
      if(role==='conjurer'){
        magic.rotation.y=t*.18;magic.visible=t<2.7;
        magic.children.forEach(o=>{if(o.material)o.material.opacity=(.4+.25*Math.sin(t*4))*(1-smooth((t-2.5)/.3));});
        attacker.arms[1].rotation.x=-1.35+.1*Math.sin(t*4);attacker.arms[0].rotation.x=-1.1;
        primary.root.rotation.z=0;primary.rig.rotation.set(0,0,0);primary.rig.position.set(0,0,0);
        erase.uEraseHeight.value=t<.8?-1:2.7*smooth((t-.8)/1.65);primary.root.visible=t<2.53;
        once('erase',t>=.85,()=>props.tone(310,65,1.3,.2,'sawtooth'));
      }
      if(role==='waveCannon'){
        cannon.root.scale.setScalar(1.45);
        attacker.arms[1].rotation.x=-Math.PI/2;attacker.arms[0].rotation.x=-1.34;attacker.arms[0].rotation.z=-.18;scene.updateMatrixWorld(true);muzzle.getWorldPosition(world);
        const charge=smooth((t-.1)/.85),fired=t>=1,fade=1-smooth((t-1.48)/.28);
        beam.charge.position.copy(world);beam.charge.scale.setScalar(.25+charge*.9);beam.charge.material.opacity=(fired?pulse(t,1,.15):charge*.7);
        const direction=hitPoint.clone().sub(world),length=direction.length();beam.root.visible=fired&&t<1.76;beam.root.position.copy(world).addScaledVector(direction,.5);beam.root.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());beam.root.scale.set(1,length,1);beam.root.children.forEach((o,i)=>o.material.opacity=[.95,.65,.18][i]*fade);
        attacker.torso.rotation.x=-pulse(t,1,.16)*.1;
        if(t>=1.15){const heat=smooth((t-1.15)/.24);primary.suit.color.copy(primary._identity).lerp(new THREE.Color(0xf14c27),heat);primary.suit.emissive.set(0xe44912);primary.suit.emissiveIntensity=heat*1.1;
          primary.root.rotation.z=0;primary.rig.rotation.set(0,0,0);once('break',t>=1.48,()=>{fragments.object.material.color.copy(primary._identity);fragments.fire(1.48,hitPoint);});primary.root.visible=t<1.48;
        }
      }
      if(role==='suicideBomber'){
        attacker.root.position.x=-.9;bombs.root.visible=t<1.1;bombs.led.opacity=.35+.5*Math.sin(t*(12+t*22))**2;
        const s=pulse(t,1.1,.24);fireGroups.forEach((f,i)=>{f.update(t,s*.8);f.object.scale.setScalar((1-s)*2.1+.5);f.object.rotation.y=(i-1)*.6;});
        light.position.set(-.9,.7,0);light.intensity=s*12;
        once('debris',t>=1.1,()=>fragments.fire(1.1,V(-.9,.8,0)));
        const ownFall=smooth((t-1.12)/.58);attacker.rig.rotation.x=ownFall*Math.PI*.48;attacker.rig.position.y=ownFall*.43;attacker.suit.color.copy(attacker._identity).multiplyScalar(1-ownFall*.72);
        victims.forEach((a,i)=>{const fall=smooth((t-1.17-i*.025)/.58);a.root.rotation.z=0;a.rig.rotation.x=-fall*Math.PI*.48;a.rig.position.y=fall*.43+Math.sin(fall*Math.PI)*.28;a.suit.color.copy(a._identity).multiplyScalar(1-fall*.65);});
      }
      if(role==='vampire'){
        attacker.root.position.x=eased(t,[[0,-.15],[.28,-.25],[.85,-2.55],[1.2,-2.8],[3.4,-2.8]]);attacker.root.rotation.y=Math.PI/2;
        attacker.torso.rotation.x=mix(.28,0,smooth(t/.7));attacker.arms.forEach(a=>a.rotation.x=mix(-1.35,-.12,smooth(t/.6)));
        primary.root.rotation.set(0,-.3,0);primary.root.visible=true;
        const circulation=smooth((t-.5)/.45)*(1-smooth((t-2.4)/.5)),fall=smooth((t-2.4)/.7);
        blood.root.position.copy(primary.root.position);blood.root.visible=t>.4&&t<2.95;
        for(let i=0;i<18;i++){const a=t*7+i*Math.PI*2/18,y=.27+((t*.55+i/18)%1)*1.45,r=.49+Math.sin(i*1.7)*.04;blood.dummy.position.set(Math.cos(a)*r,y,Math.sin(a)*r);blood.dummy.rotation.set(0,0,a);blood.dummy.scale.set(circulation*.7,circulation*(1.7+(i%3)*.3),circulation*.7);blood.dummy.updateMatrix();blood.cells.setMatrixAt(i,blood.dummy.matrix);}blood.cells.instanceMatrix.needsUpdate=true;
        for(let i=0;i<84;i++){const q=i/83,a=t*7-q*6.8,y=.3+q*1.35;blood.positions.set([Math.cos(a)*.48,y,Math.sin(a)*.48],i*3);}blood.trail.geometry.attributes.position.needsUpdate=true;blood.trail.material.opacity=circulation*.48;
        primary.torso.updateWorldMatrix(true,false);blood.veins.matrix.copy(primary.torso.matrixWorld);blood.veins.matrixWorldNeedsUpdate=true;blood.veinMat.opacity=circulation*smooth((t-.65)/.9)*(.5+.2*Math.sin(t*11)**8);
        primary.suit.color.copy(primary._identity).lerp(new THREE.Color(0x77738a),smooth((t-1)/1.8)*.55);
        primary.torso.rotation.z=Math.sin(t*8)*.025*circulation;primary.rig.rotation.x=-fall*Math.PI*.48;primary.rig.position.y=fall*.43;
        light.color.set(0xb91445);light.position.copy(primary.root.position).add(V(0,1.1,.7));light.intensity=circulation*(.4+Math.sin(t*11)**8*1.3);
        for(const beat of [1,1.5,1.95,2.3])once('heartbeat'+beat,t>=beat,()=>props.tone(75,42,.15,.16));
        if(props.drops)props.drops.count=0;if(props.timer)props.timer.s.visible=false;if(props.neckRing)props.neckRing.visible=false;if(props.spark)props.spark.visible=false;
      }
      if(role==='viper'){
        // A controlled lunge, injection, recoil, spreading poison, then corrosion.
        attacker.root.position.x=eased(t,[[0,-2.6],[.25,-2.4],[.65,-.55],[.84,-.1],[1.1,-.1],[1.6,-.9],[2.2,-1.1]]);
        attacker.root.rotation.y=Math.PI/2;
        attacker.arms[1].rotation.x=eased(t,[[0,-.3],[.35,-1],[.64,-2.1],[.82,-1.56],[1.08,-1.56],[1.6,-.3]]);
        attacker.arms[0].rotation.x=eased(t,[[0,-.15],[.6,-.2],[.84,-1.4],[1.1,-1.3],[1.65,0]]);
        attacker.torso.rotation.x=eased(t,[[0,.05],[.6,-.08],[.84,.14],[1.1,.12],[1.65,0]]);
        if(props.needle)props.needle.visible=false;
        const injected=smooth((t-.84)/.26);poison.dose.scale.y=1-injected*.9;poison.dose.position.y=-.35+(.21*(1-injected*.9))*.5;poison.plunger.position.y=-injected*.17;
        const fall=smooth((t-1.52)/.72);primary.root.rotation.set(0,-Math.PI/2,0);primary.rig.rotation.x=-fall*Math.PI/2;primary.rig.position.y=fall*.43;primary.rig.position.z=-fall*.18;
        primary.torso.rotation.z=Math.sin(t*11)*.014*smooth((t-.9)/.5)*(1-fall);
        primary.torso.rotation.x=-pulse(t,.84,.2)*.15;
        scene.updateMatrixWorld(true);poison.veins.matrix.copy(primary.torso.matrixWorld);poison.veinMat.opacity=smooth((t-.9)/.65)*(1-smooth((t-2.35)/.7))*.7;
        if(t<1.7)primary.suit.color.copy(primary._identity).lerp(new THREE.Color(0x356b60),smooth((t-.95)/1.4)*.25);
        if(props.meltU){props.meltU.uCrack.value=smooth((t-1.2)/.95);props.meltU.uT.value=smooth((t-2.28)/1.65);}
        if(props.pud){props.pud.material.opacity=Math.min(props.pud.material.opacity,.36)*(1-smooth((t-3.6)/.5));props.pud.scale.setScalar(.4+smooth((t-2.3)/1.3)*.7);}
        const vapor=smooth((t-2.15)/.55)*(1-smooth((t-3.72)/.38));
        for(const m of poison.mist){const age=(t*.6+m.phase)%1;m.object.position.set(primary.root.position.x+Math.cos(m.angle)*(.18+age*.3),.13+age*.85,Math.sin(m.angle)*(.2+age*.28));m.object.scale.setScalar(.24+age*.65);m.object.material.opacity=Math.sin(age*Math.PI)*vapor*.09;}
        poison.bubbles.visible=t>2.15&&t<3.9;
        for(let i=0;i<18;i++){const age=(t*.7+i/18)%1,s=.45+Math.sin(i*1.7)*.25;poison.dummy.position.set(primary.root.position.x+Math.cos(i*2.4)*s,.06+age*.24,Math.sin(i*2.4)*s);poison.dummy.scale.setScalar(Math.sin(age*Math.PI)*vapor*(.6+i%3*.3));poison.dummy.updateMatrix();poison.bubbles.setMatrixAt(i,poison.dummy.matrix);}poison.bubbles.instanceMatrix.needsUpdate=true;
        once('corrosion',t>=2.45,()=>props.noise(.34,{type:'bandpass',f0:1900,f1:460,gain:.16,q:.6}));
      }
      if(heroWeapon)for(const r of ribbons){
        const sw=role==='samurai'?slashTimes.some(at=>Math.abs(t-at)<.09):t>contact-.19&&t<contact+.13;scene.updateMatrixWorld(true);
        if(sw){const tip=heroWeapon.localToWorld(heroWeapon.userData.tip.clone()),base=heroWeapon.localToWorld(heroWeapon.userData.base.clone());r.points.unshift({tip,base,time:t});}
        r.points=r.points.filter(p=>t-p.time<.11).slice(0,20);
        let n=0;for(let i=0;i<r.points.length-1;i++){const a=r.points[i],b=r.points[i+1],alpha=(1-i/30)*.8;for(const p of [a.tip,a.base,b.tip,a.base,b.base,b.tip]){r.vertices.set([p.x,p.y,p.z],n*3);r.alphas.set([r.color.r*alpha,r.color.g*alpha,r.color.b*alpha],n*3);n++;}}
        r.object.geometry.setDrawRange(0,n);r.object.geometry.attributes.position.needsUpdate=true;r.object.geometry.attributes.color.needsUpdate=true;
      }
      sparks.update(t);fragments.update(t);timedBursts.forEach(b=>b.update(t));
    }

    function renderCamera() {
      const t=elapsed;
      // Frame the action rather than the far-away auxiliary split-body actors.
      // Tall and narrow screens pull back just enough to keep both subjects.
      let left=attacker.root.position.x,right=primary.root.position.x,bottom=0,top=2.05,depth=.1;
      if(left>right)[left,right]=[right,left];
      if(role==='rocket'){
        left=-1.4;right=1.4;bottom=rocket.position.y-.4;top=rocket.position.y+3.4;depth=.35;
        if(t>2.12){bottom=3.3;top=7.35;}
      }else if(role==='arsonist'){
        left=-3.4;right=Math.max(-1.2,...victims.filter(a=>a.root.visible).map(a=>a.root.position.x));top=2.3;
      }else if(role==='samurai'||role==='suicideBomber'){
        left=Math.min(attacker.root.position.x,...victims.filter(a=>a.root.visible).map(a=>a.root.position.x));right=Math.max(attacker.root.position.x,...victims.filter(a=>a.root.visible).map(a=>a.root.position.x));top=2.35;
        left=Math.max(left,-3.7);right=Math.min(right,4.1);
      }
      const hit=pulse(t,contact,.18),finish=smooth((t-(duration-.6))/.6);
      const width=Math.max(3.5,right-left+1.7),height=(top-bottom+1.02)*(1-hit*.035+finish*.04);
      const fov=32,tan=Math.tan(fov*Math.PI/360),distance=Math.max(height/(2*tan),width/(2*tan*camera.aspect));
      cameraTarget.set((left+right)*.5,mix(bottom,top,.46),depth);
      const sway=Math.sin(t*.45)*.08;
      cameraPos.copy(cameraTarget).add(V(.38+sway,distance*.13,distance));
      const shake=hit*.024;cameraPos.x+=Math.sin(t*75)*shake;cameraPos.y+=Math.cos(t*67)*shake;
      camera.position.copy(cameraPos);camera.lookAt(cameraTarget);camera.fov=fov;camera.near=.08;camera.far=100;camera.updateProjectionMatrix();
      // Hats, raised weapons and wide costumes must fit too. Ignore hidden
      // demo props and secondary split-body copies when measuring the frame.
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);subjectBounds.makeEmpty();
      const subjects=role==='rocket'?[]:[attacker,...victims.filter(a=>a.root.visible)];
      for(const actor of subjects)if(actor.root.visible)actor.root.traverseVisible(o=>{if(!o.isMesh||!o.geometry||o.material?.opacity===0)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();partBounds.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);subjectBounds.union(partBounds);});
      if(!subjectBounds.isEmpty()){
        let extent=1;
        for(let i=0;i<8;i++){corner.set(i&1?subjectBounds.max.x:subjectBounds.min.x,i&2?subjectBounds.max.y:subjectBounds.min.y,i&4?subjectBounds.max.z:subjectBounds.min.z).project(camera);extent=Math.max(extent,Math.abs(corner.x)/.94,Math.abs(corner.y)/.9);}
        if(extent>1){camera.position.copy(cameraTarget).addScaledVector(cameraPos.sub(cameraTarget),extent);camera.lookAt(cameraTarget);camera.updateMatrixWorld(true);}
      }
    }
    return {update,renderCamera,dispose(){environment.dispose();}};
  }
  return {makeCrew,mount,corrosionMaterial,blade,gun,fan,bombCluster,newBurst,flame,eraseFromFeetMaterial};
}
