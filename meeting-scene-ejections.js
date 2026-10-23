/* Ejections run on the meeting's existing actors, labels, table and camera.
 * This factory is embedded into the meeting document, so it has no module or
 * network dependencies and never creates a second scene or renderer. */
import {createExtendedEjectionEffects} from './meeting-ejection-effects.js';

function createMeetingEjections(api) {
  const {THREE, scene, camera} = api;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const props = new THREE.Group();
  props.name = 'meeting-ejection-props';
  scene.add(props);
  const particles = [];
  const labelLeaders = new Map();
  let active = null, last = null;
  const extended=createExtendedEjectionEffects({THREE,props,api,clamp,ease,v,emit});

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
      if (o.geometry) geometries.add(o.geometry);
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) materials.add(m);
    });
    root.removeFromParent();
    geometries.forEach(g => g.dispose());materials.forEach(m => m.dispose());
  }
  function clearProps() {
    for (const child of [...props.children]) dispose(child);
    particles.length = 0;
  }
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
    const mat = new THREE.PointsMaterial({color, size: .085, transparent: true,
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
    const root = new THREE.Group();props.add(root);
    const steel = material(0xb6c5d0, .78, .23), dark = material(0x1b2735, .75, .32), red = material(0xac293d);
    mesh(new THREE.CylinderGeometry(.56, .65, 3.65, 40), steel, root, [0, 2.15, 0]);
    mesh(new THREE.ConeGeometry(.56, 1.05, 40), red, root, [0, 4.5, 0]);
    for (const y of [.55, .92, 3.65]) mesh(new THREE.CylinderGeometry(.67, .67, .13, 40), dark, root, [0, y, 0]);
    for (let i = 0; i < 4; i++) {
      const fin = mesh(new THREE.BoxGeometry(.12, 1.1, .95), red, root);
      fin.position.set(Math.sin(i * Math.PI / 2) * .65, .75, Math.cos(i * Math.PI / 2) * .65);fin.rotation.y = i * Math.PI / 2;
      const rivet = mesh(new THREE.SphereGeometry(.055, 8, 6), dark, root);
      rivet.position.set(Math.sin(i * Math.PI / 2) * .57, 3.5, Math.cos(i * Math.PI / 2) * .57);
    }
    mesh(new THREE.CylinderGeometry(.38, .48, .4, 24), dark, root, [0, .15, 0]);
    const flame = new THREE.Group();root.add(flame);flame.position.y = -.1;flame.visible = false;
    mesh(new THREE.ConeGeometry(.43, 2.2, 28), glow(0xff6a16, .85), flame, [0, -1.1, 0]).rotation.z = Math.PI;
    mesh(new THREE.ConeGeometry(.22, 1.5, 24), glow(0xfff3b0), flame, [0, -.7, 0]).rotation.z = Math.PI;
    const light = new THREE.PointLight(0xff8e35, 0, 9, 2);flame.add(light);
    // Restraints sit on the actual character, without replacing its costume.
    const straps = new THREE.Group();root.add(straps);
    for (const y of [1.35, 1.9]) mesh(new THREE.TorusGeometry(.55, .055, 8, 32), dark, straps, [0, y, .72]).rotation.x = Math.PI / 2;
    return {root, flame, light};
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
    const root = new THREE.Group();props.add(root);
    if (mode === 'meteor') {
      const rock = mesh(new THREE.IcosahedronGeometry(1.25, 2), material(0x3d2824, .25, .92), root);
      const positions = rock.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const k = .9 + .17 * Math.sin(i * 43.2);positions.setXYZ(i, positions.getX(i) * k, positions.getY(i) * k, positions.getZ(i) * k);
      }
      rock.geometry.computeVertexNormals();
      mesh(new THREE.IcosahedronGeometry(1.28, 1), new THREE.MeshBasicMaterial({color: 0xff601c, wireframe: true, transparent: true, opacity: .75}), root);
    } else {
      const steel = material(0x667383, .8, .25), dark = material(0x17232f), red = material(0xb82b32);
      mesh(new THREE.CylinderGeometry(.28, .32, 1.8, 24), steel, root);
      mesh(new THREE.ConeGeometry(.28, .65, 24), red, root, [0, 1.22, 0]);
      for (let i = 0; i < 4; i++) {
        const fin = mesh(new THREE.BoxGeometry(.07, .55, .6), dark, root, [0, -.66, 0]);fin.rotation.y = i * Math.PI / 2;
      }
      mesh(new THREE.ConeGeometry(.2, 1.8, 20), glow(0xff7a22, .85), root, [0, -1.8, 0]).rotation.z = Math.PI;
      root.quaternion.setFromUnitVectors(v(0, 1, 0), v(-1, -.6, .15).normalize());
    }
    const trail = mesh(new THREE.ConeGeometry(mode === 'meteor' ? 1.15 : .35, 4.2, 24, 1, true), glow(0xff4f17, .35), root, [0, -2.7, 0]);
    trail.rotation.z = Math.PI;
    return {root};
  }
  function createBeam() {
    const root = new THREE.Group();props.add(root);root.visible = false;
    const rim = mesh(new THREE.CylinderGeometry(.63, .63, 34, 40, 1, true), glow(0xff254d, .42), root);
    const core = mesh(new THREE.CylinderGeometry(.32, .32, 34, 32), glow(0xffe9d4), root);
    rim.rotation.z = core.rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const ring = mesh(new THREE.TorusGeometry(.72, .045, 6, 36), glow(0xff4f57, .75), root, [i * 3 - 4.5, 0, 0]);ring.rotation.y = Math.PI / 2;
    }
    return {root};
  }
  function death(state) {
    if (state.dead) return;
    state.dead = true;
    for (const p of state.actors) {
      p.alive = false;p.gone = true;p.dying = false;
      if (p.chair) {p.chair.visible = false;p.chair.removeFromParent();p.chair = null;}
      for (const L of [p.tag, p.roleTag, p.voteCheck, p.voteTally, p.bub]) if (L) L.s.visible = false;
      if (p.heart) p.heart.visible = false;
    }
    const lines = state.actors.map(p => {
      const detail = (state.result.ejectedDisclosure || []).find(d => d.id === p.id);
      return detail && state.result.revealMode !== 'none' ? `${p.name}は${detail.label}だった` : `${p.name}が追放された`;
    });
    api.outcome(lines.join('　'), state.result);
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
        emissive:p.c.suit.emissive.clone(),intensity:p.c.suit.emissiveIntensity})),
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
      const approach = ease(clamp(t / 1.25));
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
        flame.visible = t > 2.25;flame.scale.y = .7 + Math.sin(t * 53) * .12 + lift * .6;light.intensity = flame.visible ? 9 : 0;
        if (t >= state.deathAt && !state.dead) {fireworks(v(0, root.position.y + 1, 0));api.impact(v(0, root.position.y + 1, 0), 0xffbc61, .65);}
      } else if (mode === 'collapse') {
        if (t > 1.8 && !state.broken) {state.broken = true;api.breakTable();api.hideCentre();api.impact(v(0, api.top, 0), 0xc3e7ef, .45);}
        if (t > 1.8) actors.forEach((p, i) => {const q = t - 1.8;p.c.root.position.y = api.top - 7 * q * q;p.c.root.rotation.z = Math.sin(i + 1) * q * .5;});
      } else if (mode === 'beam') {
        const root = state.prop.root;root.visible = t > 1.8 && t < 3.4;root.position.set(0, api.top + 1.1, 0);
        root.scale.set(1, .2 + .8 * clamp((t - 1.8) / .18), 1);
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
        if (mode === 'meteor') root.rotation.set(t * .5, t, t * .28);
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
      if(!state.dead&&mode==='cat'&&t<3.35)state.followTarget=state.prop.cat.c.root.position.clone().add(v(0,1.1,0));
      else if(!state.dead)state.followTarget=actors.reduce((point,p)=>point.add(p.c.root.position),v()).multiplyScalar(1/actors.length).add(v(0,1.1,0));
      if(state.followTarget){
        const desired=state.cameraFocus.clone().lerp(state.followTarget,ease(clamp((t-.35)/.8)));
        const next=api.orbit.target.clone().lerp(desired,1-Math.exp(-12*Math.max(0,dt)));
        camera.position.copy(next).add(state.cameraOffset);api.orbit.target.copy(next);camera.lookAt(next);
      }
      if (t >= state.deathAt) {
        actors.forEach(p => {p.c.root.visible = false;});death(state);
      }
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
      p.c.suit.emissive.copy(saved.emissive);p.c.suit.emissiveIntensity=saved.intensity;p.meetingActorBusy=false;
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
  const factory = `\nconst createExtendedEjectionEffects=${createExtendedEjectionEffects.toString()};\nconst createMeetingEjections=${createMeetingEjections.toString()};\nlet liveMeetingEjections=null;
function getLiveMeetingEjections(){return liveMeetingEjections||(liveMeetingEjections=createMeetingEjections({
 THREE,scene,camera,orbit:orb,top:TOP,now:()=>NOW,me:()=>me,getSeats:()=>seats,stand:standPose,
 impact,breakTable:mrBeginScaleBreak,hideCentre:()=>{mrCentralTable.visible=false;ped.visible=false;},
 pans:panGroups,chains:mrChainMeshes,scaleTargets:()=>scaleTargets,
 setBusy:value=>{busy=value;},voice:stage=>meetingDeathVoice(stage,'ejection'),
 hideOutcome:()=>{meetingOutcome.style.display='none';cap.style.opacity='0';},outcome:showMeetingOutcome
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
  return html.replace('</head>', css + '</head>');
}
