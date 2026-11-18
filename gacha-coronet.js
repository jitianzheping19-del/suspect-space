// Local +Z faces out of the gold setting. The five charging stones use the
// same cut and the same seat locations as the finished coronet.
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function cutCrownJewel(T) {
 const vertices = [], sectors = 12;
 function vertex(i, radius, z, shift = 0) {
  const angle = (i + shift) * Math.PI * 2 / sectors;
  const y=Math.sin(angle)*radius;
  return [Math.cos(angle)*radius*(1-.27*y), y, z];
 }
 const triangle = (a,b,c) => vertices.push(...a,...b,...c);
 for (let i=0; i<sectors; i++) {
  const a=vertex(i,1,0), b=vertex(i+1,1,0), star=vertex(i,.81,.34,.5);
  const table=vertex(i,.54,.51), next=vertex(i+1,.54,.51);
  triangle([0,0,.51],table,next);
  triangle(table,star,next); triangle(a,b,star);
  triangle(a,star,table); triangle(star,b,next);
  triangle(b,a,[0,0,-.66]);
 }
 const cut = new T.BufferGeometry();
 cut.setAttribute('position',new T.Float32BufferAttribute(vertices,3));cut.computeVertexNormals();
 return cut;
}

export function createCoronet(T,geo,mat) {
 const group=new T.Group();
 const batches=new Map();
 const gold=mat(new T.MeshStandardMaterial({color:0xe9aa5b,metalness:.86,roughness:.22}));
 const bright=mat(new T.MeshStandardMaterial({color:0xffe6ad,metalness:.74,roughness:.17}));
 const enamel=mat(new T.MeshStandardMaterial({color:0x211432,metalness:.32,roughness:.21}));
 const garnet=mat(new T.MeshStandardMaterial({color:0x762445,metalness:.25,roughness:.14,flatShading:true}));
 const diamond=mat(new T.MeshStandardMaterial({color:0xe2e6ff,metalness:.32,roughness:.12,flatShading:true}));
 // Broad strip reflections describe the turned edges even at small screen sizes.
 for (const metal of [gold,bright]) metal.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 refl=reflect(-normalize(vViewPosition),normal);
   float strip=exp(-pow(abs(refl.x+.36*refl.y-.25)/.16,2.));
   float cool=exp(-pow(abs(refl.y-.45)/.12,2.));
   outgoingLight+=vec3(1.,.83,.55)*strip*.55+vec3(.38,.39,.54)*cool*.32;
   #include <opaque_fragment>`);
 };
 function add(material,g) {
  if(!batches.has(material))batches.set(material,[]);
  batches.get(material).push(g);
 }
 const vector=(x,y,z)=>new T.Vector3(x,y,z);
 const around=(angle,r,y)=>vector(Math.sin(angle)*r,y,Math.cos(angle)*r);
 function band(material,profile) {
  add(material,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),96));
 }
 band(gold,[[.89,-.47],[.94,-.51],[1.01,-.49],[1.05,-.43],[1.07,-.16],[1.05,-.115],[.98,-.13],[.89,-.42],[.89,-.47]]);
 // The inner wall is lined in midnight enamel with a narrow lip of bare gold.
 band(enamel,[[.971,-.152],[.883,-.418]]);
 band(enamel,[[1.047,-.419],[1.063,-.391],[1.073,-.228],[1.064,-.211]]);
 for(const [radius,y,tube] of [[1.019,-.469,.039],[1.057,-.405,.022],[1.07,-.213,.025],[1.055,-.137,.036]]){
  add(bright,new T.TorusGeometry(radius,tube,8,96).rotateX(Math.PI/2).translate(0,y,0));
 }
 // Scrolls and the pearls along the rim follow the full circumference.
 function wire(material,points,radius) {
  add(material,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*3),radius,6,false));
 }
 function bead(material,point,radius) {
  add(material,new T.SphereGeometry(radius,8,6).translate(point.x,point.y,point.z));
 }
 for(let i=0;i<40;i++){
  const angle=i*Math.PI/20;
  const brilliant=new T.OctahedronGeometry(i%2?.034:.051).scale(1,.97,.63).rotateY(angle);
  const seat=around(angle,1.078,-.301);add(diamond,brilliant.translate(seat.x,seat.y,seat.z));
  bead(bright,around(angle+Math.PI/40,1.067,-.301),.021);
 }
 const petal=new T.Shape();
 petal.moveTo(-.26,0);
 petal.bezierCurveTo(-.20,.15,-.105,.19,-.145,.34);
 petal.bezierCurveTo(-.23,.48,-.105,.61,0,.80);
 petal.bezierCurveTo(.105,.61,.23,.48,.145,.34);
 petal.bezierCurveTo(.105,.19,.20,.15,.26,0);
 petal.quadraticCurveTo(0,.09,-.26,0);
 const eye=new T.Path();
 eye.moveTo(0,.34);eye.bezierCurveTo(.108,.43,.06,.53,0,.615);
 eye.bezierCurveTo(-.06,.53,-.108,.43,0,.34);
 petal.holes.push(eye);
 function dimensions(angle,i) {return (i%2===0?.98:.73)+.17*Math.cos(angle);}
 const seatLocations=[],upAxis=vector(0,1,0);
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,height=dimensions(angle,i);
  // Project each pierced leaf, its setting, and both scrolls onto a flared band.
  function local(x,y,depth=0){
   const h=y*height,r=1.033+.13*h+.088*h*h+depth;
   return around(angle+x/1.04,r,h-.16);
  }
  const leaf=new T.ExtrudeGeometry(petal,{depth:.044,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:2,curveSegments:7});
  const attr=leaf.getAttribute('position');
  for(let j=0;j<attr.count;j++){
   const v=local(attr.getX(j),attr.getY(j),attr.getZ(j));
   attr.setXYZ(j,v.x,v.y,v.z);
  }
  leaf.computeVertexNormals();add(gold,leaf);
  for(const side of [-1,1]){
   wire(bright,[[.085,.03],[.23,.14],[.34,.30],[.31,.42],[.235,.43],[.214,.376],[.252,.348]].map(([x,y])=>local(side*x,y,.035)),.026);
   wire(bright,[[0,.64],[.07,.52],[.111,.43],[.09,.35]].map(([x,y])=>local(side*x,y,.05)),.018);
  }
  bead(bright,local(0,.82,.025),.048);
  const center=local(0,.18,.082),scale=i===0?1.35:i%2===0?.96:.85;
  // Bezel, four claws and polished tips all share the gemstone's orientation.
  const settingPoint=(a,r=1)=>{
   const v=Math.sin(a),u=Math.cos(a)*(1-.27*v);
   return vector(u*.136*scale*r,v*.177*scale*r,0).applyAxisAngle(upAxis,angle).add(center);
  };
  const rim=new T.CatmullRomCurve3(Array.from({length:24},(_,j)=>settingPoint(j*Math.PI/12)),true);
  add(bright,new T.TubeGeometry(rim,32,.019*scale,6,true));
  if(i===0)for(let j=0;j<18;j++){
   const tiny=settingPoint(j*Math.PI/9,1.16);
   add(diamond,new T.OctahedronGeometry(.022).rotateY(angle).translate(tiny.x,tiny.y,tiny.z));
  }
  for(const side of [-1,1])for(const up of [-1,1]){
   const claw=local(side*.09*scale,.18+up*.113*scale/height,.12);
   bead(bright,claw,.023*scale);
  }
  const offset=i>4?i-8:i;
  if(Math.abs(offset)<=2)seatLocations[offset+2]={center,angle,scale};
  else add(garnet,cutCrownJewel(T).scale(.13*scale,.17*scale,.18*scale).rotateY(angle).translate(center.x,center.y,center.z));
 }
 for(const [material,parts] of batches){
  for(const g of parts){
   if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
   g.deleteAttribute('uv');
  }
  const merged=geo(mergeGeometries(parts));parts.forEach(g=>g.dispose());
  group.add(new T.Mesh(merged,material));
 }
 return {group,seatLocations};
}
