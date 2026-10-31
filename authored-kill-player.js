import {createCinematicArt} from './kill-cinematic-art.js';
import {createRenderBudget} from './render-performance.js';
import {createSelectedRoleCinematic} from './selected-role-cinematics.js';
import {createKillCinematicBackground} from './kill-cinematic-background.js';

// The same authored choreography and cinematic assets run in game and preview.
export const authoredKillRoles = [
  ['impostor','インポスター',4.2],['jackal','ジャッカル',1.8],
  ['sheriff','シェリフ',2.4],['samurai','侍',1.9],['slugger','スラッガー',1.6],
  ['vampire','ヴァンパイア',3.4],['viper','バイパー',4.1],
  ['penguin','ペンギン',2.6],['rocket','ロケット',3],
  ['arsonist','アーソニスト',4.4],['conjurer','コンジュラー',2.8],
  ['waveCannon','波動砲',1.9],['suicideBomber','自爆魔',2.6],
  ['triggerHappy','トリガーハッピー',2.4],
  ['fencer','フェンサー',2.05],['evolver','エボルバー',2.25],
  ['bomber','ボマー',2.2],['boxer','ボクサー',2.2],
  ['bait','ベイト（強制通報）',1.85],
];

export function resolveAuthoredKillRole(cause='', killer={}) {
  if(['boxer','bomber'].includes(cause))return cause;
  // Passive/report and transport clips are previews, not fake ways of killing.
  if(['bait','carrier'].includes(killer.subrole))return 'impostor';
  if(killer.subrole==='bomber'&&cause!=='bomber')return 'impostor';
  const aliases={killed:'',samuraiSlash:'samurai',sluggerSwing:'slugger',vampireBite:'vampire',sheriffMisfire:'sheriff',waveCannonJackal:'waveCannon',jackalWaveCannon:'waveCannon'};
  const normalize=value=>Object.hasOwn(aliases,value)?aliases[value]:value;
  const role=normalize(cause)||normalize(killer.subrole)||normalize(killer.role);
  return authoredKillRoles.some(([id])=>id===role)?role:'impostor';
}

export function authoredKillSpec(assets,role) {
  const entry=authoredKillRoles.find(([id])=>id===role)||authoredKillRoles[0];
  if(['fencer','evolver','bomber','boxer','bait'].includes(entry[0]))return{role:entry[0],label:entry[1],duration:entry[2],playbackRate:1,trimStart:0,trimEnd:.03,source:''};
  const source=entry[0]==='impostor'?assets.KILL_ASSET_SRCDOC:
    entry[0]==='vampire'?assets.SS_VAMPIRE_KILL_SRCDOC:
    entry[0]==='viper'?assets.SS_VIPER_KILL_SRCDOC:assets.KILL_DEMOS[entry[0]==='triggerHappy'?'sheriff':entry[0]].html;
  return {role:entry[0],label:entry[1],duration:entry[2],playbackRate:role==='rocket'?2.6:1.16,trimStart:role==='rocket'?.4:.08,trimEnd:.14,source};
}

export function authoredKillDurationMs(role){
 const duration=authoredKillRoles.find(([id])=>id===role)?.[2]||4.2;
 return ['fencer','evolver','bomber','boxer','bait'].includes(role)?Math.max(.1,duration-.03)*1000:role==='rocket'?Math.max(.1,duration-.54)/2.6*1000:Math.max(.1,duration-.22)/1.16*1000;
}

