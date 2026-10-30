// Ten authored silhouettes. Equipment only; no lights, physics or extra loops.
export const GOLDEN_GIFT_SKINS=Object.freeze([
 {id:'obsidianwyrm',name:'黒焔竜帝・ヴァルガロス',color:0x171b27,accent:0xff532d,trim:0xb38a52,glyph:'🐉'},
 {id:'seraphzero',name:'殲滅天使・セラフゼロ',color:0xe4e9ed,accent:0x7bedff,trim:0xd8ad59,glyph:'✧'},
 {id:'voidreaper',name:'虚空死神・ナイトメア',color:0x191627,accent:0xbb72ff,trim:0x7d829c,glyph:'☾'},
 {id:'raijinmk7',name:'雷神機甲・ライジンMk.VII',color:0x263651,accent:0x69eaff,trim:0xdfaa4b,glyph:'ϟ'},
 {id:'crimsonshogun',name:'血月将軍・アカツキ',color:0x771f35,accent:0xff7361,trim:0xc3a064,glyph:'⚔'},
 {id:'solarjuggernaut',name:'太陽要塞・ヘリオス',color:0xa9742c,accent:0xffe5a0,trim:0xf2d28a,glyph:'☀'},
 {id:'abyssleviathan',name:'深淵覇王・リヴァイアサン',color:0x174957,accent:0x61ffd6,trim:0x9db9b8,glyph:'♆'},
 {id:'chronodominus',name:'時空覇者・クロノドミナス',color:0x32304d,accent:0xc3a6ff,trim:0xcfb679,glyph:'⌛'},
 {id:'eclipsefenrir',name:'黒蝕狼王・フェンリル',color:0x252a35,accent:0x8ca9ff,trim:0xb7c6d3,glyph:'🐺'},
 {id:'astralmonarch',name:'星滅皇帝・アストラル',color:0x241d36,accent:0xffb7e9,trim:0xe1b75f,glyph:'♛'}
].map(s=>Object.freeze({...s,access:'gift',rarity:5,effect:'golden'})));

