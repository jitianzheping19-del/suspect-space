// The meeting keeps its scene and actors while the browser rebuilds GPU resources.
export function createMeetingRenderRecovery({renderer,scene,camera,composer,mobile=false,rebuildEnvironment=()=>{},disposeEnvironment=()=>{}}){
 let lost=false,disposed=false,direct=mobile,checkFrame=true,reported=false,frames=0;
 const canvas=renderer.domElement,notice=document.getElementById('meetingSceneLoading');
 const post=(type,extra={})=>{if(parent!==window)parent.postMessage({type,...extra},'*');};
 const show=text=>{if(notice){notice.hidden=false;notice.textContent=text;}};
 function render(){
  if(disposed||lost||renderer.getContext().isContextLost())return false;
  try{
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
 return{render,dispose,state:()=>({lost,direct,frames,disposed})};
}
export function patchMeetingRendering(html){
 if(html.includes('const meetingRenderRecovery='))return html;
 const environment='const mrPMREM=new THREE.PMREMGenerator(renderer),mrEnvironment=new RoomEnvironment();scene.environment=mrPMREM.fromScene(mrEnvironment,.04).texture;mrEnvironment.dispose();mrPMREM.dispose();';
 if(!html.includes(environment))throw new Error('Meeting environment anchor missing');
 html=html.replace(environment,`let meetingEnvironmentTarget=null;function rebuildMeetingEnvironment(){const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();try{const next=pmrem.fromScene(environment,.04);meetingEnvironmentTarget?.dispose();meetingEnvironmentTarget=next;scene.environment=next.texture;}finally{environment.dispose();pmrem.dispose();}}try{rebuildMeetingEnvironment();}catch{scene.environment=null;}`);
 const postprocessing='const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));\nconst bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.33,.5,1.35);composer.addPass(bloom);composer.addPass(new OutputPass());';
 if(!html.includes(postprocessing))throw new Error('Meeting composer anchor missing');
 html=html.replace(postprocessing,`const composer=mobileMeetingGpu?{setSize(){},render(){renderer.render(scene,camera);},passes:[]}:new EffectComposer(renderer);if(!mobileMeetingGpu){composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.33,.5,1.35);composer.addPass(bloom);composer.addPass(new OutputPass());}\nconst meetingRenderRecovery=(${createMeetingRenderRecovery.toString()})({renderer,scene,camera,composer,mobile:mobileMeetingGpu,rebuildEnvironment:rebuildMeetingEnvironment,disposeEnvironment:()=>{meetingEnvironmentTarget?.dispose();scene.environment=null;}});`);
 html=html.replace('if(!window.__meetingEjectionOverlayActive)composer.render();','if(!window.__meetingEjectionOverlayActive)meetingRenderRecovery.render();');
 html=html.replace('getState:()=>({room:','getState:()=>({rendering:meetingRenderRecovery.state(),room:');
 const bootstrap=`<script id="meeting-render-watchdog">(()=>{let sent=false;function report(){if(sent)return;sent=true;parent.postMessage({type:'ss3d-render-error',kind:'init'},'*');}addEventListener('error',report,true);addEventListener('unhandledrejection',report);})();</script>`;
 const loading='<div id="meetingSceneLoading" role="status" style="position:fixed;left:60%;top:50%;transform:translate(-50%,-50%);z-index:3;padding:12px 18px;color:#e7f5fa;background:#0b1f30e8;border:1px solid #56889d;border-radius:12px;font:600 15px system-ui;pointer-events:none">会議室を読み込み中…</div>';
 return html.replace('</head>',bootstrap+'</head>').replace('<body>',()=>'<body>'+loading);
}
