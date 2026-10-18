// Reuse the original authored scenes. Their geometry, camera tracks and effects
// stay in the lossless embedded asset bundle, shared by the game and preview.
export const authoredKillRoles = [
  ['impostor','インポスター',4.2],['jackal','ジャッカル',1.8],
  ['sheriff','シェリフ',1.7],['samurai','侍',1.9],['slugger','スラッガー',1.6],
  ['vampire','ヴァンパイア',1.2],['viper','バイパー',4.1],
  ['penguin','ペンギン',2.6],['rocket','ロケット',3],
  ['arsonist','アーソニスト',4.4],['conjurer','コンジュラー',2.4],
  ['waveCannon','波動砲',1.9],['suicideBomber','自爆魔',2.6],
];

export function resolveAuthoredKillRole(cause='', killer={}) {
  const aliases={killed:'',samuraiSlash:'samurai',sluggerSwing:'slugger',vampireBite:'vampire',sheriffMisfire:'sheriff',waveCannonJackal:'waveCannon',jackalWaveCannon:'waveCannon'};
  const normalize=value=>Object.hasOwn(aliases,value)?aliases[value]:value;
  const role=normalize(cause)||normalize(killer.subrole)||normalize(killer.role);
  return authoredKillRoles.some(([id])=>id===role)?role:'impostor';
}

export function authoredKillSpec(assets,role) {
  const entry=authoredKillRoles.find(([id])=>id===role)||authoredKillRoles[0];
  const source=entry[0]==='impostor'?assets.KILL_ASSET_SRCDOC:
    entry[0]==='vampire'?assets.SS_VAMPIRE_KILL_SRCDOC:
    entry[0]==='viper'?assets.SS_VIPER_KILL_SRCDOC:assets.KILL_DEMOS[entry[0]].html;
  return {role:entry[0],label:entry[1],duration:entry[2],source};
}

