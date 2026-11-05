// Twenty original outfits. Parts use shared geometries and the existing animation loop.
const ARENA_SKIN_ROWS=[
 ['cometstriker','彗星ストライカー',0x243959,0x69e5ff,'comet',4],
 ['tideranger','潮騒レンジャー',0x1c555d,0x75ffdf,'fin',4],
 ['petalduelist','花霞の決闘士',0x65314d,0xffb6df,'petal',4],
 ['cobaltfalcon','蒼翼ファルコン',0x224a72,0x98cbff,'wing',4],
 ['ambermechanic','琥珀の機巧士',0x64462c,0xffca75,'engine',4],
 ['jadeguardian','翡翠の守り手',0x25554b,0x9cffb2,'antler',4],
 ['violetmagus','紫晶の魔術師',0x48305f,0xd2aaff,'wizard',4],
 ['scarletlancer','紅蓮ランサー',0x672c38,0xff9d74,'lance',4],
 ['ivoryconductor','白夜の指揮者',0xdddde2,0x9fd9ff,'music',4],
 ['shadowlynx','影縫いリンクス',0x292c3e,0xab9cff,'cat',4],
 ['auricdragon','黄金天竜・アウルム',0x6e4825,0xffe5a1,'dragon',5],
 ['solarcrown','日輪至尊・ソルレガリア',0xe8d4a5,0xffbe61,'sun',5],
 ['goldenkraken','金海魔皇・クラーケン',0x194a50,0x7fffe1,'tentacle',5],
 ['radiantseraph','金翼聖天・ラディア',0xe1e8ef,0xb5edff,'seraph',5],
 ['imperialclock','黄金時帝・エターニア',0x3a3047,0xf8d092,'clock',5],
 ['royalstag','金森神鹿・セレスホーン',0x344937,0xcaffaa,'stag',5],
 ['gildedlotus','金蓮幻姫・パドマ',0x62394f,0xffbce8,'lotus',5],
 ['thundercitadel','金雷要塞・ヴォルト',0x293d55,0x82e8ff,'citadel',5],
 ['astralharp','黄金星奏・リラ',0x3d3867,0xd6c2ff,'harp',5],
 ['eclipseanubis','金蝕冥王・アメン',0x202a38,0xffd083,'anubis',5]
];
export const ARENA_GIFT_SKINS=Object.freeze(ARENA_SKIN_ROWS.map(([id,name,color,accent,shape,rarity])=>Object.freeze({id,name,color,accent,shape,rarity,access:'gift',effect:rarity===5?'golden':'stars',glyph:rarity===5?'♛':'✦'})));
export function createArenaGiftSkin(T,spec,{mobile=false}={}){
 const group=new T.Group();group.name='gift-skin-'+spec.id;group.userData.arenaOutfit=spec.shape;group.userData.goldenLegend=spec.rarity===5;
 const geometries=new Set(),materials=new Set(),motions=[],golden=spec.rarity===5;
 const own=g=>(geometries.add(g),g),mat=(color,metal=.6,rough=.32,emission=0)=>{const m=new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:color,emissiveIntensity:emission});materials.add(m);return m;};
 const shell=mat(spec.color),trim=mat(golden?0xe6ba61:0xa1b9cc,.85,.23),dark=mat(0x111d2c,.35,.5),glow=mat(spec.accent,.45,.25,.8),pale=mat(0xebf1ec,.45,.3);
 const box=own(new T.BoxGeometry(1,1,1)),sphere=own(new T.SphereGeometry(1,mobile?12:20,12)),gem=own(new T.OctahedronGeometry(1)),cone=own(new T.ConeGeometry(1,1,6)),torus=own(new T.TorusGeometry(1,.028,6,mobile?32:56));
 function part(g,m,x,y,z,sx,sy,sz,parent=group){const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);n.userData.lightCostume=true;parent.add(n);return n;}
 const block=(m,x,y,z,w,h,d,p)=>part(box,m,x,y,z,w,h,d,p);
 const orb=(m,x,y,z,w,h=w,d=w,p)=>part(sphere,m,x,y,z,w,h,d,p);
 const jewel=(m,x,y,z,w,h=w,d=w,p)=>part(gem,m,x,y,z,w,h,d,p);
 function rig(x,y,z){const r=new T.Group();r.position.set(x,y,z);group.add(r);return r;}
 function rod(a,b,r,m,parent=group){const from=new T.Vector3(...a),to=new T.Vector3(...b),v=to.clone().sub(from);const n=part(own(new T.CylinderGeometry(r,r,v.length(),6)),m,...from.add(to).multiplyScalar(.5).toArray(),1,1,1,parent);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return n;}
 function ring(m,x,y,z,r,p=group){return part(torus,m,x,y,z,r,r,r,p);}
 function blade(side,j,parent=group,scale=1){const n=jewel(j%2?trim:shell,side*(.48+j*.16),1.15+j*.13,-.45,.14*scale,(.42+j*.06)*scale,.07,parent);n.rotation.z=-side*(.4+j*.16);jewel(glow,n.position.x,n.position.y,-.365,.04,.24*scale,.025,parent);}
 // Layered fitted cuirass with an open visor, engraved seams, and independently animated trim.
 orb(shell,0,.83,-.025,.47,.48,.44);block(trim,0,.82,.414,.5,.25,.06);block(shell,0,.84,.452,.43,.18,.025);jewel(glow,0,.84,.49,.065,.085,.02);
 for(const side of [-1,1]){orb(trim,side*.46,1.15,-.03,.18,.17,.23);orb(shell,side*.47,1.17,.01,.145,.13,.21);for(let i=0;i<3;i++)block(trim,side*.2,.64-i*.07,.36,.2,.025,.06);rod([side*.32,.67,.36],[side*.41,1.1,.28],.012,glow);}
 const collar=ring(trim,0,1.25,-.16,.42);collar.rotation.x=Math.PI/2;
 const cape=rig(0,1.2,-.44);for(let i=0;i<5;i++){const n=block(i%2?shell:dark,(i-2)*.16,-.28,-.04,.17,.76,.045,cape);n.rotation.x=-.12;block(trim,(i-2)*.16,-.66,-.015,.16,.025,.025,cape);}motions.push((t,m)=>cape.rotation.x=Math.sin(t*(m?5:1.6))*(m?.12:.025));
 const shape=spec.shape;
 if(['wing','seraph','dragon','comet'].includes(shape)){
  for(const side of [-1,1]){const wing=rig(0,0,0);const count=shape==='seraph'?7:shape==='dragon'?5:3;for(let j=0;j<count;j++)blade(side,j,wing,shape==='dragon'?1.2:1);motions.push(t=>wing.rotation.y=side*(.12+Math.sin(t*1.7)*.06));}
  if(shape==='dragon')for(const side of [-1,1]){rod([side*.25,1.6,0],[side*.52,2,-.15],.065,trim);rod([side*.52,2,-.15],[side*.38,2.22,-.22],.035,trim);}
  if(shape==='comet'){const crest=part(cone,glow,0,1.73,-.16,.13,.62,.18);crest.rotation.x=-.5;}
 }
 if(['fin','tentacle'].includes(shape)){
  for(const side of [-1,1])for(let j=0;j<(golden?4:2);j++){const r=rig(side*.3,1.1,-.4),points=Array.from({length:9},(_,i)=>new T.Vector3(side*(.15+i*.09),Math.sin(i*.42+j)*.3-j*.15,-i*.04));const n=new T.Mesh(own(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,golden?.055:.035,6,false)),j%2?trim:shell);r.add(n);for(let i=2;i<9;i+=2)jewel(glow,...points[i].toArray(),.035,.04,.03,r);motions.push(t=>r.rotation.z=side*Math.sin(t*1.5+j)*.08);}
  for(const side of [-1,1])jewel(trim,side*.35,1.65,-.1,.14,.42,.055).rotation.z=-side*.5;
 }
 if(['petal','lotus'].includes(shape)){
  const flower=rig(0,1.45,-.58);for(let i=0;i<(golden?12:7);i++){const a=i*Math.PI*2/(golden?12:7),n=jewel(i%2?glow:trim,Math.sin(a)*.5,Math.cos(a)*.5,0,.16,.34,.045,flower);n.rotation.z=-a;}
  orb(glow,0,0,.03,.17,.17,.04,flower);motions.push(t=>flower.rotation.z=Math.sin(t*.5)*.12);for(let i=0;i<5;i++)jewel(trim,(i-2)*.13,1.72,-.1,.06,.17+(.05*(2-Math.abs(i-2))),.04);
 }
 if(['engine','citadel'].includes(shape)){
  for(const side of [-1,1]){const r=rig(side*.6,1.05,-.3);block(shell,0,0,0,.32,.65,.35,r);block(trim,0,0,.19,.27,.54,.04,r);for(let j=0;j<4;j++)block(glow,0,-.18+j*.12,.22,.21,.035,.03,r);const core=ring(glow,0,0,-.2,.22,r);motions.push(t=>core.rotation.z=t*.7);if(golden){block(trim,side*.11,.53,-.05,.12,.52,.13,r);jewel(glow,side*.11,.82,-.05,.07,.14,.07,r);}}
  block(shell,0,1.69,-.1,.6,.17,.4);for(const side of [-1,1])rod([side*.29,1.7,-.1],[side*.4,1.95,-.1],.035,trim);
 }
 if(['antler','stag'].includes(shape)){
  for(const side of [-1,1]){const end=golden?2.45:2.15;rod([side*.25,1.6,-.14],[side*.52,end,-.25],.04,trim);for(let i=0;i<(golden?4:2);i++){const y=1.8+i*.15;rod([side*(.32+i*.05),y,-.17],[side*(.62+i*.09),y+.13,-.18],.025,trim);jewel(glow,side*(.62+i*.09),y+.17,-.18,.035,.07,.025);}}
  for(const side of [-1,1])for(let j=0;j<4;j++)jewel(shell,side*(.42+j*.09),1.15-j*.1,-.33,.13,.23,.05).rotation.z=side*.7;
 }
 if(shape==='wizard'){part(cone,shell,0,1.94,-.1,.44,.65,.38);ring(trim,0,1.65,-.1,.5).rotation.x=Math.PI/2;const r=rig(.78,.65,.1);block(trim,0,0,0,.08,.38,.08,r);jewel(glow,0,.4,0,.15,.25,.12,r);motions.push(t=>r.position.y=.65+Math.sin(t*2)*.06);}
 if(shape==='lance'){rod([-.58,.35,-.42],[.55,2.1,-.5],.035,trim);const n=jewel(pale,.61,2.2,-.5,.13,.3,.035);n.rotation.z=-.55;for(const side of [-1,1])jewel(trim,side*.36,1.66,-.13,.06,.3,.06).rotation.z=-side*.3;}
 if(['music','harp'].includes(shape)){const r=rig(.68,1.15,-.35);rod([-.23,-.4,0],[0,.5,0],.04,trim,r);rod([0,.5,0],[.35,.15,0],.04,trim,r);rod([.35,.15,0],[-.23,-.4,0],.04,trim,r);for(let i=0;i<5;i++)rod([-.14+i*.06,-.25+i*.055,.015],[.03+i*.06,.38-i*.06,.015],.008,glow,r);motions.push(t=>r.rotation.y=Math.sin(t)*.1);for(const side of [-1,1])jewel(trim,side*.28,1.7,-.1,.05,.24,.04);}
 if(['cat','anubis'].includes(shape)){for(const side of [-1,1]){const n=part(cone,shell,side*.29,golden?1.98:1.79,-.09,.17,golden?.75:.37,.12);n.rotation.z=-side*.16;part(cone,trim,side*.29,golden?1.98:1.79,.025,.09,golden?.5:.23,.015);if(golden)for(let j=0;j<5;j++)block(j%2?trim:shell,side*(.41+j*.015),1.15-j*.11,-.04,.18,.09,.36);}}
 if(['sun','clock'].includes(shape)){const r=rig(0,1.42,-.6);ring(trim,0,0,0,.78,r);ring(glow,0,0,.025,.67,r);for(let i=0;i<12;i++){const a=i*Math.PI/6,n=shape==='sun'?jewel(trim,Math.sin(a)*.88,Math.cos(a)*.88,0,.07,.2,.04,r):block(trim,Math.sin(a)*.7,Math.cos(a)*.7,.06,.04,.1,.03,r);n.rotation.z=-a;}if(shape==='clock'){const hand=block(glow,0,.18,.07,.035,.4,.035,r);motions.push(t=>hand.rotation.z=-t*.5);}else motions.push(t=>r.rotation.z=t*.07);}
 if(golden){const crown=ring(trim,0,1.7,-.1,.35);crown.rotation.x=Math.PI/2;for(let i=0;i<5;i++)jewel(trim,(i-2)*.13,1.82,-.05,.055,.19+(.04*(2-Math.abs(i-2))),.045);
  const orbit=rig(0,1.2,-.1);for(let i=0;i<6;i++){const a=i*Math.PI/3;jewel(glow,Math.sin(a)*.95,.4*Math.cos(a),Math.cos(a)*.65,.035,.06,.035,orbit);}motions.push(t=>orbit.rotation.y=t*.2);
 }
 let disposed=false;const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 function update(t,{moving=false}={}){if(disposed)return;t=reduced?0:Number.isFinite(t)?t:0;for(const f of motions)f(t,moving);glow.emissiveIntensity=.75+(reduced?0:Math.sin(t*1.8)*.1);}
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 update(0);return{group,spec,update,dispose};
}
