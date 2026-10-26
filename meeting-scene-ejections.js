/* Ejections run on the meeting's existing actors, labels, table and camera.
 * This factory is embedded into the meeting document, so it has no module or
 * network dependencies and never creates a second scene or renderer. */
import {createExtendedEjectionEffects,createEjectionStaging} from './meeting-ejection-effects.js';
import {patchMeetingRendering} from './meeting-render-recovery.js';

function createMeetingEjections(api) {
  const {THREE, scene, camera, createExtendedEjectionEffects, createEjectionStaging} = api;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const props = new THREE.Group();
  props.name = 'meeting-ejection-props';
  scene.add(props);
  const particles = [];
  const labelLeaders = new Map();
  let active = null, last = null;
  const extended=createExtendedEjectionEffects({THREE,props,api,clamp,ease,v,emit,sprite:softSprite});

  function material(color, metalness = .45, roughness = .35) {
    return new THREE.MeshStandardMaterial({color, metalness, roughness});
  }
  function glow(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
  }
  function mesh(geometry, mat, parent = props, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);object.castShadow = !mat.isMeshBasicMaterial;
    parent.add(object);return object;
  }
  function dispose(root) {
    const geometries = new Set(), materials = new Set();
    root.traverse(o => {
      if(o.isInstancedMesh)o.dispose();
      if (o.geometry) geometries.add(o.geometry);
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) materials.add(m);
    });
    root.removeFromParent();
    geometries.forEach(g => g.dispose());const textures=new Set();materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());
  }
  function clearProps() {
    for (const child of [...props.children]) dispose(child);
    particles.length = 0;
  }
  function softSprite(){const a=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot((x-7.5)/7.5,(y-7.5)/7.5),i=(y*16+x)*4;a.set([255,255,255,Math.round(Math.max(0,1-d)**2*255)],i);}const t=new THREE.DataTexture(a,16,16);t.needsUpdate=true;return t;}
  function emit(position, color, count = 50, speed = 5, life = 1.2, gravity = 5) {
    const data = new Float32Array(count * 3), velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963, y = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - y * y);
      data.set([position.x, position.y, position.z], i * 3);
      const s = speed * (.7 + .3 * Math.sin(i * 17.1) ** 2);
      velocities.set([Math.cos(a) * r * s, y * s, Math.sin(a) * r * s], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data, 3));
    const mat = new THREE.PointsMaterial({color, size: .10, map:softSprite(), transparent: true,
      opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true});
    const points = new THREE.Points(geometry, mat);points.frustumCulled = false;props.add(points);
    particles.push({points, data, velocities, age: 0, life, gravity});
  }
  function fireworks(position) {
    for (let i = 0; i < 6; i++) {
      const p = position.clone().add(v(Math.cos(i * 2.4) * 1.2, Math.sin(i * 3.1) * .6, Math.sin(i * 2.4) * .8));
      emit(p, [0xffd27c, 0x60e4ff, 0xff6598, 0xa8ff8f, 0xc792ff, 0xfff7e0][i], 65, 3.6, 1.8, 1.4);
    }
  }
  function createRocket() {
    const root = new THREE.Group();root.name='ejection-launch-vehicle';props.add(root);
    const steel=material(0xc4ced3,.78,.25),dark=material(0x142532,.75,.33),red=material(0x9f3448,.55,.35),gold=material(0xe1bc76,.7,.3);
    mesh(new THREE.CylinderGeometry(.55,.62,3.65,40),steel,root,[0,2.15,0]);
    const nose=new THREE.LatheGeometry([[.55,3.97],[.54,4.20],[.46,4.47],[.31,4.76],[.14,4.99],[0,5.10]].map(p=>new THREE.Vector2(...p)),48);mesh(nose,steel,root);
    for(const y of[.52,.95,3.65,4.02])mesh(new THREE.CylinderGeometry(.635,.635,.085,40),y===3.65?red:dark,root,[0,y,0]);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,g=new THREE.Group();g.rotation.y=a;root.add(g);
      const sh=new THREE.Shape();sh.moveTo(0,.35);sh.lineTo(.55,.18);sh.quadraticCurveTo(.69,.16,.66,.31);sh.lineTo(.22,1.55);sh.lineTo(0,1.64);sh.closePath();
      const fin=mesh(new THREE.ExtrudeGeometry(sh,{depth:.08,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2}),red,g,[.48,0,-.04]);
      const trim=mesh(new THREE.BoxGeometry(.06,.7,.11),gold,g,[.67,.70,0]);trim.rotation.z=.32;
      mesh(new THREE.BoxGeometry(.045,1.9,.018),dark,g,[0,2.30,.557]);
      for(const y of[1.43,1.52,1.61])mesh(new THREE.BoxGeometry(.19,.025,.024),red,g,[0,y,.569]);
    }
    const rim=mesh(new THREE.TorusGeometry(.21,.055,8,32),dark,root,[0,3.12,.53]);
    mesh(new THREE.SphereGeometry(.18,20,12),new THREE.MeshPhysicalMaterial({color:0x6aadb8,metalness:.25,roughness:.12,clearcoat:1}),root,[0,3.12,.565]).scale.set(1,1,.21);
    const rivets=new THREE.InstancedMesh(new THREE.SphereGeometry(.022,6,4),gold,48),dummy=new THREE.Object3D();root.add(rivets);
    for(let i=0;i<48;i++){const a=(i%16)*Math.PI/8;dummy.position.set(Math.sin(a)*.626,[.99,2.14,3.61][Math.floor(i/16)],Math.cos(a)*.626);dummy.updateMatrix();rivets.setMatrixAt(i,dummy.matrix);}
    mesh(new THREE.CylinderGeometry(.39,.53,.32,32,1,true),dark,root,[0,.10,0]);mesh(new THREE.TorusGeometry(.50,.055,8,40),gold,root,[0,-.07,0]).rotation.x=Math.PI/2;
    const flame=new THREE.Group();root.add(flame);flame.position.y=-.1;flame.visible=false;
    const engineMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;uniform float time;void main(){p=uv;vec3 q=position;q.xz*=1.+.065*sin(q.y*15.+time*35.);gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float hot=pow(p.y,.45),wave=.8+.2*sin(p.y*52.-time*35.);float edge=pow(sin(p.x*3.14159),.4);gl_FragColor=vec4(mix(vec3(.24,.4,1.),vec3(1.,.83,.55),hot),edge*wave*sin(p.y*3.14159)*.75);}'});
    mesh(new THREE.ConeGeometry(.48,3.4,32,1,true),engineMat,flame,[0,-1.65,0]).rotation.z=Math.PI;
    mesh(new THREE.ConeGeometry(.23,2.7,24),glow(0xf5f7ff,.9),flame,[0,-1.28,0]).rotation.z=Math.PI;
    for(let i=0;i<4;i++){const diamond=mesh(new THREE.SphereGeometry(1,12,8),glow(0xbed9ff,.38),flame,[0,-.5-i*.62,0]);diamond.scale.set(.17-i*.018,.24,.17-i*.018);}
    const light=new THREE.PointLight(0xffb977,0,9,2);flame.add(light);
    const straps=new THREE.Group();root.add(straps);for(const y of[1.35,1.9])mesh(new THREE.TorusGeometry(.55,.055,8,32),dark,straps,[0,y,.72]).rotation.x=Math.PI/2;
    const supports=[];for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*.7,.3,0);root.add(g);mesh(new THREE.BoxGeometry(.14,.8,.20),dark,g,[side*.05,.3,0]);mesh(new THREE.BoxGeometry(.44,.10,.21),gold,g,[-side*.12,.7,0]);supports.push({g,side});}
    return{root,flame,light,engineMat,supports};
  }
  function createUfo() {
    const root = new THREE.Group();props.add(root);
    const metal = material(0x78949e, .85, .23), dark = material(0x142734, .75, .29);
    const disc = mesh(new THREE.SphereGeometry(1, 48, 24), metal, root);disc.scale.set(2.35, .33, 2.35);
    mesh(new THREE.TorusGeometry(1.92, .13, 12, 64), dark, root).rotation.x = Math.PI / 2;
    const dome = mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({color: 0x76d5dc, metalness: .28, roughness: .12, transparent: true, opacity: .7}), root, [0, .15, 0]);
    dome.scale.set(1.0, .8, 1.0);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      mesh(new THREE.SphereGeometry(.11, 12, 8), glow(i % 2 ? 0x8affd6 : 0x57bbff), root, [Math.sin(a) * 1.9, -.1, Math.cos(a) * 1.9]);
    }
    const beam = mesh(new THREE.CylinderGeometry(.5, 1.35, 6.2, 48, 1, true), glow(0x65efd3, .17), root, [0, -3.2, 0]);
    const light = new THREE.PointLight(0x70ffdc, 7, 12, 2);light.position.y = -2;root.add(light);
    return {root, beam};
  }
  function createProjectile(mode) {
    const root=new THREE.Group();props.add(root);let surface;
    if(mode==='meteor'){
      const geometry=new THREE.IcosahedronGeometry(1.35,3),positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),k=.92+.10*Math.sin(x*4.3+y*7.2+z*3.1)+.055*Math.sin(x*13.-z*8.);positions.setXYZ(i,x*k,y*k,z*k);}geometry.computeVertexNormals();
      surface=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p,n;void main(){p=position;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p,n;uniform float time;void main(){float v=sin(p.x*12.+sin(p.y*8.))*sin(p.z*11.+sin(p.x*5.));float crack=1.-smoothstep(.01,.065,abs(v));float noise=.5+.5*sin(p.x*31.+p.y*17.)*sin(p.z*23.-p.y*13.);float light=.28+.72*max(0.,dot(normalize(n),normalize(vec3(-.5,.8,.6))));vec3 rock=mix(vec3(.055,.045,.046),vec3(.22,.13,.095),noise)*light;vec3 lava=mix(vec3(1.,.19,.015),vec3(1.,.78,.22),crack)*crack*(.85+.15*sin(time*2.+p.y*3.));gl_FragColor=vec4(rock+lava,1.);}'});mesh(geometry,surface,root);
      const atmosphere=mesh(new THREE.IcosahedronGeometry(1.41,2),glow(0xff5b20,.07),root);atmosphere.scale.set(1.03,1.03,1.03);
    }else{
      const steel=material(0x8c9dab,.8,.25),dark=material(0x17232f),red=material(0xaf394b);
      mesh(new THREE.CylinderGeometry(.28,.32,1.8,32),steel,root);mesh(new THREE.ConeGeometry(.28,.65,32),red,root,[0,1.22,0]);
      for(const y of[-.76,.70])mesh(new THREE.CylinderGeometry(.325,.325,.07,32),dark,root,[0,y,0]);
      for(let i=0;i<4;i++){const a=i*Math.PI/2,g=new THREE.Group();g.rotation.y=a;root.add(g);const fin=mesh(new THREE.BoxGeometry(.065,.57,.48),dark,g,[0,-.65,.32]);fin.rotation.x=-.18;mesh(new THREE.BoxGeometry(.11,.025,.015),glow(0xffd08c,.6),g,[0,.38,.285]);}
      mesh(new THREE.ConeGeometry(.21,2.1,24),glow(0xffa366,.85),root,[0,-1.92,0]).rotation.z=Math.PI;
      root.quaternion.setFromUnitVectors(v(0,1,0),v(-1,-.6,.15).normalize());
    }
    const trail=mesh(new THREE.ConeGeometry(mode==='meteor'?1.15:.35,4.8,32,1,true),glow(0xff6d30,.22),root,[0,-2.9,0]);trail.rotation.z=Math.PI;
    return{root,surface,trail};
  }
  function createBeam() {
    const root=new THREE.Group();props.add(root);root.visible=false;const field=new THREE.Group();root.add(field);
    const beamMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float bands=.25+.75*pow(.5+.5*sin(p.y*70.-time*28.+sin(p.x*25.)),3.);float edge=pow(sin(p.x*3.14159),.4);gl_FragColor=vec4(1.,.19+bands*.34,.16+bands*.22,edge*bands*.38);}'});
    mesh(new THREE.CylinderGeometry(.67,.67,27,48,1,true),beamMaterial,field).rotation.z=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.24,.24,27,24),glow(0xfff6df,.92),field).rotation.z=Math.PI/2;
    const rings=[];for(let i=0;i<5;i++){const ring=mesh(new THREE.TorusGeometry(.71,.026,6,48),glow(0xffbd96,.55),field);ring.rotation.y=Math.PI/2;rings.push(ring);}
    const emitters=[];for(const side of[-1,1]){const g=new THREE.Group();root.add(g);g.position.x=side*8.5;g.rotation.z=side*Math.PI/2;const dark=material(0x193443,.75,.30),metal=material(0x91aab4,.8,.25);
      mesh(new THREE.CylinderGeometry(.75,.88,1.3,32),dark,g);mesh(new THREE.TorusGeometry(.77,.09,8,48),metal,g,[0,.60,0]).rotation.x=Math.PI/2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(new THREE.BoxGeometry(.12,.8,.14),metal,g,[Math.sin(a)*.79,-.05,Math.cos(a)*.79]);}
      const iris=mesh(new THREE.SphereGeometry(.58,20,12),glow(0xff9c67,.8),g,[0,.64,0]);iris.scale.y=.14;emitters.push({g,iris,side});
    }return{root,field,rings,emitters,beamMaterial};
  }
  function death(state) {
    if (state.dead) return;
    state.dead = true;
    for (const p of state.actors) {
      p.alive = false;p.gone = true;p.dying = false;p.ejectionNameHidden=true;
      if (p.chair) {p.chair.visible = false;p.chair.removeFromParent();p.chair = null;}
      for (const L of [p.tag, p.roleTag, p.voteCheck, p.voteTally, p.bub]) if (L) L.s.visible = false;
      if (p.heart) p.heart.visible = false;
    }
    const lines = state.actors.map(p => {
      const detail = (state.result.ejectedDisclosure || []).find(d => d.id === p.id);
      return detail && state.result.revealMode !== 'none' ? `${p.name}は${detail.label}だった` : `${p.name}が追放された`;
    });
    state.resultLines=lines.join('　');
    if (state.isMe) api.voice('end');
  }
  function start(ids, result, mode) {
    if (active) return;
    clearProps();
    const actors = ids.map(id => api.getSeats().find(p => p.id === id)).filter(Boolean);
    if (!actors.length) {api.outcome('', result);api.setBusy(false);return;}
    const state = active = {mode, result, actors, start: api.now(), dead: false,
      isMe: ids.includes(api.me()), positions: actors.map(p => p.c.root.position.clone()),
      rotations: actors.map(p => p.c.root.rotation.y), uuid: actors.map(p => p.c.root.uuid),
      tags: actors.map(p => p.tag.s.uuid), costumes: actors.map(p => p.costumeRoot?.uuid || null),
      appearance: actors.map(p => ({scale:p.c.root.scale.clone(),rotation:p.c.root.rotation.clone(),
        emissive:p.c.suit.emissive.clone(),intensity:p.c.suit.emissiveIntensity,arms:(p.c.arms||[]).map(a=>a.rotation.clone()),legs:(p.c.legs||[]).map(a=>a.rotation.clone())})),
      deathAt: mode === 'balance' ? 2.1 : mode === 'ufo' ? 5.35 : mode === 'rocket' ? 4.25 : mode === 'beam' ? 2.9 : mode === 'meteor' || mode === 'missile' ? 2.27 : 2.8,
      cameraFocus: api.orbit.target.clone(),cameraOffset:camera.position.clone().sub(api.orbit.target),
      finishAt: mode === 'balance' ? 3.7 : mode === 'ufo' ? 5.7 : mode === 'rocket' ? 5.8 : mode === 'beam' ? 4.3 : 4.1};
    api.setBusy(true);api.hideOutcome();
    if (state.isMe) api.voice('start');
    for (const p of actors) {p.meetingActorBusy = true;p.ejectionStarted = true;p.dying = true;p.pinned = null;}
    if (mode === 'rocket') state.prop = createRocket();
    if (mode === 'meteor' || mode === 'missile') state.prop = createProjectile(mode);
    if (mode === 'beam') state.prop = createBeam();
    if (extended.supports(mode)) {
      state.prop=extended.create(mode,state);
      state.deathAt=state.prop.deathAt;state.finishAt=state.prop.finishAt;
    }
    // Let the mechanical effect finish before announcing its outcome.
    state.resultAt=Math.max(state.deathAt+.85,state.finishAt+.15);
    state.finishAt=state.resultAt+.05;
    state.staging=createEjectionStaging({THREE,root:props,base:api.top+.13,mode,radius:(state.prop?.envelope?.radius||1.3)+.3});
    if (state.prop) state.prop.root.visible = false;
    if (mode === 'balance') {
      state.pans = actors.map(p => {
        const side = api.scaleTargets().indexOf(p.id);
        return {side, pan: api.pans[side], origin: api.pans[side]?.position.clone()};
      });
    }
    last = state;
  }
  function tick(dt) {
    const state = active;
    if (state) {
      const t = Math.max(0, api.now() - state.start), {mode, actors} = state;
      const approach = ease(clamp(t / 1.25));state.staging?.tick(t);
      if (mode !== 'balance' && mode !== 'cat') {
        actors.forEach((p, i) => {
          const end = v((i - (actors.length - 1) / 2) * 1.15, api.top + .13, mode === 'rocket' ? .95 : 0);
          p.c.root.position.lerpVectors(state.positions[i], end, approach);
          p.c.root.position.y += Math.sin(Math.PI * clamp(t / 1.25)) * .55;
          p.c.root.rotation.y = THREE.MathUtils.lerp(state.rotations[i], 0, approach);
          // Use the same model and costume throughout the walk onto the table.
          if (t < 1.25) {
            const weight = Math.sin(Math.PI * clamp(t / 1.25));
            p.c.legs.forEach((l, j) => l.rotation.x = Math.sin(t * 11 + j * Math.PI) * .35 * weight);
            p.shins.forEach(s => s.visible = t < .12);
            p.c.rig.position.y *= 1 - approach;
          } else if (!state.standing) api.stand(p);
        });
        if (t >= 1.25) state.standing = true;
      }
      if(extended.supports(mode))extended.tick(state,t,dt);
      else if (mode === 'rocket') {
        const {root, flame, light} = state.prop;root.visible = t > .65 && t < state.deathAt;
        root.position.set(0, api.top + .1 - 5 * (1 - ease(clamp((t - .65) / .75))), -.2);
        // Keep the burst inside the meeting room's visible volume while the
        // camera follows the actor while preserving the player's viewing angle.
        const lift = Math.max(0, t - 2.45);root.position.y += lift * lift;
        if (t > 1.45) actors.forEach(p => {p.c.root.position.set(0, root.position.y + .55, .55);p.c.root.rotation.y = 0;});
        flame.visible=t>2.25;flame.scale.y=.7+Math.sin(t*53)*.08+lift*.6;light.intensity=flame.visible?9:0;state.prop.engineMat.uniforms.time.value=t;
        state.prop.supports.forEach(({g,side})=>g.rotation.z=-side*ease(clamp((t-1.7)/.55))*.9);
        if(t>2.25&&!state.ignited){state.ignited=true;emit(v(0,api.top+.2,0),0xc6d5df,75,2.6,1.1,1);api.impact(v(0,api.top,0),0xffc78a,.22);}
        if (t >= state.deathAt && !state.dead) {fireworks(v(0, root.position.y + 1, 0));api.impact(v(0, root.position.y + 1, 0), 0xffbc61, .65);}
      } else if (mode === 'collapse') {
        if (t > 1.8 && !state.broken) {state.broken = true;api.breakTable();api.hideCentre();api.impact(v(0, api.top, 0), 0xc3e7ef, .45);}
        if (t > 1.8) actors.forEach((p, i) => {const q = t - 1.8;p.c.root.position.y = api.top - 7 * q * q;p.c.root.rotation.z = Math.sin(i + 1) * q * .5;});
      } else if (mode === 'beam') {
        const root = state.prop.root;root.visible=t>1.25&&t<3.6;root.position.set(0,api.top+1.1,0);const power=ease(clamp((t-1.90)/.16));state.prop.field.visible=t>1.90;state.prop.field.scale.set(1,.15+power*.85,.15+power*.85);state.prop.beamMaterial.uniforms.time.value=t;
        state.prop.emitters.forEach(({g,iris,side})=>{g.position.x=side*(8.5+Math.max(0,Math.sin((t-1.9)*25))*power*.08);iris.material.opacity=.2+.8*ease(clamp((t-1.25)/.7));});state.prop.rings.forEach((o,i)=>o.position.x=-12+((t*19+i*5)%24));
        const heat = clamp((t - 2.03) / 1.1);
        for (const p of actors) {p.c.suit.emissive.setHex(0xff241e);p.c.suit.emissiveIntensity = heat * 2;}
        if (t >= state.deathAt && !state.scatter) {
          state.scatter = true;
          for (const p of actors) {emit(p.c.root.position.clone().add(v(0, .8, 0)), p.c.suit.color.getHex(), 180, 2.1, 1.4, 4);p.c.root.visible = false;}
          api.impact(v(0, api.top + 1, 0), 0xffc194, .65);
        }
      } else if (mode === 'missile' || mode === 'meteor') {
        const root = state.prop.root, impactAt = 2.27;
        root.visible = t > 1.5 && (mode === 'meteor' || t < impactAt);
        const k = clamp((t - 1.5) / (impactAt - 1.5));
        root.position.set(9 * (1 - k), api.top + .6 + 11 * (1 - k), -3 * (1 - k));
        if(mode==='meteor'){root.rotation.set(t*.5,t,t*.28);state.prop.surface.uniforms.time.value=t;}state.prop.trail.scale.x=state.prop.trail.scale.z=.85+Math.sin(t*35)*.06;
        if (t >= impactAt && !state.broken) {
          state.broken = true;api.breakTable();api.hideCentre();
          api.impact(v(0, api.top + .3, 0), 0xff934a, mode === 'meteor' ? 1.3 : 1.8);
          emit(v(0, api.top + .2, 0), 0xffa052, 140, 7, 1.3, 7);
          if (mode === 'meteor') actors.forEach(p => p.c.root.scale.y = .14);
        }
        if (t > impactAt) {
          const q = t - impactAt;
          if (mode === 'meteor') root.position.y = api.top - Math.min(.65, q * 1.4);
          actors.forEach(p => {p.c.root.position.y = api.top - (mode === 'meteor' ? .4 : 5 * q * q);p.c.root.rotation.z = q * .8;});
        }
      } else if (mode === 'ufo') {
        const {root, beam} = state.prop;root.visible = t > .65 && t < state.deathAt;
        root.position.set(0, 6.25, -12 * (1 - ease(clamp((t - .65) / 1.1))));root.rotation.y = t * .45;
        beam.visible = t > 1.8 && t < state.deathAt;beam.material.opacity = .12 + Math.sin(t * 14) * .025;
        const lift = ease(clamp((t - 2.1) / 2.5));
        const departure = Math.max(0, t - 4.6);
        if (departure) root.position.z -= departure ** 2 * 22;
        if (t > 2.1) actors.forEach(p => {
          const carriedY = api.top + .13 + lift * 4.5 + departure ** 2 * 6;
          p.c.root.position.set(Math.sin(t * 4) * .08, carriedY, root.position.z);
          p.c.root.rotation.y = t * .7;
        });
      } else if (mode === 'balance') {
        if (t > .9 && !state.broken) {
          state.broken = true;api.breakTable();
          for (const item of state.pans) if (item.side >= 0) {
            api.chains[item.side].visible = false;
            const p = item.pan.getWorldPosition(v());api.impact(p, 0xffc875, .35);emit(p, 0xd1a765, 32, 2.1, .8, 6);
          }
        }
        actors.forEach((p, i) => {
          const item = state.pans[i], q = Math.max(0, t - .9);
          if (item.pan && item.origin) {
            item.pan.position.copy(item.origin);item.pan.position.y -= 6 * q * q;
            item.pan.rotation.z += q * .7;
            item.pan.updateWorldMatrix(true, false);
            p.c.root.position.copy(item.pan.localToWorld(v(0, .04, 0)));
          } else {p.c.root.position.copy(state.positions[i]);p.c.root.position.y -= 6 * q * q;}
          p.c.root.rotation.y = 0;p.c.root.rotation.z = q * (i ? -.25 : .25);
        });
      }
      // Small readable reactions use the real meeting rig and stop at freezing.
      // The cat's companion remains still until the surprise grab actually lands.
      if(!state.dead)actors.forEach((p,i)=>{const saved=state.appearance[i],catTarget=mode==='cat'&&p===state.prop.target,start=catTarget?3.35:mode==='balance'?1.7:1.65,weight=ease(clamp((t-start)/.5));if(t<1.25)return;
        const frozen=mode==='ice'?1-ease(clamp((t-2.9)/.5)):1,flail=Math.sin(t*7+i*1.7)*.13*weight*frozen,reach=(mode==='rocket'?.12:mode==='pod'?.20:.50)*weight;
        (p.c.arms||[]).forEach((arm,j)=>{const rest=saved.arms[j];if(!rest)return;arm.rotation.copy(rest);arm.rotation.z+=(j?1:-1)*(reach+flail);arm.rotation.x-=weight*.24+flail;});
        (p.c.legs||[]).forEach((leg,j)=>{const rest=saved.legs[j];if(rest)leg.rotation.x=rest.x+Math.sin(t*8+j*Math.PI)*.14*weight*frozen;});
      });
      if(!state.dead&&mode==='cat'&&t<3.35)state.followTarget=state.prop.cat.c.root.position.clone().add(v(0,1.1,0));
      else if(!state.dead)state.followTarget=actors.reduce((point,p)=>point.add(p.c.root.position),v()).multiplyScalar(1/actors.length).add(v(0,1.1,0));
      if(mode==='ufo'&&!state.dead&&state.prop?.ship){const arrival=ease(clamp((t-.3)/1.1)),ship=state.prop.ship,centre=v(ship.position.x,api.top+.13+ship.position.y+state.prop.height*.45,ship.position.z);state.followTarget.lerp(centre,arrival*.30);}
      if(state.followTarget){
        const desired=state.cameraFocus.clone().lerp(state.followTarget,ease(clamp((t-.35)/.8)));
        const next=api.orbit.target.clone().lerp(desired,1-Math.exp(-12*Math.max(0,dt)));
        camera.position.copy(next).add(state.cameraOffset);api.orbit.target.copy(next);camera.lookAt(next);
      }
      if (t >= state.deathAt) {
        actors.forEach(p => {p.c.root.visible = false;});death(state);
      }
      if(state.dead&&!state.outcomeShown&&t>=state.resultAt){state.outcomeShown=true;api.outcome(state.resultLines||'',state.result);}
      if (t >= state.finishAt) {
        for (const p of actors) p.meetingActorBusy = false;
        api.setBusy(false);active = null;
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const f = particles[i];f.age += dt;
      for (let j = 0; j < f.data.length; j += 3) {
        f.velocities[j + 1] -= f.gravity * dt;
        for (let axis = 0; axis < 3; axis++) f.data[j + axis] += f.velocities[j + axis] * dt;
      }
      f.points.geometry.attributes.position.needsUpdate = true;f.points.material.opacity = Math.max(0, 1 - f.age / f.life);
      if (f.age >= f.life) {dispose(f.points);particles.splice(i, 1);}
    }
    for(const p of api.getSeats())if(p.costumeRoot){
      // Costumes use the same rig and hip pivots as the actor, including corpses.
      p.costumeRoot.position.copy(p.c.rig.position);p.costumeRoot.rotation.copy(p.c.rig.rotation);
      const pants=p.costumeRoot.userData.walkPants||[];
      pants.forEach((leg,i)=>{leg.rotation.x=p.c.legs[i]?.rotation.x||0;});
      const fabric=pants[0]?.children.find(m=>m.isMesh)?.material;
      p.shins.forEach(shin=>shin.traverse(o=>{if(o.isMesh)o.material=fabric||p.c.suit;}));
    }
    layoutNames();
  }
  function layoutNames() {
    // All text follows its actor, with fixed screen-space row spacing. Camera
    // orbits never move one player's name onto a remote actor or the ceiling.
    camera.updateMatrixWorld();
    const height=Math.max(1,innerHeight),focal=height/(2*Math.tan(camera.fov*Math.PI/360));
    const occupied=[];
    const selected=new Set((active||last)?.actors||[]);
    const ordered=[...api.getSeats()].sort((a,b)=>Number(selected.has(b))-Number(selected.has(a)));
    for(const p of ordered){
      if(p.ejectionNameHidden||(p.ejectionStarted&&!p.c.root.visible)){
        for(const label of[p.tag,p.roleTag,p.voteCheck,p.voteTally,p.bub,p.alertLabel,p.boostLabel])if(label?.s)label.s.visible=false;
        continue;
      }
      if(!p.c.root.visible||!p.tag?.s.visible)continue;
      const base=p.c.root.position,anchor=v(base.x,base.y+2.2,base.z),ndc=anchor.clone().project(camera);
      const depth=Math.max(.1,-anchor.clone().applyMatrix4(camera.matrixWorldInverse).z),pixels=focal/depth;
      const ratio=Math.min(1,((p.tag.g?.measureText(p.tag.text).width||p.tag.w)+20)/p.tag.w),w=p.tag.s.scale.x*pixels*ratio,h=p.tag.s.scale.y*pixels*.73;
      const rect={x:(ndc.x+1)*innerWidth/2,y:(1-ndc.y)*height/2,w,h};
      for(let n=0;n<20;n++){const collision=occupied.find(r=>Math.abs(rect.x-r.x)<(rect.w+r.w)/2+4&&Math.abs(rect.y-r.y)<(rect.h+r.h)/2+4);if(!collision)break;rect.y=collision.y-(collision.h+rect.h)/2-5;}
      ndc.y=1-rect.y/height*2;occupied.push(rect);
      if(p.voteCheck)p.voteCheck.s.visible=!!p.voted&&!p.voteTally?.s.visible&&!p.gone;
      let cursor=Math.max(12,p.tag.s.scale.y*pixels)/2;
      for(const label of [p.tag,p.roleTag,p.voteCheck,p.voteTally,p.bub]){
        if(!label?.s.visible)continue;
        const half=Math.max(12,label.s.scale.y*pixels)/2,dy=label===p.tag?0:cursor+half+4;
        const q=ndc.clone();q.y+=dy*2/height;label.s.position.copy(q.unproject(camera));
        cursor=dy+half;
      }
    }
    for(const leader of labelLeaders.values())leader.visible=false;
  }
  function reset() {
    if (active?.isMe && !active.dead) api.voice('end');
    const old = active || last;
    old?.actors.forEach((p,i) => {
      const saved=old.appearance[i];p.c.root.scale.copy(saved.scale);p.c.root.rotation.copy(saved.rotation);
      (p.c.arms||[]).forEach((arm,j)=>{if(saved.arms[j])arm.rotation.copy(saved.arms[j]);});(p.c.legs||[]).forEach((leg,j)=>{if(saved.legs[j])leg.rotation.copy(saved.legs[j]);});p.c.suit.emissive.copy(saved.emissive);p.c.suit.emissiveIntensity=saved.intensity;p.meetingActorBusy=false;
    });
    active = null;last = null;clearProps();
    api.chains.forEach(c => c.visible = true);
    api.pans.forEach((pan, i) => {pan.visible=true;pan.position.set(i === 0 ? -2.15 : 2.15, -2.41, 0);pan.rotation.set(0, 0, 0);});
    for (const leader of labelLeaders.values()) dispose(leader);labelLeaders.clear();
  }
  function getState() {
    const s = active || last;
    return {active: !!active, mode: s?.mode || '', dead: !!s?.dead,
      elapsed: s ? api.now() - s.start : 0, deathAt:s?.deathAt||0,finishAt:s?.finishAt||0,
      effect:s?.prop?{phase:s.prop.phase,captured:!!s.prop.captured,envelope:s.prop.envelope,captureBounds:s.prop.captureBounds}:null,
      actors: (s?.actors || []).map((p, i) => ({id: p.id,
        sameActor: p.c.root.uuid === s.uuid[i], sameName: p.tag.s.uuid === s.tags[i],
        sameCostume: (p.costumeRoot?.uuid || null) === s.costumes[i], position: p.c.root.position.toArray(), visible: p.c.root.visible})),
      labels: api.getSeats().filter(p => p.tag.s.visible).map(p => ({id: p.id, name: p.tag.text,
        font: p.tag.renderedFontSize, scale: p.tag.s.scale.toArray(), position: p.tag.s.position.toArray()}))};
  }
  return {start, tick, reset, getState};
}