// This function is serialized into one preloaded iframe. A single WebGL context
// serves every original scene, without fetching modules again at the death event.
function authoredRuntime(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  document.body.append(renderer.domElement);
  const host=document.querySelector('#originalControls');
  let controller=null,configuration=null,time=0,target=0,playing=false,finished=false,dirty=false,last=performance.now();
  let sharedAudio=null,audioOutput=null;
  const listeners=[],timers=new Set();
  const send=data=>parent.postMessage(data,'*');
  function dispose(){
    for(const [type,handler,options] of listeners)window.removeEventListener(type,handler,options);
    listeners.length=0;for(const timer of timers)clearTimeout(timer);timers.clear();
    if(controller){
      const geometries=new Set(),materials=new Set(),textures=new Set();
      controller.scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);object.shadow?.dispose?.();for(const material of [].concat(object.material||[])){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
      for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
      controller.composer.passes.forEach(pass=>pass.dispose?.());controller.composer.dispose();controller=null;
    }
    renderer.clear();
  }
  function initialize(data){
    dispose();configuration=data;time=target=0;finished=false;playing=false;
    const parsed=new DOMParser().parseFromString(data.source,'text/html');
    const script=[...parsed.querySelectorAll('script[type="module"]')].map(node=>node.textContent).join('\n');
    if(!script.includes('function startLoop(update)'))throw new Error('Unsupported original animation');
    parsed.querySelectorAll('script,style,link,canvas').forEach(node=>node.remove());host.innerHTML=parsed.body.innerHTML;
    let code=script.replace(/^import .*;\s*$/gm,'')
      .replace(/new THREE\.WebGLRenderer\(\{[^}]*\}\)/g,'__runtime.renderer')
      .replace('document.body.prepend(renderer.domElement);','')
      .replace(/scene\.background\s*=\s*new THREE\.Color\([^;]*\);/g,'scene.background=null;')
      .replace(/(^|\n)[ \t]*stage\([^;\n]*\);/g,'$1')
      .replace(/function startLoop\(update\)\{[\s\S]*?\nfunction setCam/,'function startLoop(update){__runtime.update=update;}\nfunction setCam')
      .replace('if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;continue;}','if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;P.pos[i*3+1]=-10000;continue;}')
      .replace(/a\.destination/g,'__runtime.audioOutput');
    code=code.replace('composer.addPass(new OutputPass());',`composer.addPass(new OutputPass());
      for(const pass of composer.passes){
        if(pass.blendMaterial){Object.assign(pass.blendMaterial,{blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneFactor,blendEquationAlpha:THREE.AddEquation,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});pass.blendMaterial.needsUpdate=true;}
        if(pass instanceof OutputPass){pass.material.fragmentShader=pass.material.fragmentShader.replace(/}\\s*$/, 'gl_FragColor.rgb*=gl_FragColor.a;\\n}');pass.material.needsUpdate=true;}
      }`);
    code=code.replace(/new \(window.AudioContext\|\|window.webkitAudioContext\)\(\)/g,'__runtime.audio');
    const actors={impostor:['killer','victim,victimB'],jackal:['jk','vic'],sheriff:['she','tgt,crewMis'],samurai:['sam','...vics'],slugger:['sl','vic'],vampire:['vamp','vic'],viper:['viper','vic'],penguin:['peng','vic'],rocket:['rk','vic'],arsonist:['ars','...tg'],conjurer:['cj','vic'],waveCannon:['jk','vic'],suicideBomber:['bom','...vics']};
    const [attacker,victims]=actors[data.role];
    const starts={impostor:'play("knife");',jackal:'reset();startShow(killTick,1.8);',sheriff:'startShow(shootTick(false),1.7,reset);',samurai:'startShow(slashTick,1.9,reset);',slugger:'startShow(swingTick,1.6,reset);',vampire:'startAcceptedRoleKill({...payload,mode:"death"});',viper:'startAcceptedRoleKill(payload);',penguin:'startShow(captureTick,2.6,reset);',rocket:'startShow(launchTick,3,reset);',arsonist:'reset();tg.forEach((target,index)=>{if(!payload.victims||index<payload.victims.length)oil(target);else target.root.visible=false;});startShow(igniteTick(),4.4);',conjurer:'startShow(conjureTick,2.4,reset);',waveCannon:'startShow(blastTick,1.9,reset);',suicideBomber:'startShow(boomTick,2.6,reset);'};
    // Original role-only hats are placeholders; substitute the players' outfits
    // when actual game data is available, leaving original demo outfits otherwise.
    code=code.replace(/c\.torso\.add\(g\);return g;/g,'g.userData.authoredHat=true;c.torso.add(g);return g;');
    const bridge=`
      function dress(actor,color,outfit){
        if(color){actor.suit.color.set(color);actor.base?.set(color);}
        if(outfit&&typeof buildLightCostume==="function"){
          const hats=[];actor.root.traverse(object=>{if(object.userData.authoredHat)hats.push(object);});hats.forEach(hat=>hat.removeFromParent());
          const wear=buildLightCostume(THREE,outfit);wear.userData.pet?.removeFromParent();actor.rig.add(wear);
        }
      }
      const payload=__runtime.payload;
      dress(${attacker},payload.killerColor,payload.killerCostume);
      for(const [index,actor] of [${victims}].entries())dress(actor,payload.victims?.[index]?.color||payload.victimColor,payload.victims?.[index]?.costume||payload.victimCostume);
      ${starts[data.role]}
      ${data.role==='impostor'?'':'show.after=()=>{};'}
      return {scene,camera,composer,actors:[${attacker},${victims}],
        step(dt,time){__runtime.update?.(dt,dt,time);stepParticles(dt);shake=Math.max(0,shake-dt*2.4);flashV=Math.max(0,flashV-dt*2.2);if(flashEl)flashEl.style.opacity=flashV;},
        render(){
          scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
          let extent=1;const corner=new THREE.Vector3();
          for(const actor of [${attacker},${victims}])if(actor.root.visible){const bounds=new THREE.Box3().setFromObject(actor.root);for(let mask=0;mask<8;mask++){corner.set(mask&1?bounds.max.x:bounds.min.x,mask&2?bounds.max.y:bounds.min.y,mask&4?bounds.max.z:bounds.min.z).project(camera);if(corner.z<1)extent=Math.max(extent,Math.abs(corner.x)/.9,Math.abs(corner.y)/.88);}}
          const fov=camera.fov;if(extent>1){camera.fov=Math.min(105,2*Math.atan(Math.tan(fov*Math.PI/360)*extent)*180/Math.PI);camera.updateProjectionMatrix();}
          composer.render();camera.fov=fov;camera.updateProjectionMatrix();}};
    `;
    const runtime={renderer,payload:data.payload||{},update:null,get audio(){if(!sharedAudio){sharedAudio=new (window.AudioContext||window.webkitAudioContext)();audioOutput=sharedAudio.createGain();audioOutput.connect(sharedAudio.destination);}return sharedAudio;},get audioOutput(){this.audio;return audioOutput;}};
    const listen=(type,handler,options)=>{listeners.push([type,handler,options]);window.addEventListener(type,handler,options);};
    const timeout=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
    if(audioOutput)audioOutput.gain.value=0;
    controller=new Function('THREE','EffectComposer','RenderPass','UnrealBloomPass','OutputPass','__runtime','addEventListener','setTimeout',data.costumeLib+'\n'+code+'\n'+bridge)(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass,runtime,listen,timeout);
    if(audioOutput)audioOutput.gain.value=0;
    resize();controller.step(0,0);controller.render();dirty=false;
  }
  function resize(){
    const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
    renderer.setSize(width,height);renderer.setClearColor(0,0);
    if(controller){controller.camera.aspect=width/height;controller.camera.updateProjectionMatrix();controller.composer.setSize(width,height);dirty=true;}
  }
  window.addEventListener('resize',resize);
  window.addEventListener('message',event=>{
    if(event.source!==parent)return;
    const data=event.data;
    try{
      if(data?.type==='authored-configure'){
        initialize(data);send({type:'authored-configured',id:data.id});
        if(data.autoPlay){playing=true;last=performance.now();}
      }else if(data?.type==='authored-time'&&controller){
        const value=Math.max(0,Math.min(configuration.duration,Number(data.time)||0));
        if(value<time-.001)initialize(configuration);
        target=value;playing=false;
      }else if(data?.type==='authored-resize'){
        resize();
      }else if(data?.type==='authored-stop'){
        playing=false;if(audioOutput)audioOutput.gain.value=0;dispose();configuration=null;
      }
    }catch(error){playing=false;send({type:'authored-error',message:String(error.message),id:data?.id});}
  });
  function frame(now){
    const elapsed=Math.min((now-last)/1000,.05);last=now;
    if(controller&&configuration){
      if(audioOutput)audioOutput.gain.value=playing?Math.max(0,Math.min(1,Number(configuration.payload?.volume)||0)):0;
      if(playing)target=Math.min(configuration.duration,target+elapsed);
      while(time+1e-6<target){const dt=Math.min(1/60,target-time);time+=dt;controller.step(dt,time);dirty=true;}
      if(dirty){controller.render();dirty=false;}
      if(time>=configuration.duration&&!finished){finished=true;playing=false;send({type:'authored-done',id:configuration.id});}
    }
    requestAnimationFrame(frame);
  }
  resize();requestAnimationFrame(frame);send({type:'authored-ready'});
}

