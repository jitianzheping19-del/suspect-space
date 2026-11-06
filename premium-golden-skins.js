// Authored golden silhouettes. Equipment only; no lights, physics or extra loops.
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
 {id:'astralmonarch',name:'星滅皇帝・アストラル',color:0x241d36,accent:0xffb7e9,trim:0xe1b75f,glyph:'♛'},
 {id:'apocalypseking',name:'終焉魔王・アポカリプス',color:0x291423,accent:0xff4261,trim:0xd6ac55,glyph:'♛',theme:'flame'},
 {id:'fallenlucifer',name:'堕天断罪・ルシフェル',color:0x242239,accent:0xd9abff,trim:0xf0cd82,glyph:'✧',theme:'angel'},
 {id:'sealedoddeye',name:'封印魔眼・オッドアイ',color:0x17283b,accent:0x59f4ed,trim:0xc8ac69,glyph:'◉',theme:'void'},
 {id:'forbiddengrimoire',name:'禁書魔導・グリモワール',color:0x352044,accent:0xd37dff,trim:0xe0bd70,glyph:'✦',theme:'stars'},
 {id:'netheranubis',name:'冥府審判・アヌビス',color:0x142c32,accent:0x6cffe4,trim:0xe9bc58,glyph:'⚖',theme:'sun'},
 {id:'ragnarokblade',name:'天獄剣聖・ラグナロク',color:0x30334b,accent:0x8ccfff,trim:0xe6c483,glyph:'⚔',theme:'frost'},
 {id:'deusawakening',name:'機神覚醒・デウスゼロ',color:0x172836,accent:0x63ebff,trim:0xd8b96b,glyph:'ϟ',theme:'digital'},
 {id:'roserequiem',name:'黒薔薇葬・レクイエム',color:0x37172b,accent:0xff5da9,trim:0xdcb883,glyph:'❀',theme:'moon'},
 {id:'starouroboros',name:'星喰い蛇・ウロボロス',color:0x18362e,accent:0xb2ff70,trim:0xd9bf67,glyph:'∞',theme:'tide'},
 {id:'eternalnox',name:'永夜支配・ノクス',color:0x201e3b,accent:0xbda5ff,trim:0xdfc482,glyph:'☾',theme:'void'},
 {id:'auroraphoenix',name:'黄金鳳凰・オーレリア',color:0x6b3429,accent:0xffd27c,trim:0xf2c66c,glyph:'🔥',theme:'flame'},
 {id:'celestialkirin',name:'金雷麒麟・キンライ',color:0x28544c,accent:0x8affdc,trim:0xe5bf66,glyph:'ϟ',theme:'storm'},
 {id:'imperialpeacock',name:'金孔雀王・マユラ',color:0x183e55,accent:0x7de6ff,trim:0xe8c675,glyph:'❦',theme:'tide'},
 {id:'oathpaladin',name:'黄金聖盾・アイギス',color:0xe3dcc5,accent:0xb8eaff,trim:0xcda64d,glyph:'⚜',theme:'sun'},
 {id:'starwhalesovereign',name:'星海金鯨・ケートス',color:0x243a67,accent:0xa8cdff,trim:0xe7c982,glyph:'🐋',theme:'stars'},
 {id:'ninetailtenko',name:'金狐天舞・コハク',color:0x845126,accent:0xffbd92,trim:0xf3d28b,glyph:'🦊',theme:'moon'},
 {id:'auricalchemist',name:'黄金錬成・アルケミア',color:0x304644,accent:0xb7ffbe,trim:0xddbd6d,glyph:'⚗',theme:'clock'},
 {id:'saturnregent',name:'金環星王・サトゥルノ',color:0x342e58,accent:0xc1b7ff,trim:0xedcc80,glyph:'🪐',theme:'stars'},
 {id:'leonidasregalia',name:'金獅子王・レオニス',color:0x593127,accent:0xffe4a3,trim:0xe8b956,glyph:'🦁',theme:'sun'},
 {id:'prismmorpho',name:'金晶蝶姫・モルフォ',color:0x42366c,accent:0xe0aaff,trim:0xefcd87,glyph:'🦋',theme:'frost'}
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
 if(id==='apocalypseking'){
  mantle(1.35);crown(.42);
  for(const s of[-1,1]){
   rod([s*.25,1.65,0],[s*.58,1.96,-.05],.095,trim);rod([s*.58,1.96,-.05],[s*.46,2.28,.03],.06,trim,group,0);
   const wing=rig(s*.35,1.25,-.45);
   plate([[0,0],[s*.28,.80],[s*.94,.61],[s*1.0,.19],[s*.65,.34],[s*.47,-.23],[s*.20,.04]],shell,0,0,0,wing);
   for(let j=0;j<3;j++)rod([0,0,.06],[s*(.3+j*.27),.66-j*.13,.06],.025,glow,wing);
   motions.push(t=>wing.rotation.y=s*(.16+Math.sin(t*1.2)*.09));
  }
  const sword=rig(.87,.20,.12);blade(0,1.45,0,1.45,Math.PI,sword,dark);blade(0,1.42,.04,1.28,Math.PI,sword,glow);block(trim,0,1.47,0,.40,.065,.13,sword);rod([0,1.47,0],[0,1.78,0],.045,trim,sword);
 }
 if(id==='fallenlucifer'){
  mantle(.95);
  for(const s of[-1,1]){const wing=rig(s*.34,1.27,-.46);for(let j=0;j<4;j++){const a=-s*(.35+j*.30);blade(s*(.07+j*.12),j*.035,0,1.14-j*.12,a,wing,s<0?dark:trim);blade(s*(.07+j*.12),j*.035,.05,.94-j*.12,a,wing,glow);}motions.push(t=>wing.rotation.y=s*(.14+Math.sin(t*1.1)*.09));}
  const halo=rig(0,2.08,-.05);ring(trim,0,0,0,.43,halo,Math.PI*1.52);ring(glow,0,0,.025,.35,halo,Math.PI*1.52);halo.rotation.x=-.65;motions.push(t=>halo.rotation.z=.38+Math.sin(t*.7)*.18);
 }
 if(id==='sealedoddeye'){
  mantle(1.12);
  plate([[-.45,-.08],[-.46,.19],[0,.53],[.46,.19],[.45,-.08],[.29,.16],[0,.32],[-.29,.16]],dark,0,1.47,-.04,group,.25);
  // A small sealed lens leaves the rest of the player's visor visible.
  block(dark,-.19,1.23,.55,.24,.17,.035,group,.18);rod([-.28,1.17,.58],[-.10,1.29,.58],.012,trim);
  const eye=rig(.89,1.42,.02);plate([[-.34,0],[-.16,.19],[.16,.19],[.34,0],[.16,-.19],[-.16,-.19]],trim,0,0,0,eye);mesh(ball,dark,0,0,.04,.25,.14,.035,eye);mesh(gem,glow,0,0,.09,.045,.13,.025,eye);
  ring(glow,0,0,-.03,.40,eye);for(let j=0;j<6;j++){const a=j*Math.PI/3;block(trim,Math.sin(a)*.42,Math.cos(a)*.42,0,.045,.11,.03,eye,-a);}motions.push(t=>{eye.position.y=1.42+Math.sin(t*1.4)*.07;eye.rotation.z=Math.sin(t*.8)*.08;});
 }
 if(id==='forbiddengrimoire'){
  mantle(1.3);const hat=mesh(cone,shell,0,1.99,-.05,.38,.72,.34);hat.rotation.z=-.18;ring(trim,0,1.66,-.04,.47).rotation.x=Math.PI/2;
  const book=rig(-.91,1.02,.25);book.rotation.y=.20;
  for(const s of[-1,1]){block(trim,s*.18,0,0,.34,.48,.10,book,-s*.10);block(dark,s*.18,0,.06,.28,.40,.04,book,-s*.10);for(let j=0;j<4;j++)block(glow,s*.18,.13-j*.08,.09,j%2?.17:.22,.014,.012,book,-s*.10);}
  rod([0,-.25,0],[0,.25,0],.03,trim,book);motions.push(t=>{book.position.y=1.02+Math.sin(t*1.4)*.09;book.rotation.z=Math.sin(t)*.05;});
  const seal=rig(.83,1.59,-.05);ring(trim,0,0,0,.38,seal);for(let j=0;j<3;j++){const a=j*Math.PI*2/3,b=a+Math.PI*2/3;rod([Math.sin(a)*.32,Math.cos(a)*.32,.03],[Math.sin(b)*.32,Math.cos(b)*.32,.03],.016,glow,seal);}motions.push(t=>seal.rotation.z=-t*.18);
 }
 if(id==='netheranubis'){
  for(const s of[-1,1]){plate([[-.13,0],[.14,0],[s*.08,.67]],shell,s*.25,1.59,-.04,group,.23,-s*.12);plate([[-.055,0],[.055,0],[s*.05,.46]],trim,s*.25,1.69,.09,group,.025,-s*.12);for(let j=0;j<5;j++)block(j%2?dark:trim,s*.40,1.48-j*.12,-.07,.17,.10,.42);}
  const scales=rig(-.91,.22,.09);rod([0,0,0],[0,1.80,0],.035,trim,scales);rod([-.39,1.44,0],[.39,1.44,0],.025,trim,scales);mesh(gem,glow,0,1.77,0,.08,.13,.055,scales);
  for(const s of[-1,1]){rod([s*.34,1.44,0],[s*.34,1.04,0],.009,trim,scales);plate([[-.17,0],[.17,0],[.11,-.09],[-.11,-.09]],trim,s*.34,1.04,0,scales);mesh(gem,glow,s*.34,1.07,.02,.055,.055,.035,scales);}
  motions.push(t=>scales.rotation.z=Math.sin(t*.9)*.035);
 }
 if(id==='ragnarokblade'){
  mantle(.95);crown(.28);
  const sword=rig(.88,.10,.12);blade(0,1.58,0,1.55,Math.PI,sword,trim);plate([[-.035,0],[.035,0],[.035,1.19],[0,1.44],[-.035,1.19]],glow,0,1.55,.05,sword,.05,Math.PI);block(trim,0,1.61,0,.55,.075,.15,sword);rod([0,1.63,0],[0,2.03,0],.045,dark,sword);mesh(gem,glow,0,2.08,0,.075,.09,.06,sword);
  for(const s of[-1,1]){const rack=rig(s*.42,1.14,-.47);for(let j=0;j<3;j++){blade(s*(.1+j*.17),j*.10,0,.82,-s*(.45+j*.32),rack,trim);blade(s*(.1+j*.17),j*.10,.045,.65,-s*(.45+j*.32),rack,glow);}motions.push(t=>rack.position.y=1.14+Math.sin(t*1.3+s)*.055);}
 }
 if(id==='deusawakening'){
  for(const s of[-1,1]){const rail=rig(s*.78,1.24,-.31);block(shell,0,0,0,.27,1.12,.32,rail,-s*.15);for(let j=0;j<5;j++)block(glow,0,-.39+j*.18,.18,.19,.025,.025,rail);blade(s*.25,1.62,0,.52,-s*.55);motions.push(t=>rail.position.y=1.24+Math.sin(t*1.2+s)*.06);}
  const core=rig(0,1.56,-.65);ring(trim,0,0,0,.69,core);const inner=ring(glow,0,0,.03,.55,core);inner.rotation.y=.65;
  for(let j=0;j<4;j++){const a=j*Math.PI/2;plate([[-.14,-.12],[.14,-.12],[.14,.12],[-.14,.12]],shell,Math.sin(a)*.68,Math.cos(a)*.68,0,core);mesh(gem,glow,Math.sin(a)*.68,Math.cos(a)*.68,.065,.06,.08,.025,core);}motions.push(t=>{core.rotation.z=t*.13;inner.rotation.y=.65+Math.sin(t*.7)*.25;});
  // Keep the independently rotating inner ring out of the static merge.
  inner.userData.dynamic=true;
 }
 if(id==='roserequiem'){
  mantle(1.18);ring(trim,0,1.72,0,.35).rotation.x=Math.PI/2;
  function rose(x,y,z,size,p=group){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mesh(gem,shell,x+Math.sin(a)*size*.55,y+Math.cos(a)*size*.55,z,size*.48,size*.65,size*.30,p,-a);}mesh(gem,glow,x,y,z+.04,size*.30,size*.36,size*.24,p);}
  for(const s of[-1,1]){rose(s*.47,1.37,.23,.17);for(let j=0;j<3;j++)spike(s*(.12+j*.10),1.83,-.01,.25,-s*.25);}
  const rapier=rig(.85,.18,.16);blade(0,1.33,0,1.33,Math.PI,rapier,trim);ring(trim,0,1.36,0,.15,rapier);rod([0,1.37,0],[0,1.65,0],.035,dark,rapier);rose(0,1.71,0,.13,rapier);
  const briar=rig(0,1.30,-.63);ring(trim,0,0,0,.77,briar,Math.PI*1.7);for(let j=0;j<7;j++){const a=j*.76;spike(Math.sin(a)*.77,Math.cos(a)*.77,0,.17,-a,briar);if(j%2===0)rose(Math.sin(a)*.77,Math.cos(a)*.77,.04,.11,briar);}motions.push(t=>briar.rotation.z=Math.sin(t*.6)*.06);
 }
 if(id==='starouroboros'){
  mantle(.86);crown(.30);const serpent=rig(0,1.39,-.61);ring(shell,0,0,0,.82,serpent,Math.PI*1.87);ring(glow,0,0,.04,.74,serpent,Math.PI*1.87);
  for(let j=0;j<16;j++){const a=j*.37;mesh(gem,trim,Math.cos(a)*.82,Math.sin(a)*.82,.025,.08,.11,.04,serpent,a);}
  plate([[-.18,-.04],[-.10,.17],[.12,.15],[.21,0],[.08,-.13]],shell,.81,-.11,.05,serpent,.12,.35);mesh(gem,glow,.85,-.06,.13,.03,.025,.025,serpent);rod([.76,-.20,.06],[.72,-.34,.06],.015,glow,serpent);motions.push(t=>serpent.rotation.z=t*.10);
  for(const s of[-1,1])for(let j=0;j<3;j++)plate([[-.13,0],[0,.19],[.13,0],[0,-.08]],trim,s*.52,1.40-j*.12,.08,group,.07,-s*.24);
 }
 if(id==='eternalnox'){
  mantle(1.45);crown(.39);const eclipse=rig(0,1.51,-.69);ring(glow,0,0,0,.79,eclipse,Math.PI*1.62);ring(trim,0,0,-.035,.86,eclipse,Math.PI*1.62);eclipse.rotation.z=.62;
  for(const s of[-1,1]){const wing=rig(s*.35,1.23,-.44);plate([[0,0],[s*.36,.60],[s*.91,.42],[s*.68,.12],[s*.41,.23],[s*.27,-.16]],dark,0,0,0,wing);rod([0,0,.045],[s*.79,.39,.045],.022,trim,wing);motions.push(t=>wing.rotation.y=s*(.18+Math.sin(t)*.06));}
  for(let j=0;j<3;j++){const star=rig((j-1)*.63,1.96+Math.abs(j-1)*.16,-.18);mesh(gem,glow,0,0,0,.055,.13,.035,star);motions.push(t=>star.position.y=1.96+Math.abs(j-1)*.16+Math.sin(t*1.2+j)*.07);}
 }
 if(id==='auroraphoenix'){
  for(const s of[-1,1]){
   const wing=rig(s*.29,1.28,-.43);
   for(let j=0;j<5;j++){const a=-s*(.25+j*.25);blade(s*(.08+j*.13),-.05+j*.035,0,1.10-j*.08,a,wing,trim);blade(s*(.08+j*.13),-.02+j*.035,.045,.91-j*.07,a,wing,shell);}
   motions.push(t=>wing.rotation.y=s*(.18+Math.sin(t*1.6)*.12));
  }
  const tail=rig(0,.64,-.51);for(let j=-1;j<=1;j++){blade(j*.15,.12,0,.75-Math.abs(j)*.08,Math.PI+j*.3,tail,trim);blade(j*.15,.1,.04,.58,Math.PI+j*.3,tail,glow);}motions.push(t=>tail.rotation.y=Math.sin(t*1.4)*.12);
  for(let j=-1;j<=1;j++)blade(j*.13,1.68,0,.48-Math.abs(j)*.1,-j*.35,group,trim);
 }
 if(id==='celestialkirin'){
  rod([0,1.62,.02],[0,2.05,.08],.08,trim);rod([0,2.05,.08],[.13,2.35,.12],.045,trim,group,0);
  for(const s of[-1,1]){
   plate([[-.12,0],[.14,.04],[s*.12,.40]],trim,s*.31,1.60,-.04,group,.12,-s*.4);
   const mane=rig(s*.39,1.34,-.29);for(let j=0;j<4;j++)blade(s*j*.13,-j*.11,0,.48,-s*(.6+j*.25),mane,j%2?glow:trim);motions.push(t=>mane.rotation.y=s*Math.sin(t*1.3)*.07);
   for(let j=0;j<3;j++)plate([[-.15,0],[0,.18],[.15,0],[0,-.14]],trim,s*.51,1.40-j*.15,.08,group,.08,-s*.18);
  }
  const cloud=rig(0,1.25,-.65);for(let j=-1;j<=1;j++){const r=ring(glow,j*.36,Math.abs(j)*.17,0,.25,cloud,Math.PI*1.55);r.rotation.z=j*.4;}motions.push(t=>cloud.position.y=1.25+Math.sin(t)*.06);
 }
 if(id==='imperialpeacock'){
  const fan=rig(0,.92,-.67);
  for(let j=-4;j<=4;j++){
   const a=j*.27,x=Math.sin(a)*1.03,y=Math.cos(a)*1.03;
   rod([0,0,0],[x,y,0],.018,trim,fan);const feather=mesh(ball,shell,x,y,0,.17,.31,.045,fan,-a);
   const eye=ring(trim,x,y,.05,.11,fan);eye.scale.y=.17;mesh(gem,glow,x,y,.07,.055,.09,.025,fan,-a);
  }
  motions.push(t=>fan.rotation.y=Math.sin(t*.8)*.10);
  for(let j=-1;j<=1;j++){rod([j*.12,1.65,0],[j*.2,2.02,0],.014,trim);mesh(gem,glow,j*.2,2.04,0,.045,.07,.03);}
 }
 if(id==='oathpaladin'){
  mantle(1.06);crown(.24);
  const shield=rig(-.77,.88,.16),outline=[[-.36,.5],[.36,.5],[.38,-.10],[0,-.56],[-.38,-.10]];
  plate(outline,trim,0,0,0,shield,.12);plate(outline,shell,0,.015,.09,shield,.035).scale.setScalar(.82);
  block(glow,0,.02,.14,.06,.65,.025,shield);block(glow,0,.16,.14,.39,.06,.025,shield);mesh(gem,trim,0,.16,.17,.085,.11,.035,shield);
  const sword=rig(.82,.18,.10);blade(0,1.34,0,1.31,Math.PI,sword,trim);block(trim,0,1.36,0,.43,.065,.13,sword);rod([0,1.4,0],[0,1.73,0],.042,dark,sword);mesh(gem,glow,0,1.78,0,.06,.08,.045,sword);
  motions.push(t=>shield.rotation.y=Math.sin(t*.9)*.06);
 }
 if(id==='starwhalesovereign'){
  const whale=rig(0,1.88,-.68);
  mesh(ball,shell,0,0,0,.64,.25,.21,whale);mesh(ball,trim,0,-.09,.04,.56,.13,.18,whale);
  for(const s of[-1,1]){plate([[0,0],[s*.24,-.11],[s*.48,.10],[s*.21,.15]],trim,s*.36,-.03,0,whale);mesh(gem,glow,s*.22,.025,.20,.028,.035,.018,whale);}
  const tail=plate([[0,0],[-.29,.23],[-.09,.26],[0,.11],[.09,.26],[.29,.23]],trim,0,0,-.26,whale);tail.rotation.x=-1.1;
  motions.push(t=>{whale.position.y=1.88+Math.sin(t*1.1)*.10;whale.rotation.z=Math.sin(t*.7)*.06;});
  for(const s of[-1,1])plate([[0,0],[s*.30,.47],[s*.48,.42],[s*.34,-.19]],trim,s*.42,1.06,-.31,group,.09);
  const wake=rig(0,1.40,-.73);ring(glow,0,0,0,.77,wake,Math.PI*1.7);motions.push(t=>wake.rotation.z=-t*.10);
 }
 if(id==='ninetailtenko'){
  for(const s of[-1,1]){plate([[-.15,0],[.16,0],[s*.05,.51]],trim,s*.26,1.62,-.06,group,.16,-s*.12);plate([[-.07,0],[.07,0],[s*.03,.31]],shell,s*.26,1.72,.04,group,.03,-s*.12);}
  for(let side=-1;side<=1;side++){
   const tails=rig(side*.21,.70,-.52);
   for(let k=-1;k<=1;k++){const j=side*3+k,a=-j*.27,x=k*.07;
    plate([[-.08,0],[-.22,.35],[-.16,.83],[0,1.13],[.16,.83],[.22,.35],[.08,0]],trim,x,0,0,tails,.09,a);
    blade(x,.33,.06,.67,a,tails,j%2?shell:glow);
   }
   motions.push(t=>tails.rotation.y=Math.sin(t*1.2+side*1.35)*.12);
  }
  const bell=rig(0,.77,.56);mesh(ball,trim,0,0,0,.10,.10,.075,bell);block(dark,0,-.04,.075,.11,.012,.012,bell);motions.push(t=>bell.rotation.z=Math.sin(t*1.7)*.10);
 }
 if(id==='auricalchemist'){
  mantle(1.04);const hat=mesh(cone,shell,0,1.99,-.06,.32,.60,.30);hat.rotation.z=.14;ring(trim,0,1.71,-.06,.41).rotation.x=Math.PI/2;
  const seal=rig(0,1.40,-.65);ring(trim,0,0,0,.76,seal);ring(glow,0,0,.025,.64,seal);
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3,b=(j+1)*Math.PI*2/3;rod([Math.sin(a)*.61,Math.cos(a)*.61,.04],[Math.sin(b)*.61,Math.cos(b)*.61,.04],.02,trim,seal);}motions.push(t=>seal.rotation.z=t*.13);
  for(const s of[-1,1]){const flask=rig(s*.83,.97,.12);mesh(ball,trim,0,0,0,.18,.22,.15,flask);mesh(ball,glow,0,-.015,.10,.12,.13,.065,flask);block(trim,0,.23,0,.12,.20,.12,flask);block(dark,0,.35,0,.15,.07,.15,flask);motions.push(t=>flask.position.y=.97+Math.sin(t*1.4+s)*.08);}
 }
 if(id==='saturnregent'){
  mantle(1.2);crown(.34);
  const planet=rig(0,1.94,-.65);mesh(ball,shell,0,0,0,.34,.34,.34,planet);const rings=rig(0,1.94,-.65);rings.rotation.x=.95;rings.rotation.y=.25;
  ring(trim,0,0,0,.66,rings);ring(glow,0,0,.025,.55,rings);motions.push(t=>{planet.rotation.y=t*.16;rings.rotation.z=t*.12;});
  for(const s of[-1,1]){const moon=rig(s*.90,1.24,-.20);mesh(ball,trim,0,0,0,.13,.13,.13,moon);ring(glow,0,0,.025,.17,moon);motions.push(t=>moon.position.y=1.24+Math.sin(t+s)*.10);}
 }
 if(id==='leonidasregalia'){
  mantle(.95);crown(.32);
  const mane=rig(0,1.43,-.23);for(let j=0;j<11;j++){const a=(j-5)*.43;blade(Math.sin(a)*.56,Math.cos(a)*.53,0,.42,-a,mane,j%2?shell:trim);}motions.push(t=>mane.rotation.y=Math.sin(t*.8)*.035);
  for(const s of[-1,1]){mesh(ball,trim,s*.32,1.70,-.05,.12,.13,.085);mesh(ball,shell,s*.32,1.70,.025,.065,.07,.015);for(let j=0;j<3;j++)blade(s*(.49+j*.065),.80,.20,.27,s*.1,group,trim);}
  const staff=rig(.89,.18,.05);rod([0,0,0],[0,1.58,0],.035,trim,staff);mesh(gem,trim,0,1.72,0,.17,.20,.11,staff);mesh(gem,glow,0,1.72,.12,.065,.09,.025,staff);
 }
 if(id==='prismmorpho'){
  for(const s of[-1,1]){
   const wing=rig(s*.33,1.23,-.46);
   const top=[[0,0],[s*.32,.70],[s*.88,.78],[s*1.02,.40],[s*.78,.04],[s*.24,-.09]],bottom=[[0,0],[s*.66,-.04],[s*.74,-.38],[s*.35,-.57],[s*.10,-.23]];
   plate(top,trim,0,0,0,wing,.055);plate(top,shell,0,0,.045,wing,.025).scale.setScalar(.88);plate(bottom,trim,0,0,0,wing,.055);plate(bottom,shell,0,0,.045,wing,.025).scale.setScalar(.84);
   for(const [x,y]of [[.46,.38],[.76,.39],[.36,-.25]])mesh(gem,glow,s*x,y,.085,.09,.15,.025,wing,-s*.3);
   rod([0,0,.09],[s*.83,.59,.09],.014,glow,wing);motions.push(t=>wing.rotation.y=s*(.13+Math.sin(t*1.8)*.15));
   rod([s*.16,1.66,0],[s*.30,2.01,0],.018,trim);mesh(gem,glow,s*.30,2.03,0,.035,.055,.025);
  }
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
 update(0);aura.removeFromParent();return upgradeGoldenGiftSkin(T,{group,spec,update,dispose},{mobile});
}

