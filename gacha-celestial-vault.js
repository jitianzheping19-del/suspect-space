// Shared renderer, bounded instancing and caller-owned GPU resources.
export function createCelestialVault(T,{root,premium,mobile,geo,mat,reduced}){
 const rig=new T.Group();rig.name=premium?'celestial-vault-doors':'orbital-energy-arcs';root.add(rig);
 const uniforms={time:{value:0},charge:{value:0},burst:{value:0},color:{value:new T.Color(premium?0xffd391:0x70d9ff)}};
 const veilMaterial=mat(new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float time,charge,burst;uniform vec3 color;varying vec2 v;void main(){float fade=sin(v.y*3.14159)*pow(sin(v.x*3.14159),2.);float flow=pow(.5+.5*sin(v.y*27.-v.x*8.+time*.8),10.);float filigree=pow(.5+.5*cos(v.x*180.+sin(v.y*30.)*3.),20.);float strength=.12+charge*.32+sin(burst*3.14159)*.18;gl_FragColor=vec4(mix(color,vec3(.60,.48,1.),flow*.45),fade*(flow*.65+filigree*.22+.06)*strength);}`}));
 const curtains=[];for(let j=0;j<(premium?4:2);j++){const n=new T.Mesh(geo(new T.CylinderGeometry(1.75+j*.20,1.90+j*.20,4.4,48,1,true,j*Math.PI/2,Math.PI*.56)),veilMaterial);n.position.set(0,.2,-.9);rig.add(n);curtains.push(n);}
 const metal=mat(new T.MeshStandardMaterial({color:premium?0xa77c45:0x526b84,metalness:.92,roughness:.26,emissive:premium?0x8e5f1d:0x26546b,emissiveIntensity:.15}));
 const light=mat(new T.MeshBasicMaterial({color:uniforms.color.value,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending}));
 const leafGeo=geo(new T.BoxGeometry(.11,.59,.055)),leaves=new T.InstancedMesh(leafGeo,metal,premium?48:20);leaves.name='engraved-vault-petals';leaves.frustumCulled=false;rig.add(leaves);
 const glintGeo=geo(new T.OctahedronGeometry(.048)),glints=new T.InstancedMesh(glintGeo,light,premium?48:20);glints.frustumCulled=false;rig.add(glints);
 const crown=new T.Group();crown.position.z=-1.4;rig.add(crown);const arcs=[];
 for(let j=0;j<(premium?6:3);j++){const n=new T.Mesh(geo(new T.TorusGeometry(1.8+j*.11,.018,5,mobile?40:64,Math.PI*.43)),j%2?metal:light);n.rotation.z=j*Math.PI/3;crown.add(n);arcs.push(n);}
 const trailCount=mobile?(premium?24:12):(premium?42:20),trailSegments=9,positions=new Float32Array(trailCount*trailSegments*6),colors=new Float32Array(positions.length);
 const secondary=new T.Color(premium?0xbda1ff:0x66b9ea),tint=new T.Color();for(let j=0;j<trailCount;j++)for(let k=0;k<trailSegments;k++){tint.copy(j%3?uniforms.color.value:secondary).multiplyScalar(1-k/trailSegments);const idx=(j*trailSegments+k)*6;for(let end=0;end<2;end++)tint.toArray(colors,idx+end*3);}
 const trailsGeo=geo(new T.BufferGeometry());trailsGeo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));trailsGeo.setAttribute('color',new T.BufferAttribute(colors,3));
 const trailsMaterial=mat(new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.50,depthWrite:false,blending:T.AdditiveBlending})),trails=new T.LineSegments(trailsGeo,trailsMaterial);trails.frustumCulled=false;trails.name='comet-procession';rig.add(trails);
 const haloMaterial=mat(new T.MeshBasicMaterial({color:premium?0xffdf9f:0x8fe3ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
 const halo=new T.Mesh(geo(new T.RingGeometry(.68,.73,80)),haloMaterial);halo.position.set(0,-.55,-.7);rig.add(halo);
 const dummy=new T.Object3D(),clamp=v=>Math.max(0,Math.min(1,v));
 return{update(t,{power=0,burst=0,charging=false,color}){
  const charge=charging?power:0,b=clamp(burst),open=1-Math.pow(1-clamp(b*1.6),3),clock=reduced?0:t;
  uniforms.time.value=clock;uniforms.charge.value=charge;uniforms.burst.value=b;uniforms.color.value.copy(color);light.color.copy(color);metal.emissiveIntensity=.14+charge*.48;
  for(let j=0;j<curtains.length;j++){const n=curtains[j];n.rotation.y=clock*(j%2?-.10:.08);n.scale.set(1+open*.55,1+charge*.2,1+open*.55);}
  for(let j=0;j<leaves.count;j++){const a=j/leaves.count*Math.PI*2+clock*.035,r=2.17+open*(.75+j%3*.08);dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,-1.2-open*.5);dummy.rotation.set(open*.7,0,a-Math.PI/2+open*.5);dummy.scale.set(1,1+charge*.20,1);dummy.updateMatrix();leaves.setMatrixAt(j,dummy.matrix);dummy.position.multiplyScalar(1.06);dummy.scale.setScalar(.9+charge*.5);dummy.updateMatrix();glints.setMatrixAt(j,dummy.matrix);}leaves.instanceMatrix.needsUpdate=true;glints.instanceMatrix.needsUpdate=true;
  crown.rotation.z=-clock*.045;for(let j=0;j<arcs.length;j++){arcs[j].rotation.z=j*Math.PI/3+open*(j%2?-1:1)*.6;arcs[j].scale.setScalar(1+open*.35);}
  for(let j=0;j<trailCount;j++)for(let k=0;k<trailSegments;k++)for(let end=0;end<2;end++){const lag=(k+end)*.035,a=j*2.39996+clock*(.15+charge*.25)-lag,r=(1.85+j%6*.22)*(1-charge*.20)+open*1.5,idx=(j*trailSegments+k)*6+end*3;positions[idx]=Math.cos(a)*r;positions[idx+1]=Math.sin(a)*(1.1+j%3*.18)+Math.sin(j*3.7+clock*.25)*.3;positions[idx+2]=-1.4+Math.sin(a*1.7+j)*.6-lag;}
  trailsGeo.attributes.position.needsUpdate=true;trailsMaterial.opacity=(premium?.48:.30)+charge*.30;haloMaterial.opacity=b>.35?Math.sin(clamp((b-.35)/.65)*Math.PI/2)*.7:0;halo.scale.setScalar(.9+open*.7);halo.rotation.z=clock*.10;
 },stats(){return{instances:leaves.count+glints.count,trailSegments:trailCount*trailSegments,resourcesShared:true};}};
}
