import observatory from './assets-source/golden-observatory.js';

// The award has its own set and lights. The old capsule machinery never sits
// behind the costume or competes with its materials in the final shot.
export function createGoldenGallery(T,host,environment){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.05,50);
 scene.environment=environment;scene.environmentIntensity=.76;
 const resources=[],own=o=>(resources.push(o),o);
 const plate=own(new T.TextureLoader().load(observatory));
 plate.colorSpace=T.SRGBColorSpace;
 const sky=new T.Mesh(own(new T.PlaneGeometry(2,2)),own(new T.ShaderMaterial({
  uniforms:{plate:{value:plate},aspect:{value:1},light:{value:1}},
  depthWrite:false,depthTest:false,toneMapped:false,
  vertexShader:'varying vec2 v; void main(){v=uv; gl_Position=vec4(position.xy,.999,1.);}',
  fragmentShader:`varying vec2 v;uniform sampler2D plate;uniform float aspect,light;
   void main(){
    vec2 fit=vec2(min(1.,aspect/1.77778),min(1.,1.77778/aspect));
    vec2 uv=(v-.5)*fit+vec2(.5+.20*(1.-fit.x),.5);
    uv.y-=.16*(1.-fit.x)*sin(v.y*3.14159);
    vec3 night=texture2D(plate,uv).rgb;
    gl_FragColor=vec4(night*(.65+.45*light)+vec3(.002,.004,.007),1.);
    #include <colorspace_fragment>
   }`
 })));
 sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
 const plinth=new T.Group();plinth.name='golden-display-plinth';scene.add(plinth);
 const stone=own(new T.MeshStandardMaterial({color:0x161c24,metalness:.62,roughness:.28}));
 const brass=own(new T.MeshStandardMaterial({color:0xba9052,metalness:.76,roughness:.24}));
 const marble=own(new T.MeshStandardMaterial({color:0x222831,metalness:.38,roughness:.35}));
 marble.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 stoneXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstoneXZ=position.xz;');
  shader.fragmentShader='varying vec2 stoneXZ;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float p=stoneXZ.x*5.+stoneXZ.y*3.+sin(stoneXZ.y*5.1+sin(stoneXZ.x*5.))*.65;
   float vein=1.-smoothstep(0.,.055,abs(sin(p)));
   diffuseColor.rgb+=vec3(.016,.016,.025)*vein;
   diffuseColor.rgb*=mix(.18,1.,smoothstep(.04,.72,length(stoneXZ*vec2(1.,1.4))));
  `);
 };
 function tier(profile,material){
  const shape=own(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),80));
  plinth.add(new T.Mesh(shape,material));
 }
 tier([[.01,-.22],[.85,-.22],[.98,-.185],[1,-.15],[1,-.04],[.975,-.022]],stone);
 tier([[.999,-.153],[1.006,-.147],[1.006,-.137],[.999,-.132]],brass);
 tier([[.976,-.035],[.99,-.017],[.976,-.002],[.001,-.002],[0,-.002]],marble);
 const shadow=new T.Mesh(own(new T.PlaneGeometry(3.2,3.2)),own(new T.ShaderMaterial({
  transparent:true,depthWrite:false,
  vertexShader:'varying vec2 v;void main(){v=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v;void main(){gl_FragColor=vec4(.004,.006,.009,.64*(1.-smoothstep(.40,1.,length(v))));}'
 })));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=-.225;plinth.add(shadow);
 const fill=new T.HemisphereLight(0xdceaff,0x27202b,1.1);
 const key=new T.DirectionalLight(0xffe1b2,2.5),rim=new T.DirectionalLight(0x9bbefc,2.9);
 rim.position.set(-3,2,-2);scene.add(fill,key,rim);
 const mount=new T.Group();scene.add(mount);
 // Fine gold dust traces one lifting helix. It clears as the name settles.
 const knots=[],delays=[];
 for(let i=0;i<84;i++){const k=i/83;knots.push(k,(i*1.618)%1,(i*2.717)%1);delays.push((i*2.31)%1);}
 const grain=own(new T.BufferGeometry());
 grain.setAttribute('position',new T.Float32BufferAttribute(knots,3));grain.setAttribute('delay',new T.Float32BufferAttribute(delays,1));
 const dust=new T.Points(grain,own(new T.ShaderMaterial({
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{time:{value:0},power:{value:0}},
  vertexShader:`uniform float time;attribute float delay;varying float glow;
   void main(){float t=clamp(time*.67-delay*.3,0.,1.);float a=position.x*6.28+time*1.5;
    float r=1.25+position.y*.22-t*.18;vec3 p=vec3(r*cos(a),.12+t*(1.8+position.z*.55),r*sin(a));
    glow=sin(t*3.14159)*(.3+position.y*.7);vec4 eye=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*eye;gl_PointSize=clamp((5.+position.z*6.)/-eye.z,1.,3.);}
  `,fragmentShader:`uniform float power;varying float glow;
   void main(){float b=1.-smoothstep(.03,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(1.,.77,.44,b*glow*power);}`
 })));
 dust.frustumCulled=false;scene.add(dust);
 const stage=host.querySelector('.gachaStage')||host;
 const veil=document.createElement('div');veil.className='goldenSilkVeil';veil.hidden=true;veil.setAttribute('aria-hidden','true');
 const title=document.createElement('div');title.className='goldenGalleryTitle';title.hidden=true;
 const rank=document.createElement('small'),name=document.createElement('strong');
 rank.textContent='GOLDEN LEGEND';title.append(rank,name);stage.append(veil,title);
 let model=null,width=1,depth=1,height=2;
 const ramp=(x,lo,hi)=>T.MathUtils.smoothstep(x,lo,hi);
 function prepare(item,size){
  width=size.x;depth=size.z;height=Math.max(.1,size.y);name.textContent=item?.name||'ゴールデンレジェンドレア';
 }
 function update(t,hero,reduced,complete){
  const shutter=reduced?0:ramp(t,0,.34)*(1-ramp(t,.43,1.1));
  veil.hidden=shutter<=.001;veil.style.opacity=String(shutter);
  const onSet=t>=(reduced?0:.38);
  title.hidden=!onSet||complete;
  title.style.opacity=String(reduced?1:ramp(t,1,1.75));
  if(!onSet||!hero)return false;
  if(model!==hero){mount.add(hero);model=hero;}
  const light=reduced?1:ramp(t,.45,1.92);
  sky.material.uniforms.light.value=light;
  const scale=Math.min(2.1/height,2.72/Math.max(.1,width,depth));
  hero.scale.setScalar(scale);
  hero.position.set(0,.015+height*scale*.5,0);
  hero.rotation.set(0,reduced?0:(1-ramp(t,.6,2.7))*.48,0);
  hero.visible=true;
  plinth.scale.setScalar(Math.max(.95,Math.max(width,depth)*scale*.57));
  key.position.set(-2.5+light*5,3.7,3.1);key.intensity=.19+light*2.55;fill.intensity=.20+light*.98;
  dust.visible=!reduced&&t<2.6;dust.material.uniforms.time.value=Math.max(0,t-.36);dust.material.uniforms.power.value=1-ramp(t,1.7,2.6);
  return true;
 }
 function draw(renderer,aspect,angle){
  const span=Math.max(plinth.scale.x*2.15,model.scale.x*(Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*depth));
  const tangent=Math.tan(camera.fov*Math.PI/360);
  const distance=Math.max(3.30/(2*tangent),span*1.10/(2*tangent*aspect))+Math.max(width,depth)*model.scale.x*.36;
  const focus=height*model.scale.y*.44;
  camera.position.set(Math.sin(angle)*distance,focus+distance*.13,Math.cos(angle)*distance);
  camera.aspect=aspect;camera.lookAt(0,focus,0);camera.updateProjectionMatrix();
  sky.material.uniforms.aspect.value=aspect;
  renderer.render(scene,camera);
 }
 function reset(home){
  if(model){home.add(model);model.visible=false;model=null;}
  title.hidden=true;veil.hidden=true;
 }
 return {prepare,update,draw,reset,dispose(){veil.remove();title.remove();resources.forEach(r=>r.dispose());}};
}
