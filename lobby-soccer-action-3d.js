import * as THREE from 'three';

// One lazy renderer shared by the three round controls. The existing UI tick drives it.
export function createSoccerAction3D(button){
 let renderer,scene,camera,root,face,rim,models,failed=false,last=-Infinity;
 const canvas=document.createElement('canvas');canvas.className='soccerActionModel';canvas.setAttribute('aria-hidden','true');button.prepend(canvas);
 const material=color=>new THREE.MeshStandardMaterial({color,metalness:.38,roughness:.3});
 function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;}
 function boot(parent,color,x,y,z,angle=0){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=angle;parent.add(g);
  const upper=material(color),sole=material('#e9f5f9');
  const shoe=mesh(g,new THREE.CapsuleGeometry(.13,.32,4,10),upper,.05,0,.05);shoe.rotation.z=Math.PI/2;shoe.scale.z=.75;
  mesh(g,new THREE.BoxGeometry(.18,.25,.18),upper,-.13,.15,0);
  const base=mesh(g,new THREE.BoxGeometry(.56,.065,.21),sole,.05,-.1,.02);base.rotation.z=.04;
  for(let i=0;i<3;i++)mesh(g,new THREE.BoxGeometry(.025,.12,.025),sole,-.03+i*.065,.02,.15);
  return g;
 }
 function ball(parent,x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);mesh(g,new THREE.SphereGeometry(.23,20,14),material('#f5f8ee'));
  const black=material('#142b3d');for(const v of [[0,0,1],[.78,.32,.56],[-.76,.38,.55],[0,-.82,.57],[0,.9,.43]]){
   const normal=new THREE.Vector3(...v).normalize(),panel=mesh(g,new THREE.CircleGeometry(.077,5),black);panel.position.copy(normal.multiplyScalar(.232));panel.lookAt(panel.position.clone().multiplyScalar(2));
  }return g;
 }
 function init(){
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(100,100,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1.16,1.16,1.16,-1.16,.1,20);camera.position.set(0,0,6);
  scene.add(new THREE.HemisphereLight(0xe7f8ff,0x163047,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,4,5);scene.add(light);
  root=new THREE.Group();root.rotation.set(.1,-.12,0);scene.add(root);
  face=mesh(root,new THREE.CylinderGeometry(.94,.98,.15,64),material('#164f64'));face.rotation.x=Math.PI/2;
  rim=mesh(root,new THREE.TorusGeometry(.96,.035,8,64),material('#94f1d7'),0,0,.12);
  const groove=mesh(root,new THREE.TorusGeometry(.84,.012,6,64),material('#b2e5ee'),0,0,.11);groove.material.transparent=true;groove.material.opacity=.4;
  models={};for(const mode of ['feint','press','dash']){const model=new THREE.Group();model.position.set(0,.2,.28);root.add(model);models[mode]=model;}
  const feint=models.feint;ball(feint,.21,-.12,.18);feint.userData.foot=boot(feint,'#a4f6e0',-.1,.22,.25,-.2);
  const arc=mesh(feint,new THREE.TorusGeometry(.48,.025,5,32,Math.PI*1.3),material('#83e7cf'),0,-.02,.05);arc.rotation.z=-.3;
  const press=models.press;ball(press,0,-.13,.16);press.userData.left=boot(press,'#ffc486',-.43,.2,.2,-.4);press.userData.right=boot(press,'#edf5fa',.43,.18,.13,Math.PI+.4);
  const dash=models.dash;dash.userData.foot=boot(dash,'#a8ddff',.07,.07,.26,.25);
  for(let i=0;i<3;i++){const trail=mesh(dash,new THREE.BoxGeometry(.36-i*.06,.045,.06),material('#7dbfff'),-.4,-.13+i*.19,.16);trail.rotation.z=.1;}
  button.dataset.model3d='true';
 }
 function dispose(){if(scene){const geometries=new Set(),materials=new Set();scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}renderer?.dispose();renderer?.forceContextLoss();canvas.remove();delete button.dataset.model3d;}
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;canvas.hidden=true;delete button.dataset.model3d;});
 return {draw(stamp,mode,held=false){
  if(failed||button.hidden||document.hidden||stamp-last<45)return;last=stamp;
  try{if(!renderer)init();const palette={feint:['#17586b','#9aefd4'],press:['#654633','#ffd39d'],dash:['#214d81','#a3d7ff']}[mode]||['#17586b','#9aefd4'];face.material.color.set(palette[0]);rim.material.color.set(palette[1]);root.position.z=held?-.06:0;
   const reduced=(globalThis.__spaceMotionPreference?.matches??globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true),w=reduced?0:Math.sin(stamp/360)*.05;
   for(const [name,model]of Object.entries(models))model.visible=name===mode;
   models.feint.userData.foot.rotation.z=-.2+w;models.press.userData.left.position.x=-.43+w;models.press.userData.right.position.x=.43-w;models.dash.userData.foot.rotation.z=.25+w;
   renderer.render(scene,camera);
  }catch{failed=true;dispose();}
 },dispose};
}
