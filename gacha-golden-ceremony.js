// A finite golden-tier reveal inside the existing 30 FPS gacha renderer.
export function createGoldenLegendCeremony(T,{scene,host,mobile}){
 const root=new T.Group();root.name='golden-legend-gate';root.position.z=-1.45;root.visible=false;scene.add(root);
 const geometries=new Set(),materials=new Set();
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const metal=mat(new T.MeshStandardMaterial({color:0xd7aa4b,metalness:.92,roughness:.28}));
 const black=mat(new T.MeshStandardMaterial({color:0x10101c,metalness:.7,roughness:.38}));
 const light=mat(new T.MeshBasicMaterial({color:0xffdf92,transparent:true,opacity:0,depthWrite:false}));
 const cube=geo(new T.BoxGeometry(1,1,1)),gem=geo(new T.OctahedronGeometry(1));
 const add=(g,m,x,y,z,sx,sy,sz,parent=root)=>{const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);parent.add(n);return n;};
 const gates=[];
 for(const side of[-1,1]){
  const leaf=new T.Group();leaf.position.set(side*.82,0,0);root.add(leaf);gates.push({leaf,side});
  add(cube,black,0,0,0,1.54,3.75,.16,leaf);
  for(const x of[-.73,.73])add(cube,metal,x,0,.11,.055,3.82,.06,leaf);
  for(const y of[-1.84,1.84])add(cube,metal,0,y,.11,1.48,.055,.06,leaf);
  const crest=add(gem,metal,0,0,.16,.45,1.23,.06,leaf);crest.rotation.z=side*.12;
  add(gem,light,0,0,.23,.16,.70,.035,leaf);
  for(let i=0;i<4;i++){const bar=add(cube,metal,side*.14,(i-1.5)*.73,.12,.62,.025,.04,leaf);bar.rotation.z=-side*.28;}
  const bars=leaf.children.filter(n=>n.geometry===cube&&n.material===metal);
  const engraved=new T.InstancedMesh(cube,metal,bars.length);
  bars.forEach((n,i)=>{n.updateMatrix();engraved.setMatrixAt(i,n.matrix);leaf.remove(n);});
  leaf.add(engraved);
 }
 const rings=[];for(let i=0;i<3;i++){const n=new T.Mesh(geo(new T.TorusGeometry(2.13+i*.21,.012,5,mobile?48:72)),i===1?light:metal);n.position.z=-.13-i*.06;root.add(n);rings.push(n);}
 const rays=new T.Group();root.add(rays);const rayGeo=geo(new T.ConeGeometry(.10,1.35,3));
 const rayInstances=new T.InstancedMesh(rayGeo,light,10),rayPose=new T.Object3D();rays.add(rayInstances);
 for(let j=0;j<10;j++){const a=j*Math.PI/5;rayPose.position.set(Math.sin(a)*2.18,Math.cos(a)*2.18,-.2);rayPose.rotation.z=-a;rayPose.updateMatrix();rayInstances.setMatrixAt(j,rayPose.matrix);}
 const beamMaterial=mat(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{power:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float power;varying vec2 v;void main(){float edge=pow(max(0.,1.-abs(v.x-.5)*2.),3.);float fade=sin(v.y*3.14159);gl_FragColor=vec4(1.,.70,.24,edge*fade*power*.65);}'}));
 const beam=new T.Mesh(geo(new T.PlaneGeometry(2.2,6.5)),beamMaterial);beam.position.z=.15;root.add(beam);
 const count=mobile?32:56,points=new Float32Array(count*3),pg=geo(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(points,3));
 const sparksMat=mat(new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{power:{value:0}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(36./-p.z,1.,5.);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform float power;void main(){float a=1.-smoothstep(.1,.5,length(gl_PointCoord-.5));if(a<.01)discard;gl_FragColor=vec4(1.,.82,.38,a*power);}'}));
 const sparks=new T.Points(pg,sparksMat);sparks.frustumCulled=false;root.add(sparks);
 const title=document.createElement('div');title.className='goldenLegendTitle';title.hidden=true;title.innerHTML='<span>GOLDEN LEGEND</span><strong>ゴールデンレジェンドレア</strong><i>黄金の伝説、覚醒。</i>';(host.querySelector('.gachaStage')||host).append(title);
 let start=null,disposed=false;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function reset(){start=null;root.visible=false;title.hidden=true;delete host.dataset.goldenReveal;}
 function update(t,{active,burst=0,mode,reduced=false}){
  if(disposed)return;if(!active||mode==='idle'||mode==='complete'){reset();return;}
  if(start===null){start=t;host.dataset.goldenReveal='true';}
  const age=t-start,charge=clamp(age/.65),opening=1-Math.pow(1-clamp((burst-.05)/.65),3);
  root.visible=true;title.hidden=false;title.dataset.open=String(opening>.8);
  title.style.opacity=String(charge*(1-clamp((burst-.55)/.35)*.30));
  for(const {leaf,side}of gates){leaf.position.x=side*(.82+opening*2.25);leaf.rotation.y=reduced?0:side*opening*.95;leaf.scale.y=1-charge*.03;}
  light.opacity=.18+charge*.5;beamMaterial.uniforms.power.value=reduced?.10:(.15+Math.sin(clamp(burst)*Math.PI)*.85);
  root.scale.setScalar(.82+charge*.18);rays.rotation.z=reduced?0:age*.035;rays.scale.setScalar(1+opening*.18);
  for(let i=0;i<rings.length;i++){rings[i].rotation.z=reduced?0:age*(i%2?-.10:.08);rings[i].rotation.x=reduced?0:Math.sin(age*.4+i)*.08;}
  sparksMat.uniforms.power.value=reduced?0:.75*charge;
  if(!reduced){for(let i=0;i<count;i++){const a=i*2.39996+age*.1,r=1.2+(i%7)*.19;points[i*3]=Math.cos(a)*r;points[i*3+1]=((i/count*5+age*(.28+opening*.65))%5)-2.5;points[i*3+2]=Math.sin(a)*.6+.35;}pg.attributes.position.needsUpdate=true;}
 }
 function dispose(){if(disposed)return;disposed=true;reset();title.remove();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 return{update,reset,dispose};
}
