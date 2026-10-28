import {TAILORED_GIFT_IDS,createTailoredGiftSkin} from './premium-tailored-skins.js';
// Twenty authored silhouettes. Presentation only: no lights, colliders or game state.
export const EXPANDED_GIFT_SKINS = Object.freeze([
 {id:'abyssdiver',name:'圧海潜航士',color:0x275855,accent:0x71f3d6,trim:0xb78c51,effect:'bubble',glyph:'⚓'},
 {id:'sakurakimono',name:'桜花の舞姫',color:0x7f294e,accent:0xffacd1,trim:0xe6c18e,effect:'petal',glyph:'🌸'},
 {id:'chronokeeper',name:'時計仕掛けの旅人',color:0x4b3527,accent:0xffc96b,trim:0xb98a45,effect:'gear',glyph:'⚙'},
 {id:'starchef',name:'星の料理長',color:0xefe6d5,accent:0xffa960,trim:0x985937,effect:'steam',glyph:'🍳'},
 {id:'piratecaptain',name:'幽海の船長',color:0x283b50,accent:0x6ee6da,trim:0xd2a455,effect:'tide',glyph:'🏴‍☠️'},
 {id:'streetdj',name:'ストリート・ビート',color:0x26204a,accent:0xff65bd,trim:0x56e0e4,effect:'beat',glyph:'🎧'},
 {id:'honeykeeper',name:'蜜蜂の庭師',color:0xe6ae3f,accent:0xffe588,trim:0x58432b,effect:'honey',glyph:'🐝'},
 {id:'mushroomoracle',name:'蛍茸の案内人',color:0x3c466a,accent:0xb5ffab,trim:0xabc4b6,effect:'spore',glyph:'🍄'},
 {id:'jellyveil',name:'深海のプリズム',color:0x4e729a,accent:0xc4b5ff,trim:0x83e3e8,effect:'prism',glyph:'🪼'},
 {id:'origamitsuru',name:'折鶴の夢使い',color:0xe9e1cf,accent:0xf4a79e,trim:0x9d3b42,effect:'paper',glyph:'🕊'},
 {id:'patisserie',name:'ショコラ・パティシエ',color:0x694136,accent:0xffb9c6,trim:0xefcd8d,effect:'sugar',glyph:'🍰'},
 {id:'scarabpharaoh',name:'黄金のスカラベ',color:0x2a657d,accent:0xf5d686,trim:0xd3a446,effect:'sand',glyph:'𓆣'},
 {id:'rainwalker',name:'雨上がりの散歩者',color:0xe6bb43,accent:0x83d9ff,trim:0xf3ead2,effect:'rain',glyph:'☂'},
 {id:'railconductor',name:'銀河急行の車掌',color:0x233955,accent:0xffda8b,trim:0xbca06c,effect:'ticket',glyph:'🚂'},
 {id:'inkmonk',name:'墨影の書家',color:0xe7e4da,accent:0x99c4c5,trim:0x29353d,effect:'ink',glyph:'🖌'},
 {id:'carnivaljoker',name:'月夜のトリックスター',color:0x58334f,accent:0xffc96d,trim:0xb7a0db,effect:'cards',glyph:'🃏'},
 {id:'rescueworker',name:'レスキュー・ワーカー',color:0xdb712f,accent:0xffde80,trim:0x35434c,effect:'weld',glyph:'🔧'},
 {id:'cactusmariachi',name:'サボテン・セレナーデ',color:0x4b8c66,accent:0xf6dc79,trim:0x923c4a,effect:'pollen',glyph:'🌵'},
 {id:'bathduck',name:'あひる温泉',color:0xdce5e3,accent:0xa9eeff,trim:0xf4c957,effect:'foam',glyph:'🛁'},
 {id:'retroarcade',name:'アーケード・レジェンド',color:0x25465f,accent:0xff6d9d,trim:0xffd37d,effect:'pixel',glyph:'🕹'}
].map(s=>Object.freeze({...s,access:'gift'})));

