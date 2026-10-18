import {createCinematicArt} from './kill-cinematic-art.js';

// These are short, local render adapters for authoritative replicated events.
// They never kill, move, or otherwise mutate a player's game state.
const activeDeaths=new Map();
export function worldDeathAnimating(id,stamp){
  const entries=activeDeaths.get(id);if(!entries)return false;
  for(const [key,end]of entries)if(end<=stamp)entries.delete(key);
  if(!entries.size){activeDeaths.delete(id);return false;}return true;
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function createWorldRoleEffect({THREE,scene,event,avatars,roster,currentRoster=()=>roster,observable=()=>true,labelFactory,costumeFactory,phase=()=> 'play'}){
  const type=event.type,start=Number(event.startedAt??event.at)||0;
  const life=type==='penguinGrab'?Math.max(800,Number(event.fireAt)-start+100):type==='waveCannonProp'?Math.max(1000,Number(event.endsAt)-start):type==='conjurer'?2200:type==='suicideBomber'?1450:type==='sluggerCharge'?Math.max(500,Number(event.fireAt)-start+100):1200;
  const root=new THREE.Group();root.name='public-role-'+type;scene.add(root);
  const art=createCinematicArt(THREE),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const by=String(event.by||''),actor=roster[by]||{},origin={x:Number(event.x)||0,z:Number(event.z)||0};
  const targetList=(event.targets||[]).map(t=>typeof t==='string'?{id:t,...roster[t]}:t).filter(t=>t?.id);
  if(event.target&&!targetList.some(t=>t.id===event.target))targetList.push({id:event.target,x:event.targetX??event.x,z:event.targetZ??event.z});
  const copies=[],bursts=[],originalMaterials=new Set();let prop=null,grip=null,bombs=null,holder=null,rest=null,disposed=false;
  function color(p){return p?.color||new THREE.Color().setHSL(Number(p?.hue)||0,.75,.52);}
  function copy(id,at){
    const player=roster[id];if(!player)return null;
    const c=art.makeCrew(color(player),{arms:true});c.root.scale.setScalar(.76);c.root.position.set(Number(at.x)||0,0,Number(at.z)||0);c.root.rotation.y=Math.atan2(origin.x-c.root.position.x,origin.z-c.root.position.z);root.add(c.root);
    const appearance=player.costume||'standard',wear=typeof costumeFactory==='function'?costumeFactory(THREE,appearance):null;
    if(wear){wear.userData.pet?.removeFromParent();for(const [i,pants]of(wear.userData.walkPants||[]).entries())if(c.legs[i]){pants.position.sub(c.legs[i].position);c.legs[i].add(pants);}wear.position.y=-.62;c.torso.add(wear);}
    if(labelFactory){const name=labelFactory(player.name||'乗員');name.position.y=2.05;c.root.add(name);}
    c.root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))originalMaterials.add(m);});
    c.id=id;c.at={x:c.root.position.x,z:c.root.position.z};c.base=c.suit.color.clone();copies.push(c);return c;
  }
  const deadCopies=['samuraiSlash','suicideBomber','sluggerSwing','penguinFinish','waveCannonVictim','conjurer'].includes(type);
  if(deadCopies)for(const target of targetList)if(roster[target.id]?.alive===false)copy(target.id,target);
  let own=null;if(type==='suicideBomber'){own=copies.find(c=>c.id===by)||copy(by,origin);if(own)bombs=art.bombCluster(own.rig);}
  if(type==='samuraiSlash'||type==='sluggerSwing'||type==='sluggerCharge'||type==='waveCannonProp'){
    const anchor=new THREE.Group();root.add(anchor);
    if(type==='samuraiSlash')prop={root:art.blade(anchor,{length:1.38,katana:true})};
    else if(type==='waveCannonProp'){prop=art.gun(anchor,{cannon:true});prop.root.scale.setScalar(1.45);}
    else prop={root:art.fan(anchor)};
    grip=anchor;
  }
  const erased=[];
  if(type==='conjurer')for(const c of copies){const u={uEraseHeight:{value:-1}};c.root.traverse(o=>{if(o.isMesh)o.material=art.eraseFromFeetMaterial(o.material,u);});erased.push(u);}
  const flash=new THREE.PointLight(type==='waveCannonVictim'?0x57e8ff:0xff9c52,0,7,2);flash.position.set(origin.x,.9,origin.z);root.add(flash);
  if(type==='suicideBomber')for(let i=0;i<3;i++){const b=art.newBurst(root,{count:45,color:i?0xffd997:0xff6c30,speed:3.2+i,life:.8,gravity:2});b.fire(.22+i*.035,V(origin.x,.7,origin.z));bursts.push(b);}
  if(type==='samuraiSlash')for(const t of [.08,.22,.36,.5,.64]){const b=art.newBurst(root,{count:24,color:0xc6f3ff,speed:2.5,life:.3});b.fire(t,V(origin.x+Math.sin(Number(event.yaw)||0)*.6,.85,origin.z+Math.cos(Number(event.yaw)||0)*.6));bursts.push(b);}
  if(type==='sluggerSwing'||type==='penguinFinish')for(const c of copies){const b=art.newBurst(root,{count:28,color:type==='sluggerSwing'?0xffdc92:0xa4e8ff,speed:2.1,life:.55});b.fire(.12,V(c.at.x,.8,c.at.z));bursts.push(b);}
  if(type==='waveCannonVictim')for(const c of copies){const b=art.newBurst(root,{count:70,color:c.base,shards:true,speed:2.4,life:.8});b.fire(.42,V(c.at.x,.8,c.at.z));bursts.push(b);}
  let field=null;
  if(type==='conjurer'&&event.markers?.length===3){
    const pts=event.markers.map(p=>V(Number(p.x),.035,Number(p.z)));const g=new THREE.BufferGeometry().setFromPoints([...pts,pts[0]]);field=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xb99aff,transparent:true,opacity:.7}));root.add(field);
  }
  const up=V(0,1,0),a=V(),b=V(),d=V(),links=[];
  if(type==='penguinGrab')for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1,8),new THREE.MeshStandardMaterial({color:0xa6c0ca,roughness:.35,metalness:.6}));root.add(m);links.push(m);}
  const trails=[];
  if(type==='samuraiSlash')for(let i=0;i<5;i++){
    const shape=new THREE.Shape();shape.moveTo(-1.1,0);shape.quadraticCurveTo(0,.45,1.1,0);shape.quadraticCurveTo(0,.3,-1.1,0);
    const cut=new THREE.Mesh(new THREE.ShapeGeometry(shape,24),new THREE.MeshBasicMaterial({color:i%2?0xa8dfff:0xf4ffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));root.add(cut);trails.push(cut);
  }
  function clearOwn(id){const values=activeDeaths.get(id);values?.delete(event.id);if(values&&!values.size)activeDeaths.delete(id);}
  function update(stamp){
    if(disposed||!['play','ended'].includes(phase())||stamp>start+life)return false;
    const t=Math.max(0,(stamp-start)/1000),live=avatars.get(by),at=live?.position||origin;
    root.visible=observable(at)||copies.some(c=>observable(c.at));
    if(!root.visible){copies.forEach(c=>clearOwn(c.id));return true;}
    if(grip){
      const arm=live?.userData.arms?.[1],charging=type==='sluggerCharge',swing=t<.75?Math.sin(t*21):0;
      if(live&&arm){
        if(holder!==live){holder=live;rest=arm.rotation.clone();}live.userData.publicRolePose=event.id;
        arm.rotation.x=type==='waveCannonProp'?-Math.PI/2:charging?-2.3:type==='samuraiSlash'?-1.55-swing*.9:-2.5+smooth(t/.35)*2.1;
        live.updateWorldMatrix(true,true);grip.position.copy(arm.localToWorld(V(0,-.22,.02)));arm.getWorldQuaternion(grip.quaternion);live.getWorldScale(grip.scale);
      }else{grip.position.set(origin.x,1,origin.z);grip.rotation.set(-Math.PI/2,Number(event.yaw)||0,0);grip.scale.setScalar(.76);}
      grip.visible=observable(at);
    }
    for(let i=0;i<copies.length;i++){
      const c=copies[i];let end=.95;
      if(type==='conjurer'){
        erased[i].uEraseHeight.value=2.2*smooth((t-.12)/1.65);c.root.visible=t<1.9&&observable(c.at);end=1.9;
      }else if(type==='waveCannonVictim'){
        const heat=smooth(t/.38);c.suit.color.copy(c.base).lerp(new THREE.Color(0xf04f23),heat);c.suit.emissive.set(0xd2300a);c.suit.emissiveIntensity=heat*.65;c.root.visible=t<.43&&observable(c.at);end=.95;
      }else{
        const begin=type==='samuraiSlash'?.55:type==='suicideBomber'?.24:.12,fall=smooth((t-begin)/.6);
        c.rig.rotation.x=(c===own?1:-1)*fall*Math.PI/2;c.rig.position.y=fall*.43;
        if(type==='sluggerSwing')c.rig.position.z=-Math.sin(fall*Math.PI)*.35;
        if(type==='suicideBomber')c.suit.color.copy(c.base).multiplyScalar(1-fall*.65);
        c.root.visible=t<end&&observable(c.at);
      }
      if(c.root.visible||type==='waveCannonVictim'&&t<end){
        if(!activeDeaths.has(c.id))activeDeaths.set(c.id,new Map());activeDeaths.get(c.id).set(event.id,start+end*1000);
        const native=avatars.get(c.id);if(native&&(currentRoster()?.[c.id]||roster[c.id])?.alive===false)native.visible=false;
      }else clearOwn(c.id);
    }
    if(bombs){bombs.root.visible=t<.22;bombs.led.opacity=.4+.5*Math.sin(t*45)**2;}
    if(type==='suicideBomber')flash.intensity=t>.22?8*Math.exp(-(t-.22)*10):0;
    if(field)field.material.opacity=.6*(1-smooth((t-1.65)/.5));
    for(let i=0;i<trails.length;i++){const age=t-(.08+i*.14),cut=trails[i];cut.visible=age>=0&&age<.18;cut.material.opacity=clamp(1-age/.18)*.7;cut.position.set(at.x,.8,at.z);cut.rotation.set(-.5,Number(live?.rotation.y??event.yaw)||0,(i%2?1:-1)*.5);cut.scale.setScalar(Math.min(1.8,Number(event.radius)||1.8));}
    if(type==='penguinGrab'){
      const captor=avatars.get(by),target=avatars.get(event.target);
      if(!captor||!target||(currentRoster()?.[by]||roster[by])?.penguinTargetId!==event.target)return false;
      for(let i=0;i<links.length;i++){a.copy(captor.position);a.y+=.9;a.x+=(i?.1:-.1);b.copy(target.position);b.y+=.85;d.subVectors(b,a);links[i].position.copy(a).add(b).multiplyScalar(.5);links[i].scale.y=d.length();links[i].quaternion.setFromUnitVectors(up,d.normalize());}
    }
    bursts.forEach(b=>b.update(t));return true;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    copies.forEach(c=>clearOwn(c.id));
    if(holder?.userData.publicRolePose===event.id){delete holder.userData.publicRolePose;holder.userData.arms?.[1]?.rotation.copy(rest);}
    const gs=new Set(),ms=new Set(originalMaterials),ts=new Set();
    root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.isInstancedMesh)o.dispose();for(const m of [].concat(o.material||[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});
    root.removeFromParent();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());
  }
  return {root,copies,update,dispose};
}