// This function is serialized into one preloaded iframe. A single WebGL context
// serves every original scene, without fetching modules again at the death event.
function authoredRuntime(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass,createArt,makeRenderBudget,makeSelectedScene) {
  const budget=makeRenderBudget(),gate=budget.gate();let frameRequest=0;
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:!budget.mobile,powerPreference:budget.mobile?'default':'high-performance'});
  budget.syncRenderer(renderer,budget.mobile?1:2);
  document.body.append(renderer.domElement);
  const host=document.querySelector('#originalControls');
  const nameLayer=document.createElement('div');nameLayer.id='actorNames';document.body.append(nameLayer);
  const nameLabels=[];
  let controller=null,configuration=null,time=0,target=0,playing=false,audible=false,finished=false,dirty=false,last=performance.now();
  let sharedAudio=null,audioOutput=null;
  const listeners=[],timers=new Set();
  let owned=null;
  const send=data=>parent.postMessage(data,'*');
  function collect(object){
    object.traverse(node=>{if(node.geometry)owned.geometries.add(node.geometry);for(const material of [].concat(node.material||[])){owned.materials.add(material);for(const value of Object.values(material))if(value?.isTexture)owned.textures.add(value);}});
  }
  function dispose(){
    nameLabels.length=0;nameLayer.replaceChildren();
    for(const [type,handler,options] of listeners)window.removeEventListener(type,handler,options);
    listeners.length=0;for(const timer of timers)clearTimeout(timer);timers.clear();
    if(controller){
      collect(controller.scene);const {geometries,materials,textures}=owned;
      controller.scene.traverse(object=>object.shadow?.dispose?.());
      for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
      controller.art.dispose();controller.nodes.forEach(node=>node.remove());
      controller.composer.passes.forEach(pass=>pass.dispose?.());controller.composer.dispose();controller=null;owned=null;
    }
    renderer.clear();
  }
  function initialize(data){
    dispose();configuration=data;time=target=0;finished=false;playing=false;audible=false;
    owned={geometries:new Set(),materials:new Set(),textures:new Set()};
    if(['fencer','evolver','bomber','boxer','bait'].includes(data.role)){
      host.replaceChildren();
      const buildCostume=data.costumeLib?new Function('THREE',data.costumeLib+'\nreturn buildLightCostume;')(THREE):null;
      controller=makeSelectedScene(THREE,{renderer,data,art:createArt(THREE),buildCostume,cue:playSelectedCue});
      finishInitialization(data);return;
    }
    const parsed=new DOMParser().parseFromString(data.source,'text/html');
    const script=[...parsed.querySelectorAll('script[type="module"]')].map(node=>node.textContent).join('\n');
    if(!script.includes('function startLoop(update)'))throw new Error('Unsupported original animation');
    parsed.querySelectorAll('script,style,link,canvas').forEach(node=>node.remove());host.innerHTML=parsed.body.innerHTML;
    let code=script.replace(/^import .*;\s*$/gm,'')
      .replace(/new THREE\.WebGLRenderer\(\{[^}]*\}\)/g,'__runtime.renderer')
      .replace(/renderer\.setPixelRatio\([^\n;]*\);/g,'renderer.setPixelRatio(__runtime.pixelRatio);')
      .replace('const scene=new THREE.Scene();','const scene=new THREE.Scene();__runtime.ownScene(scene);')
      .replace('document.body.prepend(renderer.domElement);','')
      .replace(/scene\.background\s*=\s*new THREE\.Color\([^;]*\);/g,'scene.background=null;')
      .replace(/function makeCrew\([\s\S]*?(?=\/\* ---------- particles)/,'function makeCrew(color,options){return __runtime.art.makeCrew(color,{...options,gameplay:__runtime.payload.useGameCharacter===true});}\n\n')
      .replace(/(^|\n)[ \t]*stage\([^;\n]*\);/g,'$1')
      .replace(/function startLoop\(update\)\{[\s\S]*?\nfunction setCam/,'function startLoop(update){__runtime.update=update;}\nfunction setCam')
      .replace('if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;continue;}','if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;P.pos[i*3+1]=-10000;continue;}')
      .replace(/a\.destination/g,'__runtime.audioOutput')
      .replace('const MAXP=2600,','const MAXP=1200,');
    // Fade routines must retain the alpha of the visor reflection layer.
    code=code.replace(/function setAlpha\(c,a\)\{[^\n]*\}/,'function setAlpha(c,a){for(const m of(c._am||(c._am=allMats(c)))){const glass=m.userData.cinematicTransparent;m.transparent=!!glass||a<.995;m.opacity=glass?m.userData.cinematicOpacity*a:a;m.depthWrite=glass?false:a>.98;}}');
    // The old white star covered the point of contact. Keep its sound/timing,
    // using the cinematic's small sparks and blade trails for the visible hit.
    if(data.role==='impostor')code=code.replace(/function impact\(p,[\s\S]*?(?=\nfunction dust)/,'function impact(p,{col=0xffffff,s=1}={}){burst(p,20*s,3,col,.3,3,1.8);}\n')
      .replace(/function dust\([\s\S]*?(?=\nconst crackTex)/,'function dust(x,z,n=24,sz=1){burst(new THREE.Vector3(x,.04,z),Math.min(n,16),1.2,0x8b9cac,.3,1,2);}\n');
    else code=code.replace(/function impact\(p,[\s\S]*?(?=\nfunction ring)/,'function impact(p,col=0xffffff,s=1){burst(p,16*s,2.5,col,.3,3,1.8);}\n')
      .replace(/function dust\(x,z,n=24,sz=1\)\{[^\n]*/,'function dust(x,z,n=24,sz=1){burst(V3(x,.04,z),Math.min(n,16),1.2,0x8b9cac,.3,1,2);}\n');
    if(data.role==='viper'){
      code=code.replace('clamp((t-2.5)/2.4,0,1)','clamp((t-2.3)/1.6,0,1)')
        .replace(/\{const hood=new THREE\.Mesh[\s\S]*?viper\.torso\.add\(eye\);\}/,'')
        .replace('o.material=meltMat(o.material===vic.visorM?0x9fdcf0:col);','o.material=__runtime.art.corrosionMaterial(o.material,meltU);');
    }
    if(data.role==='vampire')code=code.replace(/\/\* cape \+ fangs \*\/[\s\S]*?(?=const VX=)/,'');
    if(data.role==='samurai')code=code.replace(/function swordLine\([\s\S]*?(?=\nfunction slashTick)/,'function swordLine(){}\n');
    if(data.role==='jackal')code=code.replace(/function sliceTrail\([\s\S]*?(?=\nfunction reset)/,'function sliceTrail(){}\n');
    code=code.replace('composer.addPass(new OutputPass());',`composer.addPass(new OutputPass());
      for(const pass of composer.passes){
        if(pass.blendMaterial){Object.assign(pass.blendMaterial,{blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneFactor,blendEquationAlpha:THREE.AddEquation,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});pass.blendMaterial.needsUpdate=true;}
        if(pass instanceof OutputPass){pass.material.fragmentShader=pass.material.fragmentShader.replace(/}\\s*$/, 'gl_FragColor.rgb*=gl_FragColor.a;\\n}');pass.material.needsUpdate=true;}
      }`);
    code=code.replace(/new \(window.AudioContext\|\|window.webkitAudioContext\)\(\)/g,'__runtime.audio');
    const actors={impostor:['killer','victim,victimB'],jackal:['jk','vic'],sheriff:['she','tgt,crewMis'],triggerHappy:['she','tgt,crewMis'],samurai:['sam','...vics'],slugger:['sl','vic'],vampire:['vamp','vic'],viper:['viper','vic'],penguin:['peng','vic'],rocket:['rk','vic'],arsonist:['ars','...tg'],conjurer:['cj','vic'],waveCannon:['jk','vic'],suicideBomber:['bom','...vics']};
    const [attacker,victims]=actors[data.role];
    const starts={impostor:'play("knife");',jackal:'reset();startShow(killTick,1.8);',sheriff:'startShow(()=>{},2.4,reset);',triggerHappy:'startShow(shootTick(false),2.4,reset);',samurai:'startShow(slashTick,1.9,reset);',slugger:'startShow(swingTick,1.6,reset);',vampire:'rolePayload=payload;roleStarted=true;startShow(()=>{},3.4,reset);',viper:'startAcceptedRoleKill(payload);',penguin:'startShow(captureTick,2.6,reset);',rocket:'startShow(launchTick,3,reset);',arsonist:'reset();tg.forEach((target,index)=>{if(index<(payload.victims?.length||1))oil(target);else target.root.visible=false;});startShow(igniteTick(),4.4);',conjurer:'startShow(()=>{},2.8,reset);',waveCannon:'startShow(blastTick,1.9,reset);',suicideBomber:'startShow(boomTick,2.6,reset);'};
    const propNames={impostor:'weapons',sheriff:'gun',triggerHappy:'gun',slugger:'hari',vampire:'drops,timer,neckRing,spark',viper:'needle,meltU,pud',rocket:'fin,pad,smoke,flame',waveCannon:'gun,coreG,floorLine,hitRip',suicideBomber:'bomb,fuse'};
    // Original role-only hats are placeholders; substitute the players' outfits
    // when actual game data is available, leaving original demo outfits otherwise.
    code=code.replace(/c\.torso\.add\(g\);return g;/g,'g.userData.authoredHat=true;c.torso.add(g);return g;');
    const bridge=`
      function dress(actor,color,outfit){
        if(color){actor.suit.color.set(color);actor.base?.set(color);}
        if(outfit&&typeof buildLightCostume==="function"){
          const hats=[];actor.root.traverse(object=>{if(object.userData.authoredHat)hats.push(object);});hats.forEach(hat=>hat.removeFromParent());
          const wear=buildLightCostume(THREE,outfit);wear.userData.pet?.removeFromParent();
          for(const [index,pants]of(wear.userData.walkPants||[]).entries())if(actor.legs[index]){pants.position.sub(actor.legs[index].position);actor.legs[index].add(pants);}
          wear.position.y=-actor.torso.position.y;actor.torso.add(wear);
        }
      }
      const payload=__runtime.payload;
      ${starts[data.role]}
      ${['impostor','vampire','viper'].includes(data.role)?'assetVolume=1;':''}
      dress(${attacker},payload.killerColor,payload.killerCostume);
      for(const [index,actor] of [${victims}].entries())dress(actor,payload.victims?.[index]?.color||payload.victimColor,payload.victims?.[index]?.costume||payload.victimCostume);
      ${['samurai','suicideBomber'].includes(data.role)?`for(const [index,actor] of [${victims}].entries())if(index>0&&(!payload.victims||index>=payload.victims.length))actor.root.visible=false;`:''}
      ${data.role==='impostor'?'':'show.after=()=>{};'}
      const art=__runtime.art.mount({scene,camera,renderer,role:${JSON.stringify(data.role)},duration:${data.duration},attacker:${attacker},victims:[${victims}],payload,props:{bloom,pPts,fxLight,tone,noise,${propNames[data.role]||''}}});
      return {scene,camera,composer,actors:[${attacker},${victims}],
        art,nodes:[],
        step(dt,time){__runtime.update?.(dt,dt,time);stepParticles(dt);art.update(dt,time);shake=Math.max(0,shake-dt*2.4);flashV=0;if(flashEl)flashEl.style.opacity=0;},
        render(){art.renderCamera();composer.render();}};
    `;
    const runtime={renderer,pixelRatio:budget.pixelRatio(budget.mobile?1:2),art:createArt(THREE),payload:data.payload||{},update:null,ownScene(scene){const add=scene.add;scene.add=function(...objects){for(const object of objects)collect(object);return add.apply(this,objects);};},get audio(){if(!sharedAudio){sharedAudio=new (window.AudioContext||window.webkitAudioContext)();audioOutput=sharedAudio.createGain();audioOutput.connect(sharedAudio.destination);}return sharedAudio;},get audioOutput(){this.audio;return audioOutput;}};
    const listen=(type,handler,options)=>{listeners.push([type,handler,options]);window.addEventListener(type,handler,options);};
    const timeout=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
    if(audioOutput)audioOutput.gain.value=0;
    const previousNodes=new Set(document.body.children);
    controller=new Function('THREE','EffectComposer','RenderPass','UnrealBloomPass','OutputPass','__runtime','addEventListener','setTimeout',data.costumeLib+'\n'+code+'\n'+bridge)(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass,runtime,listen,timeout);
    controller.nodes=[...document.body.children].filter(node=>!previousNodes.has(node));
    finishInitialization(data);
  }
  function playSelectedCue(from,to,length,type){
    if(!playing&&!audible)return;
    try{
      if(!sharedAudio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;sharedAudio=new Audio();audioOutput=sharedAudio.createGain();audioOutput.connect(sharedAudio.destination);}
      audioOutput.gain.value=Math.max(0,Math.min(1,Number(configuration?.payload?.volume)||0));sharedAudio.resume().catch(()=>{});
      const at=sharedAudio.currentTime,osc=sharedAudio.createOscillator(),envelope=sharedAudio.createGain();osc.type=type||'triangle';osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(.10,at+.008);envelope.gain.exponentialRampToValueAtTime(.0001,at+length);osc.connect(envelope);envelope.connect(audioOutput);osc.onended=()=>{osc.disconnect();envelope.disconnect();};osc.start(at);osc.stop(at+length+.02);
    }catch{}
  }
  function finishInitialization(data){
    for(const [index,actor] of controller.actors.entries()){
      const name=index===0?data.payload?.killerName:data.payload?.victims?.[index-1]?.name||data.payload?.victimName;
      if(!name)continue;
      const label=document.createElement('span');label.textContent=String(name);label.className='actorName';nameLayer.append(label);
      nameLabels.push({actor,label,anchor:new THREE.Vector3()});
    }
    collect(controller.scene);
    if(budget.mobile)controller.scene.traverse(object=>{if(object.shadow)object.shadow.mapSize.set(512,512);});
    try{if(typeof parent.__spaceRenderShadowsEnabled==='boolean')renderer.shadowMap.enabled=parent.__spaceRenderShadowsEnabled;}catch{}
    if(audioOutput)audioOutput.gain.value=0;
    resize();controller.step(0,0);
    const start=Math.max(0,Number(data.trimStart)||0);
    while(time+1e-6<start){const dt=Math.min(1/60,start-time);time+=dt;controller.step(dt,time);}
    target=time;renderScene();dirty=false;
  }
  function renderScene(){
    budget.shadows(renderer,performance.now());
    controller.render();
    for(const {actor,label,anchor} of nameLabels){
      let visible=actor.body.visible&&actor.suit.opacity>.05;
      for(let object=actor.root;object;object=object.parent)if(!object.visible)visible=false;
      actor.body.getWorldPosition(anchor);anchor.y+=1.35*actor.root.scale.y;anchor.project(controller.camera);
      label.hidden=!visible||anchor.z< -1||anchor.z>1;
      if(label.hidden)continue;
      const halfWidth=label.offsetWidth*.5,height=label.offsetHeight;
      label.style.left=Math.max(8+halfWidth,Math.min(innerWidth-8-halfWidth,(anchor.x+1)*innerWidth*.5))+'px';
      label.style.top=Math.max(8+height,Math.min(innerHeight-8,(1-anchor.y)*innerHeight*.5))+'px';
    }
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
        if(data.autoPlay){playing=true;last=performance.now();sharedAudio?.resume().catch(()=>{});}
      }else if(data?.type==='authored-time'&&controller){
        const value=Math.max(0,Math.min(configuration.duration,Number(data.time)||0));
        if(value<time-.001)initialize(configuration);
        target=value;playing=false;audible=!!data.audible;
      }else if(data?.type==='authored-resize'){
        resize();
      }else if(data?.type==='authored-volume'&&configuration){
        configuration.payload.volume=Math.max(0,Math.min(1,Number(data.volume)||0));
        if(configuration.payload.volume>0)sharedAudio?.resume().catch(()=>{});
      }else if(data?.type==='authored-stop'){
        playing=false;audible=false;if(audioOutput)audioOutput.gain.value=0;dispose();configuration=null;
      }else if(data?.type==='ss-render-shadows'&&typeof data.enabled==='boolean'){
        renderer.shadowMap.enabled=data.enabled;renderer.shadowMap.needsUpdate=true;
      }
      requestFrame();
    }catch(error){playing=false;send({type:'authored-error',message:String(error.message),id:data?.id});}
  });
  function frame(now){
    frameRequest=0;if(document.hidden)return;
    const elapsed=Math.min(Math.max(0,(now-last)/1000),.25);last=now;
    if(controller&&configuration){
      if(audioOutput)audioOutput.gain.value=playing||audible?Math.max(0,Math.min(1,Number(configuration.payload?.volume)||0)):0;
      const end=Math.max(.1,configuration.duration-(Number(configuration.trimEnd)||0));
      if(playing)target=Math.min(end,target+elapsed*(Number(configuration.playbackRate)||1));
      while(time+1e-6<target){const dt=Math.min(1/60,target-time);time+=dt;controller.step(dt,time);dirty=true;}
      if(dirty&&(gate.due(now)||time>=end)){renderScene();dirty=false;}
      if(time>=end&&!finished&&!dirty){finished=true;playing=false;send({type:'authored-done',id:configuration.id});}
    }
    if(playing||dirty||time+1e-6<target)requestFrame();
  }
  function requestFrame(){if(frameRequest||document.hidden||!controller)return;frameRequest=requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();gate.reset();requestFrame();}});
  window.addEventListener('resize',requestFrame);
  addEventListener('pagehide',event=>{cancelAnimationFrame(frameRequest);frameRequest=0;if(!event.persisted){dispose();sharedAudio?.close().catch(()=>{});renderer.dispose();renderer.forceContextLoss();}});
  addEventListener('pageshow',()=>{last=performance.now();requestFrame();});
  resize();send({type:'authored-ready'});
}

export function createAuthoredKillPlayer({mount,cdnBase='https://cdn.jsdelivr.net/npm/three@0.164.1',onDone=()=>{},onError=()=>{}}) {
  const frame=document.createElement('iframe');frame.title='役職別キル演出';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.allow='autoplay';
  frame.style.cssText='color-scheme:dark;position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;pointer-events:none;visibility:hidden';
  let ready=false,pending=null,lastTime=null,lastAudible=false,destroyed=false;
  const post=data=>frame.contentWindow?.postMessage(data,'*');
  const receive=event=>{
    if(event.source!==frame.contentWindow||destroyed)return;
    const data=event.data;
    if(data?.type==='authored-ready'){ready=true;if(pending)post(pending);}
    if(data?.type==='authored-configured'&&pending?.id===data.id&&lastTime!==null)post({type:'authored-time',time:lastTime,audible:lastAudible});
    if(data?.type==='authored-done'&&pending?.id===data.id)onDone();
    if(data?.type==='authored-error')onError(data.message);
  };
  window.addEventListener('message',receive);
  const base=cdnBase.replace(/\/$/,'');
  frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{color-scheme:dark;margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%}#originalControls{display:none!important}#actorNames{position:absolute;inset:0;pointer-events:none;overflow:hidden}.actorName{position:absolute;width:max-content;transform:translate(-50%,-100%);max-width:min(42vw,300px);color:#f8fdff;font:900 clamp(12px,2.3vw,23px)/1.2 system-ui,sans-serif;-webkit-text-stroke:3px #06101b;paint-order:stroke fill;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actorName[hidden]{display:none}</style></head><body><div id="originalControls"></div><script type="module">import * as THREE from '${base}/build/three.module.js';import {EffectComposer} from '${base}/examples/jsm/postprocessing/EffectComposer.js';import {RenderPass} from '${base}/examples/jsm/postprocessing/RenderPass.js';import {UnrealBloomPass} from '${base}/examples/jsm/postprocessing/UnrealBloomPass.js';import {OutputPass} from '${base}/examples/jsm/postprocessing/OutputPass.js';(${authoredRuntime.toString()})(THREE,EffectComposer,RenderPass,UnrealBloomPass,OutputPass,(${createCinematicArt.toString()}),(${createRenderBudget.toString()}),(${createSelectedRoleCinematic.toString()}));<\/script></body></html>`
    .replace('<script type="module">',`<script type="importmap">${JSON.stringify({imports:{three:base+'/build/three.module.js','three/addons/':base+'/examples/jsm/'}})}<\/script><script type="module">`);
  const slash=createKillCinematicBackground();
  mount.append(slash,frame);
  return {
    frame,
    configure(assets,role,payload={},autoPlay=false){const spec=authoredKillSpec(assets,role);const accents={fencer:'#8cecff',evolver:'#9cea8b',bomber:'#ffb65b',boxer:'#ff8a9f',bait:'#ffd18c',samurai:'#aeeeff',viper:'#9dff83',vampire:'#bf9aff',arsonist:'#ffb86c',waveCannon:'#68edff',conjurer:'#ba9cff',rocket:'#ffcf8c'};slash.style.setProperty('--ssx-kill-accent',accents[spec.role]||'#ff7589');pending={...spec,type:'authored-configure',costumeLib:assets.COSTUME_LIB_SRC||'',payload,autoPlay,id:String(payload.id||crypto.randomUUID())};lastTime=null;if(ready)post(pending);return spec;},
    seek(time,audible=false){lastTime=time;lastAudible=audible;if(ready&&pending)post({type:'authored-time',time,audible});},
    setVolume(volume){if(pending)pending.payload.volume=Math.max(0,Math.min(1,Number(volume)||0));post({type:'authored-volume',volume});},
    show(visible){const changed=(frame.style.visibility==='visible')!==visible;frame.style.visibility=visible?'visible':'hidden';slash.style.visibility=visible?'visible':'hidden';slash.classList.toggle('ssx-kill-slash-on',visible);if(visible&&changed)post({type:'authored-resize'});},
    stop(){pending=null;lastTime=null;post({type:'authored-stop'});frame.style.visibility='hidden';slash.style.visibility='hidden';slash.classList.remove('ssx-kill-slash-on');},
    destroy(){destroyed=true;window.removeEventListener('message',receive);frame.remove();slash.remove();},
    get ready(){return ready;},
  };
}
