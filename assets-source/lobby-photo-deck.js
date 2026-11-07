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
 const aurora=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},tintA:{value:new THREE.Color('#38ebc4')},tintB:{value:new THREE.Color('#9e66ff')}},vertexShader:'varying vec2 uvP;void main(){uvP=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvP;uniform float time;uniform vec3 tintA;uniform vec3 tintB;void main(){float y=uvP.y;float path=.62+.10*sin(uvP.x*7.+time*.15)+.06*sin(uvP.x*18.-time*.08);float a=exp(-pow((y-path)*16.,2.))*.35;vec3 c=mix(tintA,tintB,uvP.x);gl_FragColor=vec4(c,a);}' });
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
 // Camera kiosk in front of the deck, with an illuminated rear screen.
 const station=new THREE.Group();station.name='lobby-photo-camera-station';station.position.set(-4.1,0,8.0);root.add(station);
 const part=(geometry,material,x,y,z)=>{const n=new THREE.Mesh(geometry,material);n.position.set(x,y,z);station.add(n);return n;};
 part(new THREE.CylinderGeometry(.13,.22,.12,20),gold,0,.06,0);
 part(new THREE.CylinderGeometry(.045,.07,1.25,12),shell,0,.72,0);
 for(const side of [-1,1]){const leg=part(new THREE.CylinderGeometry(.035,.045,.8,8),gold,side*.22,.35,0);leg.rotation.z=side*.62;}
 part(new THREE.BoxGeometry(.66,.43,.32),shell,0,1.5,0);
 const lens=part(new THREE.CylinderGeometry(.18,.21,.24,24),gold,0,1.5,.24);lens.rotation.x=Math.PI/2;
 const glass=part(new THREE.CylinderGeometry(.145,.145,.02,24),new THREE.MeshStandardMaterial({color:0x72bfce,metalness:.8,roughness:.18,emissive:0x153843}),0,1.5,.37);glass.rotation.x=Math.PI/2;
 part(new THREE.BoxGeometry(.24,.08,.15),warm,0,1.77,.04);
 part(new THREE.BoxGeometry(.5,.26,.02),glow,0,1.5,-.17);
 const label=document.createElement('canvas');label.width=512;label.height=160;const labelContext=label.getContext('2d');labelContext.fillStyle='#102735';labelContext.fillRect(0,0,512,160);labelContext.textAlign='center';labelContext.fillStyle='#dffbef';labelContext.font='bold 40px system-ui';labelContext.fillText('撮影 / ライブラリ',256,65);labelContext.font='26px system-ui';labelContext.fillText('背景はホストが選択',256,117);
 const labelMap=new THREE.CanvasTexture(label);labelMap.colorSpace=THREE.SRGBColorSpace;
 const stationLabel=part(new THREE.PlaneGeometry(1.3,.406),new THREE.MeshBasicMaterial({map:labelMap,side:THREE.DoubleSide,toneMapped:false}),0,2.13,0);stationLabel.rotation.y=Math.PI;
 addObstacle(-4.1,8.0,.65,.5,1.8,false);
 // Layered lens coatings, focusing rings and a live shutter indicator.
 for(const [radius,z]of [[.22,.13],[.19,.28],[.16,.385]]){
  const trim=part(new THREE.TorusGeometry(radius,.018,8,32),gold,0,1.5,z);
 }
 const coating=new THREE.MeshPhysicalMaterial({color:0x64cfde,metalness:.45,roughness:.08,clearcoat:1,emissive:0x0b2e45});
 const optic=part(new THREE.CircleGeometry(.12,32),coating,0,1.5,.39);
 for(const side of [-1,1])part(new THREE.BoxGeometry(.035,.32,.35),gold,side*.29,1.5,0);
 const recordMaterial=new THREE.MeshBasicMaterial({color:0x88f7d6,toneMapped:false});
 part(new THREE.SphereGeometry(.035,12,8),recordMaterial,.24,1.65,-.18);
 const handle=part(new THREE.TorusGeometry(.13,.025,8,20,Math.PI),gold,0,1.83,0);handle.rotation.z=0;
 const backLeg=part(new THREE.CylinderGeometry(.035,.045,.85,8),gold,0,.4,-.25);backLeg.rotation.x=-.55;
 const themes={
  aurora:{base:['#071529','#1c2445','#073e4c'],nebula:'#39d6b0',a:'#38ebc4',b:'#9e66ff',planet:'#9abaca',rim:'#8ce8e0'},
  sunset:{base:['#161c43','#8b4866','#ed9a6e'],nebula:'#f4bf81',a:'#ffc494',b:'#ff73b8',planet:'#ffc392',rim:'#ffd9a2'},
  moon:{base:['#030919','#182952','#30526f'],nebula:'#809fdd',a:'#8abfff',b:'#d3dfff',planet:'#d9e4f0',rim:'#b4d9ff'},
  rose:{base:['#170e29','#67385b','#a86f89'],nebula:'#e7a1d5',a:'#ffadc7',b:'#cdb7ff',planet:'#edbddc',rim:'#ffd4e3'}
 };
 let currentBackground='';
 function setBackground(id){
  if(!themes[id]||id===currentBackground)return;currentBackground=id;root.userData.background=id;
  const theme=themes[id],gradient=ctx.createLinearGradient(0,0,1536,1024);theme.base.forEach((color,i)=>gradient.addColorStop(i/2,color));ctx.fillStyle=gradient;ctx.fillRect(0,0,1536,1024);
  for(let i=0;i<4;i++){const x=250+i*340,y=330+Math.sin(i*2)*170,r=460;const haze=ctx.createRadialGradient(x,y,0,x,y,r);haze.addColorStop(0,theme.nebula+'32');haze.addColorStop(1,theme.nebula+'00');ctx.fillStyle=haze;ctx.fillRect(0,0,1536,1024);}
  seed=731;for(let i=0;i<340;i++){const x=random()*1536,y=random()*1024,r=.4+random()*1.6;ctx.fillStyle=i%4?'#d9eeff':'#ffedc7';ctx.globalAlpha=.2+random()*.7;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(i%45===0){ctx.fillRect(x-5,y-.5,10,1);ctx.fillRect(x-.5,y-5,1,10);}}ctx.globalAlpha=1;
  texture.needsUpdate=true;planetMat.color.set(theme.planet);glow.color.set(theme.rim);aurora.uniforms.tintA.value.set(theme.a);aurora.uniforms.tintB.value.set(theme.b);rings.visible=thin.visible=id!=='moon';
 }
 const backgroundMessage=event=>{if(event.source!==parent)return;const data=event.data;if(data?.type==='lobby-games-state')setBackground(data.state?.photoBackground||'aurora');if(data?.type==='lobby-photo-start')setBackground(data.background||currentBackground);};
 window.addEventListener('message',backgroundMessage);setBackground('aurora');

 // Freeze static matrix work. Only the single aurora time uniform changes.
 root.traverse(n=>{n.updateMatrix();n.matrixAutoUpdate=false;});
 let last=-Infinity;
 return{root,spots:rows,update(stamp){if(stamp-last<100)return;last=stamp;aurora.uniforms.time.value=stamp*.001;recordMaterial.color.set(window.__lobbyPhotoCamera?(Math.sin(stamp*.012)>0?0xffc989:0xe25c66):0x88f7d6);},setBackground,dispose(){window.removeEventListener('message',backgroundMessage);root.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
function installLobbyPhotoCamera({THREE,renderer,scene,camera,player,crews=()=>[player]}){
 const photoCamera=new THREE.PerspectiveCamera(43,16/9,.1,80);photoCamera.position.set(0,4.9,1.4);photoCamera.lookAt(0,2.35,11.4);
 let timer=0,pending=null,preview=false,capturing=false,lastLabelLayout=[];const size=new THREE.Vector2();
 const inPhoto=p=>Math.abs(p.x)<4.15&&p.z>9.1&&p.z<13&&p.y<2.8;
 const near=()=>inPhoto(player.root.position)||Math.hypot(player.root.position.x+4.1,player.root.position.z-8.0)<1.2;
 function prepareView(){
  if(!near()&&!preview&&!capturing)return()=>{};
  const saved=[],set=(node,visible)=>{if(node&&node.visible!==visible){saved.push([node,node.visible]);node.visible=visible;}};
  set(scene.getObjectByName('lobby-photo-camera-station'),true);
  if(preview||capturing)set(scene.getObjectByName('lobby-overhead-sculpture'),false);
  for(const crew of crews()){
   const data=crew.root?.userData||{};
   if(capturing)set(crew.root,inPhoto(crew.root.position));else if(preview&&crew===player)set(crew.root,true);
   for(const node of [crew.label,data.lobbyNameTag,data.lobbyMicTag,data.lobbyMicCross,data.readyTag,data.connectionIndicator?.root])set(node,false);
   if(!capturing&&inPhoto(crew.root.position)){
    const name=String(data.photoNameText||'クルー').slice(0,12);
    if(data.photoNameSprite?.userData.text!==name){const old=data.photoNameSprite;if(old){old.removeFromParent();old.material.map.dispose();old.material.dispose();}const c=document.createElement('canvas');c.width=384;c.height=80;const g=c.getContext('2d');g.font='600 38px sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=6;g.strokeStyle='#081522';g.strokeText(name,192,40,360);g.fillStyle='#f1fcff';g.fillText(name,192,40,360);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const tag=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));tag.userData.text=name;tag.scale.set(.88,.183,1);tag.position.y=2.05;tag.visible=false;crew.root.add(tag);data.photoNameSprite=tag;}
    set(data.photoNameSprite,true);
   }else set(data.photoNameSprite,false);
  }
  return()=>{for(const [node,visible]of saved)node.visible=visible;};
 }
 // Place small nameplates in image coordinates, avoiding other crew faces and
 // previously placed names. Microphone glyphs never enter this texture.
 function drawNames(canvas){
  const g=canvas.getContext('2d'),width=canvas.width,height=canvas.height;g.font='600 14px sans-serif';g.textAlign='center';g.textBaseline='middle';
  scene.updateMatrixWorld(true);photoCamera.updateMatrixWorld(true);
  const project=(crew,x,y)=>{const p=crew.root.localToWorld(new THREE.Vector3(x,y,0)).project(photoCamera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2};};
  const list=crews().filter(crew=>inPhoto(crew.root.position)).map(crew=>{
   const a=project(crew,-.43,1.95),b=project(crew,.43,.95);return{crew,face:{x:Math.min(a.x,b.x)-3,y:Math.min(a.y,b.y)-3,w:Math.abs(a.x-b.x)+6,h:Math.abs(a.y-b.y)+6}};
  }).sort((a,b)=>b.crew.root.position.z-a.crew.root.position.z);
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;const used=[];
  for(const {crew}of list){
   let name=String(crew.root.userData.photoNameText||'クルー').slice(0,16);while(name.length>1&&g.measureText(name).width>72)name=name.slice(0,-1);if(name!==String(crew.root.userData.photoNameText||'クルー'))name=name.slice(0,-1)+'…';
   const w=Math.min(86,g.measureText(name).width+12),h=20,candidates=[2.13,2.42,.35,.05,.75];let chosen=null;
   for(const y of candidates){const p=project(crew,0,y),box={x:p.x-w/2,y:p.y-h/2,w,h};if(box.x<8||box.x+w>width-8||box.y<8||box.y+h>height-8)continue;if(list.some(other=>overlaps(box,other.face))||used.some(other=>overlaps(box,other)))continue;chosen=box;break;}
   if(!chosen){const p=project(crew,0,.3);chosen={x:Math.max(8,Math.min(width-w-8,p.x-w/2)),y:Math.max(8,Math.min(height-h-8,p.y-h/2)),w,h};}
   used.push({...chosen,name});g.fillStyle='#061421cc';g.beginPath();g.roundRect(chosen.x,chosen.y,w,h,8);g.fill();g.fillStyle='#f2fcff';g.fillText(name,chosen.x+w/2,chosen.y+h/2,76);
  }
  lastLabelLayout=used;
 }
 function render(viewCamera){const restore=prepareView();try{renderer.render(scene,viewCamera);}finally{restore();}}
 function cancel(){clearTimeout(timer);timer=0;pending=null;preview=false;capturing=false;window.__lobbyPhotoCamera=null;}
 window.addEventListener('message',event=>{
  if(event.source!==parent)return;const data=event.data||{};
  if(data.type==='lobby-photo-cancel'||data.type==='lobby-render-state'&&data.active!==true){cancel();return;}
  if(data.type!=='lobby-photo-start'||pending||typeof data.id!=='string'||data.id.length>100||!Number.isFinite(data.at)||data.at<Date.now()-100||data.at>Date.now()+6000)return;
  pending=data.id;preview=data.preview===true&&near();if(preview)window.__lobbyPhotoCamera=photoCamera;
  timer=setTimeout(()=>{const id=pending;if(!id)return;
   if(document.hidden||window.SpaceSuspectLobby?.__lobbyRenderActive===false){cancel();parent.postMessage({type:'lobby-photo-error',id},'*');return;}
   const ratio=renderer.getPixelRatio();renderer.getSize(size);const width=size.x,height=size.y;
   try{capturing=true;renderer.setPixelRatio(1);renderer.setSize(1280,720,false);photoCamera.aspect=16/9;photoCamera.updateProjectionMatrix();render(photoCamera);const output=document.createElement('canvas');output.width=1280;output.height=720;output.getContext('2d').drawImage(renderer.domElement,0,0);drawNames(output);const image=output.toDataURL('image/png');parent.postMessage({type:'lobby-photo-result',id,image},'*');}
   catch(error){console.warn('集合写真の撮影に失敗しました',error);parent.postMessage({type:'lobby-photo-error',id},'*');}
   finally{renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);cancel();render(camera);}
  },Math.max(0,data.at-Date.now()));
 });
 window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden&&pending){const id=pending;cancel();parent.postMessage({type:'lobby-photo-error',id},'*');}});
 return{cancel,prepareView,render,get labelLayout(){return lastLabelLayout;}};
}
/* LOBBY_PHOTO_DECK_END */
