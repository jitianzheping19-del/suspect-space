/* LOBBY_PHOTO_DECK_BEGIN */
function createLobbyPhotoDeck({THREE,scene,addObstacle}){
 const root=new THREE.Group();root.name='lobby-starlight-photo-deck';scene.add(root);
 const gold=new THREE.MeshStandardMaterial({color:0xdac49b,metalness:.72,roughness:.3});
 const shell=new THREE.MeshStandardMaterial({color:0x102736,metalness:.45,roughness:.35});
 const floor=new THREE.MeshStandardMaterial({color:0x24414c,metalness:.32,roughness:.46});
 const glow=new THREE.MeshBasicMaterial({color:0x8ce8e0,toneMapped:false});
 const warm=new THREE.MeshBasicMaterial({color:0xffdfad,toneMapped:false});
 const box=new THREE.BoxGeometry(1,1,1),pill=new THREE.CylinderGeometry(1,1,1,16);
 function mesh(g,m,x,y,z,sx=1,sy=1,sz=1){const n=new THREE.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.receiveShadow=true;root.add(n);return n;}
 function block(m,x,y,z,w,h,d){return mesh(box,m,x,y,z,w,h,d);}
 // Wide shallow risers: entered from the open front, with no camera tripod in
 // the walking lane. Each collider has the exact dimensions of its tread.
 const rows=[];
 for(let row=0;row<3;row++){
  const top=.16+row*.26,z=10.25+row*1.06,width=7.5-row*.18;
  block(shell,0,top/2,z,width,top,1.06);block(floor,0,top-.018,z,width-.08,.036,1.00);
  block(gold,0,top-.045,z-.53,width,.035,.028);
  block(glow,0,top-.085,z-.535,width-.24,.018,.014);
  addObstacle(0,z,width,1.06,top,true);
  const columns=row<2?7:6;
  for(let col=0;col<columns;col++){
   const x=(col-(columns-1)/2)*1.04;
   const mark=mesh(new THREE.RingGeometry(.19,.215,20),glow,x,top+.006,z);mark.rotation.x=-Math.PI/2;
   rows.push({x,z,y:top});
  }
 }
 // Rear bulkhead and slim structural pillars leave the sides open.
 block(shell,0,2.94,13.04,8.1,5.9,.18);addObstacle(0,13.04,8.1,.18,5.89,false);
 for(const x of [-4.05,4.05]){
  block(gold,x,2.92,12.89,.13,5.84,.15);
  block(glow,x-Math.sign(x)*.075,2.92,12.78,.025,5.48,.03);
 }
 for(const y of [.13,5.82])block(gold,0,y,12.89,8.17,.09,.18);
 // Single canvas for the deep-space backdrop; stars are batched in a texture.
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;
 const ctx=canvas.getContext('2d'),bg=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
 bg.addColorStop(0,'#071529');bg.addColorStop(.52,'#1c2445');bg.addColorStop(1,'#073e4c');ctx.fillStyle=bg;ctx.fillRect(0,0,1536,1024);
 let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<240;i++){const x=random()*1536,y=random()*1024,r=.5+random()*1.8;ctx.fillStyle=i%4?'#c5dce9':'#fff0c9';ctx.globalAlpha=.25+random()*.65;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const backdrop=mesh(new THREE.PlaneGeometry(7.86,5.52),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}),0,2.94,12.925);
 // Aurora ribbons use one bounded translucent layer, no extra lights or bloom.
 const aurora=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 uvP;void main(){uvP=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvP;uniform float time;void main(){float y=uvP.y;float path=.62+.10*sin(uvP.x*7.+time*.15)+.06*sin(uvP.x*18.-time*.08);float a=exp(-pow((y-path)*16.,2.))*.35;vec3 c=mix(vec3(.22,.92,.77),vec3(.62,.40,1.),uvP.x);gl_FragColor=vec4(c,a);}' });
 mesh(new THREE.PlaneGeometry(7.82,5.48),aurora,0,2.94,12.90);
 // A sculpted ringed planet hangs above the crew, outside their silhouettes.
 const planet=new THREE.Group();planet.name='photo-ringed-planet';planet.position.set(.65,4.05,12.34);root.add(planet);
 const planetMat=new THREE.MeshStandardMaterial({color:0x9abaca,roughness:.72,metalness:.08});
 const globe=new THREE.Mesh(new THREE.SphereGeometry(1.1,32,24),planetMat);planet.add(globe);
 const rings=new THREE.Mesh(new THREE.RingGeometry(1.32,1.86,80),new THREE.MeshBasicMaterial({color:0xd7c3b1,side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));rings.rotation.set(1.02,.25,.30);planet.add(rings);
 const thin=new THREE.Mesh(new THREE.RingGeometry(1.96,1.98,80),warm);thin.rotation.copy(rings.rotation);planet.add(thin);
 // Engraved title uses a plane so it stays anchored to the set, not the camera.
 const title=document.createElement('canvas');title.width=1024;title.height=160;const t=title.getContext('2d');t.textAlign='center';t.fillStyle='#f6e4c5';t.font='500 58px sans-serif';t.fillText('S T A R L I G H T',512,70);t.fillStyle='#9bd8d8';t.font='24px sans-serif';t.fillText('SPACE SUSPECT  /  CREW MEMORIES',512,124);
 const titleTex=new THREE.CanvasTexture(title);titleTex.colorSpace=THREE.SRGBColorSpace;
 const titleMesh=mesh(new THREE.PlaneGeometry(4.7,.735),new THREE.MeshBasicMaterial({map:titleTex,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}),0,5.36,12.69);titleMesh.rotation.y=Math.PI;
 // Sculptural side lamps stay beyond the usable 7.5 m group-photo area.
 for(const side of [-1,1]){
  mesh(pill,gold,side*4.37,.10,11.7,.32,.2,.32);
  mesh(pill,shell,side*4.37,1.65,11.7,.10,3.1,.10);
  block(warm,side*4.37,2.30,11.65,.11,1.5,.08);
  addObstacle(side*4.37,11.7,.54,.54,3.2,false);
  for(let i=0;i<3;i++){
   const star=mesh(new THREE.OctahedronGeometry(.14+i*.025),i%2?glow:warm,side*(3.3+i*.17),3.50+i*.44,12.55);star.rotation.z=.2+i*.4;
  }
 }
 // Freeze static matrix work. Only the single aurora time uniform changes.
 root.traverse(n=>{n.updateMatrix();n.matrixAutoUpdate=false;});
 let last=-Infinity;
 return{root,spots:rows,update(stamp){if(stamp-last<100)return;last=stamp;aurora.uniforms.time.value=stamp*.001;},dispose(){root.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
function installLobbyPhotoCamera({THREE,renderer,scene,camera,player,onStart,crews=()=>[player],ascent=()=>null,circuit=()=>null}){
 const photoCamera=new THREE.PerspectiveCamera(43,16/9,.1,80);photoCamera.position.set(0,5.2,3.0);photoCamera.lookAt(0,2.9,11.8);
 let timer=0,pending=null;const size=new THREE.Vector2();
 const near=()=>Math.abs(player.root.position.x)<4.15&&player.root.position.z>9.1&&player.root.position.z<13.0&&player.root.position.y<1.8;
 // Hide only for this draw so normal lobby visibility survives leaving the
 // deck, cancellation, and labels rebuilt by live voice/roster updates.
 function prepareView(){
  if(!near()&&!pending)return()=>{};
  const saved=[],hide=node=>{if(node?.visible){saved.push(node);node.visible=false;}};
  hide(ascent());
  const track=circuit();
  for(const node of [track?.root,track?.skyMap?.root,track?.spaceMap?.root,track?.vehicles])hide(node);
  for(const crew of crews()){
   const data=crew.root?.userData||{};
   for(const node of [crew.label,data.lobbyNameTag,data.lobbyMicTag,data.lobbyMicCross,data.readyTag,data.connectionIndicator?.root])hide(node);
  }
  const ownVisible=player.root.visible;if(pending)player.root.visible=true;
  return()=>{for(const node of saved)node.visible=true;player.root.visible=ownVisible;};
 }
 function render(viewCamera){const restore=prepareView();try{renderer.render(scene,viewCamera);}finally{restore();}}
 function cancel(){clearTimeout(timer);timer=0;pending=null;window.__lobbyPhotoCamera=null;}
 window.addEventListener('message',event=>{
  if(event.source!==parent)return;const data=event.data||{};
  if(data.type==='lobby-photo-cancel'||data.type==='lobby-render-state'&&data.active!==true){cancel();return;}
  if(data.type!=='lobby-photo-start'||pending||!near()||typeof data.id!=='string'||data.id.length>100||!Number.isFinite(data.at)||Math.abs(data.at-Date.now()-5000)>3000)return;
  pending=data.id;onStart?.();window.__lobbyPhotoCamera=photoCamera;
  timer=setTimeout(()=>{const id=pending;if(!id)return;
   if(document.hidden||window.SpaceSuspectLobby?.__lobbyRenderActive===false){cancel();parent.postMessage({type:'lobby-photo-error',id},'*');return;}
   const ratio=renderer.getPixelRatio();renderer.getSize(size);const width=size.x,height=size.y;
   try{renderer.setPixelRatio(1);renderer.setSize(1280,720,false);photoCamera.aspect=16/9;photoCamera.updateProjectionMatrix();render(photoCamera);const image=renderer.domElement.toDataURL('image/png');parent.postMessage({type:'lobby-photo-result',id,image},'*');}
   catch(error){console.warn('集合写真の撮影に失敗しました',error);parent.postMessage({type:'lobby-photo-error',id},'*');}
   finally{renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);cancel();render(camera);}
  },Math.max(0,data.at-Date.now()));
 });
 window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden&&pending){const id=pending;cancel();parent.postMessage({type:'lobby-photo-error',id},'*');}});
 return{cancel,prepareView,render};
}
/* LOBBY_PHOTO_DECK_END */
