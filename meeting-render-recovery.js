import {renderBudgetSource} from './render-performance.js';

// The meeting keeps its scene and actors while the browser rebuilds GPU resources.
export function createMeetingRenderRecovery({renderer,scene,camera,composer,mobile=false,budget=null,rebuildEnvironment=()=>{},disposeEnvironment=()=>{}}){
 let lost=false,disposed=false,direct=mobile,checkFrame=true,reported=false,frames=0;
 const canvas=renderer.domElement,notice=document.getElementById('meetingSceneLoading');
 const post=(type,extra={})=>{if(parent!==window)parent.postMessage({type,...extra},'*');};
 const show=text=>{if(notice){notice.hidden=false;notice.textContent=text;}};
 function render(){
  if(disposed||lost||renderer.getContext().isContextLost())return false;
  try{
   budget?.shadows(renderer,performance.now());
   renderer.setRenderTarget(null);if(direct)renderer.render(scene,camera);else composer.render();
   if(checkFrame){checkFrame=false;const gl=renderer.getContext(),error=gl.getError();if(error!==gl.NO_ERROR&&!direct){direct=true;renderer.resetState();renderer.setRenderTarget(null);renderer.render(scene,camera);}}
   frames++;if(notice)notice.hidden=true;if(!reported){reported=true;post('ss3d-rendered');}return true;
  }catch(error){
   if(!direct){direct=true;renderer.resetState();return render();}
   show('会議室を復旧中…');post('ss3d-render-error',{kind:'frame'});return false;
  }
 }
 function onLost(event){event.preventDefault();if(disposed)return;lost=true;reported=false;show('会議室を復旧中…');post('ss3d-context-lost');}
 function onRestored(){if(disposed)return;lost=false;direct=true;checkFrame=true;reported=false;try{renderer.resetState();renderer.setRenderTarget(null);renderer.shadowMap.needsUpdate=true;rebuildEnvironment();}catch{scene.environment=null;}post('ss3d-context-restored');}
 canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 function dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);composer.passes?.forEach(p=>p.dispose?.());composer.dispose?.();disposeEnvironment();renderer.dispose();renderer.forceContextLoss();}
 addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
 return{render,dispose,state:()=>({lost,direct,frames,disposed,ready:reported})};
}
export function patchMeetingRendering(html){
 if(html.includes('const meetingRenderRecovery='))return html;
 html=html.replace("const mobileMeetingGpu=matchMedia('(pointer:coarse)').matches;",()=>`${renderBudgetSource('meetingBudget')}\nconst mobileMeetingGpu=meetingBudget.mobile;`);
 html=html.replace('mobileMeetingGpu?1.15:1.8','mobileMeetingGpu?1:1.8');
 // Only presentation runs here. Seat state and commands arrive independently
 // through messages, so pausing this loop does not pause the match.
 const loopStart=html.indexOf('function startLoop(update){'),loopEnd=html.indexOf('\nfunction setCam(',loopStart);
 if(loopStart<0||loopEnd<0)throw new Error('Meeting frame loop anchor missing');
 html=html.slice(0,loopStart)+`let resumeMeetingRender=()=>{};
function startLoop(update){const clock=new THREE.Clock(),gate=meetingBudget.gate();let time=0,raf=0;
 function resume(){if(raf||document.hidden||!meetingRenderActive)return;clock.getDelta();gate.reset();raf=requestAnimationFrame(frame);}
 function frame(stamp){raf=0;if(document.hidden||!meetingRenderActive)return;raf=requestAnimationFrame(frame);if(!gate.due(stamp))return;
  const rdt=Math.min(clock.getDelta(),.15),dt=rdt*ts;time+=dt;update(dt,rdt,time);stepFx(dt);stepParticles(dt);
  shake=Math.max(0,shake-rdt*2.4);flashV=Math.max(0,flashV-rdt*2.2);if(flashEl)flashEl.style.opacity=flashV;if(!window.__meetingEjectionOverlayActive)composer.render();
 }
 resumeMeetingRender=resume;document.addEventListener('visibilitychange',resume);
 addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});addEventListener('pageshow',resume);resume();
}`+html.slice(loopEnd);
 html=html.replace('meetingRenderActive=state.renderActive!==false;','meetingRenderActive=state.renderActive!==false;if(meetingRenderActive)queueMicrotask(()=>{if(!meetingRenderActive||document.hidden)return;if(!meetingRenderRecovery.state().ready){alignMeetingIdentity();meetingRenderRecovery.render();}resumeMeetingRender();});');
 const environment='const mrPMREM=new THREE.PMREMGenerator(renderer),mrEnvironment=new RoomEnvironment();scene.environment=mrPMREM.fromScene(mrEnvironment,.04).texture;mrEnvironment.dispose();mrPMREM.dispose();';
 if(!html.includes(environment))throw new Error('Meeting environment anchor missing');
 html=html.replace(environment,`let meetingEnvironmentTarget=null;function rebuildMeetingEnvironment(){const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();try{const next=pmrem.fromScene(environment,.04);meetingEnvironmentTarget?.dispose();meetingEnvironmentTarget=next;scene.environment=next.texture;}finally{environment.dispose();pmrem.dispose();}}try{rebuildMeetingEnvironment();}catch{scene.environment=null;}`);
 const postprocessing='const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));\nconst bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.33,.5,1.35);composer.addPass(bloom);composer.addPass(new OutputPass());';
 if(!html.includes(postprocessing))throw new Error('Meeting composer anchor missing');
 html=html.replace(postprocessing,()=>`const composer=mobileMeetingGpu?{setSize(){},render(){renderer.render(scene,camera);},passes:[]}:new EffectComposer(renderer);if(!mobileMeetingGpu){composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.33,.5,1.35);composer.addPass(bloom);composer.addPass(new OutputPass());}\nconst meetingRenderRecovery=(${createMeetingRenderRecovery.toString()})({renderer,scene,camera,composer,mobile:mobileMeetingGpu,budget:meetingBudget,rebuildEnvironment:rebuildMeetingEnvironment,disposeEnvironment:()=>{meetingEnvironmentTarget?.dispose();scene.environment=null;}});`);
 const identityLayout=`
const identityAnchor=new THREE.Vector3(),identityView=new THREE.Vector3();
function alignMeetingIdentity(){
 camera.updateMatrixWorld(true);
 const height=Math.max(1,innerHeight),width=Math.max(1,innerWidth);
 for(const p of seats){
  if(p.ejectionNameHidden||(p.ejectionStarted&&!p.c?.root?.visible)){
   for(const label of[p.tag,p.roleTag,p.voteCheck,p.voteTally,p.bub,p.alertLabel,p.boostLabel])if(label?.s)label.s.visible=false;
   continue;
  }
  if(!p.c?.root||p.gone)continue;
  p.c.root.updateWorldMatrix(true,false);identityAnchor.set(0,1.85,0);p.c.root.localToWorld(identityAnchor);
  identityView.copy(identityAnchor).applyMatrix4(camera.matrixWorldInverse);
  const pixelsPerUnit=height*camera.projectionMatrix.elements[5]/(2*Math.max(.1,-identityView.z));
  identityAnchor.project(camera);
  if(identityAnchor.z < -1 || identityAnchor.z > 1)continue;
  const place=(L,x,y)=>{if(!L?.s?.visible)return;L.s.position.set(identityAnchor.x+x*2/width,identityAnchor.y+y*2/height,identityAnchor.z).unproject(camera);L.s.material.depthTest=false;L.s.renderOrder=40;};
  // Stack the actual projected sprite rectangles. Fixed pixel offsets overlap
  // at close camera angles and when names use a larger canvas/sprite scale.
  let top=8;
  for(const label of[p.tag,p.roleTag,p.voteCheck,p.voteTally,p.bub]){
   if(!label?.s?.visible)continue;
   const halfHeight=Math.abs(label.s.scale.y)*pixelsPerUnit/2;
   place(label,0,top+halfHeight);top+=halfHeight*2+5;
  }
 }
}
`;
 html=html.replace('let resumeMeetingRender=()=>{};',identityLayout+'\nlet resumeMeetingRender=()=>{};');
 html=html.replace('while(!L.fixedFontSize&&size>10)','while(size>10)');
 html=html.replace('let shown=raw,size=L.fixedFontSize||(crowded?50:56)*(L.fontScale||1);','let shown=raw,size=(crowded?50:56)*(L.fontScale||1);');
 html=html.replace('if(!window.__meetingEjectionOverlayActive)composer.render();','if(!window.__meetingEjectionOverlayActive){alignMeetingIdentity();meetingRenderRecovery.render();}');
 html=html.replace('getState:()=>({room:','getState:()=>({rendering:meetingRenderRecovery.state(),room:');
 const bootstrap=`<script id="meeting-render-watchdog">(()=>{let sent=false;function report(){if(sent)return;sent=true;parent.postMessage({type:'ss3d-render-error',kind:'init'},'*');}addEventListener('error',report,true);addEventListener('unhandledrejection',report);})();</script>`;
 const loading='<div id="meetingSceneLoading" role="status" style="position:fixed;left:60%;top:50%;transform:translate(-50%,-50%);z-index:3;padding:12px 18px;color:#e7f5fa;background:#0b1f30e8;border:1px solid #56889d;border-radius:12px;font:600 15px system-ui;pointer-events:none">会議室を読み込み中…</div>';
 return html.replace('</head>',bootstrap+'</head>').replace('<body>',()=>'<body>'+loading);
}
