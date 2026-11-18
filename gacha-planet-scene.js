import {setStudioLighting} from './studio-lighting.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRenderBudget} from './render-performance.js';
import {GACHA_RARITY_COLORS,GOLDEN_LEGEND_RARITY} from './gacha-rarity.js';
import {createGoldenGallery} from './gacha-golden-gallery.js';
import {createGoldenPromotionCue} from './gacha-golden-ceremony.js';
import {createPremiumCrest} from './gacha-premium-crest.js';
import {createGachaCeremony} from './gacha-ceremony-fx.js';
import {createGachaWearablePreview,gachaModelBounds} from './gacha-preview-controls.js';
import {createGiftSkin} from './premium-skins.js';
// One PBR mesh carries all 60 panels. The same vertex transform rotates their
// normals and opens them around tangential hinges as the capsule breaks.
function buildCapsuleShell(T,surface,uniforms){
 const parts=[];
 for(let row=0;row<6;row++)for(let column=0;column<10;column++){
  const longitude=(column+.5)*Math.PI/5,latitude=(row+.5)*Math.PI/6;
  const direction=[-Math.cos(longitude)*Math.sin(latitude),Math.cos(latitude),Math.sin(longitude)*Math.sin(latitude)];
  const geometry=new T.SphereGeometry(1.2,8,6,column*Math.PI/5+.002,Math.PI/5-.004,row*Math.PI/6+.002,Math.PI/6-.004);
  const uv=geometry.getAttribute('uv'),local=uv.clone(),panel=new Float32Array(uv.count*4);
  for(let i=0;i<uv.count;i++){
   const u=Math.min(1,Math.max(0,uv.getX(i))),v=uv.getY(i);
   uv.setXY(i,(column+u)/10,(5-row+v)/6);
   panel.set(direction,i*4);panel[i*4+3]=((column*7+row*3)%11)/10;
  }
  geometry.setAttribute('panelUV',local);geometry.setAttribute('panel',new T.BufferAttribute(panel,4));parts.push(geometry);
 }
 const shape=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 surface.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute vec4 panel;attribute vec2 panelUV;varying vec2 enamelUV;varying float panelPhase;
   uniform float opening,preload,separation,motion;
   vec3 hingeTurn(vec3 point,vec3 axis,float a){
    float c=cos(a),s=sin(a);return point*c+cross(axis,point)*s+axis*dot(axis,point)*(1.-c);
   }`).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   enamelUV=panelUV;panelPhase=panel.w;vec3 outward=panel.xyz,axis=normalize(vec3(outward.z,0.,-outward.x));
   float localOpen=smoothstep(panel.w*.11,.83+panel.w*.12,opening);
   float angle=sign(outward.y)*motion*(localOpen*(.70+panel.w*.46)+preload*.025);
   objectNormal=hingeTurn(objectNormal,axis,angle);`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 pivot=outward*1.2+vec3(0.,sign(outward.y)*.21,0.);
    transformed=pivot+hingeTurn(transformed-pivot,axis,angle);
    transformed+=outward*(separation+preload*.025+localOpen*(.95+panel.w*1.4))*motion;
    transformed.y+=motion*(sin(localOpen*3.14159)*.24-localOpen*localOpen*.55);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 enamelUV;varying float panelPhase;uniform float capsuleTime,pressure,preload,opening;uniform vec3 energyTint;`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    vec2 edges=min(enamelUV,1.-enamelUV);float border=min(edges.x,edges.y);
    float aa=max(.003,fwidth(border));
    float lip=1.-smoothstep(.009,.009+aa,border);
    float engraving=1.-smoothstep(.004,.004+aa,abs(border-.059));
    float pulse=.5+.5*cos(capsuleTime*4.-enamelUV.x*3.-panelPhase*6.);
    vec3 trim=mix(vec3(.23,.21,.18),energyTint,.45);
    totalEmissiveRadiance+=trim*engraving*(.13+.26*pressure);
    totalEmissiveRadiance+=energyTint*lip*(.18+pressure*(.48+.64*pulse)+preload*1.1+opening*.75);`);
 };
 const mesh=new T.Mesh(shape,surface);mesh.name='capsule-panels';mesh.frustumCulled=false;return mesh;
}

