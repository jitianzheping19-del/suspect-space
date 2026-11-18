import {cutCrownJewel,createCoronet} from './gacha-coronet.js';

// The five stones on the orbital seal become the five jewels in the diadem.
export function createPremiumCrest(T, scene, geo, mat) {
 const root = new T.Group();
 root.name = 'premium-orbital-crest';
 root.visible = false;
 scene.add(root);

 const stoneGeo = geo(cutCrownJewel(T));
 const stones = new T.InstancedMesh(stoneGeo, mat(new T.ShaderMaterial({
  vertexShader: `varying vec3 face,eye,cut,tint;
   void main(){
    vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);
    mat3 m=mat3(instanceMatrix);
    face=normalMatrix*(m*(normal/vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]))));
    eye=-p.xyz; cut=position; tint=instanceColor;
    gl_Position=projectionMatrix*p;
   }`,
  fragmentShader: `varying vec3 face,eye,cut,tint;
   void main(){
    vec3 n=normalize(face),v=normalize(eye),r=reflect(-v,n);
    vec2 p=cut.xy+.19*r.xy;
    float angle=atan(p.y,p.x+.00001),rad=length(p);
    float wedge=cos(floor(angle*6./3.14159)*2.42+floor(rad*3.)*1.78+r.x*2.);
    float inside=smoothstep(-.72,.85,wedge);
    float rim=pow(1.-abs(dot(n,v)),2.);
    float shine=exp(-pow(abs(r.x-.24*r.y+.18)/.14,2.));
    vec3 body=tint*(.16+inside*1.6)+vec3(.033,.014,.078)*inside;
    gl_FragColor=vec4(body+vec3(.84,.85,1.)*(.76*shine+.35*rim),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 })), 5);
 stones.frustumCulled = false;
 root.add(stones);
 let coronet;
 // Place a soft field behind the subject when the bright machinery opens.
 const field = new T.Mesh(geo(new T.PlaneGeometry(6.6, 6.6)), mat(new T.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: {focus: {value: 0}, glint: {value: 0}},
  vertexShader: 'varying vec2 p; void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `varying vec2 p; uniform float focus,glint; void main(){
   float r=length(p), fall=1.-smoothstep(.2,1.,r);
   float ray=exp(-abs(p.y-.03)*48.-abs(p.x)*3.)*glint;
   gl_FragColor=vec4(mix(vec3(.038,.022,.075),vec3(1.,.81,.43),ray),fall*focus);
   #include <colorspace_fragment>
  }`
 })));
 field.visible = false;
 scene.add(field);
 const pose = new T.Object3D(), color = new T.Color();
 const unlit = new T.Color('#503666'), lit = new T.Color('#c39bf6');
 const jewelColors = ['#dd9b46','#4b55aa','#6126ad','#4b55aa','#dd9b46'].map(c=>new T.Color(c));
 const target = new T.Vector3(), seatRotation = new T.Quaternion(), seatEuler=new T.Euler();
 const smooth = (x, a, b) => T.MathUtils.smoothstep(x, a, b);
 function prepareGold() {
  if(coronet)return;
  coronet=createCoronet(T,geo,mat);
  coronet.group.visible=false;
  root.add(coronet.group);
 }
 function update({mode, rank, golden, promotion, burst, anticipation, tapAge, clock, reduced}) {
  if (rank < 0 || mode === 'complete') { root.visible = field.visible = false; return; }
  const progress = mode === 'promoting' ? smooth(promotion, .18, .83)
   : golden && mode === 'breaking' ? anticipation : 0;
  const assemble = reduced ? Number(progress >= .5) : progress;
  const opening = reduced ? Number(burst >= .32) : smooth(burst, .03, .46);
  const focus = Math.max(assemble * (1 - opening) * .97, smooth(burst, .15, .7) * .68);
  field.visible = focus > .001;
  field.position.z = 1.12 - opening * 2.1;
  field.material.uniforms.focus.value = focus;
  field.material.uniforms.glint.value = reduced ? 0 : Math.sin(assemble * Math.PI) * .35;
  root.visible = opening < 1;
  if (!root.visible) return;
  root.position.set(0, reduced ? 0 : opening * .62, 1.62 + assemble*.85);
  root.scale.setScalar((1 + assemble*.12)*(1 - opening));
  const drift = reduced ? 0 : Math.sin(clock * .8) * .13;
  if(coronet){
   const mount=coronet.group;
   mount.visible=assemble>0;
   mount.scale.setScalar(Math.max(.001,smooth(assemble, .03, .79)));
   mount.rotation.set(.22+(reduced?0:(1-assemble)*.17),-.12+drift-(reduced?0:(1-assemble)*.87),-.035,'YXZ');
   mount.updateMatrix();
  }
  for (let i = 0; i < 5; i++) {
   const angle = Math.PI / 2 - (i-2) * Math.PI * .4 + drift;
   const pulse = !reduced && i === rank ? 1 - smooth(tapAge, 0, 420) : 0;
   const size = .105 + pulse * .055;
   pose.position.set(Math.cos(angle) * 1.58, Math.sin(angle) * 1.58, 0);
   pose.rotation.set(.06, drift, angle - Math.PI/2);
   pose.scale.set(size,size*1.8,size);
   if(assemble>0){
    const {center,angle:azimuth,scale}=coronet.seatLocations[i],mount=coronet.group;
    target.copy(center).applyMatrix4(mount.matrix);
    pose.position.lerp(target,assemble);
    pose.position.z+=reduced?0:.23*Math.sin(assemble*Math.PI);
    seatEuler.set(0,azimuth,0);
    seatRotation.setFromEuler(seatEuler).premultiply(mount.quaternion);
    pose.quaternion.slerp(seatRotation,assemble);
    pose.scale.lerp(target.set(.13,.17,.18).multiplyScalar(scale*mount.scale.x),assemble);
   }
   pose.updateMatrix();
   stones.setMatrixAt(i, pose.matrix);
   color.copy(i <= rank ? lit : unlit).lerp(jewelColors[i], assemble);
   stones.setColorAt(i, color);
  }
  stones.instanceMatrix.needsUpdate = true;
  stones.instanceColor.needsUpdate = true;
 }
 return {update, prepareGold, reset() { root.visible = field.visible = false; }, dispose() { stones.dispose(); field.removeFromParent(); root.removeFromParent(); }};
}
