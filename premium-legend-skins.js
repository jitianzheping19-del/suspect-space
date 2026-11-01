// Legend-tier outfits. All animation uses the caller's existing frame loop.
export const LEGEND_AURA_SKINS=Object.freeze([
 {id:'infernophoenix',name:'炎翼騎士・フェニックス',color:0x712a30,accent:0xff8b39,trim:0xe2ae62,aura:'embers',glyph:'🔥'},
 {id:'stormronin',name:'蒼雷浪人・シデン',color:0x243450,accent:0x74e4ff,trim:0xa4bdcf,aura:'lightning',glyph:'⚡'},
 {id:'glacialwarden',name:'氷晶衛士・グレイシア',color:0x6facc3,accent:0xc4faff,trim:0xe0eff2,aura:'snow',glyph:'❄'},
 {id:'nebulaoracle',name:'星雲賢者・ネビュラ',color:0x494174,accent:0xd0a2ff,trim:0xe1bc79,aura:'stars',glyph:'✦'},
 {id:'venomviper',name:'毒蛇将校・ヴァイパー',color:0x273e39,accent:0xadff64,trim:0x91ab70,aura:'venom',glyph:'🐍'},
 {id:'ironbehemoth',name:'鉄巨兵・ベヒーモス',color:0x434954,accent:0xffac54,trim:0xaab5c0,aura:'reactor',glyph:'⚙'},
 {id:'bloodrose',name:'血薔薇卿・ノクターン',color:0x591f3e,accent:0xff7fae,trim:0xd4b38b,aura:'petals',glyph:'🌹'},
 {id:'prismvalkyrie',name:'虹晶戦姫・ヴァルキリア',color:0xddd9e9,accent:0xcbb2ff,trim:0x9d84c6,aura:'prism',glyph:'💎'},
 {id:'lunakitsune',name:'月影狐・ツクヨミ',color:0x343253,accent:0x86cbff,trim:0xe6d6ac,aura:'wisps',glyph:'🦊'},
 {id:'gravitonace',name:'重力特務・グラビトン',color:0x222b40,accent:0x7cffe6,trim:0x8ca7bc,aura:'gravity',glyph:'◎'},
 {id:'solarcavalier',name:'太陽聖槍・ソルアーク',color:0xe4d9ba,accent:0xffd379,trim:0xb38840,aura:'embers',glyph:'☀',atelier:true},
 {id:'abysscorsair',name:'深海船長・ネレイス',color:0x193d50,accent:0x55e6dd,trim:0xb99762,aura:'wisps',glyph:'⚓',atelier:true},
 {id:'clockworkmarquis',name:'歯車伯爵・オルロージュ',color:0x3e2932,accent:0xffbd6a,trim:0xb58c53,aura:'reactor',glyph:'⚙',atelier:true},
 {id:'sakurablademaster',name:'桜花剣士・サクヤ',color:0x632944,accent:0xffb7d7,trim:0xd8b980,aura:'petals',glyph:'❀',atelier:true},
 {id:'scaraboracle',name:'砂塵祭司・ケプリ',color:0x1b4054,accent:0x78f3ec,trim:0xd2ab54,aura:'stars',glyph:'☥',atelier:true},
 {id:'thunderfalcon',name:'雷隼飛翔・アークホーク',color:0x243c61,accent:0x86cfff,trim:0xc1cfdd,aura:'lightning',glyph:'ϟ',atelier:true},
 {id:'verdantdruid',name:'翠森賢者・ユグドラ',color:0x315044,accent:0xa4eeb0,trim:0xb3a477,aura:'venom',glyph:'❧',atelier:true},
 {id:'crystalmaestro',name:'水晶楽士・セレステ',color:0xb9c7e1,accent:0xbca5ff,trim:0xf1e5bf,aura:'prism',glyph:'♫',atelier:true},
 {id:'lunamasquerade',name:'月宴道化・アルレッキーノ',color:0x4b2a64,accent:0xf5b7ec,trim:0xd0b679,aura:'gravity',glyph:'♢',atelier:true},
 {id:'raveninquisitor',name:'黒羽執行・レイヴン',color:0x242735,accent:0x9cb5ff,trim:0xa6a9bd,aura:'snow',glyph:'♠',atelier:true}
].map(s=>Object.freeze({...s,access:'gift',rarity:4,effect:s.aura})));