export function createGoldenGiftSkin(T,spec,{mobile=false}={}){
 const group=new T.Group();group.name='gift-skin-'+spec.id;group.userData.goldenLegend=true;
 const geometries=new Set(),materials=new Set(),cache=new Map(),assemblies=[group],motions=[];
 let disposed=false;
 const own=g=>(geometries.add(g),g),geo=(key,make)=>{if(!cache.has(key))cache.set(key,own(make()));return cache.get(key);};
 const mat=(color,metalness,roughness,emission=0)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,emissive:emission?color:0,emissiveIntensity:emission});materials.add(m);return m;};
 const shell=mat(spec.color,.72,.32),trim=mat(spec.trim,.87,.26),dark=mat(0x101522,.45,.5),glow=mat(spec.accent,.48,.25,1.25);
 const box=geo('box',()=>new T.BoxGeometry(1,1,1)),ball=geo('ball',()=>new T.SphereGeometry(1,mobile?12:16,mobile?8:12)),gem=geo('gem',()=>new T.OctahedronGeometry(1)),cone=geo('cone',()=>new T.ConeGeometry(1,1,6));
 function mesh(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,parent=group,rz=0){const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.rotation.z=rz;n.castShadow=false;n.userData.lightCostume=true;parent.add(n);return n;}
 const block=(m,x,y,z,w,h,d,p=group,a=0)=>mesh(box,m,x,y,z,w,h,d,p,a);
 function rig(x=0,y=0,z=0){const n=new T.Group();n.position.set(x,y,z);group.add(n);assemblies.push(n);return n;}
 function plate(points,m,x,y,z,p=group,depth=.065,a=0){
  const key=JSON.stringify(points)+depth;
  const g=geo(key,()=>{const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.01});g.translate(0,0,-depth/2);return g;});
  return mesh(g,m,x,y,z,1,1,1,p,a);
 }
 function rod(a,b,r,m,p=group,r2=r){const length=Math.hypot(...a.map((v,i)=>b[i]-v));const g=geo('rod'+r+':'+r2+':'+length,()=>new T.CylinderGeometry(r2,r,length,6));const n=mesh(g,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,1,1,1,p);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize());return n;}
 function ring(m,x,y,z,r,p=group,arc=Math.PI*2){return mesh(geo('ring'+arc,()=>new T.TorusGeometry(1,.025,5,mobile?36:56,arc)),m,x,y,z,r,r,r,p);}
 function spike(x,y,z,h,a,p=group,m=trim){return mesh(cone,m,x,y,z,.075,h,.075,p,a);}
 function blade(x,y,z,h,a,p=group,m=trim){const n=plate([[-.065,0],[.065,0],[.11,.65],[0,1],[-.11,.65]],m,x,y,z,p,.05,a);n.scale.y=h;return n;}
 function crown(tall=.35){ring(trim,0,1.70,0,.35).rotation.x=Math.PI/2;for(let i=0;i<5;i++)spike((i-2)*.14,1.84+(i===2?.10:0),-.04,tall,(2-i)*.16);}
 function mantle(width=1.05){
  const uniforms={time:{value:0},ink:{value:new T.Color(spec.color)},edge:{value:new T.Color(spec.trim)}};
  const m=new T.ShaderMaterial({uniforms,side:T.DoubleSide,vertexShader:'uniform float time;varying vec2 v;void main(){v=uv;vec3 p=position;p.x*=1.2-.45*uv.y;p.z+=sin(uv.y*6.+time*1.8+uv.x*3.)*.035*(1.-uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform vec3 ink,edge;varying vec2 v;void main(){float border=step(v.x,.025)+step(.975,v.x)+step(v.y,.035);float crest=pow(max(0.,1.-abs(v.x-.5)*12.-abs(v.y-.55)*4.),2.);gl_FragColor=vec4(ink*(.65+.28*sin(v.x*22.))+edge*(border*.7+crest*.6),1.);}'});materials.add(m);
  const n=mesh(own(new T.PlaneGeometry(width,1.25,4,6)),m,0,.94,-.55);n.userData.dynamic=true;motions.push(t=>uniforms.time.value=t);
 }
 // Layered torso armour and an open visor frame shared by the collection.
 mesh(ball,shell,0,.94,-.06,.48,.60,.44);
 mesh(ball,shell,0,1.44,-.07,.475,.36,.43);
 shell.emissive.set(spec.color);shell.emissiveIntensity=.16;
 const chest=[[-.31,.17],[0,.24],[.31,.17],[.25,-.13],[0,-.29],[-.25,-.13]];
 plate(chest,trim,0,.84,.435);plate(chest,shell,0,.85,.485).scale.setScalar(.83);
 mesh(gem,glow,0,.91,.54,.075,.12,.025);
 const visor=ring(trim,0,1.23,.39,.4);visor.scale.set(.41,.265,.12);
 for(const s of[-1,1]){
  plate([[-.2,-.13],[.2,-.14],[.28,.08],[.08,.23],[-.22,.15]],shell,s*.48,1.32,0,group,.25,-s*.15);
  block(trim,s*.49,1.34,.15,.29,.035,.03,group,-s*.15);
  plate([[-.07,-.18],[.08,-.17],[.11,.10],[0,.21],[-.09,.11]],trim,s*.36,1.42,.27,group,.05,-s*.16);
  rod([s*.25,1.62,.28],[s*.34,1.48,.33],.014,glow);
  for(let i=0;i<3;i++){
   block(dark,s*.49,1.27-i*.045,.16,.22,.012,.025,group,-s*.15);
   plate([[-.12,-.05],[.12,-.05],[.16,.04],[0,.10],[-.16,.04]],i%2?shell:trim,s*.25,.57-i*.09,.29+i*.018,group,.08,s*.12);
   mesh(gem,trim,s*(.13+i*.065),.79-i*.035,.51,.014,.018,.012);
  }
  rod([s*.10,.96,.53],[s*.24,.88,.51],.012,glow);
 }
 const id=spec.id;
 if(id==='obsidianwyrm'){
  mantle(.83);
  for(const s of[-1,1]){
   rod([s*.23,1.64,0],[s*.43,1.94,-.06],.09,trim);rod([s*.43,1.94,-.06],[s*.37,2.23,.02],.065,trim,group,0);
   const wing=rig(s*.33,1.22,-.43);
   plate([[0,0],[s*.38,.78],[s*1.02,.48],[s*.85,.15],[s*.62,.25],[s*.43,-.1],[s*.22,.08]],shell,0,0,0,wing);
   for(let j=0;j<3;j++){rod([0,0,.03],[s*(.4+j*.3),.67-j*.09,.03],.035,trim,wing);rod([s*.12,.1,.07],[s*(.33+j*.26),.53-j*.12,.07],.012,glow,wing);}
   spike(s*.55,1.61,0,.35,-s*.55);motions.push(t=>wing.rotation.y=s*(.13+Math.sin(t*1.4)*.055));
  }
 }
 if(id==='seraphzero'){
  crown(.25);
  for(const s of[-1,1]){const wing=rig(s*.35,1.27,-.43);for(let j=0;j<3;j++){blade(s*(.15+j*.15),j*.05,0,1.0-j*.08,-s*(.22+j*.43),wing,shell);blade(s*(.15+j*.15),j*.05,.055,.85-j*.08,-s*(.22+j*.43),wing,trim);}motions.push(t=>wing.rotation.y=s*(.08+Math.sin(t)*.04));}
  const halo=rig(0,1.62,-.68);ring(glow,0,0,0,.73,halo);for(let j=0;j<6;j++){const a=j*Math.PI/3;spike(Math.sin(a)*.75,Math.cos(a)*.75,0,.16,-a,halo);}motions.push(t=>halo.rotation.z=t*.12);
 }
 if(id==='voidreaper'){
  mantle(1.35);
  plate([[-.47,-.14],[-.48,.17],[0,.49],[.48,.17],[.47,-.14],[.32,.13],[0,.30],[-.32,.13]],dark,0,1.48,-.02,group,.32);
  for(const s of[-1,1])for(let j=0;j<3;j++)spike(s*(.43+j*.1),1.45-j*.07,-.12,.31,-s*(.6+j*.3));
  const scythe=rig(.91,.2,.08);rod([0,0,0],[0,1.85,0],.035,trim,scythe);
  plate([[.1,1.9],[-.12,2.05],[-.65,1.92],[-1.05,1.48],[-.58,1.72],[-.1,1.72]],trim,0,0,0,scythe);
  rod([-.15,1.79,.05],[-.63,1.77,.05],.018,glow,scythe);mesh(gem,glow,0,1.68,.07,.07,.11,.04,scythe);
 }
 if(id==='raijinmk7'){
  for(const s of[-1,1]){
   const pod=rig(s*.68,1.32,-.24);block(shell,0,0,0,.38,.51,.40,pod);block(trim,0,.23,0,.43,.08,.44,pod);
   for(let j=0;j<3;j++)block(glow,0,-.12+j*.1,.215,.23,.025,.02,pod);
   rod([s*.34,1.65,-.05],[s*.61,2.05,-.05],.045,trim);blade(s*.15,1.68,.01,.38,-s*.45);
  }
  const rack=rig(0,1.51,-.69);ring(trim,0,0,0,.72,rack);
  for(let j=0;j<5;j++){const a=(j-2)*.63;mesh(ball,shell,Math.sin(a)*.72,Math.cos(a)*.72,0,.16,.16,.09,rack);mesh(gem,glow,Math.sin(a)*.72,Math.cos(a)*.72,.09,.08,.08,.025,rack);}
  motions.push(t=>rack.rotation.z=Math.sin(t*.8)*.07);
 }
 if(id==='crimsonshogun'){
  mantle(.8);const crescent=ring(trim,0,1.86,0,.45,group,Math.PI*1.5);crescent.rotation.z=-Math.PI*.25;
  for(const s of[-1,1]){
   for(let j=0;j<3;j++){block(shell,s*.55,1.39-j*.12,0,.44,.10,.34,group,-s*.22);block(trim,s*.55,1.36-j*.12,.18,.42,.018,.025,group,-s*.22);}
   const sword=rig(s*.35,.36,-.59);sword.rotation.z=-s*.5;blade(0,0,0,1.6,0,sword);rod([0,1.55,0],[0,1.92,0],.05,dark,sword);block(trim,0,1.55,0,.37,.05,.11,sword);
  }
  plate([[-.1,0],[.1,0],[0,.31]],trim,0,1.64,.26);mesh(gem,glow,0,1.74,.31,.04,.07,.025);
 }
 if(id==='solarjuggernaut'){
  for(const s of[-1,1]){block(shell,s*.60,1.17,.01,.44,.64,.49,group,-s*.12);plate([[-.21,-.26],[.21,-.26],[.27,.23],[0,.34],[-.27,.23]],trim,s*.60,1.17,.27);mesh(gem,glow,s*.60,1.22,.33,.1,.16,.05);spike(s*.64,1.68,-.03,.32,-s*.22);}
  const sun=rig(0,1.45,-.64);ring(trim,0,0,0,.73,sun);ring(glow,0,0,.02,.59,sun);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;spike(Math.sin(a)*.86,Math.cos(a)*.86,0,.27,-a,sun,j%2?trim:shell);}motions.push(t=>sun.rotation.z=t*.06);crown(.24);
 }
 if(id==='abyssleviathan'){
  for(const s of[-1,1]){
   plate([[0,0],[s*.34,.64],[s*.38,.23],[s*.67,.4],[s*.54,-.13]],shell,s*.4,1.12,-.31,group,.09);
   for(let j=0;j<3;j++)rod([s*.41,1.2,-.23],[s*(.74+j*.13),1.64-j*.2,-.23],.018,glow);
   spike(s*.29,1.91,0,.52,-s*.38);
  }
  const trident=rig(-.96,.2,.1);rod([0,0,0],[0,1.84,0],.035,trim,trident);blade(0,1.65,0,.45,0,trident,glow);
  for(const s of[-1,1]){rod([0,1.35,0],[s*.24,1.57,0],.035,trim,trident);blade(s*.24,1.53,0,.37,0,trident);}
  const tail=rig(0,.62,-.45);rod([0,0,0],[0,-.28,-.6],.12,shell,tail,.04);plate([[-.25,0],[0,.2],[.25,0],[0,-.25]],trim,0,-.28,-.67,tail);motions.push(t=>tail.rotation.y=Math.sin(t*1.7)*.16);
 }
 if(id==='chronodominus'){
  mantle(1.12);crown(.32);const clock=rig(0,1.48,-.67);ring(trim,0,0,0,.84,clock);ring(glow,0,0,.025,.72,clock);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;block(trim,Math.sin(a)*.79,Math.cos(a)*.79,.04,.026,j%3?.07:.12,.02,clock,-a);}
  const hands=rig(0,1.48,-.61);rod([0,-.1,0],[0,.60,0],.024,trim,hands);rod([0,0,0],[.36,.23,0],.032,glow,hands);motions.push(t=>hands.rotation.z=-t*.2);
  for(const s of[-1,1]){blade(s*.53,1.3,-.18,.65,-s*.62);mesh(gem,glow,s*.62,1.32,.15,.07,.10,.035);}
 }
 if(id==='eclipsefenrir'){
  for(const s of[-1,1]){
   plate([[-.16,0],[.16,0],[s*.04,.60]],shell,s*.25,1.57,-.04,group,.23,-s*.12);
   plate([[-.06,0],[.06,0],[s*.04,.34]],glow,s*.25,1.72,.10,group,.02,-s*.12);
   for(let j=0;j<4;j++)blade(s*(.38+j*.085),1.31-j*.085,-.26,.45,-s*(.65+j*.25),group,j%2?trim:shell);
   for(let j=0;j<3;j++)blade(s*(.48+j*.065),.84,.22,.35,s*.1,group,trim);
  }
  plate([[-.32,.1],[0,.22],[.32,.1],[.21,-.06],[0,.05],[-.21,-.06]],shell,0,1.49,.3,group,.12);
  const moon=rig(0,1.35,-.66);const arc=ring(glow,0,0,0,.75,moon,Math.PI*1.55);arc.rotation.z=.6;motions.push(t=>moon.rotation.z=Math.sin(t*.6)*.09);mantle(.92);
 }
 if(id==='astralmonarch'){
  mantle(1.4);crown(.47);
  for(const s of[-1,1]){plate([[-.23,-.1],[.24,-.1],[s*.36,.39],[0,.18],[-s*.22,.27]],trim,s*.51,1.36,-.03,group,.18);mesh(gem,glow,s*.5,1.38,.16,.07,.09,.025);}
  const orbit=rig(0,1.35,-.64);ring(trim,0,0,0,.78,orbit);ring(glow,0,0,.03,.69,orbit);
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mesh(gem,trim,Math.sin(a)*.88,Math.cos(a)*.88,0,.09,.15,.06,orbit);}
  motions.push(t=>orbit.rotation.z=t*.15);
 }
 // Merge each rigid assembly by material. Animation only moves these assemblies.
 for(const parent of assemblies){
  const batches=new Map();for(const n of [...parent.children]){if(!n.isMesh||n.userData.dynamic)continue;n.updateMatrix();if(!batches.has(n.material))batches.set(n.material,[]);batches.get(n.material).push(n);}
  for(const [material,nodes]of batches){if(nodes.length<2)continue;const data={position:[],normal:[],uv:[]};
   for(const n of nodes){const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrix);for(const key of Object.keys(data)){const attr=g.getAttribute(key);if(attr)for(const v of attr.array)data[key].push(v);else for(let i=0;i<g.attributes.position.count*(key==='uv'?2:3);i++)data[key].push(0);}g.dispose();parent.remove(n);}
   const g=own(new T.BufferGeometry());for(const key of Object.keys(data))g.setAttribute(key,new T.Float32BufferAttribute(data[key],key==='uv'?2:3));g.computeBoundingSphere();mesh(g,material,0,0,0,1,1,1,parent);
  }
 }
 // A single bounded particle draw, with round fragments and no texture uploads.
 const count=mobile?14:22,positions=new Float32Array(count*3),pg=own(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(positions,3));
 const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{tint:{value:new T.Color(spec.accent)}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(30./-p.z,1.,4.);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 tint;void main(){float a=1.-smoothstep(.15,.5,length(gl_PointCoord-.5));if(a<.02)discard;gl_FragColor=vec4(tint,a*.65);}'});materials.add(pm);
 const aura=new T.Points(pg,pm);aura.name='signature-aura';aura.frustumCulled=false;group.add(aura);
 function update(seconds,{moving=false,jumping=false}={}){if(disposed)return;const t=Number.isFinite(seconds)?seconds:0;for(const motion of motions)motion(t);glow.emissiveIntensity=1.15+Math.sin(t*2)*.12+(jumping?.18:0);for(let i=0;i<count;i++){const a=i*2.39996+t*.2,r=.58+(i%3)*.08;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=(i/count*2.1+t*(moving?.32:.16))%2.1;positions[i*3+2]=Math.sin(a)*r;}pg.attributes.position.needsUpdate=true;}
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 update(0);return{group,spec,update,dispose};
}