export function createGachaPlanetScene(T,{canvas,host,oneButton,tenButton,onProgress,buildCostume,premium=false,random=Math.random}){
 const budget=createRenderBudget(),frameGate=budget.gate(),idleGate=budget.gate(20);
 const crestAntialias=premium&&!['low','ultralow'].includes(globalThis.__spaceRenderQuality?.preset);
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:crestAntialias,powerPreference:'default'});budget.syncRenderer(renderer,budget.mobile?1:1.25);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const mobile=matchMedia('(pointer:coarse)').matches;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,60);camera.position.set(0,.4,8.2);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight(0xc8ddff,0x0a0921,2));const key=new T.DirectionalLight(0xffe2b9,3.5);key.position.set(3,4,5);scene.add(key);const rim=new T.DirectionalLight(0x7968ff,2.7);rim.position.set(-4,1,-2);scene.add(rim);
 const geometries=new Set(),materials=new Set(),textures=new Set(),geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 setStudioLighting(T,renderer,scene);
 const paint=document.createElement('canvas');paint.width=512;paint.height=256;const ctx=paint.getContext('2d');ctx.fillStyle=premium?'#25203e':'#14243a';ctx.fillRect(0,0,512,256);
 for(let y=0;y<256;y++){const v=y/256;ctx.strokeStyle=`hsl(${(premium?265:210)+25*Math.sin(v*22)},${22+15*Math.sin(v*17)}%,${17+11*Math.sin(v*39)**2}%)`;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=512;x+=4)ctx.lineTo(x,y+4*Math.sin(x*.025+y*.1)+2*Math.sin(x*.07));ctx.stroke();}
 const texture=new T.CanvasTexture(paint);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);
 const surface=mat(new T.MeshStandardMaterial({map:texture,metalness:.48,roughness:.57,transparent:true})),gold=mat(new T.MeshStandardMaterial({color:premium?0xf1ca81:0xc9ad78,metalness:.9,roughness:.23,transparent:true}));
 const planet=new T.Group();scene.add(planet);
 const energyColor=new T.Color(premium?'#ffe0a3':'#64bed8');
 const capsuleUniforms={opening:{value:0},preload:{value:0},separation:{value:0},motion:{value:1},capsuleTime:{value:0},pressure:{value:0},energyTint:{value:energyColor}};
 const shell=buildCapsuleShell(T,surface,capsuleUniforms);geo(shell.geometry);planet.add(shell);
 const coreMat=mat(new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{
  energyTint:{value:energyColor},clock:{value:0},strength:{value:.18}
 },vertexShader:`varying vec3 sphere,eyeNormal,viewDir;void main(){sphere=position;
  vec4 eye=modelViewMatrix*vec4(position,1.);eyeNormal=normalMatrix*normal;viewDir=-eye.xyz;gl_Position=projectionMatrix*eye;}`,
 fragmentShader:`uniform vec3 energyTint;uniform float clock,strength;varying vec3 sphere,eyeNormal,viewDir;
  void main(){vec3 p=normalize(sphere);float latitude=p.y*13.+1.3*sin(p.x*5.+clock)+p.z*3.;
   float ribbons=pow(.5+.5*cos(latitude-clock*1.8),6.);float hot=pow(max(0.,dot(normalize(eyeNormal),normalize(viewDir))),4.);
   vec3 hue=mix(energyTint,vec3(1.,.97,.89),hot*.67+ribbons*.24);
   gl_FragColor=vec4(hue,strength*(.24+.49*hot+.25*ribbons));
   #include <colorspace_fragment>
  }`}));
 const core=new T.Mesh(geo(new T.SphereGeometry(1.16,32,24)),coreMat);planet.add(core);
 const atmosphereMat=mat(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{glow:{value:energyColor},intensity:{value:.3}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 glow;uniform float intensity;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),2.3);gl_FragColor=vec4(glow,f*intensity);}'}));
 const atmosphere=new T.Mesh(geo(new T.SphereGeometry(1.3,40,28)),atmosphereMat);planet.add(atmosphere);
 const rings=new T.Group();rings.rotation.set(1.1,.1,-.24);planet.add(rings);for(const [r,t] of [[1.62,.018],[1.75,.006],[1.85,.01]])rings.add(new T.Mesh(geo(new T.TorusGeometry(r,t,6,100)),gold));
 const dustPositions=[];for(let i=0;i<160;i++){const a=i*2.39996,r=3+(i%17)*.23;dustPositions.push(Math.cos(a)*r,Math.sin(i*13.17)*2.9,-2-Math.sin(a)*1.8);}const dustGeo=geo(new T.BufferGeometry());dustGeo.setAttribute('position',new T.Float32BufferAttribute(dustPositions,3));scene.add(new T.Points(dustGeo,mat(new T.PointsMaterial({color:0xadc5ff,size:.018,transparent:true,opacity:.6,depthWrite:false}))));
 const flareUniforms={energyTint:{value:energyColor},glow:{value:0},ignition:{value:0},clock:{value:0}};
 const flareMat=mat(new T.ShaderMaterial({uniforms:flareUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 energyTint;uniform float glow,ignition,clock;varying vec2 p;
   void main(){float r=length(p),a=atan(p.y,p.x+.00001);float falloff=1.-smoothstep(.1,1.,r);
    float spokes=pow(.5+.5*cos(a*8.+clock*.28),30.)*exp(-4.*r);
    float streak=exp(-abs(p.y)*58.-abs(p.x)*3.8);float halo=exp(-r*r*14.);
    float alpha=falloff*(glow*spokes+ignition*(.44*halo+.72*streak));
    gl_FragColor=vec4(mix(energyTint,vec3(1.,.96,.86),halo*.78),alpha);
    #include <colorspace_fragment>
   }`}));
 const flare=new T.Mesh(geo(new T.PlaneGeometry(8,8)),flareMat);flare.position.z=1.28;planet.add(flare);
 const ceremony=createGachaCeremony(T,{scene,premium,mobile,geo,mat,textures,reduced:(globalThis.__spaceMotionPreference?.matches??globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true)});
 let hero=null,heroStage=null,heroSkin=null,heroYaw=.28;const heroSize=new T.Vector3();
 function prepareHero(item){heroSkin?.dispose();heroSkin=null;if(heroStage)heroStage.visible=false;
  if(!item)return;
  heroSkin=Number(item.category)===5?createGiftSkin(T,item.id,{mobile}):createGachaWearablePreview(T,item,buildCostume);
  if(!heroSkin)return;
  if(!hero){heroStage=new T.Group();heroStage.name='gacha-award-turntable';scene.add(heroStage);hero=new T.Group();heroStage.add(hero);const bodyMaterial=mat(new T.MeshStandardMaterial({color:0x637486,roughness:.5})),glassMaterial=mat(new T.MeshStandardMaterial({color:0xbbefff,metalness:.4,roughness:.18}));const body=new T.Mesh(geo(new T.CapsuleGeometry(.42,.48,5,12)),bodyMaterial);body.position.y=1;hero.add(body);const glass=new T.Mesh(geo(new T.SphereGeometry(.35,20,14)),glassMaterial);glass.position.set(0,1.18,.43);glass.scale.set(1,.64,.48);hero.add(glass);const legGeo=geo(new T.CapsuleGeometry(.17,.24,3,8));for(const x of[-.24,.24]){const leg=new T.Mesh(legGeo,bodyMaterial);leg.position.set(x,.25,0);hero.add(leg);}const arms=[];for(const x of[-.36,.36]){const arm=new T.Group();arm.position.set(x,1.08,.02);const limb=new T.Mesh(geo(new T.CapsuleGeometry(.105,.3,4,10)),bodyMaterial);limb.position.y=-.04;arm.add(limb);hero.add(arm);arms.push(arm);}hero.userData.arms=arms;}hero.add(heroSkin.group);hero.position.set(0,0,0);heroStage.position.set(0,0,0);heroStage.rotation.set(0,0,0);heroStage.scale.setScalar(1);
  const bounds=gachaModelBounds(T,hero);bounds.getSize(heroSize);bounds.getCenter(hero.position).multiplyScalar(-1);
  heroYaw=Number(item.category)===1?Math.PI-.55:.28;heroStage.visible=false;
 }
 let crest=null,gallery=null,promotionCue=null,promotion=false,promotionAt=0;
 const uiScene=new T.Scene(),uiCamera=new T.OrthographicCamera(-1,1,1,-1,-100,100);setStudioLighting(T,renderer,uiScene,.55);uiCamera.position.z=50;uiScene.add(new T.HemisphereLight(0xffffff,0x263a52,2.8));const uiLight=new T.DirectionalLight(0xffffff,3);uiLight.position.set(-100,200,400);uiScene.add(uiLight);
 function createButton(button,label){const group=new T.Group();uiScene.add(group);const shape=new T.Shape();const w=180,h=66,r=12;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const frame=new T.Mesh(geo(new T.ExtrudeGeometry(shape,{depth:7,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:3,bevelSize:2})),mat(gold.clone()));frame.material.transparent=true;group.add(frame);const face=new T.Mesh(geo(new T.PlaneGeometry(174,58)),mat(new T.MeshStandardMaterial({color:0x142a3d,metalness:.5,roughness:.32,transparent:true})));face.position.z=11;group.add(face);
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.textAlign='center';x.textBaseline='middle';x.font='800 47px system-ui';x.fillStyle='#fff0cf';x.fillText(label,256,65);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;textures.add(map);const text=new T.Mesh(geo(new T.PlaneGeometry(150,38)),mat(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false})));text.position.z=12;group.add(text);return{group,button};}
 const buttons=[createButton(oneButton,'ガチャ1連'),createButton(tenButton,'10連ガチャ')];
 let disposed=false,raf=0,lastFrame=0,rank=-1,maxRank=0,mode='idle',shakeAt=-10000,burstAt=0,resolveReveal=null,viewX=0,viewZ=8.2,planetCenterX=0;
 const palette=GACHA_RARITY_COLORS,promotionColor=new T.Color(palette[GOLDEN_LEGEND_RARITY]);const reduced=(globalThis.__spaceMotionPreference?.matches??globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true);
 function smoothUnit(value){const u=Math.min(1,Math.max(0,value));return u*u*(3-2*u);}
 function tap(){if(mode!=='charging'||performance.now()-shakeAt<280)return;shakeAt=performance.now();rank=Math.min(promotion?4:maxRank,rank+1);energyColor.set(palette[rank]);onProgress?.({rank,maxRank,mode:'charging'});if(promotion&&rank===4){mode='promoting';promotionAt=shakeAt;promotionCue??=createGoldenPromotionCue(host);onProgress?.({rank,maxRank,mode});return;}if(rank===maxRank){if(premium&&rank===4){promotionCue??=createGoldenPromotionCue(host);promotionCue.legend();}mode='breaking';burstAt=shakeAt+(reduced?100:premium?1000:650);onProgress?.({rank,maxRank,mode:'breaking'});}}
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();const pointerUp=e=>{if(mode!=='charging')return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObject(core).length)tap();};canvas.addEventListener('pointerup',pointerUp);
 function tick(ms){raf=0;if(disposed||document.hidden||host.dataset.previewOpen==='true')return;raf=requestAnimationFrame(tick);if(!frameGate.due(ms)||((mode==='idle'||mode==='complete')&&!idleGate.due(ms)))return;budget.syncRenderer(renderer);const dt=Math.min(.1,(ms-lastFrame)/1000);lastFrame=ms;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;if(canvas.width!==Math.round(rect.width*renderer.getPixelRatio())||canvas.height!==Math.round(rect.height*renderer.getPixelRatio()))renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;
 const promotionAge=mode==='promoting'?ms-promotionAt:0;
 const ascent=Math.min(1,promotionAge/(reduced?700:2500));
 if(mode==='promoting'){
  promotionCue.update(ascent);
  energyColor.set('#baa5ff').lerp(promotionColor,smoothUnit((ascent-.28)/.52));
  if(ascent>=1){
   rank=GOLDEN_LEGEND_RARITY;mode='breaking';burstAt=ms+(reduced?100:450);shakeAt=ms;
   promotionCue.reset();host.dataset.goldenPromotion='ascended';onProgress?.({rank,maxRank,mode});
  }
 }
 const tapAge=Math.max(0,ms-shakeAt),shake=1-smoothUnit(tapAge/500);const collection=host.dataset.view==='collection',easing=1-Math.exp(-dt*7);viewX+=((collection?-1.8:0)-viewX)*easing;viewZ+=((collection?10.2:8.2)-viewZ)*easing;const burst=mode==='breaking'?Math.min(1,Math.max(0,(ms-burstAt)/(reduced?180:premium?1650:1200))):mode==='complete'?1:0;// The final tap pushes in; the same camera movement unwinds through the burst.
 const anticipation=mode==='breaking'?smoothUnit(tapAge/Math.max(1,burstAt-shakeAt))*(1-smoothUnit(burst/.38)):0;
 camera.position.set(reduced?0:Math.sin(tapAge*.05)*shake*.018,.35,Math.max(viewZ,camera.aspect<.8?6.4/camera.aspect:0)-anticipation*(reduced?0:premium?.85:.3)+burst*(premium?.15:.35));camera.lookAt(0,0,0);camera.updateProjectionMatrix();planet.rotation.y=reduced?0:ms*.000075;const targetX=collection?-Math.tan(19*Math.PI/180)*viewZ*camera.aspect*.8:0;planetCenterX+=(targetX-planetCenterX)*easing;
 planet.position.x=planetCenterX+(reduced?0:Math.sin(tapAge*.07)*shake*.03);
 planet.position.y=reduced?0:Math.sin(tapAge*.091)*shake*.055;const size=planet.scale.x+((collection?.6:1)-planet.scale.x)*easing;planet.scale.setScalar(size);
 const power=rank<0?.1:(rank+1)/palette.length,clock=reduced?0:ms*.001;
 const clearStage=smoothUnit((burst-.22)/.49);
 capsuleUniforms.opening.value=burst;capsuleUniforms.preload.value=anticipation;
 capsuleUniforms.separation.value=mode==='promoting'?Math.min(.065,promotionAge*.00004):0;
 capsuleUniforms.motion.value=reduced?.16:1;capsuleUniforms.capsuleTime.value=clock;capsuleUniforms.pressure.value=power;
 shell.visible=burst<.83;surface.opacity=1-smoothUnit((burst-.4)/.43);
 gold.opacity=1-smoothUnit((burst-.34)/.46);rings.visible=gold.opacity>.005;rings.scale.setScalar(1+burst*(reduced?.15:.95));
 coreMat.uniforms.clock.value=clock;coreMat.uniforms.strength.value=(.22+power*.60+shake*.1)*(1-clearStage);
 core.visible=burst<.71;core.scale.setScalar(1+burst*.18);
 atmosphere.visible=burst<.73;atmosphereMat.uniforms.intensity.value=(.34+power*.82+shake*.38)*(1-clearStage);
 flareUniforms.clock.value=clock;flareUniforms.glow.value=(rank<0?0:(.10+power*.22+shake*.17))*(1-clearStage);
 flareUniforms.ignition.value=Math.sin(Math.PI*Math.min(1,burst/.37))*(reduced?.055:.64);
 flare.visible=rank>=0&&burst<.71;
 if(premium && mode==='breaking' && rank===4 && burst>.28)promotionCue?.reset();
 if(premium && rank>=0 && mode!=='complete'){
  crest??=createPremiumCrest(T,scene,geo,mat);
  // The surprise path has already assembled the crown when the gate opens.
  const crownCharge=promotion?1:smoothUnit(tapAge/Math.max(1,burstAt-shakeAt));
  crest.update({mode,rank,golden:rank===GOLDEN_LEGEND_RARITY,promotion:ascent,burst,anticipation:crownCharge,tapAge,clock,reduced});
 }
 const goldenShot=premium&&gallery&&rank===GOLDEN_LEGEND_RARITY&&(mode==='breaking'||mode==='complete');
 const galleryTime=(ms-burstAt)*.001;
 const onSet=goldenShot&&gallery.update(galleryTime,heroStage,reduced,mode==='complete');
 ceremony.setColor(energyColor);
 if(!onSet)ceremony.update(ms*.001,{rank,power,shake,burst,charging:mode==='charging'||mode==='promoting'||mode==='breaking',complete:mode==='complete',x:planet.position.x,size});
 if(onSet)heroSkin?.update(clock,{moving:false,jumping:false});
 if(heroStage&&!onSet){
  heroStage.visible=!!heroSkin&&mode==='breaking'&&burst>.32;
  if(heroStage.visible){
   const rise=smoothUnit((burst-.32)/.62),height=2*Math.tan(camera.fov*Math.PI/360)*(camera.position.z-1.25);
   const scale=Math.min(2.8,height*.59/Math.max(.1,heroSize.y),height*camera.aspect*.73/Math.max(.1,heroSize.x,heroSize.z));
   heroStage.position.set(0,-.05-(reduced?0:(1-rise)*.45),1.25);
   heroStage.rotation.y=heroYaw+(reduced?0:(1-rise)*.92);heroStage.scale.setScalar(scale*(reduced?1:.84+.16*rise));
   heroSkin.update(ms*.001,{moving:false,jumping:false});
  }
 }
 if(mode==='breaking'&&burst>=1&&ms-burstAt>=(reduced?180:maxRank===GOLDEN_LEGEND_RARITY?4300:premium?2600:heroSkin?1650:1200)){mode='complete';crest?.reset();if(onSet)gallery.update(galleryTime,heroStage,reduced,true);promotionCue?.reset();onProgress?.({rank,maxRank,mode:'complete'});const done=resolveReveal;resolveReveal=null;done?.(true);}

 renderer.autoClear=true;
 if(onSet)gallery.draw(renderer,rect.width/rect.height,0);
 else renderer.render(scene,camera);
 if(collection||host.dataset.stage!=='idle'||mode!=='idle')return;
 if(uiCamera.right!==rect.width/2||uiCamera.top!==rect.height/2){
  uiCamera.left=-rect.width/2;uiCamera.right=rect.width/2;uiCamera.top=rect.height/2;uiCamera.bottom=-rect.height/2;uiCamera.updateProjectionMatrix();
 }
 let hasButton=false;
 for(const {group,button} of buttons){
  if(button.hidden){group.visible=false;continue;}
  const box=button.getBoundingClientRect();group.visible=!!box.width&&getComputedStyle(button).visibility==='visible';
  if(!group.visible)continue;
  hasButton=true;group.position.set(box.x+box.width/2-rect.x-rect.width/2,rect.height/2-(box.y+box.height/2-rect.y),0);group.scale.set(box.width/185,box.height/72,1);group.rotation.x=-.08;
  group.children.forEach(m=>{if(m.material)m.material.opacity=button.disabled?.4:1;});
 }
 if(hasButton){renderer.autoClear=false;renderer.clearDepth();renderer.render(uiScene,uiCamera);}
 }

 function syncActivity(){
  if(document.hidden||host.dataset.previewOpen==='true'){cancelAnimationFrame(raf);raf=0;return;}
  if(!raf&&!disposed){lastFrame=performance.now();frameGate.reset();idleGate.reset();raf=requestAnimationFrame(tick);}
 }
 const previewObserver=new MutationObserver(syncActivity);previewObserver.observe(host,{attributes:true,attributeFilter:['data-preview-open']});
 document.addEventListener('visibilitychange',syncActivity);
 onProgress?.({rank,maxRank,mode:'idle'});syncActivity();
 return {tap,reset(){crest?.reset();gallery?.reset(scene);promotionCue?.reset();promotion=false;promotionAt=0;rank=-1;mode='idle';energyColor.set(premium?'#ffe0a3':palette[0]);if(heroStage)heroStage.visible=false;burstAt=0;shakeAt=-10000;onProgress?.({rank,maxRank,mode});},reveal(max,{items=[]}={}){
  // Build the gold mount before the interactive sequence, so the five stones
  // can settle into their seats without meshing the filigree mid-animation.
  gallery?.reset(scene);
  const featured=items.reduce((best,item)=>!best||item.rarity>best.rarity?item:best,null);
  prepareHero(featured);
  if(premium&&max===GOLDEN_LEGEND_RARITY){
   gallery??=createGoldenGallery(T,host,scene.environment);
   gallery.prepare(featured,heroSize);
   crest??=createPremiumCrest(T,scene,geo,mat);
   crest.prepareGold();
  }
  promotionCue?.reset();promotion=premium&&max===GOLDEN_LEGEND_RARITY&&random()<.5;rank=-1;maxRank=max;mode='charging';onProgress?.({rank,maxRank,mode});return new Promise(resolve=>{resolveReveal=resolve;});},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);previewObserver.disconnect();document.removeEventListener('visibilitychange',syncActivity);canvas.removeEventListener('pointerup',pointerUp);resolveReveal?.(false);resolveReveal=null;heroSkin?.dispose();ceremony.dispose();crest?.dispose();gallery?.reset(scene);gallery?.dispose();promotionCue?.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