export function createLegendAuraSkin(T,spec,{mobile=false}={}){
 const group=new T.Group();group.name='gift-skin-'+spec.id;group.userData.legendAura=spec.aura;
 const sculpt=new T.Group(),aura=new T.Group();aura.name='signature-aura';aura.userData.variant=spec.aura;group.add(sculpt,aura);
 const geometries=new Set(),materials=new Set(),cache=new Map(),assemblies=[sculpt],motions=[];
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 let disposed=false;
 const own=g=>(geometries.add(g),g),geo=(key,make)=>{if(!cache.has(key))cache.set(key,own(make()));return cache.get(key);};
 const mat=(color,metal=.5,rough=.4,emission=0)=>{const m=new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:emission?color:0,emissiveIntensity:emission});materials.add(m);return m;};
 const shell=mat(spec.color,.65,.35),trim=mat(spec.trim,.8,.28),dark=mat(0x111b29,.35,.6),ivory=mat(0xe4e7e4,.35,.4),glow=mat(spec.accent,.3,.3,.9);
 const box=geo('box',()=>new T.BoxGeometry(1,1,1)),ball=geo('ball',()=>new T.SphereGeometry(1,mobile?12:18,mobile?8:12)),gem=geo('gem',()=>new T.OctahedronGeometry(1));
 function mesh(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,p=sculpt){const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.castShadow=false;n.userData.lightCostume=true;p.add(n);return n;}
 const block=(m,x,y,z,w,h,d,p=sculpt)=>mesh(box,m,x,y,z,w,h,d,p);
 const orb=(m,x,y,z,w,h,d,p=sculpt)=>mesh(ball,m,x,y,z,w,h,d,p);
 function rig(x,y,z){const n=new T.Group();n.position.set(x,y,z);sculpt.add(n);assemblies.push(n);return n;}
 function plate(points,m,x,y,z,depth=.055,p=sculpt){const key=JSON.stringify(points)+depth;return mesh(geo(key,()=>{const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.01,bevelThickness:.008});g.translate(0,0,-depth/2);return g;}),m,x,y,z,1,1,1,p);}
 function rod(a,b,r,m,p=sculpt,top=r){const length=Math.hypot(...a.map((v,i)=>b[i]-v));const n=mesh(geo('rod'+[r,top,length],()=>new T.CylinderGeometry(top,r,length,8)),m,...a.map((v,i)=>(v+b[i])/2),1,1,1,p);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...a.map((v,i)=>b[i]-v)).normalize());return n;}
 function ring(m,x,y,z,r,p=sculpt,arc=Math.PI*2){return mesh(geo('ring'+arc,()=>new T.TorusGeometry(1,.028,5,mobile?32:48,arc)),m,x,y,z,r,r,r,p);}
 function jewel(x,y,z,w=.08,h=.14,p=sculpt,m=glow){return mesh(gem,m,x,y,z,w,h,.065,p);}
 function feather(side,j,p,m=ivory){const n=plate([[0,0],[side*.15,.25],[side*.13,.72],[0,.97],[-side*.07,.23]],m,side*(.07+j*.14),j*.025,0,.055,p);n.rotation.z=-side*(.38+j*.32);return n;}
 function cape(width=1.1,m=shell){const n=rig(0,1.30,-.46);plate([[-.31,.18],[.31,.18],[width/2,-.82],[.16,-.70],[0,-.88],[-.16,-.70],[-width/2,-.82]],m,0,0,0,.045,n);for(const s of[-1,1])rod([s*.28,.1,-.035],[s*width/2,-.8,-.035],.014,trim,n);motions.push((t,moving)=>n.rotation.x=.04+Math.sin(t*1.7)*(moving?.07:.025));return n;}
 function coat(){orb(shell,0,1.0,-.02,.49,.64,.485);for(const s of[-1,1]){const lapel=plate([[0,.22],[s*.25,.10],[s*.10,-.30]],trim,s*.055,.99,.475);lapel.rotation.y=s*.30;for(let j=0;j<3;j++)orb(trim,s*.17,.69+j*.13,.48,.022,.022,.014);}}
 function helmet(){orb(shell,0,1.48,-.04,.49,.32,.46);for(const s of[-1,1])plate([[-.08,-.20],[.08,-.18],[.09,.15],[0,.24],[-.10,.12]],trim,s*.35,1.39,.30,.055);}
 function armour(){coat();helmet();plate([[-.29,.13],[0,.23],[.29,.13],[.21,-.18],[0,-.27],[-.21,-.18]],shell,0,.84,.46,.07);jewel(0,.91,.515,.07,.12);for(const s of[-1,1]){orb(shell,s*.48,1.25,0,.23,.19,.27);block(trim,s*.48,1.27,.23,.29,.035,.025);}}
 // Curved seams and inset panels give the new collection detail at game scale.
 function seam(points,m=trim,r=.012,p=sculpt){return mesh(own(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),mobile?8:14,r,5,false)),m,0,0,0,1,1,1,p);}
 function panel(points,m,x,y,z,p=sculpt){plate(points,trim,x,y,z,.065,p);const inset=plate(points,m,x,y,z+.042,.035,p);inset.scale.set(.86,.86,1);return inset;}
 function cog(x,y,z,r,p=sculpt){ring(trim,x,y,z,r,p);ring(dark,x,y,z+.015,r*.66,p);for(let j=0;j<12;j++){const a=j*Math.PI/6;const tooth=block(trim,x+Math.sin(a)*r,y+Math.cos(a)*r,z,r*.22,r*.22,.065,p);tooth.rotation.z=-a;}jewel(x,y,z+.025,r*.22,r*.22,p);}
 function leaf(x,y,z,s,a,p=sculpt,m=shell){const n=plate([[0,0],[-.15,.12],[-.17,.32],[0,.64],[.16,.32],[.14,.12]],m,x,y,z,.035,p);n.scale.setScalar(s);n.rotation.z=a;rod([x-Math.sin(a)*s*.05,y+Math.cos(a)*s*.05,z+.025],[x-Math.sin(a)*s*.53,y+Math.cos(a)*s*.53,z+.025],.009,trim,p);return n;}
 function tailoredCoat(){coat();shell.roughness=.65;shell.metalness=.22;for(const s of[-1,1]){seam([[s*.32,1.17,.38],[s*.29,.94,.445],[s*.33,.68,.36]]);panel([[0,.14],[s*.23,.12],[s*.31,-.25],[s*.13,-.34]],shell,s*.11,.64,.30);for(let j=0;j<3;j++)block(trim,s*.14,.93-j*.11,.50,.04,.012,.012);}}
 function medallion(x,y,z,r,p=sculpt){ring(trim,x,y,z,r,p);orb(dark,x,y,z,r*.8,r*.8,.025,p);jewel(x,y,z+.035,r*.38,r*.55,p);}
 const id=spec.id;
 switch(id){
 case 'infernophoenix':{
  armour();for(const s of[-1,1]){const wing=rig(s*.36,1.25,-.42);for(let j=0;j<4;j++){feather(s,j,wing,j%2?trim:shell);const f=feather(s,j,wing,glow);f.scale.set(.27,.83,.35);f.position.z=.05;}motions.push(t=>wing.rotation.y=s*(.15+Math.sin(t*1.5)*.07));}
  for(let j=0;j<3;j++){const f=feather(1,j,sculpt,trim);f.position.set((j-1)*.13,1.66,-.14);f.scale.set(.5,.45,.6);f.rotation.z=(1-j)*.3;}
  cape(.75,dark);break;
 }
 case 'stormronin':{
  coat();const hat=rig(0,1.72,-.035);mesh(geo('ronin-hat',()=>new T.ConeGeometry(.76,.29,mobile?16:24)),shell,0,0,0,1,1,.91,hat);ring(trim,0,-.145,0,.76,hat).rotation.x=Math.PI/2;
  for(let j=0;j<12;j++){const a=j*Math.PI/6;rod([0,.15,0],[Math.sin(a)*.72,-.145,Math.cos(a)*.66],.009,trim,hat);}
  const scarf=rig(0,1.03,-.41);plate([[-.15,0],[.14,.12],[.83,-.06],[.91,-.27],[.29,-.11]],glow,0,0,0,.035,scarf);motions.push(t=>scarf.rotation.y=Math.sin(t*1.7)*.08);
  for(const s of[-1,1]){const sword=rig(s*.38,.54,-.48);sword.rotation.z=-s*.42;block(dark,0,.48,0,.07,1.2,.10,sword);block(trim,0,1.10,0,.28,.045,.17,sword);rod([0,1.12,0],[0,1.45,0],.038,shell,sword);for(let j=0;j<4;j++)block(glow,0,1.15+j*.07,.043,.08,.015,.015,sword);}
  break;
 }
 case 'glacialwarden':{
  armour();for(const s of[-1,1])for(let j=0;j<3;j++){const crystal=jewel(s*(.37+j*.13),1.55-j*.10,0,.10,.34,sculpt,j%2?ivory:glow);crystal.rotation.z=-s*(.25+j*.3);}jewel(0,1.85,0,.12,.28);
  const shield=rig(-.73,.94,.15);plate([[-.31,.30],[0,.47],[.31,.30],[.27,-.25],[0,-.50],[-.27,-.25]],trim,0,0,0,.12,shield);plate([[-.22,.24],[0,.35],[.22,.24],[.17,-.19],[0,-.37],[-.17,-.19]],shell,0,0,.075,.045,shield);jewel(0,0,.12,.10,.26,shield);
  const spear=rig(.82,.13,.05);rod([0,0,0],[0,1.70,0],.032,trim,spear);jewel(0,1.91,0,.13,.31,spear,ivory);jewel(0,1.90,.06,.045,.22,spear);break;
 }
 case 'nebulaoracle':{
  coat();cape(1.13);const hat=rig(0,1.68,-.04);mesh(geo('oracle-hat',()=>new T.ConeGeometry(.35,.69,12)),shell,.08,.29,-.015,1,1,1,hat).rotation.z=-.22;orb(shell,0,-.05,0,.67,.065,.58,hat);ring(trim,0,-.05,0,.65,hat).rotation.x=Math.PI/2;
  for(let j=0;j<3;j++)jewel(.08+j*.055,.1+j*.14,.29-j*.08,.025,.045,hat,trim);
  const staff=rig(.82,.12,0);rod([0,0,0],[0,1.63,0],.035,trim,staff);const orbit=rig(.82,1.92,0);ring(trim,0,0,0,.24,orbit);jewel(0,0,0,.12,.16,orbit);motions.push(t=>orbit.rotation.y=t*.45);
  const book=rig(-.69,.92,.12);block(trim,0,0,0,.38,.45,.15,book);block(ivory,0,0,.08,.30,.38,.05,book);block(shell,0,0,.12,.32,.4,.02,book);jewel(0,0,.14,.045,.08,book);book.rotation.z=.18;motions.push(t=>book.position.y=.92+Math.sin(t*1.8)*.055);break;
 }
 case 'venomviper':{
  armour();const hood=rig(0,1.47,-.43);for(const s of[-1,1]){plate([[0,-.60],[s*.65,-.27],[s*.72,.31],[s*.40,.60],[s*.13,.35]],shell,0,0,0,.09,hood);for(let j=0;j<4;j++){const bar=block(glow,s*(.36+j*.035),.29-j*.15,.06,.27,.022,.025,hood);bar.rotation.z=-s*.4;}}
  for(const s of[-1,1]){orb(dark,s*.28,1.03,.38,.12,.12,.09);ring(trim,s*.28,1.03,.46,.095);rod([s*.27,.62,-.53],[s*.27,1.39,-.53],.14,dark);for(let j=0;j<3;j++)ring(glow,s*.27,.78+j*.21,-.53,.145).rotation.x=Math.PI/2;}
  jewel(0,1.77,.07,.06,.13);break;
 }
 case 'ironbehemoth':{
  armour();for(const s of[-1,1]){block(shell,s*.61,1.16,0,.42,.65,.47);block(trim,s*.61,1.45,0,.46,.10,.51);for(let j=0;j<3;j++){const stripe=block(glow,s*.61,1.31-j*.13,.25,.30,.045,.025);stripe.rotation.z=s*.28;}for(let j=0;j<2;j++){rod([s*(.26+j*.22),.90,-.5],[s*(.26+j*.22),1.90-j*.15,-.5],.085,dark);ring(trim,s*(.26+j*.22),1.9-j*.15,-.5,.10).rotation.x=Math.PI/2;}}
  ring(trim,0,.85,.50,.19);orb(glow,0,.85,.51,.14,.14,.04);for(let j=0;j<3;j++)block(dark,0,.77+j*.08,.55,.26,.025,.03);block(dark,0,1.72,-.02,.45,.09,.42);break;
 }
 case 'bloodrose':{
  coat();cape(1.45,dark);for(const s of[-1,1]){plate([[0,0],[s*.41,-.11],[s*.51,.52],[s*.19,.31]],shell,s*.23,1.19,-.28,.08);const tail=rig(s*.25,.67,-.12);plate([[-.18,.10],[.18,.10],[s*.29,-.42],[0,-.28],[-.16,-.40]],shell,0,0,0,.04,tail);motions.push(t=>tail.rotation.x=Math.sin(t*1.5+s)*.04);}
  const rose=rig(-.28,1.07,.38);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;orb(glow,Math.sin(a)*.05,Math.cos(a)*.05,0,.045,.045,.02,rose);}jewel(0,0,.02,.03,.03,rose,trim);
  const tiara=ring(trim,0,1.72,0,.31);tiara.rotation.x=Math.PI/2;for(let j=0;j<3;j++)jewel((j-1)*.17,1.78+(j===1?.08:0),.06,.045,.1,sculpt,trim);break;
 }
 case 'prismvalkyrie':{
  armour();for(const s of[-1,1]){for(let j=0;j<3;j++){const fin=feather(s,j,sculpt,trim);fin.position.set(s*(.29+j*.07),1.51,-.06);fin.scale.set(.6,.45,.7);}
   const drones=rig(s*.55,1.37,-.40);for(let j=0;j<3;j++){const crystal=jewel(s*(.09+j*.16),.17+j*.22,0,.12,.29,drones,j%2?glow:ivory);crystal.rotation.z=-s*(.2+j*.3);rod([s*.08,-.05,-.02],[s*(.09+j*.16),.15+j*.22,-.02],.014,trim,drones);}motions.push(t=>{drones.position.y=1.37+Math.sin(t*1.4+s)*.04;drones.rotation.y=s*.13+Math.sin(t)*.05;});}
  const skirt=rig(0,.63,-.18);for(const s of[-1,1])plate([[0,.08],[s*.40,.11],[s*.48,-.28],[s*.18,-.14]],ivory,0,0,.17,.05,skirt);break;
 }
 case 'lunakitsune':{
  coat();helmet();for(const s of[-1,1]){const ear=plate([[-.15,0],[.15,0],[s*.05,.50]],ivory,s*.25,1.61,-.06,.14);ear.rotation.z=-s*.15;plate([[-.06,0],[.06,0],[s*.05,.30]],glow,s*.25,1.68,.025,.025).rotation.z=-s*.15;}
  for(let j=0;j<5;j++){const a=(j-2)*.35,tail=rig(Math.sin(a)*.22,.67,-.43);tail.rotation.z=-a;plate([[-.09,0],[.12,-.05],[.25,.21],[.23,.60],[.07,.88],[-.03,.62],[-.20,.31]],ivory,0,0,0,.17,tail);plate([[-.02,.52],[.07,.85],[.21,.61],[.15,.48]],shell,0,0,.10,.025,tail);motions.push(t=>tail.rotation.y=a*.45+Math.sin(t*1.3+j)*.055);}
  const moon=ring(trim,0,1.63,-.63,.63,sculpt,Math.PI*1.5);moon.rotation.z=.75;for(const s of[-1,1])rod([s*.12,1.01,.46],[s*.32,.93,.39],.018,glow);break;
 }
 case 'gravitonace':{
  armour();block(dark,0,1.61,.21,.52,.07,.22);for(const s of[-1,1]){block(trim,s*.46,1.45,0,.12,.26,.23);rod([s*.47,1.57,-.04],[s*.51,1.91,-.07],.019,trim);jewel(s*.51,1.91,-.07,.025,.05);const engine=rig(s*.67,1.10,-.36);ring(trim,0,0,0,.30,engine);ring(glow,0,0,.025,.23,engine);orb(dark,0,0,0,.16,.20,.13,engine);for(let j=0;j<4;j++){const a=j*Math.PI/2;const panel=block(shell,Math.sin(a)*.29,Math.cos(a)*.29,0,.20,.10,.19,engine);panel.rotation.z=-a;}motions.push(t=>engine.rotation.z=s*t*.22);}
  for(let j=0;j<3;j++)block(glow,0,.69+j*.1,.49,.24,.022,.025);break;
 }
 case 'solarcavalier':{
  armour();shell.metalness=.48;shell.roughness=.29;cape(1.12,ivory);
  for(const s of[-1,1]){panel([[-.23,.06],[0,.28],[.25,.05],[.18,-.16],[-.17,-.16]],ivory,s*.48,1.35,.08);seam([[s*.08,1.08,.49],[s*.25,.92,.48],[s*.18,.70,.44]]);for(let j=0;j<3;j++)panel([[-.13,.08],[.13,.08],[.16,-.08],[0,-.14],[-.15,-.08]],ivory,s*.27,.61-j*.09,.31+j*.025);}
  medallion(0,.91,.55,.13);const halo=rig(0,1.64,-.55);ring(trim,0,0,0,.60,halo);ring(glow,0,0,.025,.53,halo);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;const ray=jewel(Math.sin(a)*.70,Math.cos(a)*.70,0,.035,.13,halo,trim);ray.rotation.z=-a;}motions.push(t=>halo.rotation.z=Math.sin(t*.4)*.04);
  const shield=rig(-.72,.93,.15);panel([[-.28,.30],[0,.43],[.28,.30],[.23,-.25],[0,-.46],[-.23,-.25]],ivory,0,0,0,shield);ring(trim,0,.03,.08,.17,shield);for(let j=0;j<8;j++){const a=j*Math.PI/4;rod([Math.sin(a)*.10,.03+Math.cos(a)*.10,.10],[Math.sin(a)*.22,.03+Math.cos(a)*.22,.10],.012,trim,shield);}jewel(0,.03,.12,.06,.08,shield);
  const lance=rig(.79,.11,.03);rod([0,0,0],[0,1.61,0],.03,trim,lance);panel([[-.08,0],[-.12,.24],[0,.65],[.12,.24],[.08,0]],ivory,0,1.49,0,lance);jewel(0,1.69,.08,.04,.18,lance);for(let j=0;j<5;j++)ring(dark,0,.56+j*.09,0,.042,lance).rotation.x=Math.PI/2;break;
 }
 case 'abysscorsair':{
  tailoredCoat();cape(1.22,dark);const hat=rig(0,1.67,-.05);orb(shell,0,.08,0,.44,.20,.40,hat);
  panel([[-.65,-.04],[-.37,.24],[0,.07],[.36,.27],[.65,-.04],[.28,-.14],[-.28,-.14]],shell,0,0,.22,hat);medallion(0,.06,.28,.095,hat);
  const plume=rig(-.38,1.82,-.08);for(let j=0;j<3;j++){const f=feather(-1,j,plume,j===1?glow:ivory);f.scale.set(.45,.47,.45);}motions.push(t=>plume.rotation.z=Math.sin(t*1.1)*.035);
  for(const s of[-1,1]){panel([[-.21,.10],[.20,.11],[.28,-.07],[0,-.19],[-.24,-.06]],shell,s*.48,1.23,0);for(let j=0;j<5;j++)rod([s*.48+(j-2)*.04,1.23,.18],[s*.48+(j-2)*.04,1.10,.18],.009,trim);}
  const wheel=rig(0,1.26,-.64);ring(trim,0,0,0,.51,wheel);ring(shell,0,0,0,.44,wheel);for(let j=0;j<8;j++){const a=j*Math.PI/4;rod([0,0,0],[Math.sin(a)*.68,Math.cos(a)*.68,0],.025,trim,wheel);orb(dark,Math.sin(a)*.68,Math.cos(a)*.68,0,.045,.075,.045,wheel);}motions.push(t=>wheel.rotation.z=Math.sin(t*.6)*.13);
  const cutlass=rig(.73,.31,.17);panel([[0,0],[.08,.10],[.20,.65],[.14,1.04],[.08,.78],[-.03,.14]],ivory,0,.23,0,cutlass);ring(trim,0,.16,0,.15,cutlass,Math.PI*1.5).rotation.z=-.4;rod([0,0,0],[0,.28,0],.032,dark,cutlass);
  const lantern=rig(-.72,.61,.12);for(const s of[-1,1])rod([s*.11,-.18,0],[s*.11,.17,0],.014,trim,lantern);block(trim,0,-.19,0,.26,.045,.20,lantern);block(trim,0,.19,0,.26,.045,.20,lantern);orb(glow,0,0,0,.08,.14,.06,lantern);ring(trim,0,.29,0,.075,lantern);motions.push(t=>lantern.rotation.z=Math.sin(t*1.6)*.07);break;
 }
 case 'clockworkmarquis':{
  tailoredCoat();cape(.95,dark);const hat=rig(0,1.73,-.03);mesh(geo('marquis-hat',()=>new T.CylinderGeometry(.32,.36,.48,mobile?16:24)),shell,0,.20,0,1,1,1,hat);orb(dark,0,-.05,0,.56,.045,.48,hat);ring(trim,0,.01,0,.36,hat).rotation.x=Math.PI/2;cog(0,.15,.34,.11,hat);
  for(const s of[-1,1]){panel([[0,.20],[s*.24,.10],[s*.16,-.29],[s*.03,-.23]],dark,s*.04,.98,.49);rod([s*.12,1.03,.54],[s*.28,.89,.45],.012,trim);}
  const watch=rig(.49,.81,.31);cog(0,0,0,.15,watch);seam([[.12,.95,.51],[.23,.76,.50],[.46,.85,.35]],trim,.012);medallion(-.17,.91,.53,.045);
  const clock=rig(0,1.48,-.59);orb(dark,0,0,0,.63,.63,.045,clock);cog(0,0,.04,.59,clock);ring(ivory,0,0,.085,.49,clock);for(let j=0;j<12;j++){const a=j*Math.PI/6;rod([Math.sin(a)*.43,Math.cos(a)*.43,.10],[Math.sin(a)*.47,Math.cos(a)*.47,.10],.011,trim,clock);}
  const hands=rig(0,1.48,-.46);rod([0,-.08,0],[0,.37,0],.016,glow,hands);rod([0,0,.01],[.24,.10,.01],.021,trim,hands);motions.push(t=>hands.rotation.z=-t*.13);
  const small=rig(-.49,1.15,-.62);cog(0,0,0,.22,small);motions.push(t=>small.rotation.z=t*.28);
  const cane=rig(-.76,.15,.18);rod([0,0,0],[0,1.11,0],.024,dark,cane);ring(trim,.07,1.11,0,.10,cane,Math.PI*1.5).rotation.z=-.75;jewel(.07,1.19,.02,.035,.035,cane);break;
 }
 case 'sakurablademaster':{
  tailoredCoat();helmet();shell.metalness=.22;shell.roughness=.58;
  for(const s of[-1,1]){for(let j=0;j<3;j++){panel([[-.22,.07],[.22,.07],[.20,-.07],[-.18,-.10]],shell,s*.48,1.38-j*.10,.03);for(let k=0;k<3;k++)rod([s*.48+(k-1)*.10,1.39-j*.10,.10],[s*.48+(k-1)*.10,1.31-j*.10,.10],.009,glow);}seam([[s*.18,1.63,.27],[s*.37,1.78,.10],[s*.43,1.98,-.02]],trim,.025);}
  block(dark,0,.70,.44,.66,.15,.055);block(trim,0,.70,.48,.22,.10,.025);jewel(0,.70,.50,.04,.05);
  const blossom=(x,y,z,r,p)=>{for(let j=0;j<5;j++){const a=j*Math.PI*2/5;orb(glow,x+Math.sin(a)*r*.6,y+Math.cos(a)*r*.6,z,r*.48,r*.50,.02,p);}jewel(x,y,z+.025,r*.23,r*.23,p,trim);};blossom(-.33,1.66,.19,.12,sculpt);
  const fan=rig(-.63,1.29,-.43);for(let j=0;j<9;j++){const a=(j-4)*.22;const f=plate([[-.02,0],[-.09,.57],[0,.76],[.09,.57],[.02,0]],j%2?ivory:shell,0,0,0,.035,fan);f.rotation.z=a;rod([0,0,.03],[-Math.sin(a)*.70,Math.cos(a)*.70,.03],.01,trim,fan);}blossom(0,.54,.045,.09,fan);motions.push(t=>fan.rotation.y=Math.sin(t*.9)*.08);
  const katana=rig(.63,.27,.05);katana.rotation.z=-.22;seam([[0,.27,0],[.015,.80,0],[.12,1.28,0]],ivory,.038,katana);seam([[.035,.27,.02],[.05,.80,.02],[.12,1.28,.02]],glow,.009,katana);block(trim,0,.27,0,.28,.045,.15,katana);rod([0,0,0],[0,.25,0],.035,dark,katana);for(let j=0;j<5;j++)block(glow,0,.03+j*.044,.035,.062,.013,.012,katana);break;
 }
 case 'scaraboracle':{
  armour();const head=rig(0,1.58,-.25);for(const s of[-1,1]){panel([[0,.23],[s*.35,.28],[s*.55,-.28],[s*.37,-.67],[s*.19,-.52]],shell,0,0,0,head);for(let j=0;j<7;j++)rod([s*(.19+j*.014),.18-j*.105,.07],[s*(.37+j*.022),.18-j*.105,.07],.013,trim,head);}
  const sun=rig(0,1.97,-.15);orb(glow,0,0,0,.17,.17,.045,sun);ring(trim,0,0,.02,.20,sun);for(const s of[-1,1])seam([[s*.12,-.14,0],[s*.32,.05,-.015],[s*.23,.35,0]],trim,.034,sun);
  for(let j=0;j<7;j++){const a=(j-3)*.22;const tab=panel([[-.04,.03],[.04,.03],[.065,-.21],[0,-.28],[-.065,-.21]],j%2?glow:shell,Math.sin(a)*.43,1.04+Math.cos(a)*.12,.43);tab.rotation.z=-a;}
  const wings=rig(0,1.12,-.49);for(const s of[-1,1])for(let j=0;j<6;j++){const f=feather(s,j,wings,j%2?trim:shell);f.scale.set(.72,.67,.8);f.rotation.z=-s*(.67+j*.16);}orb(shell,0,.19,.09,.18,.23,.13,wings);seam([[0,.40,.21],[0,.14,.24],[0,-.02,.20]],glow,.012,wings);motions.push(t=>wings.rotation.y=Math.sin(t*.7)*.05);
  const staff=rig(.81,.12,.04);rod([0,0,0],[0,1.64,0],.027,trim,staff);ring(glow,0,1.77,0,.16,staff);rod([0,1.40,0],[0,1.64,0],.033,trim,staff);rod([-.15,1.54,0],[.15,1.54,0],.025,trim,staff);for(let j=0;j<5;j++)ring(shell,0,.65+j*.08,0,.039,staff).rotation.x=Math.PI/2;break;
 }
 case 'thunderfalcon':{
  armour();shell.roughness=.26;for(const s of[-1,1]){panel([[-.14,-.18],[.13,-.14],[.20,.16],[0,.35],[-.17,.14]],shell,s*.36,1.57,-.04);seam([[s*.09,1.02,.52],[s*.30,.89,.45],[s*.22,.66,.38]],glow,.012);}
  panel([[-.18,.06],[0,.19],[.18,.06],[0,-.06]],trim,0,1.55,.30);medallion(0,.87,.55,.09);
  for(const s of[-1,1]){const wing=rig(s*.34,1.30,-.47);panel([[0,-.08],[s*.32,.52],[s*1.02,.83],[s*.82,.20],[s*.30,-.18]],shell,0,0,0,wing);
   for(let j=0;j<4;j++){const f=feather(s,j,wing,j%2?trim:ivory);f.position.set(s*(.27+j*.18),.20+j*.10,.06);f.scale.set(.70,.58,.65);f.rotation.z=-s*(1.25+j*.12);rod([s*(.21+j*.15),.13+j*.09,.10],[s*(.35+j*.16),.48+j*.08,.10],.011,glow,wing);}
   const turbine=rig(s*.52,.96,-.42);ring(trim,0,0,0,.20,turbine);ring(glow,0,0,.025,.14,turbine);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const fin=block(dark,Math.sin(a)*.09,Math.cos(a)*.09,.03,.10,.05,.025,turbine);fin.rotation.z=-a+.5;}motions.push((t,moving,jumping)=>{wing.rotation.y=s*(.17+Math.sin(t*1.4)*.045+(jumping?.15:0));turbine.rotation.z=s*t*(moving?1.2:.45);});}
  break;
 }
 case 'verdantdruid':{
  tailoredCoat();cape(1.14);shell.roughness=.8;shell.metalness=.10;helmet();
  for(const s of[-1,1]){seam([[s*.24,1.65,-.10],[s*.40,1.94,-.13],[s*.37,2.23,-.08],[s*.53,2.38,0]],trim,.045);seam([[s*.39,1.96,-.13],[s*.67,2.10,-.08],[s*.72,2.27,0]],trim,.030);for(let j=0;j<3;j++)leaf(s*(.31+j*.14),1.25+j*.06,.06,.75,-s*(.8+j*.25));leaf(s*.32,1.67,.20,.44,-s*.8,sculpt,glow);seam([[s*.12,.96,.49],[s*.29,.85,.43],[s*.23,.69,.39]],trim,.018);}
  const branch=rig(-.69,.10,.04);seam([[0,0,0],[-.03,.52,0],[.05,1.20,0],[-.04,1.66,0]],trim,.043,branch);seam([[-.04,1.5,0],[-.25,1.72,0],[-.19,1.94,0]],trim,.028,branch);seam([[-.03,1.52,0],[.19,1.72,0],[.14,1.91,0]],trim,.028,branch);leaf(-.16,1.70,0,.5,.6,branch);leaf(.16,1.69,0,.5,-.6,branch);
  const seed=rig(-.72,1.86,.04);orb(glow,0,0,0,.10,.15,.09,seed);ring(trim,0,0,0,.18,seed).rotation.y=.6;motions.push(t=>{seed.position.y=1.86+Math.sin(t*1.4)*.045;seed.rotation.y=t*.35;});
  const wreath=rig(0,1.41,-.54);ring(trim,0,0,0,.65,wreath);for(let j=0;j<9;j++){const a=j*Math.PI*2/9;leaf(Math.sin(a)*.58,Math.cos(a)*.58,.025,.45,-a+.65,wreath,j%3===0?ivory:shell);}medallion(0,.96,.53,.10);break;
 }
 case 'crystalmaestro':{
  tailoredCoat();cape(1.02,ivory);shell.metalness=.42;shell.roughness=.26;
  for(const s of[-1,1]){panel([[-.22,.06],[0,.24],[.23,.02],[.16,-.11],[-.18,-.12]],ivory,s*.48,1.28,.02);for(let j=0;j<3;j++){const gem=jewel(s*(.18+j*.13),1.73+j*.06,-.05,.055,.18,sculpt,j%2?trim:glow);gem.rotation.z=-s*(.15+j*.22);}seam([[s*.14,1.08,.49],[s*.27,.90,.45],[s*.19,.69,.43]],trim,.012);}
  const harp=rig(-.76,.57,.04);seam([[0,0,0],[-.31,.27,0],[-.28,.85,0],[-.09,1.15,0],[.21,1.23,0],[.24,.09,0],[0,0,0]],trim,.034,harp);for(let j=0;j<6;j++){const x=-.20+j*.075;rod([x,.16+Math.abs(x)*.35,.015],[x,1.07+(x+.2)*.18,.015],.006,j%2?ivory:glow,harp);}jewel(.21,1.23,0,.065,.12,harp);
  const baton=rig(.73,.72,.12);rod([0,0,0],[-.17,.66,0],.015,ivory,baton);jewel(-.17,.66,0,.035,.08,baton);motions.push((t,moving)=>baton.rotation.z=Math.sin(t*(moving?2.4:1.2))*.07);
  const score=rig(.68,1.54,-.40);for(let j=0;j<3;j++){const n=jewel((j-1)*.19,j*.20,0,.055,.10,score,j%2?trim:glow);n.rotation.z=.3;rod([(j-1)*.19+.04,j*.20,0],[(j-1)*.19+.04,j*.20+.23,0],.012,trim,score);}motions.push(t=>score.position.y=1.54+Math.sin(t*1.1)*.045);break;
 }
 case 'lunamasquerade':{
  tailoredCoat();const collar=rig(0,1.17,-.28);for(let j=0;j<9;j++){const a=(j-4)*.27;const ruff=leaf(Math.sin(a)*.43,Math.cos(a)*.14,0,.65,-a,collar,j%2?ivory:shell);ruff.rotation.y=a*.30;}
  helmet();for(const s of[-1,1]){const horn=rig(s*.22,1.65,-.10);panel([[0,0],[s*.19,.53],[s*.43,.49],[s*.50,.24],[s*.31,.34],[s*.15,-.03]],s<0?ivory:shell,0,0,0,horn);orb(trim,s*.49,.24,0,.055,.055,.055,horn);motions.push(t=>horn.rotation.z=Math.sin(t*1.6+s)*.035);}
  const mask=panel([[-.04,-.13],[.13,-.16],[.23,.04],[.12,.16],[-.06,.12]],ivory,.15,1.30,.40);mask.rotation.y=.13;jewel(.22,1.38,.46,.025,.045,sculpt,dark);
  for(let j=0;j<3;j++)jewel(0,.96-j*.13,.52,.048,.07,sculpt,j%2?trim:ivory);
  const moon=rig(0,1.59,-.61);ring(trim,0,0,0,.64,moon,Math.PI*1.47).rotation.z=.80;for(let j=0;j<3;j++){const card=rig(.60+j*.08,.91+j*.30,-.19);card.rotation.z=-.22+j*.16;panel([[-.13,-.18],[.13,-.18],[.13,.18],[-.13,.18]],ivory,0,0,0,card);jewel(0,0,.075,.045,.075,card,shell);motions.push(t=>{card.position.y=.91+j*.30+Math.sin(t*1.3+j)*.04;card.rotation.y=Math.sin(t*.9+j)*.2;});}
  const ribbon=rig(-.41,.84,-.29);seam([[0,.38,0],[-.27,.12,0],[-.13,-.11,0],[-.33,-.37,0]],trim,.023,ribbon);motions.push(t=>ribbon.rotation.z=Math.sin(t*1.4)*.05);break;
 }
 case 'raveninquisitor':{
  tailoredCoat();helmet();cape(1.30,dark);shell.roughness=.61;shell.metalness=.38;
  panel([[-.27,.08],[0,.20],[.27,.08],[.15,-.06],[0,.03],[-.15,-.06]],dark,0,1.61,.22);for(const s of[-1,1]){jewel(s*.22,1.65,.29,.018,.035);panel([[0,.04],[s*.24,.30],[s*.35,-.03],[s*.16,-.20]],shell,s*.28,1.13,.04);seam([[s*.12,1.07,.49],[s*.31,.90,.43],[s*.23,.68,.38]],trim,.012);}
  for(const s of[-1,1]){const wing=rig(s*.35,1.26,-.47);for(let j=0;j<5;j++){const f=feather(s,j,wing,j%2?dark:shell);f.scale.set(.72,.83-j*.035,.7);f.rotation.z=-s*(.43+j*.23);const spine=feather(s,j,wing,trim);spine.scale.set(.055,.65-j*.035,.2);spine.position.z=.04;spine.rotation.z=f.rotation.z;}motions.push(t=>wing.rotation.y=s*(.12+Math.sin(t*1.1)*.05));}
  const crossbow=rig(.75,.78,.10);crossbow.rotation.z=.27;panel([[-.08,-.34],[.08,-.34],[.07,.46],[-.07,.46]],shell,0,0,0,crossbow);seam([[-.35,.22,0],[-.18,.34,0],[0,.30,0],[.18,.34,0],[.35,.22,0]],trim,.022,crossbow);rod([-.35,.22,.03],[0,-.06,.04],.006,ivory,crossbow);rod([.35,.22,.03],[0,-.06,.04],.006,ivory,crossbow);rod([0,-.16,.06],[0,.56,.06],.012,trim,crossbow);jewel(0,.56,.06,.035,.08,crossbow);
  medallion(-.19,1.02,.49,.07);for(let j=0;j<3;j++)panel([[-.10,.09],[.10,.09],[.09,-.13],[-.09,-.13]],dark,-.35+j*.27,.63,.36);break;
 }
 }
 // Batch static pieces by material within each independently moving assembly.
 for(const parent of assemblies){const batches=new Map();for(const n of [...parent.children])if(n.isMesh){n.updateMatrix();if(!batches.has(n.material))batches.set(n.material,[]);batches.get(n.material).push(n);}
  for(const [material,nodes]of batches){if(nodes.length<2)continue;const data={position:[],normal:[],uv:[]};for(const n of nodes){const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrix);for(const key of Object.keys(data)){const a=g.getAttribute(key);for(let i=0;i<g.attributes.position.count*(key==='uv'?2:3);i++)data[key].push(a?.array[i]||0);}g.dispose();parent.remove(n);}const g=own(new T.BufferGeometry());for(const key of Object.keys(data))g.setAttribute(key,new T.Float32BufferAttribute(data[key],key==='uv'?2:3));g.computeBoundingSphere();mesh(g,material,0,0,0,1,1,1,parent);}
 }
 // Two shader draws: a themed floor sigil and bounded GPU-animated particles.
 const mode=['embers','lightning','snow','stars','venom','reactor','petals','prism','wisps','gravity'].indexOf(spec.aura);
 const time={value:0},strength={value:1},color={value:new T.Color(spec.accent)};
 function shader(options){options.uniforms.fade={value:1};options.fragmentShader='uniform float fade;'+options.fragmentShader.replace(/}\s*$/,'gl_FragColor.a*=fade;}');const m=new T.ShaderMaterial({...options,transparent:true,depthWrite:false});m.onBeforeRender=()=>{m.uniforms.fade.value=m.opacity;m.uniformsNeedUpdate=true;};materials.add(m);return m;}
 const sigilMaterial=shader({side:T.DoubleSide,uniforms:{time,color,strength,mode:{value:mode}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
  uniform float time,strength,mode;uniform vec3 color;varying vec2 v;
  void main(){vec2 p=(v-.5)*2.;float r=length(p),a=atan(p.y,p.x),t=time*.24;
   float ring=1.-smoothstep(.014,.040,abs(r-.76));float inner=1.-smoothstep(.010,.025,abs(r-.58));
   float marks=pow(max(0.,cos(a*12.-t)),14.)*(1.-smoothstep(.025,.09,abs(r-.69)));
   float pulse=.75+.15*sin(time*1.6);float alpha=ring*.42+inner*.15+marks*.50;
   if(mode<1.)alpha*=.6+.4*sin(a*6.+r*9.-time*1.3)*sin(a*6.+r*9.-time*1.3);
   else if(mode<2.)alpha+=.32*(1.-smoothstep(.007,.025,abs(r-(.65+.045*sin(a*9.+time*.8)))));
   else if(mode<4.)alpha+=pow(max(0.,cos(a*6.+t)),28.)*(1.-smoothstep(.02,.14,abs(r-.43)))*.3;
   else if(mode<5.)alpha*=.60+.4*sin(a*4.+time*.6)*sin(a*4.+time*.6);
   else if(mode>8.)alpha+=.24*(1.-smoothstep(.01,.025,abs(r-.4-.04*sin(a*3.+t))));
   vec3 c=mode>6.5&&mode<7.5?mix(color,.55+.45*cos(vec3(0.,2.,4.)+a+t),.6):color;
   gl_FragColor=vec4(c,alpha*pulse*strength*(1.-smoothstep(.9,1.,r)));}`});
 const sigil=mesh(own(new T.PlaneGeometry(2.12,2.12)),sigilMaterial,0,.065,0,1,1,1,aura);sigil.rotation.x=-Math.PI/2;
 const count=mobile?18:30,seed=new Float32Array(count),pos=new Float32Array(count*3);for(let i=0;i<count;i++)seed[i]=(i+.5)/count;
 const pg=own(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('seed',new T.BufferAttribute(seed,1));
 const particleMaterial=shader({uniforms:{time,color,strength,mode:{value:mode}},vertexShader:`
  uniform float time,mode;attribute float seed;varying float life,hue;
  void main(){float t=time,a=seed*70.+t*.28,h=fract(seed+t*.15);vec3 p;
   if(mode<.5||abs(mode-5.)<.4)p=vec3(cos(a)*(.6+h*.22),h*2.15,sin(a)*(.6+h*.22));
   else if(mode<1.5){a=floor(seed*6.)*1.047+sin(t*.4)*.07;p=vec3(cos(a)*.68,h*2.,sin(a)*.68);}
   else if(mode<2.5)p=vec3(cos(a)*.85,(1.-h)*2.15,sin(a)*.68);
   else if(mode<3.5)p=vec3(cos(a)*.87,1.1+sin(a*1.4)*.66,sin(a)*.64);
   else if(mode<4.5)p=vec3(cos(a)*(.58+h*.2),h*1.5,sin(a)*(.58+h*.2));
   else if(mode>5.5&&mode<6.5)p=vec3(cos(a)*.9,(1.-h)*1.95,sin(a)*.65);
   else if(mode<7.5)p=vec3(cos(a)*.85,.3+h*1.6,sin(a)*.65);
   else if(mode<8.5)p=vec3(cos(a)*.79,.5+sin(a*1.4)*.35,sin(a)*.79);
   else p=vec3(cos(a)*.91,1.0+sin(a)*.48,sin(a)*.65);
   life=sin(h*3.14159);hue=seed;vec4 view=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((mode>3.5&&mode<4.5?100.:70.)/max(.2,-view.z),2.,18.);gl_Position=projectionMatrix*view;}`,fragmentShader:`
  uniform float time,mode,strength;uniform vec3 color;varying float life,hue;
  void main(){vec2 p=gl_PointCoord-.5;float d=length(p),alpha=1.-smoothstep(.10,.48,d);vec3 c=color;
   if(mode<.5||abs(mode-5.)<.4)alpha=1.-smoothstep(.12,.5,length(p*vec2(1.5,.85)));
   else if(mode<1.5)alpha=1.-smoothstep(.035,.10,abs(p.x-.15*sin(p.y*16.+hue*13.)));
   else if(mode<3.5)alpha=max(1.-smoothstep(.025,.06,abs(p.x)),1.-smoothstep(.025,.06,abs(p.y)))*(1.-smoothstep(.18,.48,d));
   else if(mode<4.5)alpha=(1.-smoothstep(.025,.075,abs(d-.31)))*.7;
   else if(mode>5.5&&mode<6.5){float a=hue*12.+time*.35;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*p;alpha=1.-smoothstep(.12,.42,length(q*vec2(1.8,.9)));}
   else if(mode<7.5){alpha=1.-smoothstep(.24,.42,abs(p.x)+abs(p.y));c=mix(color,.5+.5*cos(vec3(0.,2.,4.)+hue*6.+time*.2),.6);}
   else if(mode>8.5)alpha=(1.-smoothstep(.035,.08,abs(p.y)))*(1.-smoothstep(.20,.48,abs(p.x)));
   alpha*=max(.15,life)*strength*.82;if(alpha<.01)discard;gl_FragColor=vec4(c,alpha);}`});
 const particles=new T.Points(pg,particleMaterial);particles.frustumCulled=false;particles.userData.count=count;aura.add(particles);
 function update(seconds,{moving=false,jumping=false}={}){if(disposed)return;const t=Number.isFinite(seconds)?seconds:0,clock=reduced?0:t;time.value=clock;strength.value=reduced?.48:jumping?1.12:1;for(const motion of motions)motion(clock,moving,jumping);glow.emissiveIntensity=.85+(reduced?0:Math.sin(t*1.8)*.08);}
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 update(0);return{group,spec,update,dispose};
}