export function createAuthoredKillPlayer({mount,cdnBase='https://cdn.jsdelivr.net/npm/three@0.164.1',onDone=()=>{},onError=()=>{}}) {
  const frame=document.createElement('iframe');frame.title='役職別キル演出';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.allow='autoplay';
  frame.style.cssText='color-scheme:dark;position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;pointer-events:none;visibility:hidden';
  let ready=false,pending=null,lastTime=null,destroyed=false;
  const post=data=>frame.contentWindow?.postMessage(data,'*');
  const receive=event=>{
    if(event.source!==frame.contentWindow||destroyed)return;
    const data=event.data;
    if(data?.type==='authored-ready'){ready=true;if(pending)post(pending);}
    if(data?.type==='authored-configured'&&pending?.id===data.id&&lastTime!==null)post({type:'authored-time',time:lastTime});
    if(data?.type==='authored-done'&&pending?.id===data.id)onDone();
    if(data?.type==='authored-error')onError(data.message);
  };
  window.addEventListener('message',receive);
  const base=cdnBase.replace(/\/$/,'');
  frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{color-scheme:dark;margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%}#originalControls{display:none!important}</style></head><body><div id="originalControls"></div><script type="module">import * as THREE from '${base}/build/three.module.js';import {EffectComposer} from '${base}/examples/jsm/postprocessing/EffectComposer.js';import {RenderPass} from '${base}/examples/jsm/postprocessing/RenderPass.js';import {UnrealBloomPass} from '${base}/examples/jsm/postprocessing/UnrealBloomPass.js';import {OutputPass} from '${base}/examples/jsm/postprocessing/OutputPass.js';(${authoredRuntime.toString()})(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass);<\/script></body></html>`
    .replace('<script type="module">',`<script type="importmap">${JSON.stringify({imports:{three:base+'/build/three.module.js','three/addons/':base+'/examples/jsm/'}})}<\/script><script type="module">`);
  const slash=document.createElement('div');
  slash.setAttribute('aria-hidden','true');
  slash.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;visibility:hidden';
  slash.innerHTML=`<style>@keyframes ssx-kill-sweep{from{transform:translateX(-35%) scaleX(.1);opacity:.4}to{transform:translateX(0) scaleX(1);opacity:1}}.ssx-kill-slash-on svg{animation:ssx-kill-sweep .16s cubic-bezier(.15,.8,.25,1) both}@keyframes ssx-kill-streak{from{transform:translateX(-160px)}to{transform:translateX(160px)}}.ssx-kill-slash-on .ssx-streak{animation:ssx-kill-streak .3s linear infinite}</style>
  <svg viewBox="0 0 1600 600" preserveAspectRatio="none" style="position:absolute;width:100%;height:84%;top:8%;left:0;overflow:visible">
    <defs><linearGradient id="ssx-kill-red" x2="0" y2="1"><stop stop-color="#ff2929"/><stop offset=".5" stop-color="#e90b1e"/><stop offset="1" stop-color="#ab0019"/></linearGradient><linearGradient id="ssx-kill-core" x2="0" y2="1"><stop stop-color="#ff6f68"/><stop offset=".5" stop-color="#ffe0cc"/><stop offset="1" stop-color="#ff7266"/></linearGradient></defs>
    <path fill="url(#ssx-kill-red)" d="M-120 128 90 182 32 80 230 198 192 130 372 214 330 157 534 222 508 170 710 235 672 185 858 225 815 163 1024 218 969 126 1165 205 1108 90 1320 180 1260 60 1470 172 1412 101 1720 150 1640 280 1720 430 1450 408 1524 508 1307 411 1372 527 1144 417 1203 484 1010 405 1058 468 853 398 889 455 693 401 724 478 522 407 569 479 370 403 422 510 205 399 260 493 56 402 108 478-120 431Z"/>
    <path fill="url(#ssx-kill-core)" d="M-100 238 190 255 117 225 453 272 399 236 702 277 1000 260 923 234 1290 248 1212 217 1710 232 1710 367 1330 351 1394 382 1044 338 1104 372 760 330 493 352 552 379 225 350 284 389-100 372Z"/>
    <g class="ssx-streak" fill="#fff6e7" opacity=".8"><path d="M-100 291 580 296 410 302-100 305ZM650 285 1330 291 1044 299 691 296ZM1110 325 1710 329 1710 338 1300 332ZM-100 331 210 328 418 334-100 337Z"/></g>
    <g fill="none" stroke="#ff3c32" stroke-width="5" opacity=".85"><path d="M60 142 191 213 294 232M382 147 510 213 612 237M1085 144 1218 218 1410 236M180 422 369 375 466 375M1030 424 1190 366 1410 395"/></g>
  </svg>`;
  mount.append(slash,frame);
  return {
    frame,
    configure(assets,role,payload={},autoPlay=false){const spec=authoredKillSpec(assets,role);pending={...spec,type:'authored-configure',costumeLib:assets.COSTUME_LIB_SRC||'',payload,autoPlay,id:String(payload.id||crypto.randomUUID())};lastTime=null;if(ready)post(pending);return spec;},
    seek(time){lastTime=time;if(ready&&pending)post({type:'authored-time',time});},
    show(visible){const changed=(frame.style.visibility==='visible')!==visible;frame.style.visibility=visible?'visible':'hidden';slash.style.visibility=visible?'visible':'hidden';slash.classList.toggle('ssx-kill-slash-on',visible);if(visible&&changed)post({type:'authored-resize'});},
    stop(){pending=null;lastTime=null;post({type:'authored-stop'});frame.style.visibility='hidden';slash.style.visibility='hidden';slash.classList.remove('ssx-kill-slash-on');},
    destroy(){destroyed=true;window.removeEventListener('message',receive);frame.remove();slash.remove();},
    get ready(){return ready;},
  };
}
