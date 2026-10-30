// Ten legend-tier outfits. All animation uses the caller's existing frame loop.
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
 {id:'gravitonace',name:'重力特務・グラビトン',color:0x222b40,accent:0x7cffe6,trim:0x8ca7bc,aura:'gravity',glyph:'◎'}
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
