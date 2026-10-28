import {createCelestialVault} from './gacha-celestial-vault.js';
// Drawn by the planet's renderer and clock; no post-processing or additional RAF.
export function createGachaCeremony(T,{scene,premium,mobile,geo,mat,textures,reduced}){
 const root=new T.Group();root.name=premium?'premium-astral-vault':'gacha-energy-chamber';scene.add(root);
 const color=new T.Color(premium?0xffd89b:0x73d9ff),white=new T.Color(0xfff2cf),blue=new T.Color(0x73d9ff);
 const energy=mat(new T.MeshBasicMaterial({color,transparent:true,opacity:.32,depthWrite:false,blending:T.AdditiveBlending}));
 const metal=mat(new T.MeshStandardMaterial({color:premium?0x96703c:0x385b78,metalness:.88,roughness:.28}));
 const torus=geo(new T.TorusGeometry(1,.012,5,mobile?64:100));
 function ring(r,x=0,y=0,z=-.7,m=energy){const mesh=new T.Mesh(torus,m);mesh.scale.setScalar(r);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 const gates=[];for(let j=0;j<(premium?4:2);j++){const n=ring(1.65+j*.24);n.rotation.set(j%2?.24:-.18,j%2?-.30:.24,j*.3);gates.push(n);}
 const floor=new T.Group();floor.position.set(0,-1.60,0);floor.rotation.x=-Math.PI/2;root.add(floor);
 const floorRings=[];for(const r of[.8,1.3,1.8]){const n=new T.Mesh(torus,metal);n.scale.setScalar(r);floor.add(n);floorRings.push(n);}
 const runeCanvas=document.createElement('canvas');runeCanvas.width=runeCanvas.height=512;const ctx=runeCanvas.getContext('2d');ctx.translate(256,256);ctx.strokeStyle=premium?'#fbe1a7':'#91d8f0';ctx.lineWidth=2;
 for(const r of[169,185,218,233]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}
 for(let j=0;j<48;j++){const a=j*Math.PI/24;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,218);ctx.lineTo(0,j%4===0?199:209);ctx.stroke();if(j%4===0){ctx.beginPath();ctx.moveTo(-8,182);ctx.lineTo(0,171);ctx.lineTo(8,182);ctx.lineTo(0,193);ctx.closePath();ctx.stroke();}ctx.restore();}
 const map=new T.CanvasTexture(runeCanvas);textures.add(map);const runeMat=mat(new T.MeshBasicMaterial({map,color,transparent:true,opacity:premium?.48:.2,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));const sigil=new T.Mesh(geo(new T.PlaneGeometry(5.3,5.3)),runeMat);sigil.position.z=-1.1;root.add(sigil);
 const seals=new T.Group();root.add(seals);const sealCount=premium?8:4,sealGeo=geo(new T.OctahedronGeometry(.09)),sealMesh=new T.InstancedMesh(sealGeo,metal,sealCount);seals.add(sealMesh);const dummy=new T.Object3D();for(let j=0;j<sealCount;j++){const a=j*Math.PI*2/sealCount;dummy.position.set(Math.cos(a)*2.15,Math.sin(a)*2.15,-.65);dummy.rotation.set(.2,a,Math.PI/4);dummy.scale.set(1,1.7,1);dummy.updateMatrix();sealMesh.setMatrixAt(j,dummy.matrix);}
 const plumeUniforms={power:{value:0},color:{value:color}};
 const beamMat=mat(new T.ShaderMaterial({uniforms:plumeUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float power;uniform vec3 color;varying vec2 v;void main(){float edge=pow(abs(sin(v.x*3.1415926)),1.8);float ends=sin(v.y*3.1415926);float lines=.7+.3*cos(v.x*150.);gl_FragColor=vec4(color,edge*ends*lines*power*.38);}'}));
 const beam=new T.Mesh(geo(new T.CylinderGeometry(.66,.22,6,24,1,true)),beamMat);beam.position.y=.6;root.add(beam);
 const shockwaves=[];for(let j=0;j<(premium?3:2);j++){const m=mat(energy.clone());m.opacity=0;const n=ring(1,0,0,0,m);n.rotation.x=j%2?1.1:0;shockwaves.push(n);}
 const count=mobile?(premium?110:65):(premium?220:120),positions=new Float32Array(count*3),particleGeo=geo(new T.BufferGeometry());particleGeo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 const dot=document.createElement('canvas');dot.width=dot.height=32;const dc=dot.getContext('2d');const grad=dc.createRadialGradient(16,16,0,16,16,16);grad.addColorStop(0,'#fff');grad.addColorStop(.2,'#fff9');grad.addColorStop(1,'#fff0');dc.fillStyle=grad;dc.fillRect(0,0,32,32);const dotMap=new T.CanvasTexture(dot);textures.add(dotMap);
 const particleMat=mat(new T.PointsMaterial({map:dotMap,color,size:premium?.065:.045,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending})),particles=new T.Points(particleGeo,particleMat);particles.frustumCulled=false;root.add(particles);
 const streakCount=premium?42:20,streakPositions=new Float32Array(streakCount*6),streakGeo=geo(new T.BufferGeometry());streakGeo.setAttribute('position',new T.BufferAttribute(streakPositions,3).setUsage(T.DynamicDrawUsage));const streakMat=mat(new T.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})),streaks=new T.LineSegments(streakGeo,streakMat);root.add(streaks);
 const vault=createCelestialVault(T,{root,premium,mobile,geo,mat,reduced});
 function update(t,{rank=-1,power=0,shake=0,burst=0,charging=false,complete=false,x=0,size=1}={}){
  root.position.x=x;root.scale.setScalar(size);vault.update(t,{power,burst,charging,color});
  energy.color.copy(color);runeMat.color.copy(color);particleMat.color.copy(color);streakMat.color.copy(color);
  root.visible=!complete;const b=Math.min(1,burst),charge=charging?power:0;
  if(!reduced){sigil.rotation.z=-t*(premium?.075:.035);seals.rotation.z=t*.10;for(let j=0;j<gates.length;j++){gates[j].rotation.z=t*(j%2?-.12:.09)+j*.3;gates[j].rotation.y=Math.sin(t*.3+j)*(.18+charge*.22);}}
  sigil.scale.setScalar(1+charge*.12+b*.5);runeMat.opacity=((premium?.42:.15)+charge*.22+shake*.15)*(1-b*.5);
  energy.opacity=(.2+charge*.42)*(1-b*.6);metal.emissive.copy(color);metal.emissiveIntensity=.04+charge*.28;
  for(let j=0;j<gates.length;j++)gates[j].scale.setScalar((1.65+j*.24)*(1+b*.8+shake*.025));
  beam.visible=premium||burst>0;plumeUniforms.power.value=premium?(charge*.45+Math.sin(b*Math.PI)*2):Math.sin(b*Math.PI)*.7;
  beam.rotation.y=t*.15;beam.scale.set(1+charge*.5,1+b*.4,1+charge*.5);
  for(let j=0;j<count;j++){const k=j*3,a=j*2.39996+t*(.13+charge*.6),base=.80+(j%13)*.11;const radial=burst>0?base+b*b*(2+j%7*.6):base;positions[k]=Math.cos(a)*radial;positions[k+1]=burst>0?Math.sin(j*6.7)*(1+b*3):(j/count*3.7+t*(.11+charge*.5))%3.7-1.8;positions[k+2]=Math.sin(a)*radial-.3;}particleGeo.attributes.position.needsUpdate=true;
  particleMat.opacity=.3+charge*.5+(burst>0?Math.sin(b*Math.PI)*.4:0);
  for(let j=0;j<streakCount;j++){const a=j*2.39996,z=Math.sin(j*7.3)*.6,r=1+b*4,k=j*6;streakPositions[k]=Math.cos(a)*r;streakPositions[k+1]=Math.sin(a)*r;streakPositions[k+2]=z;streakPositions[k+3]=Math.cos(a)*(r+.2+b*1.7);streakPositions[k+4]=Math.sin(a)*(r+.2+b*1.7);streakPositions[k+5]=z-b;}streakGeo.attributes.position.needsUpdate=true;streakMat.opacity=burst>0?Math.sin(b*Math.PI)*.75:0;
  for(let j=0;j<shockwaves.length;j++){const phase=Math.max(0,Math.min(1,(b-j*.09)*1.2));shockwaves[j].scale.setScalar(.8+phase*(premium?5:3.5));shockwaves[j].material.opacity=burst>0?Math.sin(phase*Math.PI)*.6:0;}
  if(rank>=0)color.lerp(premium?white:blue,.002);
 }
 return{update,setColor(value){color.set(value);},dispose(){root.traverse(n=>{if(n.isInstancedMesh)n.dispose();});root.removeFromParent();}};
}