// Golden couture: authored ornaments plus three bounded aura draws, shared by
// every golden outfit. The caller owns the frame loop.
export function upgradeGoldenGiftSkin(T,skin,{mobile=false}={}){
 const {group,spec}=skin,id=spec.id;
 const theme=spec.theme??({obsidianwyrm:'flame',onimusha:'flame',crimsonshogun:'flame',solarjuggernaut:'sun',seraphzero:'angel',celestial:'angel',voidreaper:'void',raijinmk7:'storm',abyssleviathan:'tide',chronodominus:'clock',eclipsefenrir:'moon',astralmonarch:'stars',galaxylord:'stars',neonphantom:'digital',error404:'digital',frostemperor:'frost',spacebunny:'stars',boxgod:'sun'})[id];
 const variants=['flame','sun','angel','void','storm','tide','clock','moon','stars','digital','frost'],variant=variants.indexOf(theme);
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const geometries=new Set(),materials=new Set(),parts=[],ornaments=new T.Group();ornaments.name='golden-couture';group.add(ornaments);
 group.userData.goldenCouture=2;
 const own=g=>(geometries.add(g),g),material=(color,emission=0)=>{const m=new T.MeshStandardMaterial({color,metalness:.78,roughness:.28,emissive:emission?color:0,emissiveIntensity:emission});materials.add(m);return m;};
 const gold=material(spec.trim??0xe1bd75),enamel=material(spec.color),glow=material(spec.accent,.65);
 const box=own(new T.BoxGeometry(1,1,1)),gem=own(new T.OctahedronGeometry(1)),rodGeo=own(new T.CylinderGeometry(1,1,1,5));
 function add(g,m,x,y,z,sx=1,sy=1,sz=1,angle=0){const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.rotation.z=angle;parts.push(n);return n;}
 function line(a,b,m=gold,r=.012){const n=add(rodGeo,m,...a.map((v,i)=>(v+b[i])/2),r,Math.hypot(...a.map((v,i)=>b[i]-v)),r);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...a.map((v,i)=>b[i]-v)).normalize());return n;}
 function contour(points,m=gold,r=.012){for(let j=1;j<points.length;j++)line(points[j-1],points[j],m,r);}
 function leaf(x,y,z,w,h,angle=0,m=enamel){const shape=new T.Shape();shape.moveTo(0,-.52);shape.lineTo(-.48,-.18);shape.lineTo(-.35,.26);shape.lineTo(0,.55);shape.lineTo(.35,.26);shape.lineTo(.48,-.18);shape.closePath();const g=own(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.009}));return add(g,m,x,y,z,w,h,1,angle);}
 // Engraved gorget, gem settings and linked waist chains sit below the visor.
 for(const s of[-1,1]){
  contour([[s*.055,1.02,.51],[s*.18,.98,.52],[s*.29,.88,.52],[s*.24,.72,.53]],gold,.013);
  for(let j=0;j<4;j++){const x=s*(.12+j*.064),y=.69-Math.sin(j/3*Math.PI)*.055;add(gem,gold,x,y,.49,.028,.037,.016);add(gem,glow,x,y,.51,.011,.018,.009);}
  for(let j=0;j<3;j++){
   leaf(s*(.39+j*.065),1.43-j*.045,.18,.11,.24,-s*(.3+j*.24),gold);
   add(gem,glow,s*(.39+j*.065),1.43-j*.045,.23,.022,.04,.014);
  }
 }
 // Each silhouette gets its own large accessory, with enamel insets and trim.
 if(['storm','digital'].includes(theme)){
  for(const s of[-1,1]){
   for(let j=0;j<3;j++){
    const x=s*(.65+j*.16),y=1.20+j*.16;
    leaf(x,y,-.41,.22,.72,-s*.35,gold);leaf(x,y,-.36,.16,.60,-s*.35,enamel);
    contour([[x,y-.19,-.29],[x-s*.065,y+.03,-.29],[x+s*.035,y+.03,-.29],[x,y+.25,-.29]],glow,.017);
   }
  }
 }else if(theme==='tide'){
  for(const s of[-1,1])for(let j=0;j<4;j++){
   const x=s*(.49+j*.13),y=1.19+j*.08;
   leaf(x,y,-.36,.32,.91,-s*(.35+j*.26),gold);leaf(x,y,-.31,.26,.82,-s*(.35+j*.26),enamel);
   line([x,y-.19,-.24],[x+s*.14,y+.23,-.24],glow,.014);
   for(let k=0;k<3;k++)add(gem,gold,s*(.39+j*.095),.83-k*.10,-.14,.095,.08,.025,-s*.15);
  }
 }else if(['flame','frost','angel'].includes(theme)){
  for(const s of[-1,1])for(let j=0;j<4;j++){
   const x=s*(.52+j*.13),y=1.35+j*.10,angle=-s*(.45+j*.22);
   leaf(x,y,-.44,.18,theme==='angel'?.88:.64,angle,gold);
   leaf(x,y,-.39,.095,theme==='angel'?.73:.51,angle,glow);
   if(theme==='flame')add(gem,enamel,s*(.39+j*.08),.73-j*.055,.32,.10,.16,.04,-s*.25);
  }
 }else if(theme==='moon'){
  for(const s of[-1,1])for(let j=0;j<5;j++){
   leaf(s*(.46+j*.09),1.35-j*.085,-.17,.20,.49,-s*(.7+j*.20),gold);
   leaf(s*(.46+j*.09),1.35-j*.085,-.12,.13,.40,-s*(.7+j*.20),enamel);
  }
 }else if(theme==='void'){
  for(const s of[-1,1]){
   contour([[s*.38,1.53,-.11],[s*.61,1.40,.02],[s*.53,.99,.13],[s*.76,.55,.04]],gold,.018);
   for(let j=0;j<5;j++)add(gem,j%2?gold:glow,s*(.50+Math.sin(j*.8)*.11),1.36-j*.17,.10,.035,.065,.026);
   leaf(s*.63,.75,-.36,.35,1.04,s*.2,enamel);
   line([s*.57,1.16,-.31],[s*.75,.33,-.31],glow,.012);
  }
 }else{
  // Embroidered split banners, a sunburst/orrery crest and cabochon settings.
  for(const s of[-1,1]){
   leaf(s*.68,.95,-.45,.45,1.26,-s*.17,gold);leaf(s*.68,.95,-.40,.38,1.16,-s*.17,enamel);
   for(let j=0;j<3;j++){const y=.61+j*.25;add(gem,gold,s*.68,y,-.33,.064,.11,.025);add(gem,glow,s*.68,y,-.30,.026,.05,.018);}
  }
  for(let j=0;j<12;j++){const a=j*Math.PI/6,x=Math.sin(a)*.91,y=1.39+Math.cos(a)*.91;
   add(gem,gold,x,y,-.64,.052,j%3?.08:.16,.035,-a);
   if(j%3===0)add(gem,glow,x,y,-.59,.024,.07,.022,-a);
  }
 }
 // Merge all ornaments by material; extra detail costs three mesh draws.
 for(const mat of [gold,enamel,glow]){
  const attributes={position:[],normal:[],uv:[]};
  for(const n of parts.filter(n=>n.material===mat)){n.updateMatrix();const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrix);for(const key of Object.keys(attributes))attributes[key].push(...g.attributes[key].array);g.dispose();}
  if(!attributes.position.length)continue;
  const g=own(new T.BufferGeometry());for(const key of Object.keys(attributes))g.setAttribute(key,new T.Float32BufferAttribute(attributes[key],key==='uv'?2:3));g.computeBoundingSphere();const n=new T.Mesh(g,mat);n.userData.lightCostume=true;ornaments.add(n);
 }
 const aura=new T.Group();aura.name='signature-aura';aura.userData.variant=theme;group.add(aura);
 const shader=(vertexShader,fragmentShader)=>{const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0},tint:{value:new T.Color(spec.accent)},gold:{value:new T.Color(0xffce77)},variant:{value:variant},fade:{value:1},power:{value:1}},vertexShader,fragmentShader});materials.add(m);return m;};
 const vertex='varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const floorMat=shader(vertex,`uniform float time,fade,power,variant;uniform vec3 tint,gold;varying vec2 v;void main(){vec2 p=(v-.5)*2.;float r=length(p),a=atan(p.y,p.x)+time*.12;float outer=1.-smoothstep(.008,.023,abs(r-.86));float inner=1.-smoothstep(.006,.016,abs(r-.68));float dash=step(.55,cos(a*(variant==6.?24.:12.)))*(1.-smoothstep(.014,.032,abs(r-.77)));float spokes=pow(max(0.,cos(a*6.)),40.)*smoothstep(.43,.53,r)*(1.-smoothstep(.72,.82,r));float mist=exp(-pow((r-.74)*9.,2.))*.14;float alpha=(outer*.6+inner*.42+dash*.55+spokes*.30+mist)*fade*power;gl_FragColor=vec4(mix(tint,gold,outer*.65),alpha);}`);
 const seal=new T.Mesh(own(new T.PlaneGeometry(2.42,2.42)),floorMat);seal.rotation.x=-Math.PI/2;seal.position.y=.035;aura.add(seal);
 const veilMat=shader(vertex,`uniform float time,fade,power,variant;uniform vec3 tint,gold;varying vec2 v;void main(){float a=v.x*6.283185;float wave=sin(a*5.+v.y*8.-time*1.5);float height=(1.-smoothstep(.22,.96,v.y))*smoothstep(0.,.14,v.y);float ribbon=pow(max(0.,sin(a*3.-v.y*8.+time*.8)),22.);float motif=0.;if(variant==0.)motif=pow(max(0.,sin(a*9.+sin(v.y*10.-time*2.))),8.)*(1.-v.y);else if(variant==4.||variant==9.){float zig=abs(fract(v.y*7.-time*.18)-.5)*.45;motif=pow(max(0.,cos(a*5.+zig*12.)),50.);}else if(variant==5.)motif=pow(max(0.,sin(v.y*25.+a*3.-time*1.6)),16.);else if(variant==10.)motif=pow(max(0.,cos(a*6.)),28.)*.6;else motif=ribbon;float alpha=height*(.035+motif*.32+ribbon*.10)*fade*power;gl_FragColor=vec4(mix(tint,gold,ribbon*.22),alpha);}`);
 const veil=new T.Mesh(own(new T.CylinderGeometry(.92,1.04,2.12,mobile?28:40,1,true)),veilMat);veil.position.y=1.08;aura.add(veil);
 const count=mobile?28:44,seeds=new Float32Array(count*3),pg=own(new T.BufferGeometry());for(let i=0;i<count;i++){seeds[i*3]=i*2.39996;seeds[i*3+1]=(i+.5)/count;seeds[i*3+2]=(i%7)/7;}pg.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));pg.setAttribute('seed',new T.BufferAttribute(seeds,3));
 const pm=shader(`attribute vec3 seed;uniform float time,variant;varying float phase;void main(){phase=fract(seed.y+time*(variant==10.?-.07:.10));float a=seed.x+time*.24,r=.78+seed.z*.32;vec3 p=vec3(cos(a)*r,.12+phase*2.38,sin(a)*r);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((46.+seed.z*20.)/-mv.z,2.,12.);gl_Position=projectionMatrix*mv;}`,`uniform vec3 tint,gold;uniform float fade,variant;varying float phase;void main(){vec2 p=abs(gl_PointCoord-.5)*2.;float shape;if(variant==4.||variant==9.)shape=1.-smoothstep(.35,.65,max(p.x,p.y));else if(variant==10.)shape=1.-smoothstep(.30,.70,p.x+p.y);else shape=max(exp(-length(p)*5.),max(exp(-p.x*15.-p.y*3.),exp(-p.y*15.-p.x*3.)));float alpha=shape*sin(phase*3.14159)*fade;if(alpha<.01)discard;gl_FragColor=vec4(mix(tint,gold,.28),alpha*.85);}`);
 const sparks=new T.Points(pg,pm);sparks.frustumCulled=false;aura.add(sparks);
 for(const node of aura.children)node.onBeforeRender=()=>{node.material.uniforms.fade.value=node.material.opacity;};
 let disposed=false;
 function update(seconds,pose={}){if(disposed)return;const t=reduced?0:Number.isFinite(seconds)?seconds:0;skin.update(t,pose);for(const m of [floorMat,veilMat,pm]){m.uniforms.time.value=t;m.uniforms.power.value=pose.jumping?1.18:1;m.uniforms.fade.value=m.opacity;}glow.emissiveIntensity=.65+(reduced?0:Math.sin(t*1.6)*.12);}
 function dispose(){if(disposed)return;disposed=true;skin.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 update(0);return{group,spec,update,dispose};
}
