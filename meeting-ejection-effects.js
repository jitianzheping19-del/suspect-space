// Self-contained: embedded alongside the live meeting animation controller.
// Every effect moves the existing actors and owns only its mechanical/VFX props.
export function createExtendedEjectionEffects(ctx) {
  const {THREE,props,api,clamp,ease,v,emit}=ctx;
  const supported=['cat','balance','gravity','pod','ice','singularity','crane','ufo'];
  const TAU=Math.PI*2,steel=0x839ba9,ink=0x152839,gold=0xd8ad64,cyan=0x79ebed;
  const smooth=(a,b,t)=>ease(clamp((t-a)/(b-a)));
  function group(parent=props){const g=new THREE.Group();parent.add(g);return g;}
  function mat(color,glow=false,opacity=1){return glow?new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}):new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.32});}
  function glass(color,opacity=.15){return new THREE.MeshPhysicalMaterial({color,metalness:.12,roughness:.14,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,clearcoat:.8});}
  function mesh(g,m,p){const o=new THREE.Mesh(g,m);o.castShadow=false;o.receiveShadow=false;p.add(o);return o;}
  function box(p,m,x,y,z,w,h,d){const o=mesh(new THREE.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o;}
  function ring(p,m,r,y,t=.025){const o=mesh(new THREE.TorusGeometry(r,t,6,64),m,p);o.rotation.x=Math.PI/2;o.position.y=y;return o;}
  function pipe(p,m,points,r=.025){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a=>v(...a))),Math.max(12,points.length*5),r,6,false),m,p);}
  function bolts(p,m,r,y,n=12){const geo=new THREE.CylinderGeometry(.04,.04,.04,6);for(let i=0;i<n;i++){const a=i/n*TAU,o=mesh(geo,m,p);o.position.set(Math.sin(a)*r,y,Math.cos(a)*r);}}
  function cloud(p,n,color,size=.035){const array=new Float32Array(n*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(array,3));const material=new THREE.PointsMaterial({color,size,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}),o=new THREE.Points(geo,material);o.frustumCulled=false;p.add(o);return{object:o,array,n};}
  function updateCloud(c,fn){for(let i=0;i<c.n;i++)fn(i,c.array,i*3);c.object.geometry.attributes.position.needsUpdate=true;}
  function measure(state){
    const box3=new THREE.Box3(),bounds=new THREE.Box3(),inv=new THREE.Matrix4(),q=new THREE.Matrix4();
    let radius=.8,height=2.3,minY=0;
    for(const p of state.actors){p.c.root.updateWorldMatrix(true,true);inv.copy(p.c.root.matrixWorld).invert();bounds.makeEmpty();p.c.root.traverse(o=>{if(!o.isMesh||!o.visible)return;o.geometry.computeBoundingBox();q.multiplyMatrices(inv,o.matrixWorld);box3.copy(o.geometry.boundingBox).applyMatrix4(q);bounds.union(box3);});const scale=p.c.root.scale;radius=Math.max(radius,Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*scale.x,Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*scale.z));height=Math.max(height,bounds.max.y*scale.y);minY=Math.min(minY,bounds.min.y*scale.y);}
    return{radius:radius+.24,height:height-minY+.35,minY};
  }
  function space(root){
    const stars=cloud(root,210,0xbcd6f8,.065);
    updateCloud(stars,(i,a,k)=>{const az=i*2.39996,y=1-2*(i+.5)/stars.n,r=Math.sqrt(1-y*y);a[k]=Math.cos(az)*r*100;a[k+1]=y*100+35;a[k+2]=Math.sin(az)*r*100;});
    const planet=mesh(new THREE.SphereGeometry(22,32,20),new THREE.MeshStandardMaterial({color:0x315a74,emissive:0x123348,emissiveIntensity:.45,roughness:.9}),root);planet.position.set(-42,47,-78);const halo=mesh(new THREE.SphereGeometry(22.5,32,20),mat(0x55b1de,true,.10),root);halo.position.copy(planet.position);root.userData.spaceBackdrop=true;
    return{stars,planet,halo};
  }
  function platform(root,r=1.8,color=cyan){
    const metal=mat(steel),dark=mat(ink),light=mat(color,true,.8),base=group(root);
    mesh(new THREE.CylinderGeometry(r,r+.08,.16,64),dark,base).position.y=-.04;
    ring(base,metal,r,.06,.045);ring(base,light,r*.87,.065,.017);bolts(base,metal,r*.94,.07);
    for(let i=0;i<8;i++){const a=i/8*TAU,g=group(base);g.rotation.y=a;box(g,metal,0,.08,r*.79,.16,.045,.25);box(g,light,0,.11,r*.79,.07,.012,.15);}
    return{base,light};
  }
  function shockwaves(root,color,n=3){return Array.from({length:n},()=>{const m=mat(color,true,0),o=ring(root,m,1,0,.025);o.visible=false;return o;});}
  function create(mode,state){
    const root=group(),envelope=measure(state),effect={root,envelope,deathAt:7.15,finishAt:7.55,phase:'approach',captured:false};
    root.name='ejection-'+mode;root.position.y=api.top+.13;
    effect.metal=mat(steel);effect.dark=mat(ink);effect.light=mat(cyan,true,.8);effect.gold=mat(gold);effect.space=space(group(root));
    effect.space.stars.object.visible=false;effect.space.planet.visible=effect.space.halo.visible=false;
    effect.waves=shockwaves(root,mode==='singularity'?0xbc90ff:cyan);
    effect.dust=cloud(root,mode==='singularity'?150:80,mode==='ice'?0xc9f4ff:cyan,.042);
    effect.pad=platform(root,Math.max(1.45,envelope.radius+.25),mode==='singularity'?0xb98be8:cyan);
    if(mode==='cat'){
      effect.cat=state.actors.find(p=>p.id===state.result.catDrag?.cat)||state.actors[0];effect.target=state.actors.find(p=>p.id===state.result.catDrag?.target)||state.actors[1];
      effect.portal=group(root);effect.portal.rotation.x=Math.PI/2;effect.portal.position.y=.02;
      for(let i=0;i<3;i++){const o=mesh(new THREE.TorusGeometry(1+i*.17,.035,6,64),mat(i%2?0xcf90ed:0x8e87e8,true,.65),effect.portal);o.rotation.z=i*.4;}
      effect.rope=mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(48*3),3)),mat(0xc38fea,true,.95),root);root.remove(effect.rope);effect.rope=new THREE.Line(effect.rope.geometry,effect.rope.material);root.add(effect.rope);effect.rope.visible=false;
      effect.hook=group(root);for(const side of[-1,1]){pipe(effect.hook,effect.metal,[[side*.13,.12,0],[side*.26,0,0],[side*.18,-.18,0],[0,-.20,0]],.035);box(effect.hook,effect.gold,side*.15,.04,0,.10,.08,.08);}effect.hook.visible=false;
      effect.bindings=[0,1].map(()=>{const o=ring(root,mat(0xd49cff,true,.9),.45,0,.035);o.visible=false;return o;});effect.deathAt=6.65;effect.finishAt=7.1;
    }else if(mode==='balance'){
      effect.pad.base.visible=false;effect.weights=state.actors.map((p,i)=>{const g=group(root),color=p.c.suit.color.getHex(),weight=mat(color),pos=state.positions[i].clone();
        mesh(new THREE.CylinderGeometry(.72,.92,1.05,8),effect.dark,g).position.y=.65;box(g,effect.metal,0,.11,0,1.9,.22,1.65);box(g,effect.metal,0,1.18,0,.88,.14,.72);ring(g,effect.gold,.23,1.48,.065).rotation.x=0;
        mesh(new THREE.SphereGeometry(.32,16,10),weight,g).position.set(0,.70,.69);box(g,effect.light,0,.38,.78,.65,.025,.025);
        const fragments=Array.from({length:14},(_,j)=>{const o=mesh(new THREE.CylinderGeometry(.12,.22,.10,3),effect.metal,root);o.visible=false;return o;});
        return{g,pos,fragments,pan:api.pans[api.scaleTargets().indexOf(p.id)]};});
      effect.survivor=api.getSeats().find(p=>api.scaleTargets().includes(p.id)&&!state.actors.includes(p));
      if(effect.survivor){effect.gun=group(root);effect.gun.name='survivor-sidearm';box(effect.gun,effect.dark,0,0,0,.13,.16,.37);box(effect.gun,effect.metal,0,.06,.17,.12,.05,.22);box(effect.gun,effect.gold,0,-.14,-.06,.08,.20,.09);const barrel=mesh(new THREE.CylinderGeometry(.034,.034,.34,12),effect.metal,effect.gun);barrel.rotation.x=Math.PI/2;barrel.position.z=.31;
        effect.flash=mesh(new THREE.ConeGeometry(.12,.65,8),mat(0xffe2a8,true,.9),effect.gun);effect.flash.rotation.x=Math.PI/2;effect.flash.position.z=.70;
        effect.shot=mesh(new THREE.CylinderGeometry(.014,.035,1,6),mat(0xffdda2,true,.8),root);effect.shot.visible=false;effect.arm=effect.survivor.c.arms?.[1];effect.armRest=effect.arm?.rotation.clone();}
      effect.deathAt=4.8;effect.finishAt=5.4;
    }else if(mode==='gravity'){
      effect.rings=Array.from({length:3},(_,i)=>{const g=group(root),o=ring(g,mat(i===1?gold:cyan,true,.8),Math.max(1.22,envelope.radius+.14)+i*.16,.3+i*.6,.024);return{g,o};});
      effect.spokes=group(root);for(let i=0;i<8;i++){const g=group(effect.spokes);g.rotation.y=i/8*TAU;box(g,effect.dark,0,.11,1.65,.22,.18,.44);box(g,effect.light,0,.22,1.65,.10,.025,.32);}
    }else if(mode==='pod'){
      const r=Math.max(1.10,envelope.radius+.16),h=envelope.height+.4,cabin=effect.cabin=group(root);effect.radius=r;effect.height=h;
      mesh(new THREE.CylinderGeometry(r,r+.10,.24,48),effect.dark,cabin).position.y=.08;ring(cabin,effect.metal,r,.22,.06);
      mesh(new THREE.CylinderGeometry(r*.72,r, .45,48),effect.metal,cabin).position.y=h+.30;
      for(const side of[-1,1]){const g=group(cabin);g.rotation.y=side*Math.PI/2;box(g,effect.metal,0,h/2,-r,.095,h,.12);}
      effect.doors=[-1,1].map(side=>{const g=group(cabin);g.userData.side=side;const wall=mesh(new THREE.CylinderGeometry(r,r,h,48,1,true,side<0?0:Math.PI,Math.PI),glass(0xadd5e0,.14),g);wall.position.y=h/2+.2;for(const y of[.2,h+.2])ring(g,effect.light,r,y,.014);return g;});
      effect.latches=[];for(let i=0;i<6;i++){const a=i/6*TAU,g=group(cabin);g.rotation.y=a;const latch=box(g,effect.gold,0,.35,r+.06,.13,.24,.15);effect.latches.push(latch);}
      effect.exhaust=mesh(new THREE.ConeGeometry(r*.5,3.6,32,1,true),mat(0x80dfff,true,.7),cabin);effect.exhaust.rotation.z=Math.PI;effect.exhaust.position.y=-1.9;effect.exhaust.visible=false;
      effect.rails=group(root);for(const side of[-1,1]){box(effect.rails,effect.metal,side*(r+.32),.16,-1.3,.12,.12,5.4);for(let i=0;i<7;i++)box(effect.rails,effect.light,side*(r+.32),.23,-3.5+i*.65,.09,.025,.28);}
    }else if(mode==='ice'){
      const ice=effect.shell=group(root),r=Math.max(1,envelope.radius+.1),h=envelope.height+.35;effect.height=h;
      const geometry=new THREE.CylinderGeometry(r*.72,r,h,7,1,false),p=geometry.attributes.position;
      for(let i=0;i<p.count;i++)if(p.getY(i)>0)p.setY(i,p.getY(i)+Math.max(0,.14*Math.sin(p.getX(i)*9+p.getZ(i)*7)));geometry.computeVertexNormals();
      effect.crystal=mesh(geometry,glass(0xb8e6fb,.19),ice);effect.crystal.position.y=h/2;effect.crystal.material.depthWrite=false;
      const wire=mesh(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x9ee2f3,transparent:true,opacity:.65}),ice);ice.remove(wire);effect.edges=new THREE.LineSegments(wire.geometry,wire.material);effect.edges.position.y=h/2;ice.add(effect.edges);
      effect.snow=cloud(ice,110,0xecffff,.035);updateCloud(effect.snow,(i,a,k)=>{const angle=i*2.4,rr=.8+(i%7)*.05;a[k]=Math.sin(angle)*rr;a[k+1]=(i/110)*h;a[k+2]=Math.cos(angle)*rr;});
      effect.aurora=mesh(new THREE.CylinderGeometry(18,21,16,64,1,true),new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 p;uniform float time,strength;void main(){float w=.5+.5*sin(p.x*42.+sin(p.x*19.+time)*2.);float a=pow(w,3.)*sin(p.y*3.14159)*.22*strength;gl_FragColor=vec4(mix(vec3(.12,.8,.6),vec3(.45,.3,.95),p.y),a);}'}),root);effect.aurora.position.y=27;
    }else if(mode==='singularity'){
      effect.portal=group(root);effect.portal.position.set(0,envelope.height*.58,-1.5);
      const hole=mesh(new THREE.SphereGeometry(1,40,24),new THREE.MeshBasicMaterial({color:0x02020b}),effect.portal);hole.scale.set(1,1,.28);
      effect.disk=mesh(new THREE.PlaneGeometry(6,6),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:1}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 p;uniform float time,strength;void main(){float r=length(p),a=atan(p.y,p.x);float rim=exp(-pow((r-.37)*32.,2.));float disk=exp(-pow((r-.53)*9.,2.))*(.45+.55*sin(a*7.-time*7.+r*30.));float ring=exp(-pow((r-.72)*36.,2.))*.18;float alpha=(rim+disk*.5+ring)*strength;gl_FragColor=vec4(mix(vec3(.45,.17,.9),vec3(1.,.73,.38),rim),alpha);}'}),effect.portal);effect.disk.position.z=.34;
      effect.portalRim=ring(group(effect.portal),mat(0xc4a0f4,true,.65),1.03,0,.025);effect.portalRim.rotation.x=0;effect.portalRim.parent.rotation.z=.25;
      effect.debris=Array.from({length:18},(_,i)=>{const o=mesh(new THREE.IcosahedronGeometry(.035+(i%4)*.018,0),effect.metal,root);return o;});
    }else if(mode==='crane'){
      const r=Math.max(.95,envelope.radius+.1),h=envelope.height+.5;effect.height=h;
      effect.rail=group(root);for(const side of[-1,1]){box(effect.rail,effect.dark,side*2.5,8,-1,.32,.48,9);box(effect.rail,effect.metal,side*2.5,7.70,-1,.45,.12,9);}
      effect.trolley=group(root);box(effect.trolley,effect.metal,0,7.65,0,5.4,.32,.75);box(effect.trolley,effect.dark,0,7.22,0,.94,.48,.82);for(const side of[-1,1])box(effect.trolley,effect.gold,side*.33,7.22,.45,.16,.30,.035);
      effect.hoist=group(root);effect.cables=[-1,1].map(side=>{const o=mesh(new THREE.CylinderGeometry(.021,.021,1,8),effect.dark,root);o.position.x=side*.25;return o;});
      ring(effect.hoist,effect.metal,r,h,.065);effect.claws=[-1,1].map(side=>{const g=group(effect.hoist);g.position.set(side*(r+.2),h,0);const a=pipe(g,effect.metal,[[0,0,0],[side*.15,-.35,0],[side*.08,-h+.35,0],[-side*.32,-h+.12,0]],.065);box(g,effect.dark,side*.12,-h/2,0,.15,.65,.19);return{g,side};});
      effect.seat=group(effect.hoist);box(effect.seat,effect.dark,0,.07,0,1.45,.12,1.30);box(effect.seat,effect.metal,0,.10,-.5,1.30,.12,.12);effect.release=false;
    }else if(mode==='ufo'){
      const r=Math.max(1.25,envelope.radius+.25),h=Math.max(2.9,envelope.height+.55),ufo=effect.ship=group(root);effect.radius=r;effect.height=h;effect.mountY=.46;effect.captured=false;ufo.name='ufo-cabin';ufo.userData.cabin={radius:r,bottom:.18,top:h+.46};
      const profile=[[r,-.12],[r+.14,-.12],[r+1,.02],[r+1.2,.25],[r+.85,.47],[r+.16,.56],[r,.46]];
      const hull=effect.hull=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),80),mat(0x718b9c),ufo);
      ring(ufo,effect.dark,r+1.12,.24,.085);ring(ufo,effect.light,r+1.14,.28,.025);ring(ufo,effect.gold,r+.10,.49,.028);
      const canopy=mesh(new THREE.CylinderGeometry(r,r,h,64,1,true),glass(0x93cbd9,.10),ufo);canopy.position.y=h/2+.46;
      const roof=mesh(new THREE.SphereGeometry(1,48,20,0,TAU,0,Math.PI/2),glass(0x6aa6c4,.28),ufo);roof.scale.set(r,.50,r);roof.position.y=h+.46;
      ring(ufo,effect.metal,r,h+.46,.045);ring(ufo,effect.light,r,h+.48,.014);
      for(let i=0;i<16;i++){const a=i/16*TAU,g=group(ufo);g.rotation.y=a;box(g,effect.dark,0,.20,r+.68,.20,.085,.37);box(g,i%2?effect.light:mat(0x99b7ff,true,.9),0,.25,r+.70,.08,.014,.22);pipe(g,effect.metal,[[0,.47,r+.1],[0,.38,r+.4],[0,.30,r+.95]],.012);}
      effect.iris=Array.from({length:8},(_,i)=>{const g=group(ufo);g.rotation.y=i/8*TAU;const blade=box(g,effect.dark,0,.20,r*.50,.90,.09,r*.95);return{g,blade,i};});
      effect.field=group(root);effect.beam=mesh(new THREE.CylinderGeometry(r*.86,r*1.30,1,64,1,true),new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 p;uniform float time,strength;void main(){float ribbon=pow(.5+.5*sin(p.x*75.+sin(p.y*15.-time*3.)*.7),12.);float scan=pow(.5+.5*sin(p.y*96.-time*12.),9.);float edge=pow(abs(sin(p.x*3.14159)),2.);float a=(.055+ribbon*.16+scan*.08)*sin(p.y*3.14159)*strength;gl_FragColor=vec4(mix(vec3(.12,.62,.85),vec3(.61,1.,.76),scan),a);}'}),effect.field);
      effect.climbing=Array.from({length:7},()=>ring(effect.field,mat(0x94ffdd,true,0),1,0,.014));
      effect.shafts=Array.from({length:5},(_,i)=>{const o=mesh(new THREE.CylinderGeometry(.012,.035,1,6,1,true),mat(i%2?0xafffe2:0x8fb9ff,true,.33),effect.field);return o;});
      effect.engine=mesh(new THREE.CylinderGeometry(r*.25,r*.6,1,32,1,true),mat(0x93dcff,true,.35),ufo);effect.engine.position.y=-.9;effect.engine.visible=false;
      effect.lightSource=new THREE.PointLight(0x71f3da,0,18,2);effect.lightSource.position.y=3;root.add(effect.lightSource);
    }
    return effect;
  }
  function tick(state,t,dt){
    const f=state.prop,{mode,actors}=state,base=api.top+.13;f.root.visible=t>.2;f.phase=t<1.25?'approach':t<3?'charge':t<5.2?'capture':'departure';
    const flight=smooth(5.0,7.0,t),spaceVisible=t>5.1;
    f.space.stars.object.visible=f.space.planet.visible=f.space.halo.visible=spaceVisible;
    f.dust.object.visible=t>1.35&&t<5.8;
    updateCloud(f.dust,(i,a,k)=>{const u=((i/f.dust.n+t*.35)%1),r=mode==='singularity'?2.8*(1-u):f.envelope.radius*(1+.25*Math.sin(i));const angle=i*2.4+t*(mode==='singularity'?3.4:1.3);a[k]=Math.sin(angle)*r;a[k+1]=mode==='singularity'?f.envelope.height*.6+.20*Math.cos(angle):u*5;a[k+2]=Math.cos(angle)*r-(mode==='singularity'?1.5:0);});
    for(let i=0;i<f.waves.length;i++){const u=(t-4.8-i*.15)/.9,o=f.waves[i];o.visible=u>0&&u<1;o.scale.setScalar(1+Math.max(0,u)*7);o.material.opacity=Math.max(0,1-u)*.6;}
    if(mode==='cat'){
      const cat=f.cat,target=f.target,catIndex=actors.indexOf(cat),walk=smooth(0,1.35,t),snag=smooth(2.8,3.35,t),drag=smooth(3.35,5.3,t),fall=Math.max(0,t-4.9);
      const start=state.positions[catIndex];cat.c.root.position.lerpVectors(start,v(0,base,0),walk);cat.c.root.rotation.y=THREE.MathUtils.lerp(state.rotations[catIndex],0,walk);if(t>=1.35&&!f.stood){api.stand(cat);f.stood=true;}
      f.portal.rotation.z=-t*1.6;f.portal.scale.setScalar(Math.max(.01,smooth(1.4,2.5,t)));cat.c.root.position.y=base-Math.max(0,t-2.1)*.32-fall*fall*7;
      if(target){const ti=actors.indexOf(target),origin=state.positions[ti],destination=v(.45,base,-.2),landing=origin.clone().lerp(destination,drag);landing.y+=Math.sin(drag*Math.PI)*1.4-fall*fall*7;
        target.c.root.position.copy(t<3.35?origin:landing);target.c.root.rotation.z=t>3.35?Math.sin(t*10)*.18+drag*.8:0;if(t>3.35&&!f.targetStood){api.stand(target);f.targetStood=true;}
        const hookStart=cat.c.root.position.clone().add(v(0,.7,0)),hookEnd=target.c.root.position.clone().add(v(0,.3,0)),reach=hookStart.clone().lerp(hookEnd,snag);f.hook.visible=t>2.8;f.hook.position.copy(reach).sub(f.root.position);f.hook.rotation.y=t*3;
        const a=f.rope.geometry.attributes.position;for(let i=0;i<48;i++){const u=i/47,q=hookStart.clone().lerp(reach,u);q.y+=Math.sin(u*Math.PI)*(.6+Math.sin(t*4)*.12);q.sub(f.root.position);a.setXYZ(i,q.x,q.y,q.z);}a.needsUpdate=true;f.rope.visible=t>2.8;
        f.bindings.forEach((o,i)=>{o.visible=t>3.22;o.position.copy(target.c.root.position).sub(f.root.position).add(v(0,.18+i*.25,0));o.rotation.y=t*2;});
      }
      f.captured=t>3.35;f.phase=t<2.8?'cat-only':t<3.35?'surprise-grab':'dragging-together';
    }else if(mode==='balance'){
      const hitAt=1.85,fall=Math.max(0,t-hitAt),falling=smooth(.65,hitAt,t);
      if(f.survivor){const p=f.survivor,pos=p.c.root.position.clone().add(v(0,1.1,0)),aim=state.positions[0].clone().add(v(0,.7,0)),delta=aim.clone().sub(pos);f.gun.position.copy(pos).sub(f.root.position);f.gun.rotation.y=Math.atan2(delta.x,delta.z);f.gun.visible=t<2.2;f.flash.visible=t>1.15&&t<1.32;
        f.shot.visible=t>1.17&&t<1.33;f.shot.position.copy(pos).lerp(aim,.5).sub(f.root.position);f.shot.quaternion.setFromUnitVectors(v(0,1,0),delta.clone().normalize());f.shot.scale.y=delta.length();if(f.arm&&t<2.2)f.arm.rotation.x=-1.25;else if(f.arm&&f.armRest)f.arm.rotation.copy(f.armRest);}
      f.weights.forEach((item,i)=>{const p=actors[i],origin=item.pos;item.g.position.set(origin.x,origin.y-base+7*(1-falling)-fall*fall*10,origin.z);p.c.root.position.copy(origin);if(fall){p.c.root.scale.y=state.appearance[i].scale.y*(1-.82*smooth(0,.14,fall));p.c.root.position.y-=fall*fall*10;p.c.root.rotation.z=fall*(i?-.9:.9);if(item.pan)item.pan.visible=false;}
        item.fragments.forEach((o,j)=>{o.visible=fall>0&&fall<1.4;const a=j*2.4,dist=fall*(1.4+j%4);o.position.set(origin.x+Math.cos(a)*dist,origin.y-base+.08+fall*(2+j%3)-fall*fall*6,origin.z+Math.sin(a)*dist);o.rotation.set(fall*5+j,fall*6,fall*7);});
      });if(t>=hitAt&&!f.crushed){f.crushed=true;api.impact(state.positions[0].clone(),0xb8ddeb,1);emit(state.positions[0].clone(),0xb6d0dc,85,3,1.1,5);for(const chain of api.chains||[])chain.visible=false;}f.captured=t>=hitAt;
    }else if(mode==='gravity'){
      const lift=smooth(1.8,3.8,t)*2.0,launch=Math.max(0,t-4.8),y=lift+launch*launch*10;
      f.rings.forEach(({g,o},i)=>{g.rotation.y=t*(i%2?-.7:.7);g.rotation.z=Math.sin(t*.8+i)*.12;o.position.y=.45+i*.55+Math.sin(t*2+i)*.05+Math.min(y,7);o.scale.setScalar(1+.035*Math.sin(t*5+i));o.material.opacity=smooth(1.0,1.7,t)*(1-smooth(5.2,6,t))*.8;});f.spokes.rotation.y=t*.3;
      if(t>1.8)actors.forEach((p,i)=>{p.c.root.position.set((i-(actors.length-1)/2)*1.2,base+y,0);p.c.root.rotation.z=Math.sin(t*2)*.07*(1-flight);});
    }else if(mode==='pod'){
      const rise=smooth(.7,1.6,t),lock=smooth(2.0,3.2,t),launch=Math.max(0,t-4.85),travel=launch*launch;
      f.cabin.position.set(0,-5*(1-rise)+travel*8,-travel*3);
      f.doors.forEach(d=>{d.position.x=d.userData.side*1.9*(1-lock);});f.latches.forEach((l,i)=>{l.rotation.z=Math.sin(Math.max(0,t-2.6-i*.07)*3)*.18*(1-lock);});
      f.exhaust.visible=t>4.6;f.exhaust.scale.y=.8+Math.sin(t*43)*.08+flight*1.4;
      if(t>1.6)actors.forEach((p,i)=>p.c.root.position.set(i*.6,base+f.cabin.position.y+.22,f.cabin.position.z));f.captured=lock>.99;
    }else if(mode==='ice'){
      const grow=smooth(1.5,3.4,t),launch=Math.max(0,t-4.9),y=launch*launch*8;
      f.shell.scale.y=Math.max(.015,grow);f.shell.position.y=y;f.crystal.material.opacity=.12+grow*.10;f.edges.material.opacity=grow*.55;f.snow.object.visible=grow>.1;f.snow.object.rotation.y=t*.15;f.aurora.material.uniforms.time.value=t;f.aurora.material.uniforms.strength.value=smooth(4.8,6.8,t);
      if(t>3.4)actors.forEach(p=>{p.c.root.position.y=base+y;p.c.root.rotation.y=.15*Math.sin(t);});f.captured=grow>.99;
    }else if(mode==='singularity'){
      const open=smooth(1.3,2.9,t),pull=smooth(3.5,6.65,t);f.portal.scale.setScalar(Math.max(.001,open)*(1-smooth(6.85,7.15,t)));f.disk.material.uniforms.time.value=t;
      f.debris.forEach((o,i)=>{const u=(t*.20+i/18)%1,r=3*(1-u),a=t*2+i*2.4;o.position.set(Math.sin(a)*r,1.8+Math.cos(a)*r,Math.cos(a)*.15-1.35);o.rotation.set(t+i,t*.7,0);});
      if(t>3.5)actors.forEach(p=>{p.c.root.position.set(Math.sin(t*4)*.12*(1-pull),base+pull*.6,-pull*1.5);p.c.root.rotation.z=-pull*.55;const s=state.appearance[actors.indexOf(p)].scale;p.c.root.scale.copy(s).multiplyScalar(1-smooth(6.4,7.05,t)*.98);});
      f.pad.base.scale.setScalar(1-open*.10);f.space.stars.object.visible=true;f.space.stars.object.rotation.z=t*.015;
    }else if(mode==='crane'){
      const descend=smooth(.6,2.2,t),grip=smooth(2.3,3.15,t),lift=smooth(3.4,5.15,t)*5,away=smooth(5.1,6.8,t),drop=Math.max(0,t-6.3);
      const y=(1-descend)*5+lift,z=-away*18;f.hoist.position.set(0,y,z);f.trolley.position.z=z;
      f.claws.forEach(({g,side})=>g.rotation.z=-side*(1-grip)*.35+side*smooth(6.2,6.6,t)*.5);
      f.cables.forEach(o=>{const h=Math.max(.05,7.0-y-f.height);o.scale.y=h;o.position.set(o.position.x,y+f.height+h/2,z);});
      if(t>3.15)actors.forEach(p=>{p.c.root.position.set(0,base+y+.14-drop*drop*7,z);p.c.root.rotation.z=drop*.6;});f.captured=grip>.99&&t<6.3;
    }else if(mode==='ufo'){
      const arrive=smooth(.2,1.6,t),beam=smooth(1.65,2.35,t)*(1-smooth(5.0,5.45,t)),capture=smooth(2.6,5.0,t),depart=Math.max(0,t-5.7),shipY=5.9+depart*depart*8;
      f.ship.position.set(0,shipY,-14*(1-arrive)-depart*depart*12);f.ship.rotation.y=t*.32;f.ship.rotation.z=Math.sin(t*1.7)*.018*(1-smooth(5.4,5.8,t));
      const open=smooth(1.5,2.0,t)*(1-smooth(5.12,5.60,t));f.iris.forEach(({blade})=>{blade.position.z=f.radius*.50+open*(f.radius+.2);});
      const top=shipY+.1,height=Math.max(.1,top);f.field.visible=beam>.001;f.beam.position.y=height/2;f.beam.scale.y=height;f.beam.material.uniforms.time.value=t;f.beam.material.uniforms.strength.value=beam;
      f.climbing.forEach((o,i)=>{const u=(t*.45+i/7)%1;o.position.y=u*height;o.scale.setScalar(f.radius*(1.30-u*.44));o.material.opacity=Math.sin(u*Math.PI)*beam*.50;});
      f.shafts.forEach((o,i)=>{const a=t*.5+i/5*TAU,r=f.radius*.55;o.position.set(Math.sin(a)*r,height/2,Math.cos(a)*r);o.scale.y=height;o.material.opacity=beam*.28;});f.lightSource.intensity=beam*12;f.lightSource.position.y=height*.4;f.pad.light.opacity=beam*.8;
      if(t>2.6)actors.forEach((p,i)=>{const mount=base+shipY+f.mountY-f.envelope.minY;const y=THREE.MathUtils.lerp(base,mount,capture);p.c.root.position.set((i-(actors.length-1)/2)*.8*Math.min(1,1-capture),y,THREE.MathUtils.lerp(0,f.ship.position.z,capture));p.c.root.rotation.y=t*.32*capture;});
      f.captured=capture>.999;f.captureBounds={bottom:base+shipY+.18,top:base+shipY+f.height+.46,actorBottom:actors[0].c.root.position.y+f.envelope.minY,actorTop:actors[0].c.root.position.y+f.envelope.height+f.envelope.minY};
      f.engine.visible=t>5.65;f.engine.scale.y=1+depart*2;f.engine.material.opacity=.5;
    }
  }
  return{supports:mode=>supported.includes(mode),create,tick};
}