export function patchMeetingRuntime(source) {
  if (!source.includes('function mrStartEjection(')) throw new Error('Meeting ejection entry point is missing');
  let html = source.replace(/^const MR_EJECTION_ASSET=.*;\s*$/m, '');
  const ejectionStart = 'tween(landT+1.0,.01,()=>{},()=>mrStartEjection(ejectedIds,r));';
  if (!html.includes(ejectionStart)) throw new Error('Meeting ejection timing hook is missing');
  html = html.replace(ejectionStart, 'tween(landT+1.8,.01,()=>{},()=>mrStartEjection(ejectedIds,r));');
  // The vote numbers were anchored well above the seated actors, which made
  // them appear at the ceiling in the results view. Keep them near the names.
  html = html.replaceAll('p.voteTally.s.position.set(p.x,4.45,p.z)', 'p.voteTally.s.position.set(p.x,3.28,p.z)');
  html = html.replaceAll('p.voteTally.s.position.set(b.x,b.y+4.22,b.z)', 'p.voteTally.s.position.set(b.x,b.y+3.16,b.z)');
  html=html.replace('const fullName=String(s.name||""),meetingName=seats.length<=6?fullName:String(p.nick||fullName);','const fullName=String(s.name||""),meetingName=fullName;');
  html=html.replace('const micTxt=s.mic?"🎙 ":""','const micTxt=s.alive!==false&&s.mic?"🎙 ":""');
  const factory = `\nconst createEjectionStaging=${createEjectionStaging.toString()};\nconst createExtendedEjectionEffects=${createExtendedEjectionEffects.toString()};\nconst createMeetingEjections=${createMeetingEjections.toString()};\nlet liveMeetingEjections=null;
function getLiveMeetingEjections(){return liveMeetingEjections||(liveMeetingEjections=createMeetingEjections({
 THREE,scene,camera,createExtendedEjectionEffects,createEjectionStaging,orbit:orb,top:TOP,now:()=>NOW,me:()=>me,getSeats:()=>seats,stand:standPose,
 impact,breakTable:mrBeginScaleBreak,hideCentre:()=>{mrCentralTable.visible=false;ped.visible=false;},
 pans:panGroups,chains:mrChainMeshes,scaleTargets:()=>scaleTargets,
 setBusy:value=>{busy=value;},voice:stage=>meetingDeathVoice(stage,'ejection'),
 hideOutcome:()=>{cancelMeetingOutcomeTyping();meetingOutcome.style.display='none';cap.style.opacity='0';},outcome:showMeetingOutcome
}));}
function mrStartEjection(ids,result,forcedMode){
 getLiveMeetingEjections().start(ids,result,forcedMode||(result.catDrag?'cat':mrEjectionMode(ids)));
}
`;
  html = html.replace(/function mrStartEjection\([\s\S]*?(?=window\.previewMeetingEjection=)/, factory);
  html=html.replace("const names=['rocket','collapse','beam','missile','meteor','ufo'];","const names=['rocket','collapse','beam','missile','meteor','ufo','gravity','pod','ice','singularity','crane'];");
  html = html.replace('meetingIdentitySnapshot=[];resetMeetingAbilityEffects();', 'liveMeetingEjections?.reset();meetingIdentitySnapshot=[];resetMeetingAbilityEffects();');
  html = html.replace('if(!mrScaleBroken||window.__meetingEjectionOverlayActive)return;', 'if(!mrScaleBroken)return;');
  html = html.replace('getAbilityState:()=>(', 'getEjectionState:()=>getLiveMeetingEjections().getState(),getAbilityState:()=>(');
  // The former collision fix repeatedly shrank names to a few pixels. Choose
  // readable metrics once; layoutNames resolves overlaps by moving the sprites.
  html = html.replace(/nameTag\(p\.tag,micTxt\+meetingName,p\.ally\?"#ff526b":\(s\.mic==="speaking"\?"#7dffb0":"#ffffff"\)\);/, 'delete p.tag.fixedFontSize;nameTag(p.tag,micTxt+meetingName,p.ally?"#ff526b":(s.mic==="speaking"?"#7dffb0":"#ffffff"));p.tag.fixedFontSize=p.tag.renderedFontSize||56;');
  html = html.replace(/function updateCrewLabelLayout\(\)\{[\s\S]*?(?=\/\/ Only the beginning of a meeting)/, `function updateCrewLabelLayout(){
 const n=seats.length,nameScale=n<=3?3.2:n<=5?3.0:n<=8?2.8:2.55,roleScale=n<=8?2.1:1.9,fontScale=n<=5?1.7:1.55;
 for(const p of seats){for(const [L,scale] of [[p.tag,nameScale],[p.roleTag,roleScale]])if(L){L.s.scale.set(scale,scale*L.h/L.w,1);if(L.fontScale!==fontScale){L.fontScale=fontScale;delete L.fixedFontSize;nameTag(L,L.text||'',L.color||'#fff');L.fixedFontSize=L.renderedFontSize||56;}}}
}
`);
  const frameEnd = /(?=\n\}\);\s*<\/script>)/;
  if (!frameEnd.test(html)) throw new Error('Meeting animation loop is missing');
  html = html.replace(frameEnd, '\n  getLiveMeetingEjections().tick(dt);');
  const css = `<style id="live-meeting-result-readability">
 #meetingOutcome[data-kind="result"]{left:calc((100% + var(--meeting-chat-width,190px))/2)!important;box-sizing:border-box;max-width:calc(100vw - var(--meeting-chat-width,190px) - 32px);width:min(88vw,calc(100vw - var(--meeting-chat-width,190px) - 32px))!important;padding:14px 28px;border-radius:16px;background:linear-gradient(90deg,#06101cda,#06101cf2 20%,#06101cf2 80%,#06101cda);box-shadow:0 8px 32px #0004;font-size:clamp(18px,2.6vw,34px)!important;line-height:1.4!important;overflow-wrap:anywhere}
 #meetingOutcome[data-kind="result"]>div:first-child>div{max-width:100%;}
 @media(max-height:500px){#meetingOutcome[data-kind="result"]{max-width:84vw;padding:10px 20px;font-size:clamp(16px,2.5vw,25px)!important;border-radius:12px}#meetingOutcome>div+div{margin-top:8px!important}}
 </style>`;
  return patchMeetingRendering(html.replace('</head>', css + '</head>'));
}
