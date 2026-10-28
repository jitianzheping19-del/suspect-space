// Finishing work for the fifteen remaining outfits. Uses the owner's resources and clock.
const REMAINING_COUTURE_IDS=['streetdj','honeykeeper','mushroomoracle','jellyveil','origamitsuru','patisserie','scarabpharaoh','rainwalker','railconductor','inkmonk','carnivaljoker','rescueworker','cactusmariachi','bathduck','retroarcade'];

// Keep the game's ghost/fade treatment working for custom shader decorations too.
function coutureMaterial(T,options){
 options.uniforms.coutureOpacity={value:1};
 options.fragmentShader='uniform float coutureOpacity;'+options.fragmentShader.replace(/}\s*$/,'gl_FragColor.a*=coutureOpacity;}');
 const material=new T.ShaderMaterial(options);
 material.onBeforeRender=()=>{material.uniforms.coutureOpacity.value=material.opacity;material.uniformsNeedUpdate=true;};
 return material;
}

export function refineRemainingDesigns(T,h){
 const {id,cloth,gold,lining,dark,leather,ivory,glow,silver,sculpt,fx,own,cached,materials,textures,uniforms,mobile,held,mesh,orb,block,node,motion,hoop,cylinder,tube,plate,stud,bodyPatch,belt,panel,seam,flower,surface}=h;
 if(!REMAINING_COUTURE_IDS.includes(id))return;
 sculpt.userData.coutureFinish=1;
 const texture=(paint,w=256,height=256)=>{const c=document.createElement('canvas');c.width=w;c.height=height;paint(c.getContext('2d'),w,height);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.add(tex);return tex;};
 // Real fabric/paper patterns, authored once; they do not repaint each frame.
 const fabricMap=texture((c,w,height)=>{
  c.fillStyle='#f3f3f3';c.fillRect(0,0,w,height);c.lineWidth=1;
  for(let y=0;y<height;y+=4){c.strokeStyle=y%8?'#dadada':'#eeeeee';c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  for(let x=0;x<w;x+=4){c.strokeStyle='#eeeeee';c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();}
  if(['streetdj','retroarcade'].includes(id)){c.strokeStyle='#b8b8b8';for(let y=12;y<height;y+=40)for(let x=12;x<w;x+=48){c.beginPath();c.moveTo(x,y);c.lineTo(x+18,y);c.lineTo(x+18,y+12);c.lineTo(x+30,y+12);c.stroke();c.strokeRect(x+28,y+10,4,4);}}
  else if(id==='carnivaljoker'){for(let y=-32;y<height;y+=48)for(let x=-32;x<w;x+=48){c.fillStyle=(x+y)%96?'#f9f9f9':'#939393';c.beginPath();c.moveTo(x,y-24);c.lineTo(x+24,y);c.lineTo(x,y+24);c.lineTo(x-24,y);c.closePath();c.fill();}}
  else if(['honeykeeper','patisserie','cactusmariachi'].includes(id)){c.strokeStyle='#c5c5c5';for(let y=12;y<height;y+=36)for(let x=12;x<w;x+=36){c.beginPath();if(id==='honeykeeper'){for(let j=0;j<6;j++){const a=j*Math.PI/3;c.lineTo(x+Math.sin(a)*14,y+Math.cos(a)*14);}}else{c.moveTo(x,y-14);c.lineTo(x+14,y);c.lineTo(x,y+14);c.lineTo(x-14,y);}c.closePath();c.stroke();}}
  else if(id==='railconductor'){c.strokeStyle='#bfbfbf';for(let x=0;x<w;x+=18){c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();}}
  else if(['origamitsuru','inkmonk','scarabpharaoh'].includes(id)){c.strokeStyle='#d4d4d4';for(let j=0;j<14;j++){c.beginPath();c.moveTo(j*20,0);c.lineTo(j*20+70,height);c.stroke();}}
  else if(id==='mushroomoracle'){c.strokeStyle='#c7c7c7';for(let j=0;j<10;j++){c.beginPath();c.moveTo(j*28,height);c.bezierCurveTo(j*28-20,160,j*28+15,90,j*28,0);c.stroke();}}
 });
 fabricMap.wrapS=fabricMap.wrapT=T.RepeatWrapping;fabricMap.repeat.set(2,2);
 const textile=id==='bathduck'||id==='inkmonk'||id==='origamitsuru'?ivory:cloth;textile.map=fabricMap;textile.needsUpdate=true;
 function pipedPanel(p,w,height,depth=.08,m=dark){const shape=new T.Shape(),r=.06;shape.moveTo(-w/2+r,-height/2);shape.lineTo(w/2-r,-height/2);shape.quadraticCurveTo(w/2,-height/2,w/2,-height/2+r);shape.lineTo(w/2,height/2-r);shape.quadraticCurveTo(w/2,height/2,w/2-r,height/2);shape.lineTo(-w/2+r,height/2);shape.quadraticCurveTo(-w/2,height/2,-w/2,height/2-r);shape.lineTo(-w/2,-height/2+r);shape.quadraticCurveTo(-w/2,-height/2,-w/2+r,-height/2);const g=own(new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:2}));g.translate(0,0,-depth/2);return mesh(g,m,0,0,0,1,1,1,p);}
 function star(p,x,y,z,r,m=gold){const points=[];for(let j=0;j<10;j++){const a=j*Math.PI/5,k=j%2?.42:1;points.push([Math.sin(a)*r*k,Math.cos(a)*r*k]);}return plate(points,.015,m,x,y,z,p);}
 function arc(points,m=gold,r=.007,p=sculpt){return tube(points,r,m,p);}
 function embroideredWing(p,side,x,y,z){for(let j=0;j<5;j++){const o=plate([[0,0],[side*(.17+j*.028),.09-j*.025],[side*(.14+j*.028),.045-j*.025]],.012,gold,x,y,z,p);o.rotation.y=side*.12;}}
 function screen(p,x,y,z,w,height,theme){
  const u={time:{value:0},color:{value:new T.Color(theme)}};uniforms.push(u);const digital=theme===0xff77b6;
  const m=coutureMaterial(T,{uniforms:u,side:T.DoubleSide,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:digital?
   'uniform float time;uniform vec3 color;varying vec2 v;void main(){vec2 cell=floor(v*vec2(14.,20.));float maze=step(.65,fract(sin(dot(cell,vec2(34.17,81.91)))*1937.));float scan=.87+.13*sin(v.y*180.-time*3.);float player=step(length(cell-vec2(mod(floor(time*2.),10.)+2.,3.)),1.);vec3 c=vec3(.025,.055,.08)+color*maze*.25+vec3(.35,1.,.84)*player;gl_FragColor=vec4(c*scan,1.);}' :
   'uniform float time;uniform vec3 color;varying vec2 v;void main(){float wave=.5+.16*sin(v.x*22.+time*2.)+.09*sin(v.x*41.-time*3.);float line=1.-smoothstep(.008,.027,abs(v.y-wave));float grid=step(.97,fract(v.x*12.))*.07+step(.97,fract(v.y*8.))*.07;gl_FragColor=vec4(vec3(.015,.035,.055)+color*(line*.85+grid),1.);}'});materials.add(m);const o=mesh(own(new T.PlaneGeometry(w,height)),m,x,y,z,1,1,1,p);o.rotation.y=Math.PI;return o;
 }
 function silverZip(x,y,z,p=sculpt){block(dark,x,y,z,.025,.23,.018,p);for(let j=0;j<7;j++)block(silver,x+(j%2?.006:-.006),y-.09+j*.03,z+.012,.012,.014,.009,p);}
 switch(id){
 case 'streetdj':{
  const violet=surface(0x9958c9,.36,.29,.2),cyan=surface(0x72e9e3,.35,.3,.9);
  for(const s of[-1,1]){const pad=node(s*.46,1.42,0);hoop(violet,s*.08,0,0,.126,0,Math.PI/2,pad);hoop(cyan,s*.09,0,0,.108,0,Math.PI/2,pad);for(let j=0;j<12;j++){const a=j*Math.PI/6;stud(silver,s*.104,Math.sin(a)*.11,Math.cos(a)*.11,.008,pad);}silverZip(s*.25,.72,.408);}
  const deck=node(0,1.06,-.708);pipedPanel(deck,.55,.72,.045);screen(deck,0,0,-.035,.37,.15,0x77e8db);for(const y of[-.20,.20]){for(const r of[.065,.089,.115])hoop(silver,0,y,-.034,r,0,0,deck);stud(glow,0,y,-.044,.017,deck);}for(let j=0;j<3;j++)block(cyan,-.12+j*.12,-.31,-.04,.05,.012,.01,deck);
  embroideredWing(sculpt,-1,-.02,.93,.49);embroideredWing(sculpt,1,.02,.93,.49);break;
 }
 case 'honeykeeper':{
  const wax=surface(0xe7b35d,.12,.46),amber=surface(0xffcf69,.25,.23,.18);bodyPatch(ivory,{bottom:1.10,top:1.74,offset:.006});
  for(const s of[-1,1]){const pin=node(s*.30,.88,.36);plate([[-.04,-.07],[.04,-.07],[.04,.07],[-.04,.07]],.03,gold,0,0,0,pin);block(dark,0,0,.02,.025,.055,.012,pin);}
  const hive=node(0,1.05,-.83);for(let j=0;j<7;j++){const x=(j%3-1)*.10,y=.15-Math.floor(j/3)*.09;const points=Array.from({length:6},(_,k)=>[x+Math.sin(k*Math.PI/3)*.062,y+Math.cos(k*Math.PI/3)*.062,-.01]);tube(points,.006,gold,hive,true);orb(amber,x,y,0,.045,.045,.018,hive);}
  for(let j=0;j<3;j++){const drop=node(-.10+j*.09,-.17,-.02,hive);orb(wax,0,0,0,.012,.03,.012,drop);motion(drop,(n,t)=>n.scale.y=.8+.2*Math.sin(t*1.3+j));}flower(sculpt,.29,.58,.28,.055,ivory);break;
 }
 case 'mushroomoracle':{
  const moss=surface(0x627d68,.12,.77),faint=surface(0x89d9b2,.1,.6,.25);
  const back=node(0,1.04,-.70);for(const s of[-1,1]){arc([[0,-.21,0],[s*.17,0,0],[s*.12,.26,.01]],gold,.009,back);for(let j=0;j<4;j++){const leaf=plate([[0,0],[s*.12,.03],[s*.16,.12],[s*.05,.10]],.018,moss,s*.04,-.15+j*.10,.02,back);leaf.rotation.z=-s*.12;}}
  const mushroom=node(0,1.65,-.04);hoop(faint,0,-.005,0,.65,Math.PI/2,0,mushroom).scale.z=.68;for(let j=0;j<9;j++){const a=j*2.4;orb(ivory,Math.sin(a)*.48,.28+Math.cos(a)*.02,Math.cos(a)*.39,.014,.007,.014,mushroom);}
  for(const s of[-1,1]){const cord=node(s*.36,1.03,-.19);arc([[0,0,0],[s*.08,-.22,-.02],[0,-.40,0]],leather,.013,cord);const lantern=node(0,-.41,0,cord);orb(faint,0,0,0,.055,.075,.055,lantern);for(let j=0;j<4;j++){const a=j*Math.PI/2;arc([[0,.10,0],[Math.sin(a)*.07,0,Math.cos(a)*.07],[0,-.10,0]],gold,.004,lantern);}motion(cord,(n,t)=>n.rotation.z=Math.sin(t*.9+s)*.025);}
  break;
 }
 case 'jellyveil':{
  for(const m of materials)if(m.color?.getHex()===0xa4b9ed&&m.transparent){m.opacity=.29;m.roughness=.16;}
  const pearl=surface(0xd9d9f7,.45,.22,.15);for(const s of[-1,1]){const shoulder=node(s*.38,1.08,-.03);orb(pearl,0,0,0,.115,.055,.14,shoulder);for(let j=0;j<5;j++)stud(glow,(j-2)*.025,.04,.08,.008,shoulder);}
  const core=node(0,1.92,-.08);mesh(cached('couture-gem',()=>new T.IcosahedronGeometry(1,0)),glow,0,0,0,.06,.095,.06,core);for(let j=0;j<3;j++){const r=hoop(pearl,0,0,0,.10+j*.024,Math.PI/2,j*.6,core);motion(r,(n,t)=>n.rotation.z=t*(.16+j*.04));}
  for(let j=0;j<12;j++){const a=j*Math.PI/6;stud(pearl,Math.sin(a)*.56,1.66,Math.cos(a)*.50-.07,.011);}break;
 }
 case 'origamitsuru':{
  const ink=surface(0x4d6571,.1,.73),red=surface(0xc05b59,.2,.55);const crane=node(0,1.18,-.607);
  for(const s of[-1,1]){plate([[0,.03],[s*.18,.22],[s*.63,.35],[s*.26,.11]],.012,ivory,0,0,-.035,crane);plate([[0,.03],[s*.26,.11],[s*.44,.10],[s*.25,-.05]],.012,lining,0,0,-.054,crane);arc([[0,.03,-.06],[s*.26,.11,-.06],[s*.63,.35,-.05]],gold,.005,crane);}
  const beltSeal=node(0,.77,.475);plate([[0,.05],[.045,0],[0,-.05],[-.045,0]],.025,red,0,0,0,beltSeal);for(const s of[-1,1]){seam([s*.21,.62],[s*.13,.52],ink,.004);seam([s*.28,.63],[s*.22,.50],gold,.004);}break;
 }
 case 'patisserie':{
  const pink=surface(0xe4a9a9,.10,.56),chocolate=surface(0x3c221d,.18,.36);
  for(const s of[-1,1]){const macaron=node(s*.38,1.06,-.015);orb(pink,0,.015,0,.13,.047,.14,macaron);orb(ivory,0,-.015,0,.13,.02,.14,macaron);orb(chocolate,0,-.045,0,.13,.028,.14,macaron);for(let j=0;j<5;j++){const a=j*Math.PI/2.5;stud(gold,Math.sin(a)*.11,.03,Math.cos(a)*.11,.007,macaron);}}
  const parcel=node(0,.98,-.675);pipedPanel(parcel,.50,.55,.02,chocolate);block(pink,0,0,-.025,.065,.53,.01,parcel);block(pink,0,0,-.03,.48,.055,.01,parcel);for(const s of[-1,1]){const loop=hoop(gold,s*.075,.08,-.04,.08,0,0,parcel);loop.scale.set(.075,.035,.06);}star(parcel,0,-.12,-.04,.055,gold);
  for(let j=0;j<6;j++)orb(ivory,-.17+j*.064,1.89,.13,.032,.026,.03);break;
 }
 case 'scarabpharaoh':{
  const lapis=surface(0x1b5e78,.5,.25),carnelian=surface(0xb95548,.48,.25);bodyPatch(lapis,{bottom:1.37,top:1.76,offset:.006});
  for(const s of[-1,1]){for(let j=0;j<3;j++)arc([[s*.04,.96-j*.04,.46],[s*.23,.96-j*.04,.40],[s*.35,1.025-j*.035,.27]],gold,.012);for(let j=0;j<3;j++)stud(carnelian,s*.27,.89-j*.043,.397,.009);}
  const scarab=node(0,1.10,-.675);orb(lapis,0,0,0,.075,.16,.02,scarab);block(gold,0,0,-.025,.008,.29,.01,scarab);for(const s of[-1,1])for(let j=0;j<3;j++)arc([[s*.06,.08-j*.07,-.015],[s*.18,.10-j*.10,-.018],[s*.22,.04-j*.10,-.018]],gold,.008,scarab);
  const cobra=node(0,1.85,.31);orb(gold,0,0,0,.035,.07,.027,cobra);for(const s of[-1,1])stud(carnelian,s*.019,.014,.028,.005,cobra);break;
 }
 case 'rainwalker':{
  const wet=texture((c,w,h)=>{c.fillStyle='#d6d6d6';c.fillRect(0,0,w,h);for(let j=0;j<44;j++){const x=(j*61)%w,y=(j*83)%h,r=2+j%3;const g=c.createRadialGradient(x-1,y-1,0,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.45,'#b3b3b3');g.addColorStop(1,'#d6d6d6');c.fillStyle=g;c.beginPath();c.ellipse(x,y,r,r*1.5,0,0,Math.PI*2);c.fill();}});cloth.roughnessMap=wet;cloth.roughness=.23;
  bodyPatch(cloth,{bottom:.40,top:.58,offset:.012,fold:.025,faceOpen:false});for(const s of[-1,1]){const boot=node(0,-.03,0,sculpt.getObjectByName("tailored-boot-"+s)||sculpt);hoop(lining,0,.13,0,.189,Math.PI/2,0,boot);block(ivory,0,0,.205,.10,.018,.016,boot);}
  for(let j=0;j<10;j++){const a=j*2.4,x=Math.sin(a)*.32,y=.58+(j%5)*.072;stud(ivory,x,y,Math.sqrt(Math.max(.01,.477**2-x*x)),.005);}break;
 }
 case 'railconductor':{
  const enamel=surface(0x233a52,.5,.31);const train=node(0,1.07,-.685);pipedPanel(train,.43,.56,.045,enamel);
  for(const s of[-1,1]){const window=node(s*.104,.09,-.035,train);pipedPanel(window,.14,.20,.015,gold);block(dark,0,0,-.014,.112,.165,.014,window);block(glow,0,-.03,-.023,.008,.07,.008,window);orb(dark,s*.13,-.26,-.03,.072,.072,.028,train);hoop(gold,s*.13,-.26,-.056,.044,0,0,train);embroideredWing(sculpt,s,s*.07,.93,.47);}
  for(let j=0;j<6;j++)block(gold,-.14+j*.055,-.11,-.04,.018,.08,.01,train);block(gold,0,.33,0,.47,.04,.15,train);
  arc([[.30,1.045,.32],[.23,.96,.39],[.32,.86,.34]],gold,.010);arc([[.34,1.04,.29],[.28,.92,.39],[.35,.86,.32]],gold,.006);break;
 }
 case 'inkmonk':{
  const calligraphy=texture((c,w,h)=>{c.fillStyle='#e4e1ce';c.fillRect(0,0,w,h);c.fillStyle='#d4d0bc';for(let j=0;j<160;j++)c.fillRect(j*37%w,j*71%h,1,14);c.fillStyle='#16252c';c.font='700 165px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('墨',w/2,h*.43,w*.78);c.font='42px serif';c.fillText('影',w*.78,h*.80);c.strokeStyle='#a84e45';c.lineWidth=4;c.strokeRect(w*.15,h*.74,35,40);c.fillStyle='#a84e45';c.fillRect(w*.15+7,h*.74+8,21,5);},256,384);
  const u={time:{value:0},map:{value:calligraphy}};uniforms.push(u);const m=coutureMaterial(T,{uniforms:u,side:T.DoubleSide,vertexShader:'uniform float time;varying vec2 v;void main(){v=uv;vec3 p=position;p.z+=sin(uv.y*6.+time*1.2)*.028*(1.-uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform sampler2D map;varying vec2 v;void main(){vec3 c=texture2D(map,v).rgb;gl_FragColor=vec4(c*(.78+.13*sin(v.y*9.)),1.);}'});materials.add(m);
  const scroll=mesh(own(new T.PlaneGeometry(.48,.71,5,12)),m,0,1.05,-.595);scroll.rotation.y=Math.PI;scroll.userData.dynamic=true;
  for(const y of[.675,1.425]){const roller=cylinder(gold,0,y,-.57,.032,.58);roller.rotation.z=Math.PI/2;for(const s of[-1,1])orb(dark,s*.305,y,-.57,.032,.041,.041);}break;
 }
 case 'carnivaljoker':{
  for(const s of[-1,1]){const tassel=node(s*.50,1.98,0);orb(gold,0,0,0,.048,.053,.048,tassel);hoop(dark,0,-.008,0,.035,0,0,tassel);stud(glow,0,-.017,.047,.008,tassel);motion(tassel,(n,t)=>n.rotation.z=Math.sin(t*2+s)*.08);}
  const wand=held(1,.10,.09,0);cylinder(dark,0,.06,0,.018,.42,wand);star(wand,0,.29,0,.105,glow);hoop(gold,0,.29,0,.13,0,0,wand);motion(wand,(n,t)=>n.rotation.z=Math.sin(t*1.7)*.06);
  const collar=node(0,1.005,-.05);for(let j=0;j<9;j++){const a=-1.3+j*.325;stud(glow,Math.sin(a)*.43,0,Math.cos(a)*.43,.008,collar);}break;
 }
 case 'rescueworker':{
  const carbon=surface(0x293d43,.45,.38);for(const s of[-1,1]){const pad=node(s*.38,1.075,-.04);orb(carbon,0,.0,0,.13,.085,.17,pad);arc([[-.08,.04,.12],[0,.07,.15],[.08,.04,.12]],lining,.009,pad);for(let j=0;j<4;j++)stud(silver,(j-1.5)*.04,.055,.11,.006,pad);}
  const harness=node(0,1.07,-.66);block(carbon,0,0,0,.09,.59,.10,harness);for(const s of[-1,1])arc([[s*.24,.25,-.015],[s*.29,.04,-.02],[s*.25,-.27,0]],silver,.014,harness);for(let j=0;j<5;j++)block(lining,-.024,.98-j*.027,.48,.075,.012,.013).rotation.z=.45;
  const clamp=node(-.38,.80,-.46);block(silver,0,0,0,.05,.41,.05,clamp);for(const s of[-1,1])arc([[0,.16,0],[s*.09,.25,0],[s*.12,.14,0]],silver,.024,clamp);break;
 }
 case 'cactusmariachi':{
  const rosewood=surface(0x814234,.20,.38),jade=surface(0x416a4b,.15,.56);for(const s of[-1,1]){const patch=node(s*.34,.84,.28);flower(patch,0,0,0,.045,lining);for(let j=0;j<5;j++){const a=j*Math.PI/2.5;arc([[Math.sin(a)*.035,Math.cos(a)*.035,0],[Math.sin(a)*.085,Math.cos(a)*.085,0]],gold,.003,patch);}}
  const guitar=node(0,1.03,-.654);guitar.rotation.z=-.22;orb(rosewood,0,-.14,0,.225,.255,.024,guitar);orb(rosewood,0,.10,0,.167,.18,.024,guitar);orb(dark,0,.04,-.025,.075,.075,.012,guitar);for(const r of[.077,.087,.096])hoop(gold,0,.04,-.04,r,0,0,guitar);for(let j=0;j<6;j++)block(silver,(j-2.5)*.009,.07,-.045,.002,.51,.005,guitar);
  for(const s of[-1,1])for(let j=0;j<3;j++){orb(gold,s*.06,.67+j*.045,-.56,.014,.014,.025);arc([[s*.42,.86,-.12],[s*.55,.93,-.13],[s*.54,1.08,-.13]],jade,.029);}break;
 }
 case 'bathduck':{
  ivory.roughness=.87;for(const s of[-1,1]){const collar=[];for(let j=0;j<8;j++){const f=j/7,x=s*(.30-f*.23),y=1.04-f*.25;collar.push([x,y,Math.sqrt(Math.max(.01,.473**2-x*x))]);}arc(collar,lining,.025);}
  const bundle=node(0,1.23,-.55);const towel=cylinder(ivory,0,.01,-.03,.087,.38,bundle);towel.rotation.z=Math.PI/2;for(const s of[-1,1]){hoop(gold,s*.11,.01,-.03,.089,0,Math.PI/2,bundle);const ends=hoop(lining,s*.197,.01,-.03,.056,0,Math.PI/2,bundle);}
  const badge=node(-.20,.86,.42);orb(gold,0,0,0,.034,.025,.015,badge);orb(gold,.007,.027,.003,.022,.022,.015,badge);stud(dark,.014,.033,.018,.003,badge);break;
 }
 case 'retroarcade':{
  const cyan=surface(0x5debd3,.30,.25,.7);const cabinet=node(0,1.07,-.697);pipedPanel(cabinet,.49,.72,.04,cloth);screen(cabinet,0,.04,-.031,.34,.40,0xff77b6);block(gold,0,.29,-.03,.39,.06,.02,cabinet);for(let j=0;j<5;j++){const lamp=block(j%2?cyan:glow,-.14+j*.07,.29,-.045,.028,.018,.01,cabinet);motion(lamp,(n,t)=>n.visible=(Math.floor(t*4)+j)%6!==0);}for(const s of[-1,1]){arc([[s*.23,-.28,-.02],[s*.23,.30,-.02],[s*.15,.34,-.02]],glow,.008,cabinet);silverZip(s*.26,.71,.405);}
  const crest=node(0,1.73,-.04);for(let j=0;j<5;j++)block(j%2?glow:cyan,-.10+j*.05,.0,.025,.03,.027,.027,crest);break;
 }
 }
}

// A single themed floor shader, not fifteen copies of the same generic glowing disc.
export function createRemainingAura(T,{id,fx,own,materials,uniforms,color,secondary}){
 const kind=REMAINING_COUTURE_IDS.indexOf(id);if(kind<0)return;
 const patterns=[
  'float bands=pow(.5+.5*sin(a*24.),16.);float beat=.05+.05*sin(time*3.+floor(a*12.));f=band(r,.64+beat,.016)+band(r,.82,.008)*bands;',
  'vec2 q=p*8.;q.x+=mod(floor(q.y),2.)*.5;float hex=length(fract(q)-.5);f=band(r,.77,.012)+band(hex,.33,.025)*(1.-smoothstep(.66,.87,r))*.50;',
  'float root=.72+.07*sin(a*7.+sin(a*3.+time*.3));f=band(r,root,.014)*(.5+.5*sin(a*19.))+band(r,.85,.005);',
  'float wave=.69+.07*sin(a*6.+time*1.1);f=band(r,wave,.022)+band(r,wave+.10,.009);',
  'float edge=.59/(max(abs(cos(a)),abs(sin(a)))+.08);f=band(r,edge,.009)+band(r,.83,.006)*pow(.5+.5*cos(a*12.-time*.4),12.);',
  'f=band(r,.72,.016)+band(r,.84,.008);f+=pow(.5+.5*cos(a*10.+time*.5),24.)*band(r,.78,.045);',
  'f=band(r,.63,.011)+band(r,.81,.011);f+=pow(.5+.5*cos(a*32.-time*.3),28.)*band(r,.73,.06);',
  'float wave=fract(time*.35);f=band(r,.5+wave*.40,.014)*(1.-wave)+band(r,.68+fract(wave+.5)*.3,.007)*.5;',
  'f=band(r,.69,.008)+band(r,.85,.008);f+=pow(.5+.5*cos(a*28.+time*.4),30.)*band(r,.77,.05);',
  'float brush=.68+.055*sin(a*3.+time*.2);f=band(r,brush,.035)*(.4+.6*pow(.5+.5*sin(a*9.-time*.3),2.));',
  'f=band(r,.72,.014)+pow(.5+.5*cos(a*8.-time*.6),16.)*band(r,.83,.035);',
  'f=band(r,.73,.008)+band(r,.82,.008)*step(.5,fract(a*7.+time*.2));',
  'float petals=.69+.08*cos(a*5.+time*.25);f=band(r,petals,.013)+band(r,petals+.08,.006);',
  'float wave=fract(time*.22);f=band(r,.45+wave*.45,.015)*(1.-wave)+band(r,.70,.007);',
  'vec2 q=floor(p*18.)/18.;float square=max(abs(q.x),abs(q.y));f=band(square,.62,.016)+band(square,.77,.012)*step(.3,fract((q.x+q.y)*9.+time));'
 ];
 const u={time:{value:0},color:{value:color},secondary:{value:secondary}};uniforms.push(u);
 const m=coutureMaterial(T,{uniforms:u,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float time;uniform vec3 color,secondary;varying vec2 v;float band(float x,float at,float width){return 1.-smoothstep(width,width*2.,abs(x-at));}void main(){vec2 p=(v-.5)*2.;float r=length(p),a=atan(p.y,p.x),f=0.;${patterns[kind]}float haze=exp(-pow((r-.72)*7.,2.))*.035;float alpha=min(.55,f*.38+haze)*(1.-smoothstep(.94,1.,r));gl_FragColor=vec4(mix(color,secondary,.4+.3*sin(a+time*.25)),alpha);}`});materials.add(m);
 const ring=new T.Mesh(own(new T.PlaneGeometry(2.08,2.08)),m);ring.name='couture-aura-floor-'+id;ring.rotation.x=-Math.PI/2;ring.position.y=.033;fx.add(ring);
}