export function createExpandedGiftSkin(T,spec,{mobile=false}={}) {
 if(TAILORED_GIFT_IDS.includes(spec.id))return createTailoredGiftSkin(T,spec,{mobile});
 const group=new T.Group();group.name='gift-skin-'+spec.id;
 const geometries=new Set(),materials=new Set(),textures=new Set(),cache=new Map(),assemblies=[group],motions=[];
 let disposed=false,previous=-1,wasJumping=false,jumpAt=-100,trailAt=-1,trailCursor=0;
 const own=g=>(geometries.add(g),g);
 const geometry=(key,make)=>{if(!cache.has(key))cache.set(key,own(make()));return cache.get(key);};
 const mat=(color,metalness=.15,roughness=.6,emissive=0)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,emissive:emissive?color:0,emissiveIntensity:emissive});materials.add(m);return m;};
 const fabric=mat(spec.color),trim=mat(spec.trim,.65,.3),dark=mat(0x17232d,.3,.5),ivory=mat(0xefe8d7,.1,.65),glow=mat(spec.accent,.3,.28,1.2);
 const wood=mat(0x704734,.05,.8),silver=mat(0xa1b9bf,.8,.27),rose=mat(0xca697f,.1,.5);
 const box=geometry('box',()=>new T.BoxGeometry(1,1,1)),ball=geometry('ball',()=>new T.SphereGeometry(1,mobile?14:20,mobile?10:14));
 const torus=geometry('torus',()=>new T.TorusGeometry(1,.045,6,mobile?36:56));
 function mesh(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,parent=group){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=false;o.userData.lightCostume=true;parent.add(o);return o;}
 const block=(m,x,y,z,w,h,d,p=group)=>mesh(box,m,x,y,z,w,h,d,p);
 const ellipsoid=(m,x,y,z,a,b,c,p=group)=>mesh(ball,m,x,y,z,a,b,c,p);
 function ring(m,x,y,z,r,rx=0,ry=0,p=group){const o=mesh(torus,m,x,y,z,r,r,r,p);o.rotation.set(rx,ry,0);return o;}
 function cylinder(m,x,y,z,r,h,p=group,top=r){return mesh(geometry(`cylinder:${r}:${top}:${h}`,()=>new T.CylinderGeometry(top,r,h,mobile?16:24)),m,x,y,z,1,1,1,p);}
 function cone(m,x,y,z,r,h,p=group){return cylinder(m,x,y,z,r,h,p,0);}
 function node(x,y,z){const n=new T.Group();n.position.set(x,y,z);group.add(n);assemblies.push(n);return n;}
 function animate(n,fn){motions.push({node:n,fn});return n;}
 function plate(points,depth,m,x,y,z,p=group){const key=JSON.stringify(points)+depth;const g=geometry(key,()=>{const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.01});g.translate(0,0,-depth/2);return g;});return mesh(g,m,x,y,z,1,1,1,p);}
 function tube(points,r,m,p=group){const g=own(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),mobile?10:16,r,6,false));return mesh(g,m,0,0,0,1,1,1,p);}
 function seam(points,m=trim,p=group){tube(points,.009,m,p);}
 function button(x,y,z,m=trim,r=.025,p=group){ellipsoid(m,x,y,z,r,r,.018,p);}
 function garment(m=fabric){ellipsoid(m,0,.92,-.035,.49,.63,.455);}
 function lapels(){for(const s of[-1,1]){plate([[0,.12],[s*.25,0],[s*.12,-.27]],.045,trim,s*.08,1.02,.415);for(let j=0;j<3;j++)button(s*.18,.78+j*.12,.45);}}
 function boots(m=fabric){for(const s of[-1,1]){ellipsoid(m,s*.23,.24,.04,.21,.22,.28);block(trim,s*.23,.10,.05,.37,.055,.45);}}
 function gear(parent,x,y,z,r,m=trim){ring(m,x,y,z,r,0,0,parent);cylinder(m,x,y,z,r*.26,.08,parent).rotation.x=Math.PI/2;for(let j=0;j<12;j++){const a=j*Math.PI/6;const b=block(m,x+Math.sin(a)*r,y+Math.cos(a)*r,z,r*.16,r*.3,.07,parent);b.rotation.z=-a;}for(let j=0;j<6;j++){const b=block(m,x,y,z,r*1.65,.025,.05,parent);b.rotation.z=j*Math.PI/3;}}
 function star(parent,m,x,y,z,r=.1){const points=[];for(let j=0;j<10;j++){const a=j*Math.PI/5+Math.PI/2,k=j%2?.43:1;points.push([Math.cos(a)*r*k,Math.sin(a)*r*k]);}return plate(points,.035,m,x,y,z,parent);}
 function flower(parent,x,y,z,r=.1){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ellipsoid(rose,x+Math.sin(a)*r*.65,y+Math.cos(a)*r*.65,z,r*.46,r*.46,.02,parent);}button(x,y,z+.025,glow,r*.28,parent);}
 function scroll(x,y,z){const n=node(x,y,z);block(ivory,0,0,0,.53,.88,.04,n);for(const yy of[-.46,.46]){const c=cylinder(wood,0,yy,0,.055,.65,n);c.rotation.z=Math.PI/2;for(const s of[-1,1])button(s*.34,yy,0,trim,.06,n);}for(let j=0;j<5;j++){const stroke=block(dark,Math.sin(j*3)*.09,.28-j*.13,.028,.16,.018,.015,n);stroke.rotation.z=Math.sin(j*5)*.65;}return n;}
 function label(text,w=.5,h=.12,x=0,y=1,z=.45,p=group,color='#fff1ce',background='#18303f'){
  const c=document.createElement('canvas');c.width=256;c.height=96;const cx=c.getContext('2d');cx.fillStyle=background;cx.fillRect(0,0,256,96);cx.fillStyle=color;cx.font='900 46px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,128,50,244);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.add(t);const m=new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.35,roughness:.65});materials.add(m);return mesh(own(new T.PlaneGeometry(w,h)),m,x,y,z,1,1,1,p);
 }
 // Every outfit is constructed independently rather than recolouring a shared armour.
 switch(spec.id){
 case 'abyssdiver': {
  garment();boots(dark);const copper=trim;
  ellipsoid(copper,0,1.48,-.04,.52,.42,.47);ring(copper,0,1.37,.43,.36);ring(dark,0,1.37,.46,.30);ring(glow,0,1.37,.475,.285);
  for(let j=0;j<10;j++){const a=j*Math.PI/5;button(Math.sin(a)*.36,1.37+Math.cos(a)*.36,.465,silver,.018);}
  cylinder(copper,0,1.78,-.03,.18,.09);for(const s of[-1,1]){cylinder(copper,s*.26,.98,-.5,.17,.86);ring(dark,s*.26,1.17,-.5,.18,Math.PI/2);ring(dark,s*.26,.77,-.5,.18,Math.PI/2);tube([[s*.42,1.47,0],[s*.67,1.26,-.05],[s*.56,.63,-.28],[s*.26,.60,-.49]],.045,dark);block(copper,s*.4,.74,.22,.13,.21,.1);}
  const dial=node(-.55,.96,.20);ring(copper,0,0,0,.13,0,0,dial);ellipsoid(ivory,0,0,0,.115,.115,.018,dial);const needle=block(dark,.025,.035,.025,.015,.09,.01,dial);animate(dial,(n,t)=>{needle.rotation.z=Math.sin(t)*.3;});
  label('DEEP',.24,.09,0,.73,.45);break;
 }
 case 'sakurakimono': {
  garment();const skirt=cylinder(fabric,0,.61,-.02,.53,.47,group,.40);const sash=mat(0xe6bf8d,.2,.55);cylinder(sash,0,.88,-.03,.50,.19);
  for(const s of[-1,1]){const sleeve=node(s*.48,1.06,0);plate([[-.2,.23],[.2,.23],[.25,-.42],[-.20,-.34]],.36,fabric,0,0,0,sleeve);plate([[-.16,.18],[.16,.18],[.19,-.34],[-.16,-.29]],.02,ivory,0,0,.2,sleeve);flower(sleeve,0,-.17,.22,.075);animate(sleeve,(n,t,m,j)=>n.rotation.z=s*(.06+Math.sin(t*1.8)*.035+(j?.12:0)));seam([[s*.03,1.5,.29],[s*.18,1.07,.41],[s*.35,.62,.40]],ivory);}
  block(sash,0,.88,-.48,.62,.27,.16);for(const s of[-1,1])plate([[0,0],[s*.3,.17],[s*.36,-.11]],.12,rose,s*.04,.90,-.55);
  const fan=node(.06,1.28,-.58);for(let j=0;j<9;j++){const a=(j-4)*.21;const p=plate([[-.06,0],[.06,0],[.14,.75],[-.14,.75]],.025,j%2?rose:fabric,0,0,0,fan);p.rotation.z=a;const b=block(sash,Math.sin(-a)*.38,Math.cos(a)*.38,.02,.015,.77,.015,fan);b.rotation.z=a;}animate(fan,(n,t)=>n.rotation.y=Math.sin(t*.7)*.1);
  for(let j=0;j<6;j++)flower(group,Math.sin(j*2)*.29,.58+j*.13,.43,.045);flower(group,-.30,1.67,.13,.16);break;
 }
 case 'chronokeeper': {
  garment();lapels();boots(dark);for(const s of[-1,1]){const tail=node(s*.24,.72,-.3);plate([[-.18,.15],[.18,.15],[.20,-.44],[0,-.53],[-.20,-.44]],.06,fabric,0,0,0,tail);animate(tail,(n,t,m)=>n.rotation.x=(m?.17:.03)*Math.sin(t*3));}
  const clock=node(0,1.20,-.56);ring(trim,0,0,0,.49,0,0,clock);ellipsoid(dark,0,0,0,.45,.45,.06,clock);for(let j=0;j<12;j++){const a=j*Math.PI/6;const b=block(ivory,Math.sin(a)*.39,Math.cos(a)*.39,-.07,.014,.055,.015,clock);b.rotation.z=-a;}const hand=block(glow,0,.12,-.09,.025,.27,.02,clock);hand.userData.dynamic=true;animate(clock,(n,t)=>hand.rotation.z=t*.18);
  for(const [s,y,r]of[[-1,1.60,.24],[1,.88,.22]]){const g=node(s*.45,y,-.52);gear(g,0,0,0,r);animate(g,(n,t)=>n.rotation.z=t*s*.4);}
  tube([[-.20,1.02,.45],[-.1,.74,.50],[.2,.80,.47]],.014,trim);ring(trim,.24,1.48,.30,.13);block(trim,0,1.71,-.02,.58,.08,.5);label('XII',.20,.08,0,.77,.45);break;
 }
 case 'starchef': {
  garment(ivory);boots(dark);block(fabric,0,.74,.43,.52,.55,.08);for(const s of[-1,1])for(let j=0;j<3;j++)button(s*.13,.78+j*.12,.49,dark,.022);
  cylinder(ivory,0,1.78,-.02,.32,.30);for(let j=0;j<5;j++)ellipsoid(ivory,Math.sin(j*2.4)*.20,1.99+(j===0?.08:0),Math.cos(j*2.4)*.14,.22,.21,.22);ring(rose,0,1.66,0,.35,Math.PI/2);
  const pan=node(.62,.83,.09);cylinder(dark,0,0,0,.30,.07,pan);ring(silver,0,.04,0,.29,Math.PI/2,0,pan);block(wood,0,0,-.37,.09,.08,.43,pan);ellipsoid(ivory,0,.06,0,.18,.025,.16,pan);ellipsoid(glow,.01,.08,0,.07,.04,.07,pan);animate(pan,(n,t,m,j)=>{n.rotation.z=Math.sin(t*2)*.1+(j?.3:0);});
  const spoon=node(-.60,.96,.10);cylinder(wood,0,.15,0,.025,.69,spoon);ellipsoid(trim,0,.52,0,.10,.16,.035,spoon);spoon.rotation.z=.25;animate(spoon,(n,t)=>n.rotation.z=.25+Math.sin(t*1.5)*.06);
  for(const s of[-1,1])tube([[s*.30,1.36,-.12],[s*.32,.94,-.43],[s*.20,.62,-.46]],.025,rose);label('CHEF',.28,.09,0,.55,.48);break;
 }
 case 'piratecaptain': {
  garment();lapels();boots(dark);for(const s of[-1,1]){block(trim,s*.47,1.28,.02,.24,.10,.36);for(let j=0;j<5;j++)cylinder(trim,s*(.39+j*.035),1.21,.10,.012,.12);}
  const hat=node(0,1.70,-.08);plate([[-.66,0],[-.55,.28],[-.24,.18],[0,.4],[.24,.18],[.55,.28],[.66,0],[0,-.08]],.35,dark,0,0,0,hat);seam([[-.59,.07,.19],[-.5,.21,.19],[0,.32,.19],[.5,.21,.19],[.59,.07,.19]],trim,hat);ellipsoid(ivory,0,.15,.20,.075,.07,.025,hat);for(const s of[-1,1])block(ivory,s*.04,.08,.2,.016,.08,.02,hat).rotation.z=s*.7;
  const wheel=node(0,1.03,-.57);ring(wood,0,0,0,.43,0,0,wheel);ring(trim,0,0,0,.39,0,0,wheel);for(let j=0;j<8;j++){const b=block(wood,0,0,0,.025,1.04,.045,wheel);b.rotation.z=j*Math.PI/4;}animate(wheel,(n,t)=>n.rotation.z=Math.sin(t*.6)*.13);
  const coat=node(0,.79,-.36);plate([[-.4,.32],[.4,.32],[.49,-.4],[0,-.27],[-.49,-.4]],.045,fabric,0,0,0,coat);animate(coat,(n,t,m)=>n.rotation.x=Math.sin(t*2)*(m?.11:.04));break;
 }
 case 'streetdj': {
  garment();boots(ivory);for(const s of[-1,1]){block(rose,s*.22,.83,.42,.22,.34,.05);block(trim,s*.47,1.48,0,.13,.33,.23);ring(dark,s*.53,1.49,0,.12,0,Math.PI/2);ring(glow,s*.54,1.49,0,.08,0,Math.PI/2);}
  const band=tube([[-.48,1.5,0],[-.38,1.82,0],[0,1.94,0],[.38,1.82,0],[.48,1.5,0]],.055,dark);
  const boom=node(0,1.08,-.55);block(dark,0,0,0,1.10,.63,.27,boom);block(trim,0,0,-.15,1.03,.56,.03,boom);for(const s of[-1,1]){ellipsoid(dark,s*.33,0,-.18,.21,.21,.025,boom);ring(glow,s*.33,0,-.21,.17,0,0,boom);ellipsoid(silver,s*.33,0,-.23,.07,.07,.025,boom);}block(fabric,0,.37,0,.40,.07,.10,boom);for(const s of[-1,1])block(fabric,s*.20,.31,0,.07,.15,.1,boom);
  const bars=[];for(let j=0;j<7;j++){const bar=block(j%2?glow:rose,-.15+j*.05,.05,-.21,.027,.16,.02,boom);bar.userData.dynamic=true;bars.push(bar);}animate(boom,(n,t)=>{for(let j=0;j<bars.length;j++)bars[j].scale.y=.05+.17*(.5+.5*Math.sin(t*6+j));});
  label('BEAT',.32,.1,0,.75,.48);for(let j=0;j<3;j++)ring(glow,0,.44-j*.08,-.06,.49,Math.PI/2);break;
 }
 case 'honeykeeper': {
  garment();boots(trim);for(let j=0;j<3;j++){const b=ring(trim,0,.64+j*.21,-.02,.46,Math.PI/2);b.scale.set(.46,.46,.15);}
  for(const s of[-1,1]){tube([[s*.15,1.55,-.04],[s*.29,1.83,-.02],[s*.38,1.87,0]],.024,trim);ellipsoid(glow,s*.38,1.87,0,.07,.07,.07);const wing=node(s*.29,1.18,-.39);ellipsoid(ivory,s*.22,.12,-.08,.24,.37,.045,wing).rotation.z=-s*.4;seam([[0,0,-.13],[s*.25,.35,-.13],[s*.37,.18,-.13]],trim,wing);animate(wing,(n,t,m)=>n.rotation.y=s*(.2+Math.sin(t*(m?13:5))*.13));}
  cylinder(wood,0,.91,-.57,.26,.63);ring(trim,0,1.18,-.57,.28,Math.PI/2);ring(trim,0,.64,-.57,.28,Math.PI/2);label('HONEY',.35,.13,0,.90,-.84).rotation.y=Math.PI;for(let j=0;j<3;j++)flower(group,-.35+j*.35,1.61,-.15,.08);break;
 }
 case 'mushroomoracle': {
  garment();boots(wood);const cap=node(0,1.69,-.03);const dome=geometry('mushroom-cap',()=>new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2));mesh(dome,fabric,0,0,0,.80,.40,.72,cap);cylinder(ivory,0,-.015,0,.74,.055,cap,.78);for(let j=0;j<18;j++){const a=j*2.39996,r=.3+(j%3)*.15;ellipsoid(glow,Math.cos(a)*r,.37*Math.sqrt(1-r*r/.64)+.015,Math.sin(a)*r,.035+(j%3)*.016,.014,.035,cap);}for(let j=0;j<20;j++){const a=j*Math.PI/10;seam([[Math.sin(a)*.19,-.05,Math.cos(a)*.19],[Math.sin(a)*.7,-.05,Math.cos(a)*.7]],trim,cap);}animate(cap,(n,t,m)=>n.rotation.z=Math.sin(t*1.2)*(m?.035:.016));
  const cape=node(0,1.03,-.35);plate([[-.35,.28],[.35,.28],[.58,-.51],[.3,-.42],[0,-.57],[-.3,-.42],[-.58,-.51]],.06,ivory,0,0,0,cape);animate(cape,(n,t,m)=>n.rotation.x=Math.sin(t*1.7)*(m?.09:.035));for(let j=0;j<4;j++){cylinder(wood,-.28+j*.18,.56,-.50,.04,.24);ellipsoid(glow,-.28+j*.18,.70,-.50,.12,.07,.11);}break;
 }
 case 'jellyveil': {
  garment();fabric.metalness=.55;fabric.roughness=.23;const pearl=mat(0xb5d8e4,.35,.24);
  const dome=geometry('jelly-dome',()=>new T.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2));mesh(dome,pearl,0,1.68,-.05,.68,.44,.62);ring(glow,0,1.68,-.05,.63,Math.PI/2);for(let j=0;j<10;j++){const a=j*Math.PI/5;ellipsoid(glow,Math.sin(a)*.60,1.65,Math.cos(a)*.57-.05,.035,.04,.035);}
  for(let j=0;j<8;j++){const a=j*Math.PI/4;const n=node(Math.sin(a)*.52,1.65,-.12-Math.abs(Math.cos(a))*.3);const pts=[];for(let k=0;k<7;k++)pts.push([Math.sin(k*1.8+j)*.045,-k*.19,Math.cos(k*1.2+j)*.055]);tube(pts,.025,j%2?glow:pearl,n);animate(n,(o,t,m)=>{o.rotation.z=Math.sin(t*1.6+j)*.07;o.rotation.x=Math.cos(t*1.2+j)*.08+(m?.1:0);});}
  const pearlOrb=node(0,.8,-.6);ellipsoid(pearl,0,0,0,.21,.25,.18,pearlOrb);ring(glow,0,0,0,.25,Math.PI/2,0,pearlOrb);animate(pearlOrb,(n,t)=>n.position.y=.85+Math.sin(t)*.08);break;
 }
 case 'origamitsuru': {
  garment();lapels();boots(trim);for(const s of[-1,1]){plate([[0,.2],[s*.44,.05],[s*.32,-.42],[0,-.2]],.05,ivory,s*.2,.81,.3);seam([[s*.08,1.50,.25],[s*.23,1.10,.41],[s*.38,.65,.38]],trim);}
  function crane(p,size){const n=new T.Group();p.add(n);plate([[-.12,0],[0,.2],[.14,0],[0,-.1]],.05,ivory,0,0,0,n);for(const s of[-1,1]){const w=plate([[0,0],[s*.79,.48],[s*.49,-.07]],.025,ivory,s*.05,.07,0,n);w.rotation.y=s*.24;seam([[s*.05,.08,.025],[s*.66,.40,.025],[s*.35,.07,.025]],trim,n);}plate([[0,0],[.05,.34],[.2,.29],[.06,.40],[-.05,.12]],.035,rose,0,.12,.02,n);n.scale.setScalar(size);return n;}
  const bird=node(0,1.30,-.56);crane(bird,1);animate(bird,(n,t,m)=>{n.rotation.y=Math.sin(t*.8)*.12;n.rotation.z=Math.sin(t*1.6)*.05;});
  const little=node(.64,1.70,0);crane(little,.25);animate(little,(n,t)=>{n.position.set(Math.cos(t*.6)*.69,1.6+Math.sin(t*1.4)*.09,Math.sin(t*.6)*.65);n.rotation.y=-t*.6;});break;
 }
 case 'patisserie': {
  garment();boots(ivory);cylinder(ivory,0,.69,0,.51,.23,group,.44);for(let j=0;j<10;j++){const a=j*Math.PI/5;ellipsoid(rose,Math.sin(a)*.48,.75,Math.cos(a)*.45,.08,.10,.07);}block(ivory,0,.95,.43,.40,.35,.06);label('SUCRÉ',.30,.10,0,.96,.47,group);
  ellipsoid(rose,0,1.73,-.04,.44,.16,.38);for(let j=0;j<5;j++){const a=j*2.4;ellipsoid(ivory,Math.sin(a)*.14,1.88,Math.cos(a)*.12,.13,.14,.12);}ellipsoid(rose,.08,2.01,.03,.09,.12,.08);cone(trim,.08,2.14,.03,.07,.09);
  const cake=node(0,1.03,-.57);for(let j=0;j<3;j++){cylinder(j%2?ivory:fabric,0,-.23+j*.18,0,.35-j*.04,.15,cake);ring(rose,0,-.14+j*.18,0,.34-j*.04,Math.PI/2,0,cake);}animate(cake,(n,t)=>n.rotation.y=t*.12);
  for(const [s,y]of[[-1,1.2],[1,.75]]){const mac=node(s*.62,y,0);for(const z of[-.035,.035])ellipsoid(rose,0,0,z,.16,.16,.065,mac);ring(ivory,0,0,0,.14,0,0,mac);animate(mac,(n,t)=>{n.position.y=y+Math.sin(t*1.3+s)*.05;n.rotation.y=t*.2;});}break;
 }
 case 'scarabpharaoh': {
  garment();boots(trim);cylinder(ivory,0,.57,0,.51,.32,group,.41);for(let j=0;j<7;j++){const x=(j-3)*.12;block(trim,x,.61,.43,.035,.23,.035);}
  for(const s of[-1,1]){plate([[-.13,.30],[.13,.30],[.22,-.34],[-.16,-.4]],.25,fabric,s*.40,1.47,-.08);for(let j=0;j<6;j++)block(trim,s*.42,1.2+j*.10,.07,.25,.035,.02);}
  ring(trim,0,1.59,0,.41,Math.PI/2);for(let j=0;j<5;j++)tube([[-.30,1.05-j*.025,.32],[0,.91-j*.04,.48],[.30,1.05-j*.025,.32]],.02,trim);
  const scarab=node(0,1.12,-.58);ellipsoid(trim,0,0,0,.35,.42,.10,scarab);ellipsoid(fabric,0,.04,-.10,.25,.31,.09,scarab);block(trim,0,0,-.20,.018,.57,.015,scarab);for(const s of[-1,1]){for(let j=0;j<3;j++)tube([[s*.2,.15-j*.13,0],[s*.46,.21-j*.16,0],[s*.53,.12-j*.15,0]],.022,trim,scarab);}const sun=ring(glow,0,.51,-.04,.18,0,0,scarab);sun.userData.dynamic=true;animate(scarab,(n,t)=>sun.rotation.z=t*.25);break;
 }
 case 'rainwalker': {
  garment();fabric.roughness=.25;boots(trim);cylinder(fabric,0,.62,0,.53,.40,group,.44);ellipsoid(fabric,0,1.53,-.05,.47,.36,.46);ring(trim,0,1.37,.35,.32);for(let j=0;j<5;j++)button(0,.65+j*.12,.47,ivory,.019);
  for(const s of[-1,1]){block(fabric,s*.25,.78,.45,.17,.16,.045);block(ivory,s*.25,.86,.47,.20,.035,.025);tube([[s*.12,1.48,.35],[s*.15,1.20,.47]],.012,trim);}
  const umbrella=node(0,1.02,-.55);cylinder(wood,0,.20,0,.022,1.5,umbrella);const canopy=geometry('folded-umbrella',()=>new T.ConeGeometry(.19,1.10,8));mesh(canopy,trim,0,.32,0,1,1,1,umbrella);for(let j=0;j<8;j++){const a=j*Math.PI/4;tube([[0,.86,0],[Math.sin(a)*.18,-.20,Math.cos(a)*.18]],.009,fabric,umbrella);}umbrella.rotation.z=-.25;animate(umbrella,(n,t,m)=>n.rotation.z=-.25+Math.sin(t*2)*(m?.04:.01));break;
 }
 case 'railconductor': {
  garment();lapels();boots(dark);cylinder(fabric,0,1.76,-.01,.41,.19,group,.36);cylinder(trim,0,1.67,-.01,.42,.04);ellipsoid(dark,0,1.64,.27,.40,.055,.30);plate([[-.07,0],[.07,0],[.1,.08],[0,.13],[-.1,.08]],.025,trim,0,1.76,.37);
  const train=node(0,.99,-.56);block(fabric,0,0,0,.68,.67,.40,train);block(trim,0,.38,0,.76,.07,.49,train);for(const s of[-1,1]){block(ivory,s*.18,.12,-.22,.20,.23,.025,train);ellipsoid(dark,s*.25,-.35,-.14,.12,.12,.06,train);button(s*.25,-.35,-.21,trim,.045,train);}cylinder(dark,0,.51,0,.09,.22,train);ring(trim,0,.61,0,.10,Math.PI/2,0,train);label('EXPRESS',.55,.1,0,-.14,-.23,train).rotation.y=Math.PI;
  const lantern=node(.60,.79,.13);cylinder(trim,0,0,0,.13,.30,lantern);ellipsoid(glow,0,0,0,.10,.13,.10,lantern);for(const s of[-1,1])block(dark,s*.1,0,0,.02,.28,.02,lantern);ring(trim,0,.23,0,.11,0,0,lantern);animate(lantern,(n,t,m)=>n.rotation.z=Math.sin(t*(m?4:1.5))*(m?.13:.04));break;
 }
 case 'inkmonk': {
  garment();boots(trim);for(const s of[-1,1]){plate([[0,.2],[s*.43,.06],[s*.38,-.42],[0,-.32]],.24,ivory,s*.30,1.02,0);seam([[s*.03,1.5,.28],[s*.20,1.05,.40],[s*.29,.64,.40]],dark);}cylinder(dark,0,.85,0,.50,.14);cylinder(ivory,0,.53,0,.51,.37,group,.40);
  const paper=scroll(0,1.13,-.59);paper.rotation.y=Math.PI;animate(paper,(n,t,m)=>n.rotation.x=Math.sin(t*1.7)*(m?.07:.02));
  const brush=node(.58,1.0,.07);cylinder(wood,0,.24,0,.045,.91,brush);cylinder(trim,0,-.25,0,.065,.10,brush);cone(dark,0,-.45,0,.07,.30,brush).rotation.z=Math.PI;brush.rotation.z=-.28;animate(brush,(n,t)=>n.rotation.z=-.28+Math.sin(t*1.3)*.06);
  const knot=node(-.2,1.71,-.01);ellipsoid(dark,0,0,0,.18,.12,.16,knot);block(trim,0,0,.1,.37,.035,.035,knot);break;
 }
 case 'carnivaljoker': {
  garment();boots(trim);plate([[0,.35],[.28,.30],[.40,-.40],[0,-.3]],.08,rose,.04,.87,.39);for(const s of[-1,1]){const n=node(s*.23,1.62,0);tube([[0,0,0],[s*.17,.44,-.04],[s*.34,.42,0],[s*.38,.20,.03]],.105,s<0?fabric:trim,n);ellipsoid(glow,s*.38,.17,.03,.06,.06,.06,n);animate(n,(o,t)=>o.rotation.z=Math.sin(t*1.8+s)*.07);}for(let j=0;j<8;j++){const a=j*Math.PI/4;const p=plate([[-.07,0],[.07,0],[0,-.23]],.04,j%2?trim:rose,Math.sin(a)*.40,1.43,Math.cos(a)*.30);p.rotation.y=a;}
  for(let j=0;j<3;j++){const n=node(0,0,0);ellipsoid(j%2?rose:glow,0,0,0,.10,.10,.10,n);animate(n,(o,t)=>{const a=t*1.5+j*Math.PI*2/3;o.position.set(Math.sin(a)*.75,1.15+Math.cos(a)*.4,Math.cos(a)*.32);});}
  const cards=node(0,1.15,-.58);for(let j=0;j<5;j++){const p=block(ivory,0,0,0,.30,.44,.035,cards);p.rotation.z=(j-2)*.24;p.position.x=(j-2)*.09;star(cards,rose,(j-2)*.12,.03,-.03,.06);}animate(cards,(n,t)=>n.rotation.y=Math.sin(t)*.1);break;
 }
 case 'rescueworker': {
  garment();boots(dark);for(const s of[-1,1]){block(trim,s*.50,1.17,-.03,.20,.54,.30);cylinder(silver,s*.52,1.20,-.03,.055,.35);block(fabric,s*.5,1.44,-.04,.31,.14,.40);block(ivory,s*.26,.73,.43,.29,.08,.035);for(let j=0;j<4;j++)block(dark,s*.27+Math.sin(j)*.02,.74,.453,.025,.09,.01).rotation.z=-.5;}
  const frame=node(0,1.02,-.58);block(trim,0,0,0,.69,.88,.24,frame);block(fabric,0,.02,-.16,.52,.64,.08,frame);for(let j=0;j<6;j++)block(dark,0,-.2+j*.075,-.21,.37,.025,.02,frame);for(const s of[-1,1]){const arm=node(s*.53,1.21,-.42);block(trim,s*.12,.1,0,.35,.12,.12,arm);ellipsoid(silver,s*.30,.09,0,.11,.11,.11,arm);block(fabric,s*.34,-.10,0,.13,.39,.17,arm);for(const k of[-1,1])block(silver,s*.34+k*.065,-.34,0,.04,.17,.07,arm);animate(arm,(n,t,m)=>n.rotation.z=s*(.13+Math.sin(t*1.6)*.05+(m?.08:0)));}
  const beacon=node(0,1.79,-.04);cylinder(trim,0,-.04,0,.22,.09,beacon);ellipsoid(glow,0,.08,0,.16,.17,.16,beacon);const beam=block(ivory,0,.08,0,.32,.03,.04,beacon);beam.userData.dynamic=true;animate(beacon,(n,t)=>beam.rotation.y=t*2);label('RESCUE',.32,.08,0,.97,.47);break;
 }
 case 'cactusmariachi': {
  garment();for(let j=0;j<12;j++){const a=j*Math.PI/6;tube([[Math.sin(a)*.40,.55,Math.cos(a)*.40],[Math.sin(a)*.48,.94,Math.cos(a)*.44],[Math.sin(a)*.39,1.41,Math.cos(a)*.38]],.012,trim);}for(const s of[-1,1]){tube([[s*.4,.80,0],[s*.70,.88,0],[s*.71,1.15,0]],.095,fabric);for(let j=0;j<3;j++)cone(ivory,s*.49,.76+j*.19,.05,.02,.08).rotation.z=-s*Math.PI/2;}
  cylinder(trim,0,1.66,-.02,.70,.06);cone(wood,0,1.84,-.02,.30,.42);for(let j=0;j<16;j++){const a=j*Math.PI/8;button(Math.sin(a)*.65,1.70,Math.cos(a)*.65,rose,.024);}flower(group,.20,1.96,.05,.09);
  const guitar=node(0,.99,-.59);ellipsoid(wood,0,-.17,0,.28,.31,.08,guitar);ellipsoid(wood,0,.10,0,.22,.23,.07,guitar);ellipsoid(dark,0,.08,-.08,.095,.095,.018,guitar);block(trim,0,.48,0,.08,.70,.06,guitar);block(wood,0,.84,0,.15,.17,.08,guitar);for(let j=0;j<4;j++)seam([[-.03+j*.02,-.27,-.10],[-.03+j*.02,.83,-.10]],ivory,guitar);guitar.rotation.z=-.25;animate(guitar,(n,t)=>n.rotation.z=-.25+Math.sin(t*2.3)*.03);break;
 }
 case 'bathduck': {
  garment();fabric.roughness=.95;boots(ivory);for(const s of[-1,1]){plate([[0,.22],[s*.27,.06],[s*.17,-.28]],.04,ivory,s*.09,1.00,.42);block(ivory,s*.27,.76,.43,.18,.17,.05);}cylinder(ivory,0,.85,0,.50,.08);
  const tub=node(0,.50,-.04);cylinder(wood,0,0,0,.57,.23,tub,.60);for(const y of[-.10,.10])ring(silver,0,y,0,.58,Math.PI/2,0,tub);for(let j=0;j<16;j++){const a=j*Math.PI/8;seam([[Math.sin(a)*.57,-.1,Math.cos(a)*.57],[Math.sin(a)*.60,.1,Math.cos(a)*.60]],trim,tub);}animate(tub,(n,t,m)=>n.rotation.z=Math.sin(t*2)*(m?.035:.01));
  function duck(n,s){ellipsoid(trim,0,0,0,.23*s,.17*s,.26*s,n);ellipsoid(trim,0,.22*s,.12*s,.14*s,.15*s,.14*s,n);ellipsoid(rose,0,.20*s,.26*s,.10*s,.04*s,.10*s,n);for(const side of[-1,1])ellipsoid(dark,side*.09*s,.26*s,.21*s,.018*s,.018*s,.018*s,n);}
  const head=node(0,1.74,-.02);duck(head,.9);animate(head,(n,t)=>n.rotation.y=Math.sin(t)*.12);const towel=node(0,1.54,-.48);block(ivory,0,0,0,.43,.13,.20,towel);for(let j=0;j<4;j++)block(trim,-.16+j*.10,.07,0,.025,.015,.18,towel);break;
 }
 case 'retroarcade': {
  block(fabric,0,.96,-.03,.99,1.13,.87);for(const s of[-1,1]){plate([[-.14,-.53],[.14,-.53],[.17,.29],[.02,.56],[-.14,.45]],.05,trim,s*.5,.98,-.08).rotation.y=Math.PI/2;block(glow,s*.47,1.14,.43,.025,.86,.025);}
  block(dark,0,1.20,.42,.82,.52,.055);for(const y of[.94,1.46])block(trim,0,y,.46,.84,.045,.05);block(fabric,0,1.62,.22,.95,.20,.50);label('1UP',.60,.15,0,1.62,.48,group,'#ffe7a5','#27204a');
  const controls=block(trim,0,.89,.53,.94,.07,.28);controls.rotation.x=-.12;cylinder(dark,-.23,.99,.55,.035,.17);ellipsoid(rose,-.23,1.09,.55,.075,.075,.075);for(let j=0;j<3;j++)cylinder(j%2?glow:rose,.09+j*.10,.96,.56,.035,.035);
  block(dark,0,.60,.43,.56,.27,.05);label('INSERT',.36,.07,0,.63,.47);block(silver,0,.55,.47,.16,.025,.03);for(let j=0;j<6;j++)block(trim,-.27+j*.10,.46,.47,.04,.025,.015);
  const marquee=node(0,1.78,.1);const pixels=[];for(let j=0;j<7;j++)pixels.push(block(glow,-.3+j*.10,0,0,.045,.045,.045,marquee));pixels.forEach(p=>p.userData.dynamic=true);animate(marquee,(n,t)=>pixels.forEach((p,j)=>p.visible=(Math.floor(t*5)+j)%4!==0));boots(dark);break;
 }
 }

 // Small, themed particles: a single draw call for ambient detail and one for trails.
 const sprite=document.createElement('canvas');sprite.width=sprite.height=64;const c=sprite.getContext('2d');c.translate(32,32);c.strokeStyle=c.fillStyle='#fff';c.lineWidth=3;c.lineCap='round';
 const effect=spec.effect;
 if(['bubble','foam','tide','rain'].includes(effect)){c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.stroke();c.beginPath();c.arc(-5,-5,13,Math.PI,Math.PI*1.5);c.stroke();}
 else if(['petal','pollen','spore'].includes(effect)){c.beginPath();c.moveTo(0,-25);c.bezierCurveTo(28,-17,25,17,0,25);c.bezierCurveTo(-25,17,-20,-12,0,-25);c.fill();}
 else if(['ticket','paper','cards'].includes(effect)){c.strokeRect(-17,-23,34,46);if(effect==='cards'){c.beginPath();c.moveTo(0,-12);c.lineTo(8,0);c.lineTo(0,12);c.lineTo(-8,0);c.closePath();c.fill();}else{for(let j=0;j<3;j++)c.fillRect(-10,-9+j*9,20,3);}}
 else if(['pixel','beat'].includes(effect)){for(const [x,y]of[[-2,-1],[0,-1],[1,0],[-3,0],[-3,1],[1,1],[-2,2],[0,2],[-1,3]])c.fillRect(x*8+8,y*8-8,7,7);}
 else if(effect==='gear'){c.beginPath();c.arc(0,0,17,0,Math.PI*2);c.stroke();for(let j=0;j<8;j++){c.rotate(Math.PI/4);c.fillRect(-3,-25,6,10);}}
 else if(effect==='ink'){c.beginPath();c.moveTo(-18,18);c.bezierCurveTo(15,20,-18,-15,19,-23);c.lineWidth=10;c.stroke();}
 else if(effect==='honey'){c.beginPath();for(let j=0;j<6;j++){const a=j*Math.PI/3;c.lineTo(Math.cos(a)*23,Math.sin(a)*23);}c.closePath();c.stroke();}
 else {c.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2?7:26;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();}
 const texture=new T.CanvasTexture(sprite);textures.add(texture);const count=mobile?16:28,positions=new Float32Array(count*3),pg=own(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 const pm=new T.PointsMaterial({map:texture,color:spec.accent,size:['steam','foam'].includes(effect)?.14:.095,transparent:true,opacity:.72,depthWrite:false,blending:effect==='ink'?T.NormalBlending:T.AdditiveBlending});materials.add(pm);const particles=new T.Points(pg,pm);group.add(particles);particles.frustumCulled=false;
 const tn=mobile?10:16,trailPositions=new Float32Array(tn*3),tg=own(new T.BufferGeometry());tg.setAttribute('position',new T.BufferAttribute(trailPositions,3).setUsage(T.DynamicDrawUsage));const tm=pm.clone();tm.size=.13;materials.add(tm);const trails=new T.Points(tg,tm);trails.frustumCulled=false;group.add(trails);const slots=Array.from({length:tn},()=>({x:0,y:0,z:0,until:-1}));
 const pulseMat=new T.MeshBasicMaterial({color:spec.accent,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});materials.add(pulseMat);const pulse=ring(pulseMat,0,.055,0,.61,Math.PI/2);pulse.userData.dynamic=true;
 // Merge static sculpt detail by material per moving assembly.
 for(const parent of assemblies){const buckets=new Map();for(const o of[...parent.children]){if(!o.isMesh||o.userData.dynamic)continue;o.updateMatrix();if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);}
  for(const [m,objects]of buckets){if(objects.length<2)continue;const values={position:[],normal:[],uv:[]};for(const o of objects){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);for(const name of Object.keys(values)){const a=g.getAttribute(name);if(a)for(const n of a.array)values[name].push(n);else for(let j=0;j<g.getAttribute('position').count*(name==='uv'?2:3);j++)values[name].push(0);}g.dispose();parent.remove(o);}const g=own(new T.BufferGeometry());for(const name of Object.keys(values))g.setAttribute(name,new T.Float32BufferAttribute(values[name],name==='uv'?2:3));g.computeBoundingSphere();mesh(g,m,0,0,0,1,1,1,parent);}
 }
 const world=new T.Vector3(),local=new T.Vector3(),inverse=new T.Matrix4();
 function update(seconds,{moving=false,jumping=false}={}){
  if(disposed)return;const t=Number(seconds)||0;if(t===previous)return;previous=t;
  glow.emissiveIntensity=1.08+.20*Math.sin(t*2);for(const {node:n,fn}of motions)fn(n,t,moving,jumping);
  for(let j=0;j<count;j++){const a=j*2.39996+t*.27,r=.53+(j%4)*.1,k=j*3;let y=(j/count*2.25+t*.26)%2.25;let x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(['rain','sand','petal','paper','cards','ticket'].includes(effect)){y=2.3-(j/count*2.3+t*(effect==='rain'?.9:.28))%2.3;x+=Math.sin(t*1.3+j)*.12;}
   if(['foam','bubble','steam','spore'].includes(effect)){x=Math.sin(a+t*.1)*r;y=(j/count*2.1+t*.38)%2.1;z=Math.cos(a)*r;}
   if(effect==='beat'||effect==='pixel'){x=Math.round(x*12)/12;y=Math.round(y*12)/12;z=Math.round(z*12)/12;}
   if(effect==='ink'){y=.65+Math.sin(a*.7)*.48;z=Math.cos(a)*.62;x=Math.sin(a)*.68;}
   positions[k]=x;positions[k+1]=y;positions[k+2]=z;
  }pg.attributes.position.needsUpdate=true;
  if(jumping&&!wasJumping)jumpAt=t;wasJumping=jumping;const elapsed=t-jumpAt;pulse.visible=elapsed>=0&&elapsed<.6;if(pulse.visible){pulse.scale.setScalar(.61+elapsed*1.15);pulseMat.opacity=(1-elapsed/.6)*.42;}
  group.updateWorldMatrix(true,false);group.getWorldPosition(world);inverse.copy(group.matrixWorld).invert();if((moving&&t-trailAt>.085)||(jumping&&elapsed<.08)){trailAt=t;const s=slots[trailCursor++%tn];s.x=world.x;s.y=world.y+.07;s.z=world.z;s.until=t+.7;}
  for(let j=0;j<tn;j++){const s=slots[j],k=j*3;if(s.until>t){local.set(s.x,s.y,s.z).applyMatrix4(inverse);trailPositions[k]=local.x;trailPositions[k+1]=local.y;trailPositions[k+2]=local.z;}else{trailPositions[k]=0;trailPositions[k+1]=-999;trailPositions[k+2]=0;}}tg.attributes.position.needsUpdate=true;
 }
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
 update(0);return{group,update,dispose,spec};
}
