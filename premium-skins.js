import {EXPANDED_GIFT_SKINS,createExpandedGiftSkin} from './premium-skins-expansion.js';
// Gift-only visual equipment. No colliders, lights, timers, or gameplay state.
export const GIFT_SKINS=Object.freeze([
 {id:'neonphantom',name:'ネオン・ファントム',access:'gift',color:0x141025,accent:0xaf42ff,effect:'neon'},
 {id:'galaxylord',name:'ギャラクシー・ロード',access:'gift',color:0x171b48,accent:0x879bff,effect:'stars'},
 {id:'frostemperor',name:'フロスト・エンペラー',access:'gift',color:0x568ba5,accent:0x8af2ff,effect:'ice'},
 {id:'onimusha',name:'紅蓮の鬼武者',access:'gift',color:0x38151e,accent:0xff5930,effect:'fire'},
 {id:'spacebunny',name:'うさぎ宇宙飛行士',access:'gift',color:0xede5eb,accent:0xff88c7,effect:'sparkle'},
 {id:'error404',name:'ERROR 404',access:'gift',color:0x151a26,accent:0x43f5df,effect:'glitch'},
 {id:'celestial',name:'天界の守護者',access:'gift',color:0xf0ece0,accent:0xffd779,effect:'radiance'},
 {id:'boxgod',name:'ダンボール神',access:'gift',color:0xb48a56,accent:0xffd887,effect:'box'},
 ...EXPANDED_GIFT_SKINS
]);
export function createGiftSkin(T,id,{mobile=false}={}){
 const spec=GIFT_SKINS.find(s=>s.id===id);if(!spec)throw new Error('Unknown gift skin');
 if(EXPANDED_GIFT_SKINS.some(s=>s.id===id))return createExpandedGiftSkin(T,spec,{mobile});
 const group=new T.Group();group.name='gift-skin-'+id;
 const geometries=new Set(),materials=new Set(),textures=new Set(),cache=new Map(),containers=[group],animated=[],uniforms=[];
 let disposed=false,lastTime=0;
 const keep=g=>{geometries.add(g);return g;};
 const geo=(key,fn)=>{if(!cache.has(key))cache.set(key,keep(fn()));return cache.get(key);};
 const material=(color,glow=0,metal=.65,rough=.32)=>{const m=new T.MeshStandardMaterial({color,emissive:glow?color:0,emissiveIntensity:glow,metalness:metal,roughness:rough});materials.add(m);return m;};
 const shell=material(spec.color,0,.60,.32),edge=material(id==='celestial'?0xcaa764:id==='boxgod'?0x795332:0x74829b,0,.78,.27),dark=material(0x111625,0,.45,.46),light=material(id==='boxgod'?0xddba83:0xe1eaf0,0,.42,.34),glow=material(spec.accent,1.4,.48,.24);
 const gold=material(0xd8b15d,0,.82,.25),red=material(0xff3863,1.3),blue=material(0x4d82ff,1.3);
 const box=geo('box',()=>new T.BoxGeometry(1,1,1)),orb=geo('orb',()=>new T.SphereGeometry(1,16,12)),gem=geo('gem',()=>new T.OctahedronGeometry(1)),ring=geo('ring',()=>new T.TorusGeometry(1,.025,6,mobile?40:64));
 function mesh(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,parent=group,rz=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.z=rz;o.castShadow=false;o.userData.lightCostume=true;parent.add(o);return o;}
 const block=(m,x,y,z,w,h,d,parent=group,rz=0)=>mesh(box,m,x,y,z,w,h,d,parent,rz);
 function branch(x,y,z){const o=new T.Group();o.position.set(x,y,z);group.add(o);containers.push(o);return o;}
 function plate(points,depth,m,x=0,y=0,z=0,parent=group,rz=0){const key='plate'+JSON.stringify(points)+':'+depth;const g=geo(key,()=>{const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.012});g.translate(0,0,-depth/2);return g;});return mesh(g,m,x,y,z,1,1,1,parent,rz);}
 function tube(points,radius,m,parent=group){const g=keep(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),mobile?10:16,radius,5,false));return mesh(g,m,0,0,0,1,1,1,parent);}
 function hoop(m,x,y,z,r,rx=0,ry=0,parent=group){const o=mesh(ring,m,x,y,z,r,r,r,parent);o.rotation.x=rx;o.rotation.y=ry;return o;}
 const blade=[[-.12,0],[.12,0],[.11,.75],[.02,1.10],[-.09,.82]],feather=[[-.06,0],[.12,.12],[.10,.65],[0,1.12],[-.13,.54]];
 // Tailored chest shell; the original visor remains exposed and player names remain above it.
 mesh(orb,shell,0,1.00,-.035,.48,.69,.46);
 const breast=id==='onimusha'?[[-.27,-.18],[.27,-.18],[.32,.12],[-.32,.12]]:id==='spacebunny'?[[-.27,-.10],[.27,-.10],[.31,.04],[.25,.15],[-.25,.15],[-.31,.04]]:id==='galaxylord'||id==='celestial'?[[-.28,-.07],[0,-.25],[.28,-.07],[.26,.15],[-.26,.15]]:[[-.28,-.14],[.28,-.14],[.34,.07],[.22,.19],[-.22,.19],[-.34,.07]];
 plate(breast,.08,id==='boxgod'?shell:edge,0,.83,.42);plate(breast,.035,shell,0,.84,.48).scale.setScalar(.83);
 mesh(gem,edge,0,.86,.535,.105,.13,.035);mesh(gem,glow,0,.86,.57,.055,.082,.025);
 for(const side of [-1,1]){block(edge,side*.33,.64,.25,.13,.12,.24,group,side*.12);block(glow,side*.31,.67,.39,.10,.025,.03);}
 // Fine surface treatment: restrained brushed finish on metal, fabric/corrugation on organic materials.
 const surface=document.createElement('canvas');surface.width=surface.height=128;const sc=surface.getContext('2d');sc.fillStyle='#bcbcbc';sc.fillRect(0,0,128,128);for(let y=0;y<128;y++){const k=135+Math.floor((Math.sin(y*49.13)*.5+.5)*70);sc.fillStyle=`rgb(${k},${k},${k})`;sc.fillRect(0,y,128,1);}const roughnessTex=new T.CanvasTexture(surface);textures.add(roughnessTex);roughnessTex.wrapS=roughnessTex.wrapT=T.RepeatWrapping;roughnessTex.repeat.set(2,2);shell.roughnessMap=roughnessTex;edge.roughnessMap=roughnessTex;
 if(id==='boxgod'){shell.metalness=0;edge.metalness=0;light.metalness=0;shell.roughness=.93;edge.roughness=.87;}
 else if(id==='spacebunny'){shell.metalness=.22;shell.roughness=.24;light.metalness=.3;light.roughness=.22;}
 if(id!=='boxgod'){
  const rim=hoop(edge,0,1.18,.365,.36);rim.scale.set(.38,.245,.075);
  const seal=hoop(dark,0,1.18,.379,.34);seal.scale.set(.355,.224,.055);
  for(const side of [-1,1]){mesh(gem,edge,side*.28,.90,.535,.025,.025,.012);block(dark,side*.24,.72,.455,.11,.035,.03);for(let j=0;j<3;j++)block(edge,side*(.18+j*.045),.72,.475,.014,.03,.01);}
 }
 const wings=[],floaters=[],flaps=[],glitches=[];
 let halo=null,cape=null,emblem=null;
 function shoulder(side,m=shell){const shape=[[-.20,-.10],[.21,-.13],[.25,.05],[0,.23],[-.22,.12]];plate(shape,.36,m,side*.49,1.32,0,group,-side*.18);plate(shape,.03,edge,side*.49,1.32,.20,group,-side*.18).scale.setScalar(.8);}
 function crown(m){for(let j=0;j<5;j++){const x=(j-2)*.15;plate([[-.075,0],[.075,0],[.055,.14],[0,.36+(.06*(j%2))],[-.055,.14]],.08,m,x,1.64,-.08);mesh(gem,glow,x,1.76,.0,.035,.05,.025);}hoop(edge,0,1.68,0,.37,Math.PI/2);}
 if(id==='neonphantom'){
  for(const side of [-1,1]){shoulder(side);const wing=branch(side*.34,1.12,-.43);wings.push({node:wing,side});
   for(let j=0;j<4;j++){const x=side*(.20+j*.18),y=.02+j*.10,a=-side*(.30+j*.17);const p=plate(blade,.10,dark,x,y,0,wing,a);p.scale.set(1,1.3-j*.08,1);const vein=block(glow,x+side*.02,y+.40,.065,.025,.90-j*.05,.025,wing,a);}
   tube([[side*.28,1.55,.23],[side*.40,1.36,.32],[side*.34,.85,.42],[side*.24,.63,.38]],.018,glow);
   plate([[-.09,0],[.09,0],[.02,.42],[-.05,.30]],.10,edge,side*.29,1.65,-.05,group,-side*.40);
  }halo=hoop(glow,0,1.58,-.70,.78);halo.userData.dynamic=true;
  for(let j=0;j<4;j++)block(glow,0,.70+j*.09,-.50,.38,.022,.022);
 }
 if(id==='galaxylord'){
  crown(gold);for(const side of [-1,1])shoulder(side,dark);
  emblem=branch(0,1.42,-.68);const compass=hoop(gold,0,0,0,.76,0,0,emblem);for(let j=0;j<8;j++){const a=j*Math.PI/4;plate([[-.05,0],[.05,0],[0,.36]],.04,j%2?glow:gold,Math.sin(a)*.61,Math.cos(a)*.61,0,emblem,-a);}
  for(let j=0;j<3;j++){const node=branch(0,0,0);mesh(gem,j%2?glow:gold,0,0,0,.10,.15,.08,node);floaters.push({node,a:j*2.094,r:.88,y:1.12+j*.22});}
 }
 if(id==='frostemperor'){
  crown(light);for(const side of [-1,1]){shoulder(side,edge);const wing=branch(side*.3,1.05,-.41);wings.push({node:wing,side});for(let j=0;j<4;j++){const shape=[[-.10,0],[.12,.06],[.13,.53],[.03,1.01],[-.12,.55]];const crystal=plate(shape,.14,j%2?light:edge,side*(.14+j*.17),j*.1,0,wing,-side*(.25+j*.18));crystal.scale.y=1.1-j*.1;block(glow,side*(.14+j*.17),.38+j*.1,.09,.025,.61,.025,wing,-side*(.25+j*.18));}}
  const sceptre=branch(.82,.18,.13);block(edge,0,.64,0,.07,1.3,.07,sceptre);mesh(gem,light,0,1.55,0,.24,.38,.13,sceptre);mesh(gem,glow,0,1.55,.135,.09,.20,.025,sceptre);hoop(glow,0,1.55,0,.28,0,0,sceptre);
 }
 if(id==='onimusha'){
  for(const side of [-1,1]){for(let j=0;j<3;j++){plate([[-.22,-.09],[.22,-.09],[.24,.08],[-.20,.13]],.34,shell,side*.50,1.40-j*.13,0,group,-side*.12);block(gold,side*.5,1.35-j*.13,.19,.36,.018,.025);}tube([[side*.23,1.63,0],[side*.48,1.85,-.03],[side*.56,2.13,-.04],[side*.44,2.31,0]],.07,gold);for(let j=0;j<3;j++)block(shell,side*.27,.60-j*.10,.27,.24,.085,.13,group,side*.12);}
  const sword=branch(-.45,.2,-.55);sword.rotation.z=-.47;block(dark,0,1.05,0,.15,1.85,.13,sword);block(glow,.065,1.12,.07,.018,1.65,.02,sword);block(gold,0,1.93,0,.46,.07,.20,sword);block(shell,0,2.12,0,.09,.35,.09,sword);for(let j=0;j<5;j++)block(gold,0,2.0+j*.055,.055,.11,.014,.015,sword);
  emblem=branch(0,1.55,-.70);hoop(glow,0,0,0,.58,0,0,emblem);for(let j=0;j<7;j++){const a=j*Math.PI*2/7;plate([[-.07,0],[.09,.06],[.12,.30],[-.02,.52],[-.05,.23]],.02,glow,Math.sin(a)*.48,Math.cos(a)*.48,0,emblem,-a);}mesh(gem,gold,0,0,0,.15,.22,.07,emblem);
 }
 if(id==='spacebunny'){
  for(const side of [-1,1]){shoulder(side,light);const ear=tube([[side*.18,1.62,-.08],[side*.23,1.99,-.04],[side*.34,2.36,0],[side*.40,2.48,0]],.10,light);tube([[side*.21,1.78,.005],[side*.25,2.02,.05],[side*.34,2.30,.08]],.035,glow);
   const pod=branch(side*.65,1.15,-.48);mesh(orb,light,0,0,0,.19,.47,.23,pod);block(edge,0,-.25,0,.25,.12,.31,pod);hoop(glow,0,-.32,0,.14,Math.PI/2,0,pod);mesh(gem,glow,0,-.46,0,.075,.17,.075,pod);floaters.push({node:pod,a:side,r:0,y:1.15,fixed:true,x:side*.65,z:-.48});
  }hoop(glow,0,1.22,-.65,.40);block(edge,0,1.08,-.51,.49,.65,.27);mesh(orb,glow,0,1.12,-.69,.23,.23,.055);
 }
 if(id==='error404'){
  for(const side of [-1,1]){shoulder(side,dark);const wing=branch(side*.34,1.10,-.47);for(let j=0;j<5;j++){const node=new T.Group();node.position.set(side*(.17+j*.15),.13+j*.21,0);wing.add(node);containers.push(node);block(dark,0,0,0,.30,.22,.18,node,-side*.35);block(j%2?red:blue,side*.02,.04,.11,.26,.018,.025,node);glitches.push({node,x:node.position.x,y:node.position.y,seed:j+side*3});}}
  for(let j=0;j<6;j++){const node=branch((j%2?1:-1)*.28,.65+j*.17,.46);block(j%3===0?red:j%3===1?glow:blue,0,0,0,.22,.035,.02,node);glitches.push({node,x:node.position.x,y:node.position.y,seed:j});}
  halo=hoop(blue,0,1.46,-.64,.76);halo.rotation.z=.3;halo.userData.dynamic=true;
 }
 if(id==='celestial'){
  crown(gold);for(const side of [-1,1]){shoulder(side,light);const wing=branch(side*.32,1.13,-.40);wings.push({node:wing,side});for(let j=0;j<6;j++){const x=side*(.10+j*.15),y=.09+j*.10,a=-side*(.28+j*.17);const f=plate(feather,.06,light,x,y,0,wing,a);f.scale.y=1.24-j*.08;tube([[x,y, .045],[x+Math.sin(-a)*.22,y+.40,.045],[x+Math.sin(-a)*.44,y+.80,.045]],.012,gold,wing);}mesh(gem,gold,side*.10,.20,.08,.09,.15,.06,wing);}
  halo=hoop(glow,0,2.26,0,.50,Math.PI/2);halo.userData.dynamic=true;hoop(gold,0,2.20,0,.58,Math.PI/2);for(let j=0;j<8;j++){const a=j*Math.PI/4;mesh(gem,glow,Math.sin(a)*.50,2.26,Math.cos(a)*.50,.028,.065,.028);}
 }
 if(id==='boxgod'){
  block(shell,0,.94,-.03,.96,.91,.86);for(const side of [-1,1]){block(edge,side*.48,.94,-.03,.025,.90,.87);block(light,side*.45,.93,.42,.025,.76,.025);}
  block(light,0,1.0,.415,.14,.84,.018);block(gold,0,1.0,.435,.055,.84,.012);for(const x of [-.22,.22]){block(dark,x,1.22,.43,.19,.095,.03);block(glow,x,1.22,.455,.15,.045,.02);}
  for(let j=0;j<4;j++){const x=(j-1.5)*.18;block(edge,x,.70,.435,.10,.028,.02,group,j%2?.2:-.2);}for(const side of [-1,1]){const lid=branch(side*.48,1.41,-.03);block(shell,-side*.24,0,0,.48,.045,.86,lid);block(light,-side*.24,.027,0,.08,.012,.86,lid);flaps.push({node:lid,side});}
  halo=hoop(glow,0,2.04,0,.52,Math.PI/2);halo.userData.dynamic=true;
  for(let j=0;j<3;j++){const node=branch(0,0,0);block(shell,0,0,0,.23,.23,.23,node);block(gold,0,0,.12,.04,.24,.01,node);floaters.push({node,a:j*2.094,r:.87,y:.70+j*.28});}
 }
 // Layered details are merged with their assembly; they do not introduce per-frame mesh creation.
 if(id==='neonphantom'){
  for(const side of [-1,1]){for(let j=0;j<3;j++){const x=side*(.50+j*.14);plate([[-.04,0],[.04,0],[.02,.30],[-.02,.24]],.022,edge,x,1.55+j*.22,-.39,group,-side*.55);mesh(gem,glow,side*.49,1.35,.255,.043,.045,.015);}tube([[side*.28,1.5,-.16],[side*.42,1.48,-.35],[side*.36,.88,-.55]],.025,edge);}
  const core=branch(0,1.22,-.60);hoop(edge,0,0,0,.22,0,0,core);mesh(gem,glow,0,0,-.04,.12,.17,.08,core);for(let j=0;j<6;j++){const a=j*Math.PI/3;block(edge,Math.cos(a)*.25,Math.sin(a)*.25,0,.08,.04,.08,core,a);}
 }
 if(id==='galaxylord'){
  if(emblem){hoop(glow,0,0,.02,.68,0,0,emblem);hoop(dark,0,0,-.02,.81,0,0,emblem);for(let j=0;j<24;j++){const a=j*Math.PI/12;block(gold,Math.sin(a)*.75,Math.cos(a)*.75,.035,.013,j%3?.035:.075,.02,emblem,-a);}mesh(gem,gold,0,0,.04,.16,.22,.055,emblem);mesh(gem,glow,0,0,.105,.07,.11,.025,emblem);}
  for(const side of [-1,1]){tube([[side*.12,1.43,.27],[side*.28,1.32,.32],[side*.35,1.20,.30]],.016,gold);for(let j=0;j<3;j++)mesh(gem,gold,side*(.30+j*.065),1.28-j*.045,.27,.028,.035,.02);}
 }
 if(id==='frostemperor'){
  for(const {node,side}of wings){for(let j=0;j<3;j++){const shard=mesh(gem,glow,side*(.20+j*.21),.14+j*.08,.11,.07,.22,.032,node);shard.rotation.z=-side*(.3+j*.16);}}
  for(const side of [-1,1]){tube([[side*.17,.92,.52],[side*.23,.85,.52],[side*.20,.74,.51]],.012,light);for(let j=0;j<3;j++)mesh(gem,light,side*(.12+j*.075),.64,-.16,.06,.15,.065);}
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mesh(gem,glow,.82+Math.sin(a)*.23,1.73+Math.cos(a)*.23,.13,.035,.06,.035);}
 }
 if(id==='onimusha'){
  for(const side of [-1,1]){for(let j=0;j<3;j++)for(let k=0;k<3;k++){mesh(orb,gold,side*(.36+k*.14),1.39-j*.13,.19,.014,.014,.012);block(dark,side*(.37+k*.13),1.37-j*.13,.203,.012,.056,.008);}for(let j=0;j<3;j++){block(gold,side*.26,.59-j*.10,.345,.19,.012,.015);mesh(orb,gold,side*.26,.62-j*.10,.34,.015,.015,.012);}}
  plate([[-.06,-.08],[.06,-.08],[.1,.04],[0,.17],[-.1,.04]],.04,gold,0,1.64,.22);mesh(gem,glow,0,1.70,.26,.034,.054,.025);
 }
 if(id==='spacebunny'){
  for(const f of floaters){if(!f.fixed)continue;const pod=f.node;for(let j=0;j<3;j++)hoop(edge,0,-.12+j*.14,0,.19,Math.PI/2,0,pod);for(const side of [-1,1])block(glow,side*.12,.07,.18,.025,.20,.025,pod);}
  for(const side of [-1,1]){block(light,side*.29,.82,.49,.15,.16,.055);mesh(orb,glow,side*.29,.84,.53,.024,.024,.015);block(edge,side*.48,1.34,.22,.16,.06,.025);block(glow,side*.48,1.34,.24,.08,.018,.012);}
  const badge=branch(.17,.97,.53);hoop(edge,0,0,0,.07,0,0,badge);mesh(gem,glow,0,0,.015,.033,.04,.016,badge);
 }
 if(id==='error404'){
  for(const {node,seed}of glitches){if(node.position.z>0)continue;block(edge,0,-.09,.1,.25,.018,.02,node);for(let j=0;j<3;j++)block(seed%2?red:glow,-.08+j*.07,0,.12,.025,.025,.016,node);}
  for(const side of [-1,1]){const panel=branch(side*.23,1.49,.24);plate([[-.09,-.04],[.09,-.04],[.11,.04],[-.08,.08]],.03,dark,0,0,0,panel);block(side<0?red:blue,side*.025,0,.03,.14,.016,.014,panel);}
 }
 if(id==='celestial'){
  for(const {node,side}of wings){for(let j=0;j<5;j++){const x=side*(.17+j*.15),y=.12+j*.1;for(let k=0;k<3;k++){const a=-side*(.3+j*.17);block(gold,x+side*(.06+k*.06),y+.22+k*.12,.052,.009,.085,.01,node,a+side*.45);}}}
  for(const side of [-1,1]){tube([[side*.12,.97,.52],[side*.22,.95,.51],[side*.27,.82,.50],[side*.14,.77,.52]],.012,gold);mesh(gem,gold,side*.49,1.39,.24,.06,.08,.025);mesh(gem,glow,side*.49,1.39,.27,.025,.042,.012);}
  hoop(edge,0,2.25,0,.56,Math.PI/2);for(let j=0;j<12;j++){const a=j*Math.PI/6;block(gold,Math.sin(a)*.54,2.26,Math.cos(a)*.54,.02,.055,.02);}
 }
 if(id==='boxgod'){
  for(const side of [-1,1])for(let j=0;j<14;j++)block(light,side*.485,.52+j*.06,.405,.023,.015,.028);
  for(const f of flaps){for(let j=0;j<10;j++)block(edge,-f.side*.24,0,-.37+j*.08,.46,.048,.009,f.node);}
  const stampCanvas=document.createElement('canvas');stampCanvas.width=256;stampCanvas.height=128;const st=stampCanvas.getContext('2d');st.fillStyle='#d2af7c';st.fillRect(0,0,256,128);st.strokeStyle='#59452d';st.lineWidth=5;st.strokeRect(8,8,240,112);st.fillStyle='#59452d';st.font='bold 28px monospace';st.textAlign='center';st.fillText('DIVINE CARGO',128,43);st.font='18px monospace';st.fillText('HANDLE WITH FAITH',128,72);for(let j=0;j<40;j++){const w=j%3===0?3:1;st.fillRect(24+j*5,84,w,25);}const stampTex=new T.CanvasTexture(stampCanvas);textures.add(stampTex);const stampMat=new T.MeshStandardMaterial({map:stampTex,roughness:.95,metalness:0});materials.add(stampMat);const stamp=mesh(keep(new T.PlaneGeometry(.35,.175)),stampMat,.19,.84,.413);stamp.rotation.z=-.09;
 }
 // True animated nebula cloth rather than a flat coloured box.
 if(id==='galaxylord'||id==='celestial'||id==='frostemperor'){
  const u={time:{value:0},base:{value:new T.Color(spec.color)},light:{value:new T.Color(spec.accent)},galaxy:{value:id==='galaxylord'?1:0}};uniforms.push(u);
  const mat=new T.ShaderMaterial({uniforms:u,side:T.DoubleSide,vertexShader:`uniform float time;varying vec2 v;void main(){v=uv;vec3 p=position;p.x*=.65+.50*(1.-uv.y);p.z+=sin(uv.y*5.+time*2.+uv.x*2.)*.055*(1.-uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;uniform vec3 base,light;uniform float galaxy;varying vec2 v;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 q=v*vec2(24.,36.);float h=hash(floor(q));float stars=step(.96,h)*pow(max(0.,1.-length(fract(q)-.5)*2.),4.)*(.6+.4*sin(time*1.7+h*60.));float nebula=pow(.5+.5*sin(v.x*11.+sin(v.y*9.+time*.15)*2.),3.);float border=step(v.x,.035)+step(.965,v.x)+step(v.y,.035);vec3 c=base*(.7+nebula*.8)+light*(stars*2.5*galaxy+border*.6);gl_FragColor=vec4(c,1.);}`});materials.add(mat);cape=mesh(keep(new T.PlaneGeometry(1.12,1.25,5,8)),mat,0,.89,-.55);cape.userData.dynamic=true;cape.rotation.x=-.1;
 }
 // Narrow emissive aura. No full-screen postprocessing or per-character lights.
 const auraUniform={time:{value:0},color:{value:new T.Color(spec.accent)},flame:{value:id==='onimusha'?1:0},strength:{value:1}};uniforms.push(auraUniform);
 const auraMat=new T.ShaderMaterial({uniforms:auraUniform,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time,flame,strength;uniform vec3 color;varying vec2 v;void main(){float wave=.5+.5*sin(v.x*38.+time*3.+sin(v.y*15.-time*4.));float a=pow(1.-v.y,2.)*.08+pow(wave,8.)*.12*flame;float fade=smoothstep(0.,.08,v.y)*(1.-smoothstep(.4,1.,v.y));gl_FragColor=vec4(color,a*fade*strength);}`});materials.add(auraMat);mesh(keep(new T.CylinderGeometry(.52,.66,1.55,20,1,true)),auraMat,0,.88,0).userData.dynamic=true;
 const foot=hoop(glow,0,.045,0,.61,Math.PI/2);foot.userData.dynamic=true;
 const jump=hoop(glow,0,.06,0,.65,Math.PI/2);jump.userData.dynamic=true;jump.visible=false;
 // Procedural themed sprites, loaded once per equipment instance.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.translate(32,32);c.fillStyle='#fff';c.strokeStyle='#fff';c.lineWidth=4;c.lineCap='round';
 if(id==='frostemperor'){for(let j=0;j<6;j++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-25);c.moveTo(0,-14);c.lineTo(-7,-20);c.moveTo(0,-14);c.lineTo(7,-20);c.stroke();}}
 else if(['galaxylord','celestial','spacebunny'].includes(id)){c.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,r=j%2?9:27;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();}
 else if(id==='onimusha'){c.beginPath();c.moveTo(0,-29);c.bezierCurveTo(22,-8,24,12,10,24);c.bezierCurveTo(-18,36,-29,2,0,-29);c.fill();}
 else if(id==='error404'||id==='neonphantom')c.fillRect(-16,-16,32,32);else{c.beginPath();c.arc(0,0,15,0,Math.PI*2);c.fill();}
 const tex=new T.CanvasTexture(canvas);textures.add(tex);
 const count=mobile?14:26,pos=new Float32Array(count*3);const pg=keep(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));const pm=new T.PointsMaterial({map:tex,color:spec.accent,size:id==='frostemperor'?.13:.09,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending});materials.add(pm);const particles=new T.Points(pg,pm);particles.frustumCulled=false;group.add(particles);
 const n=mobile?10:18,tp=new Float32Array(n*3),tg=keep(new T.BufferGeometry());tg.setAttribute('position',new T.BufferAttribute(tp,3).setUsage(T.DynamicDrawUsage));const tm=pm.clone();tm.size=id==='spacebunny'?.18:.105;materials.add(tm);const trail=new T.Points(tg,tm);trail.frustumCulled=false;group.add(trail);const trailSlots=Array.from({length:n},()=>({x:0,y:0,z:0,until:0}));let cursor=0,spawnAt=-1,jumpAt=-100,wasJumping=false;
 const world=new T.Vector3(),local=new T.Vector3();
 let echoes=null,echoCursor=0;const echoSlots=[],inverse=new T.Matrix4(),echoMatrix=new T.Matrix4(),bodyOffset=new T.Matrix4().makeTranslation(0,1,0),echoColor=new T.Color();
 if(id==='neonphantom'||id==='error404'){const m=new T.MeshBasicMaterial({color:spec.accent,transparent:true,opacity:.17,depthWrite:false,blending:T.AdditiveBlending});materials.add(m);echoes=new T.InstancedMesh(keep(new T.CapsuleGeometry(.43,.48,4,10)),m,mobile?2:4);echoes.userData.dynamic=true;echoes.frustumCulled=false;group.add(echoes);for(let i=0;i<echoes.count;i++){echoSlots.push({world:new T.Matrix4(),until:-1});echoes.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));echoes.setColorAt(i,new T.Color(0));}}
 // Merge static pieces by material within each moving assembly. Names/physics stay outside this group.
 for(const parent of containers){const batches=new Map();for(const o of [...parent.children]){if(!o.isMesh||o.userData.dynamic)continue;o.updateMatrix();let bucket=batches.get(o.material);if(!bucket)batches.set(o.material,bucket=[]);bucket.push(o);}
  for(const [mat,objects]of batches){if(objects.length<2)continue;const positions=[],normals=[],uvs=[];for(const o of objects){const temp=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();temp.applyMatrix4(o.matrix);for(const name of ['position','normal','uv']){const a=temp.getAttribute(name);const dest=name==='position'?positions:name==='normal'?normals:uvs;if(a)for(let i=0;i<a.array.length;i++)dest.push(a.array[i]);else for(let i=0;i<temp.getAttribute('position').count*(name==='uv'?2:3);i++)dest.push(0);}temp.dispose();parent.remove(o);}const g=keep(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();mesh(g,mat,0,0,0,1,1,1,parent);}
 }
 function update(seconds,{moving=false,jumping=false}={}){
  if(disposed)return;const t=Number(seconds)||0;lastTime=t;for(const u of uniforms){u.time.value=t;if(u.strength)u.strength.value=jumping?1.7:1;}
  glow.emissiveIntensity=1.25+.25*Math.sin(t*2.5);if(halo)halo.rotation.z=t*.28;if(emblem)emblem.rotation.z=Math.sin(t*.4)*.08;
  for(const {node,side}of wings)node.rotation.y=side*(.08+Math.sin(t*1.7)*.05+(moving?.06:0));
  for(const f of floaters){if(f.fixed)f.node.position.set(f.x,f.y+Math.sin(t*2+f.a)*.05,f.z);else{const a=f.a+t*.45;f.node.position.set(Math.cos(a)*f.r,f.y+Math.sin(t*1.7+f.a)*.10,Math.sin(a)*f.r);f.node.rotation.y=-a;}}
  for(const f of flaps)f.node.rotation.z=f.side*(jumping?1.05:.10+.025*Math.sin(t*2));
  for(const g of glitches){const pulse=Math.sin(Math.floor(t*12+g.seed)*78.23+g.seed*20)>.75;g.node.position.x=g.x+(pulse?.10:0);g.node.position.y=g.y+(pulse?.035:0);g.node.visible=!pulse||Math.sin(t*33+g.seed)>-.15;}
  for(let i=0;i<count;i++){const a=i*2.39996+t*(id==='galaxylord'?.50:.22),r=.53+(i%4)*.1,k=i*3;let y=(i/count*2.35+t*(id==='celestial'||id==='frostemperor'?-.24:.30)+100)%2.35;pos[k]=Math.cos(a)*r;pos[k+1]=y;pos[k+2]=Math.sin(a)*r;}pg.attributes.position.needsUpdate=true;
  group.updateWorldMatrix(true,false);group.getWorldPosition(world);if(jumping&&!wasJumping)jumpAt=t;wasJumping=jumping;
  const j=t-jumpAt;jump.visible=j>=0&&j<.55;if(jump.visible){jump.scale.setScalar(.65+j*.8);jump.rotation.z=t*.7;}
  if((moving&&t-spawnAt>.1)||(jumping&&j<.06)){spawnAt=t;const s=trailSlots[cursor++%n];s.x=world.x;s.y=world.y+.04;s.z=world.z;s.until=t+.85;if(echoes&&moving){const e=echoSlots[echoCursor++%echoSlots.length];e.world.copy(group.matrixWorld);e.until=t+.42;}}
  for(let i=0;i<n;i++){const s=trailSlots[i],k=i*3;if(s.until>t){local.set(s.x,s.y,s.z);group.worldToLocal(local);tp[k]=local.x;tp[k+1]=local.y;tp[k+2]=local.z;}else{tp[k]=0;tp[k+1]=-999;tp[k+2]=0;}}tg.attributes.position.needsUpdate=true;
  if(echoes){inverse.copy(group.matrixWorld).invert();for(let i=0;i<echoSlots.length;i++){const e=echoSlots[i],fade=Math.max(0,(e.until-t)/.42);if(fade>0)echoMatrix.multiplyMatrices(inverse,e.world).multiply(bodyOffset);else echoMatrix.makeScale(0,0,0);echoes.setMatrixAt(i,echoMatrix);echoColor.setRGB(fade,fade,fade);echoes.setColorAt(i,echoColor);}echoes.instanceMatrix.needsUpdate=true;echoes.instanceColor.needsUpdate=true;}
 }
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 update(0);return{group,update,dispose,spec};
}
