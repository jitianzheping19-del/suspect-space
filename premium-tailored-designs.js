import {refineRemainingDesigns} from './premium-couture.js';
// Individual silhouettes built on the same capsule envelope and limb bindings.
export function addTailoredDesign(T,h){
 const {id,cloth,gold,lining,dark,leather,ivory,glow,silver,sculpt,fx,own,cached,materials,mesh,orb,block,node,motion,hoop,cylinder,tube,plate,stud,bodyPatch,belt,panel,seam,arm,boot,held,flower,surface}=h;
 const both=(sleeve=cloth,shoe=leather,wide=false)=>{for(const s of[-1,1]){arm(s,sleeve,{wide});boot(s,shoe);}};
 const jacket=(m=cloth)=>{bodyPatch(m,{bottom:.40,top:1.12});for(const s of[-1,1])seam([s*.31,1.055],[s*.10,.79],gold,.012);};
 const tail=(x,y,z,m,w=.2,length=.45)=>{const n=node(x,y,z);plate([[-w,.14],[w,.14],[w*.9,-length],[0,-length-.05],[-w*.9,-length]],.025,m,0,0,0,n);motion(n,(o,t,moving)=>o.rotation.x=Math.sin(t*2+x*5)*(moving?.13:.035));return n;};
 const star=(m,x,y,z,r,p=sculpt)=>{const pts=[];for(let j=0;j<10;j++){const a=j*Math.PI/5,rr=j%2?r*.43:r;pts.push([Math.sin(a)*rr,Math.cos(a)*rr]);}return plate(pts,.018,m,x,y,z,p);};
 const leaf=(m,x,y,z,r,p=sculpt)=>plate([[0,0],[-r*.45,r*.4],[-r*.35,r*.8],[0,r],[r*.35,r*.8],[r*.45,r*.4]],.015,m,x,y,z,p);
 const cap=(m,y=1.64)=>{const n=node(0,y,0);cylinder(m,0,.055,0,.34,.12,n,.37);const brim=orb(dark,0,-.015,.16,.40,.025,.36,n);hoop(gold,0,.015,0,.36,Math.PI/2,0,n);return n;};
 const gemGeo=cached('design-gem',()=>new T.OctahedronGeometry(1));
 if(id==='streetdj'){
  jacket();both(cloth,dark);belt(dark,.57,.10);panel(dark,0,.84,.34,.25,.032);
  const cyan=surface(0x53e5ed,.45,.3,.8);for(const s of[-1,1]){seam([s*.29,.98],[s*.29,.61],cyan,.013);tube([[s*.41,1.39,.01],[s*.38,1.69,-.01],[0,1.77,-.02]],.04,dark);const ear=node(s*.45,1.42,0);orb(dark,0,0,0,.105,.16,.14,ear);hoop(glow,s*.055,0,0,.102,0,Math.PI/2,ear);orb(gold,s*.1,0,0,.025,.08,.08,ear);}
  for(let j=0;j<6;j++){const n=block(j%2?cyan:glow,-.12+j*.048,.79,.488,.022,.08,.009);motion(n,(o,t)=>o.scale.y=.08*(.4+Math.abs(Math.sin(t*2.8+j))*.7));}
  const deck=node(0,1.06,-.56);block(dark,0,0,0,.56,.69,.13,deck);for(const y of[-.18,.18]){hoop(gold,0,y,-.081,.14,0,0,deck);orb(dark,0,y,-.095,.12,.12,.01,deck);const pin=block(glow,0,y,-.11,.013,.21,.012,deck);motion(pin,(o,t)=>o.rotation.z=t*1.3+y);}
  for(const s of[-1,1]){const lace=node(s*.24,.28,.206);for(let j=0;j<3;j++)block(ivory,0,-j*.05,0,.12,.013,.014,lace);}star(glow,0,.91,.49,.06);
 }
 if(id==='honeykeeper'){
  jacket(ivory);both(ivory,leather);belt(leather,.67,.09);panel(cloth,0,.82,.46,.28,.028);for(const s of[-1,1])seam([s*.25,1.03],[s*.19,.66],leather,.025);
  const hat=cap(cloth);orb(cloth,0,.12,-.03,.36,.15,.33,hat);hoop(dark,0,.04,0,.37,Math.PI/2,0,hat);flower(hat,.29,.09,.17,.075);
  const hive=node(0,1.05,-.55);for(let j=0;j<6;j++)cylinder(gold,0,-.23+j*.085,0,.28-Math.abs(j-2.5)*.025,.07,hive);cylinder(leather,0,.30,0,.08,.12,hive);for(const s of[-1,1])tube([[s*.29,1.12,-.43],[s*.37,.91,-.52],[s*.24,.69,-.45]],.025,leather);
  const comb=held(1,.05,.08,-.05);const hex=own(new T.CylinderGeometry(.16,.16,.045,6));mesh(hex,gold,0,0,0,1,1,1,comb).rotation.x=Math.PI/2;for(let j=0;j<6;j++){const a=j*Math.PI/3;hoop(glow,Math.sin(a)*.09,Math.cos(a)*.09,.03,.033,0,0,comb);}tube([[0,-.08,0],[0,-.33,0]],.023,leather,comb);motion(comb,(o,t)=>o.rotation.z=Math.sin(t)*.08);
  for(const s of[-1,1]){leaf(cloth,s*.39,.54,.27,.17).rotation.z=-s*.4;flower(sculpt,s*.28,.73,.39,.04);}
 }
 if(id==='mushroomoracle'){
  bodyPatch(cloth,{bottom:.40,top:1.12});both(cloth,leather,true);belt(leather,.73,.07);for(const s of[-1,1])seam([s*.31,1.04],[s*.13,.64],glow,.008);
  const hat=node(0,1.65,-.04);mesh(own(new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2)),cloth,0,0,0,.69,.40,.59,hat);orb(lining,0,.005,0,.68,.025,.58,hat);for(let j=0;j<20;j++){const a=j*Math.PI/10;tube([[Math.sin(a)*.12,-.015,Math.cos(a)*.1],[Math.sin(a)*.40,-.025,Math.cos(a)*.35],[Math.sin(a)*.65,0,Math.cos(a)*.55]],.008,glow,hat);}for(let j=0;j<11;j++){const a=j*2.4,r=.23+j%3*.13;orb(glow,Math.cos(a)*r,Math.sqrt(1-(r/.7)**2)*.40,Math.sin(a)*r*.8,.035,.015,.035,hat);}
  const pack=node(0,.94,-.55);orb(leather,0,0,0,.30,.38,.15,pack);for(let j=0;j<3;j++){const x=(j-1)*.18;const n=node(x,.19+j%2*.14,-.14,pack);cylinder(ivory,0,0,0,.025,.27,n);orb(j%2?glow:cloth,0,.15,0,.13,.08,.12,n);}const lantern=held(1,.10,.10,0);tube([[0,-.38,0],[0,.39,0],[.10,.45,0],[.15,.33,0]],.028,leather,lantern);orb(glow,.15,.19,0,.065,.11,.065,lantern);hoop(gold,.15,.22,0,.09,Math.PI/2,0,lantern);motion(lantern,(o,t)=>o.rotation.z=Math.sin(t*.8)*.06);leaf(lining,0,.77,.49,.15);
 }
 if(id==='jellyveil'){
  jacket();both(cloth,ivory);belt(silver,.63,.06);for(const s of[-1,1])seam([s*.28,1.03],[s*.21,.66],glow,.014);
  const glass=surface(0xa4b9ed,.4,.18,.18);glass.transparent=true;glass.opacity=.53;glass.depthWrite=false;
  const bell=node(0,1.68,-.07);mesh(own(new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.55)),glass,0,0,0,.60,.34,.55,bell);hoop(glow,0,-.045,0,.58,Math.PI/2,0,bell);orb(glow,0,.19,-.05,.09,.09,.09,bell);
  for(let j=0;j<9;j++){const a=.8+j*(Math.PI*2-1.6)/8,x=Math.sin(a)*.48,z=Math.cos(a)*.45;const n=node(x,-.02,z,bell),pts=[];for(let k=0;k<9;k++)pts.push([Math.sin(k*.8+j)*.055,-k*.115,Math.cos(k*.6+j)*.035]);tube(pts,.012,j%2?silver:glow,n);mesh(gemGeo,glow,pts[8][0],-.97,pts[8][2],.035,.09,.035,n);motion(n,(o,t)=>{o.rotation.z=Math.sin(t*1.1+j)*.13;o.rotation.x=Math.sin(t*.7+j)*.08;});}
  const back=node(0,1.05,-.51);mesh(gemGeo,glass,0,0,0,.25,.44,.16,back);for(let j=0;j<3;j++)hoop(silver,0,-.15+j*.16,-.14,.17,Math.PI/2,0,back);mesh(gemGeo,glow,0,.78,.49,.055,.095,.03);
 }
 if(id==='origamitsuru'){
  bodyPatch(ivory,{top:1.12,bottom:.40});both(ivory,dark,true);belt(cloth,.77,.14);seam([-.31,1.06],[.22,.74],gold,.018);seam([.31,1.06],[-.12,.78],lining,.012);
  const crane=(p,r)=>{const n=node(0,0,0,p);plate([[0,0],[-.18,.22],[-.63,.35],[-.28,-.07]],.016,ivory,0,0,0,n);plate([[0,0],[.18,.22],[.63,.35],[.28,-.07]],.016,lining,0,0,0,n);plate([[-.11,-.02],[.10,.10],[.17,.34],[.23,.27],[.19,.08],[.06,-.10]],.025,ivory,0,0,.04,n);for(const s of[-1,1])tube([[0,0,.02],[s*.18,.22,.02],[s*.63,.35,.02]],.008,gold,n);n.scale.setScalar(r);return n;};
  const back=node(0,1.18,-.55),bird=crane(back,1);bird.rotation.y=Math.PI;motion(back,(o,t)=>o.rotation.z=Math.sin(t*.7)*.06);const crown=node(-.28,1.67,0);crane(crown,.3).rotation.y=-.5;for(const s of[-1,1])tail(s*.20,.65,-.31,cloth,.13,.32);
  for(let j=0;j<5;j++)plate([[0,.045],[.035,0],[0,-.045],[-.035,0]],.008,gold,-.18+j*.09,.64+(j%2)*.055,.436);star(gold,0,.77,.479,.06);
 }
 if(id==='patisserie'){
  jacket();both(cloth,dark);panel(ivory,0,.74,.50,.33,.028);belt(lining,.59,.07);for(const s of[-1,1]){seam([s*.25,1.02],[s*.24,.56],gold,.01);for(let j=0;j<3;j++)stud(gold,s*.13,.70+j*.09,.485,.016);}
  const beret=node(0,1.66,-.02);orb(cloth,0,.1,0,.43,.18,.35,beret);hoop(gold,0,0,0,.34,Math.PI/2,0,beret);for(let j=0;j<7;j++)orb(ivory,-.20+j*.067,.22,.15,.048,.038,.045,beret);orb(lining,.21,.26,.13,.055,.065,.05,beret);leaf(gold,.21,.30,.14,.07,beret);
  const tray=held(1,.12,.05,.07),trayY=tray.position.y;cylinder(gold,0,0,0,.25,.02,tray);cylinder(cloth,0,.06,0,.16,.11,tray);cylinder(ivory,0,.13,0,.16,.025,tray);for(let j=0;j<6;j++){const a=j*Math.PI/3;orb(lining,Math.cos(a)*.115,.16,Math.sin(a)*.115,.034,.045,.034,tray);}star(gold,0,.25,0,.09,tray);motion(tray,(o,t)=>o.position.y=trayY+Math.sin(t*1.5)*.018);
  const box=node(0,.98,-.55);block(cloth,0,0,0,.49,.54,.21,box);block(gold,0,0,-.12,.055,.56,.018,box);block(gold,0,0,-.125,.50,.05,.015,box);for(const s of[-1,1])orb(lining,s*.08,.09,-.15,.095,.045,.025,box);tail(0,.76,-.69,ivory,.09,.24);
 }
 if(id==='scarabpharaoh'){
  bodyPatch(cloth,{top:1.12,bottom:.40});both(gold,dark);belt(gold,.66,.12);for(let j=0;j<3;j++)belt(j%2?gold:lining,.83+j*.065,.025,.02);
  const crown=node(0,1.67,0);hoop(gold,0,0,0,.34,Math.PI/2,0,crown);for(const s of[-1,1]){const n=node(s*.40,-.11,-.08,crown);plate([[-.10,.14],[.10,.14],[.16,-.54],[-.09,-.64]],.065,cloth,0,0,0,n);for(let j=0;j<7;j++)block(gold,.015,-.02-j*.08,.046,.21,.025,.018,n);motion(n,(o,t)=>o.rotation.z=Math.sin(t*.8)*s*.015);}tube([[0,0,.31],[0,.18,.31],[0,.28,.31],[.04,.31,.32]],.026,gold,crown);mesh(gemGeo,glow,0,.25,.34,.035,.055,.018,crown);
  const scarab=node(0,1.1,-.55);orb(gold,0,0,0,.15,.21,.09,scarab);for(const s of[-1,1])for(let j=0;j<6;j++){const p=plate([[0,0],[s*.52,.32-j*.085],[s*.50,.23-j*.085],[s*.08,-.12]],.022,j%2?gold:cloth,0,0,0,scarab);p.rotation.y=s*.25;}hoop(glow,0,.26,0,.19,0,0,scarab);mesh(gemGeo,glow,0,.78,.49,.07,.095,.035);tail(0,.62,.41,gold,.14,.29);
 }
 if(id==='rainwalker'){
  jacket();both(cloth,cloth);panel(dark,0,.80,.045,.44,.035);for(const s of[-1,1]){panel(lining,s*.23,.68,.13,.13,.03);stud(gold,s*.15,.89,.46,.017);}
  const hood=node(0,1.60,-.08);mesh(own(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI*.45)),cloth,0,0,0,.45,.24,.43,hood);orb(cloth,0,.015,.25,.45,.022,.25,hood);hoop(lining,0,0,0,.43,Math.PI/2,0,hood);
  const umbrella=node(0,1.20,-.55);tube([[0,-.41,0],[0,.24,0],[.02,.83,0]],.019,silver,umbrella);const canopy=node(0,.43,0,umbrella);mesh(own(new T.ConeGeometry(.72,.33,12,1,true)),cloth,0,.16,0,1,1,1,canopy);for(let j=0;j<12;j++){const a=j*Math.PI/6;tube([[0,.33,0],[Math.sin(a)*.45,.14,Math.cos(a)*.45],[Math.sin(a)*.72,0,Math.cos(a)*.72]],.008,lining,canopy);orb(glow,Math.sin(a)*.72,-.025,Math.cos(a)*.72,.018,.035,.018,canopy);}motion(umbrella,(o,t)=>o.rotation.z=Math.sin(t*.7)*.04);
  for(const s of[-1,1]){hoop(lining,s*.24,.27,0,.192,Math.PI/2);block(dark,s*.24,.13,.196,.11,.06,.018);}leaf(glow,-.24,.87,.40,.10);
 }
 if(id==='railconductor'){
  jacket();both(cloth,dark);belt(leather,.60,.065);for(const s of[-1,1]){for(let j=0;j<3;j++)stud(gold,s*.16,.70+j*.09,.451,.018);panel(gold,s*.27,.91,.11,.035,.025);}const hat=cap(cloth);block(gold,0,.08,.36,.21,.035,.025,hat);star(gold,0,.07,.38,.047,hat);
  const pack=node(0,1.07,-.55);block(leather,0,0,0,.48,.58,.18,pack);for(const s of[-1,1])block(gold,s*.17,0,-.10,.025,.58,.015,pack);const watch=node(.25,.78,.43);hoop(gold,0,0,0,.073,0,0,watch);orb(ivory,0,0,.008,.064,.064,.012,watch);block(dark,0,.022,.023,.008,.05,.008,watch);tube([[.24,.84,.43],[.08,.72,.48],[-.05,.86,.46]],.009,gold);
  const lamp=held(1,.1,.06,.03);cylinder(dark,0,-.11,0,.10,.045,lamp);cylinder(gold,0,.13,0,.105,.04,lamp);orb(glow,0,.01,0,.062,.115,.062,lamp);for(const s of[-1,1])tube([[s*.08,-.10,0],[s*.08,.14,0],[s*.05,.25,0],[0,.27,0]],.009,gold,lamp);motion(lamp,(o,t)=>o.rotation.z=Math.sin(t*1.3)*.08);
  for(let j=0;j<3;j++)plate([[-.06,-.035],[.06,-.035],[.06,.035],[-.06,.035]],.012,ivory,-.19+j*.035,.77+j*.04,.43+j*.01);
 }
 if(id==='inkmonk'){
  bodyPatch(ivory,{top:1.12,bottom:.40});both(ivory,dark,true);belt(dark,.78,.11);seam([-.31,1.05],[.22,.72],dark,.025);seam([.30,1.045],[-.10,.78],gold,.012);for(const s of[-1,1])tail(s*.20,.65,-.32,ivory,.19,.30);
  const scroll=node(0,1.05,-.55);block(ivory,0,0,0,.44,.61,.04,scroll);for(const y of[-.32,.32]){const r=cylinder(leather,0,y,0,.04,.56,scroll);r.rotation.z=Math.PI/2;}for(let j=0;j<7;j++){const y=.23-j*.073;tube([[-.13,y,-.032],[-.04,y+.025,-.034],[.07,y-.019,-.034],[.14,y+.015,-.033]],.011,dark,scroll);}
  const brush=held(1,.12,.1,-.08);brush.rotation.z=-.23;cylinder(leather,0,0,0,.027,.89,brush);cylinder(gold,0,-.38,0,.043,.09,brush);mesh(own(new T.ConeGeometry(.058,.22,16)),ivory,0,-.53,0,1,1,1,brush).rotation.z=Math.PI;orb(dark,0,-.61,0,.026,.035,.026,brush);motion(brush,(o,t)=>o.rotation.z=-.23+Math.sin(t*.8)*.06);
  const hat=node(0,1.65,-.02);cylinder(dark,0,.06,0,.33,.13,hat);hoop(gold,0,0,0,.34,Math.PI/2,0,hat);for(let j=0;j<4;j++)tube([[-.19+j*.12,.095,.29],[-.18+j*.12,.16,.27]],.008,ivory,hat);tube([[-.11,.93,.46],[0,.89,.49],[.09,.94,.47]],.011,dark);
 }
 if(id==='carnivaljoker'){
  jacket();bodyPatch(lining,{bottom:.40,top:1.03,start:0,end:Math.PI,faceOpen:false,offset:.006});both(cloth,dark);belt(gold,.60,.055);
  for(let j=0;j<7;j++){const a=-1.1+j*.37,x=Math.sin(a)*.40,z=Math.cos(a)*.40;const n=node(x,1.025,z);plate([[-.07,0],[.07,0],[0,-.14]],.016,j%2?gold:lining,0,0,0,n);orb(gold,0,-.15,0,.018,.018,.018,n);}
  const hat=node(0,1.65,0);hoop(gold,0,0,0,.34,Math.PI/2,0,hat);for(const s of[-1,1]){const points=[];for(let j=0;j<12;j++){const f=j/11;points.push([s*(.16+f*.34),.05+Math.sin(f*2.3)*.38,-.01]);}tube(points,.085,s<0?cloth:lining,hat);orb(gold,s*.50,.33,0,.055,.055,.055,hat);}star(glow,0,.81,.47,.055);
  const cards=node(0,1.05,-.55);for(let j=0;j<5;j++){const n=node((j-2)*.13,0,0,cards);n.rotation.z=(j-2)*-.20;plate([[-.15,-.26],[.15,-.26],[.15,.26],[-.15,.26]],.026,ivory,0,0,0,n);star(j%2?cloth:gold,0,0,-.024,.10,n);}motion(cards,(o,t)=>o.rotation.y=Math.sin(t*.8)*.07);for(const s of[-1,1])tail(s*.24,.64,-.31,cloth,.17,.31);
 }
 if(id==='rescueworker'){
  jacket();both(cloth,dark);for(const y of[.65,.93])belt(lining,y,.035,.02);for(const s of[-1,1]){panel(dark,s*.24,.78,.13,.17,.035);seam([s*.27,1.04],[s*.24,.60],lining,.012);}belt(dark,.56,.08);
  const helmet=node(0,1.62,-.02);mesh(own(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2)),cloth,0,0,0,.43,.25,.39,helmet);orb(cloth,0,0,0,.48,.025,.43,helmet);block(lining,0,.20,.07,.05,.10,.45,helmet);orb(dark,0,.06,.40,.11,.075,.04,helmet);orb(glow,0,.06,.439,.074,.045,.016,helmet);
  const tank=node(0,1.07,-.54);for(const s of[-1,1]){cylinder(gold,s*.14,0,0,.105,.51,tank);orb(dark,s*.14,.27,0,.106,.075,.106,tank);orb(dark,s*.14,-.27,0,.106,.075,.106,tank);for(const y of[-.15,.15])cylinder(dark,s*.14,y,0,.11,.037,tank);}tube([[.24,1.26,-.47],[.44,1.1,-.37],[.45,.67,-.20],[.30,.59,-.32]],.021,dark);
  const wrench=held(1,.10,.08,-.02);block(silver,0,0,0,.055,.47,.04,wrench);hoop(silver,0,.24,0,.095,0,0,wrench);block(dark,0,-.09,0,.078,.23,.05,wrench);motion(wrench,(o,t)=>o.rotation.z=Math.sin(t*.9)*.07);star(gold,0,.86,.48,.07);
 }
 if(id==='cactusmariachi'){
  jacket();both(cloth,leather);belt(leather,.61,.10);for(const s of[-1,1]){seam([s*.30,1.045],[s*.13,.80],lining,.026);for(let j=0;j<4;j++)stud(gold,s*.23,.68+j*.065,.415,.017);}
  const sombrero=node(0,1.64,-.03);orb(gold,0,0,0,.72,.035,.59,sombrero);mesh(own(new T.ConeGeometry(.28,.40,28)),cloth,0,.20,0,1,1,1,sombrero);hoop(lining,0,.03,0,.64,Math.PI/2,0,sombrero);for(let j=0;j<24;j++){const a=j*Math.PI/12;orb(lining,Math.sin(a)*.65,.035,Math.cos(a)*.53,.025,.015,.025,sombrero);}flower(sombrero,.22,.15,.12,.065);
  const guitar=node(0,1.03,-.56);guitar.rotation.z=-.22;orb(gold,0,-.14,0,.24,.27,.075,guitar);orb(gold,0,.10,0,.18,.20,.075,guitar);orb(dark,0,.03,-.077,.06,.06,.008,guitar);block(leather,0,.42,0,.075,.65,.065,guitar);block(gold,0,.78,0,.13,.17,.075,guitar);for(let j=0;j<4;j++)tube([[(j-1.5)*.012,-.30,-.084],[(j-1.5)*.012,.82,-.05]],.0025,silver,guitar);
  const cactus=held(1,.10,.08,0);cylinder(gold,0,-.06,0,.09,.12,cactus,.075);orb(cloth,0,.08,0,.069,.17,.069,cactus);tube([[0,.08,0],[.12,.10,0],[.12,.21,0]],.035,cloth,cactus);flower(cactus,0,.24,0,.045);motion(cactus,(o,t)=>o.rotation.z=Math.sin(t*1.3)*.05);flower(sculpt,-.22,.89,.41,.05);
 }
 if(id==='bathduck'){
  bodyPatch(ivory,{top:1.11,bottom:.40});both(ivory,gold,true);belt(lining,.75,.105);seam([-.31,1.04],[.20,.72],lining,.028);seam([.31,1.04],[-.1,.78],gold,.009);for(const s of[-1,1])tail(s*.23,.60,-.29,ivory,.15,.20);
  const towel=node(0,1.66,-.03);block(ivory,0,0,0,.49,.11,.38,towel);for(let j=0;j<4;j++)tube([[-.22,-.03+j*.025,.20],[.20,-.03+j*.025,.20]],.006,lining,towel);const duck=node(.04,.10,.02,towel);orb(gold,0,.04,0,.12,.085,.14,duck);orb(gold,0,.13,.08,.078,.078,.073,duck);orb(leather,0,.115,.15,.055,.018,.044,duck);for(const s of[-1,1])orb(dark,s*.039,.15,.14,.009,.009,.009,duck);
  const basket=node(0,.99,-.55);cylinder(leather,0,0,0,.26,.43,basket);for(let j=0;j<5;j++)hoop(gold,0,-.19+j*.095,0,.266,Math.PI/2,0,basket);for(let j=0;j<12;j++){const a=j*Math.PI/6;tube([[Math.sin(a)*.264,-.21,Math.cos(a)*.264],[Math.sin(a)*.264,.21,Math.cos(a)*.264]],.012,lining,basket);}orb(ivory,0,.24,0,.22,.08,.20,basket);hoop(gold,0,.30,0,.21,0,0,basket);motion(duck,(o,t)=>o.rotation.y=Math.sin(t*1.2)*.17);panel(gold,-.22,.87,.10,.07,.027);
 }
 if(id==='retroarcade'){
  jacket(dark);both(cloth,dark);belt(gold,.59,.065);for(const s of[-1,1])seam([s*.29,1.04],[s*.24,.65],glow,.013);panel(cloth,0,.83,.39,.24,.032);panel(dark,0,.83,.32,.17,.045);
  const cyan=surface(0x6eecdf,.3,.3,.9);for(let j=0;j<7;j++){block(j%2?glow:cyan,-.12+j*.04,.80+(j%3)*.023,.503,.025,.025,.013);}for(const s of[-1,1]){const ear=node(s*.43,1.48,-.03);block(cloth,0,0,0,.095,.18,.18,ear);block(glow,s*.055,0,0,.013,.10,.12,ear);}tube([[-.40,1.50,-.05],[-.27,1.77,-.05],[.27,1.77,-.05],[.40,1.50,-.05]],.025,dark);
  const cabinet=node(0,1.07,-.56);block(cloth,0,0,0,.47,.69,.19,cabinet);block(gold,0,.26,-.105,.43,.035,.02,cabinet);block(dark,0,.07,-.115,.37,.29,.035,cabinet);for(let j=0;j<15;j++){const x=(j%5-2)*.055,y=.02+Math.floor(j/5)*.055;if(j%3!==0)block(j%2?cyan:glow,x,y,-.14,.035,.035,.012,cabinet);}block(gold,0,-.19,-.15,.39,.08,.12,cabinet);const stick=node(-.10,-.15,-.20,cabinet);cylinder(silver,0,.055,0,.009,.10,stick);orb(glow,0,.11,0,.035,.035,.035,stick);for(const x of[.04,.11])orb(cyan,x,-.14,-.20,.023,.012,.023,cabinet);star(gold,0,.96,.49,.045);
 }
 // Couture details remain on the fitted shell; the animated sleeves keep their bindings.
 const remaining=['streetdj','honeykeeper','mushroomoracle','jellyveil','origamitsuru','patisserie','scarabpharaoh','rainwalker','railconductor','inkmonk','carnivaljoker','rescueworker','cactusmariachi','bathduck','retroarcade'];
 if(remaining.includes(id)){
  cloth.roughness=['rainwalker','jellyveil'].includes(id)?.27:.58;
  gold.roughness=.22;
  const stitch=(a,b,m=gold)=>{const at=f=>{const x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f,cap=y<.775?.775:y>1.325?1.325:y,r=Math.sqrt(Math.max(0,.448**2-(y-cap)**2))+.024;return[x,y,Math.sqrt(Math.max(.01,r*r-x*x))];};for(let j=0;j<9;j++){const f=j/9,g=(j+.44)/9;tube([at(f),at((f+g)/2),at(g)],.003,m);}};
  for(const side of[-1,1])stitch([side*.31,.96],[side*.27,.58],id==='inkmonk'?dark:gold);
  if(id==='streetdj'){
   for(const side of[-1,1]){const shoulder=node(side*.39,1.055,-.02);orb(dark,0,0,0,.13,.065,.16,shoulder);for(let j=0;j<4;j++)block(glow,(j-1.5)*.034,.035,.075,.014,.012,.12,shoulder);}
   for(let j=0;j<12;j++){const a=j*Math.PI/6;stud(gold,Math.sin(a)*.10,.84+Math.cos(a)*.10,.491,.008);}
   const disc=node(0,1.06,-.645);for(let j=0;j<4;j++)hoop(silver,0,.18,-.008,.055+j*.022,0,0,disc);
   tube([[-.28,.74,.39],[-.20,.63,.45],[.07,.66,.48]],.009,silver);panel(glow,.22,.87,.045,.08,.035);
  }else if(id==='honeykeeper'){
   for(let j=0;j<7;j++){const x=(j%3-1)*.07,y=.85-Math.floor(j/3)*.063;const pts=Array.from({length:6},(_,k)=>[x+Math.sin(k*Math.PI/3)*.035,y+Math.cos(k*Math.PI/3)*.035,.49]);tube(pts,.005,gold,sculpt,true);}
   for(const side of[-1,1]){const pouch=node(side*.31,.60,.25);orb(leather,0,0,0,.10,.10,.06,pouch);hoop(gold,0,.025,.06,.052,0,0,pouch);}
   const bee=node(-.48,1.77,.05);orb(dark,0,0,0,.065,.04,.038,bee);for(const x of[-.025,.02])hoop(gold,x,0,0,.041,0,Math.PI/2,bee);for(const side of[-1,1])orb(ivory,0,.045,side*.039,.055,.012,.042,bee);motion(bee,(o,t)=>{o.position.y=1.77+Math.sin(t*3)*.06;o.rotation.y=Math.sin(t)*.5;});
  }else if(id==='mushroomoracle'){
   for(const side of[-1,1]){const n=node(side*.34,.72,.26);for(let j=0;j<5;j++){const l=leaf(lining,(j%2?1:-1)*.035,j*.045,0,.09,n);l.rotation.z=(j%2?1:-1)*.6;}tube([[0,0,0],[0,.23,0]],.006,gold,n);}
   const stalk=node(-.25,1.78,-.15);for(let j=0;j<3;j++){const a=j*2.1;tube([[0,0,0],[Math.sin(a)*.14,.24+j*.05,Math.cos(a)*.12]],.012,silver,stalk);orb(glow,Math.sin(a)*.14,.25+j*.05,Math.cos(a)*.12,.045,.028,.045,stalk);}
   for(let j=0;j<9;j++){const a=j*2.4;stud(glow,Math.sin(a)*.27,.55+(j%3)*.05,.42,.011);}
  }else if(id==='jellyveil'){
   for(const side of[-1,1])for(let j=0;j<3;j++)seam([side*(.16+j*.04),.98],[side*(.08+j*.06),.62],j%2?silver:glow,.005);
   for(let j=0;j<7;j++){const a=j*Math.PI/3.5;orb(silver,Math.sin(a)*.42,1.74,Math.cos(a)*.38-.07,.024,.018,.024);}
   const core=node(0,1.08,-.70);mesh(gemGeo,glow,0,0,0,.075,.17,.06,core);motion(core,(o,t)=>o.rotation.y=t*.55);
  }else if(id==='origamitsuru'){
   for(let j=0;j<6;j++){const x=-.25+j*.10;stitch([x,.55],[x+.055,.63],gold);}
   for(const side of[-1,1]){const cord=node(side*.24,.73,.32);tube([[0,0,0],[side*.05,-.15,.03],[side*.02,-.24,.02]],.008,gold,cord);for(let j=0;j<5;j++)tube([[side*.02,-.24,.02],[side*.02+(j-2)*.008,-.34,.02]],.003,cloth,cord);motion(cord,(o,t)=>o.rotation.z=Math.sin(t*1.7)*.06);}
   for(const side of[-1,1])tube([[side*.10,1.18,-.60],[side*.27,1.31,-.60],[side*.50,1.40,-.60]],.004,gold);
  }else if(id==='patisserie'){
   for(let j=0;j<7;j++){const n=node(-.23+j*.076,.58,.44);orb(gold,0,0,0,.035,.018,.008,n);}
   for(const side of[-1,1]){panel(cloth,side*.20,.67,.10,.09,.042);stitch([side*.25,.71],[side*.15,.71]);}
   const whisk=node(-.29,.76,.40);cylinder(leather,0,0,0,.012,.13,whisk);for(let j=0;j<4;j++){const a=j*Math.PI/2;tube([[0,.06,0],[Math.sin(a)*.035,.14,Math.cos(a)*.035],[0,.19,0]],.003,silver,whisk);}
   for(let j=0;j<6;j++)orb(gold,-.17+j*.067,1.81,.24,.009,.009,.009);
  }else if(id==='scarabpharaoh'){
   for(let j=0;j<13;j++){const a=-1.15+j*.19;const x=Math.sin(a)*.37,z=Math.cos(a)*.43;mesh(gemGeo,j%2?gold:glow,x,.90-Math.cos(a)*.055,z,.018,.033,.015);}
   for(let j=0;j<5;j++){const y=.48+j*.042;block(dark,0,y,.453,.10,.009,.007);block(glow,(j%2?1:-1)*.025,y+.012,.459,.008,.024,.006);}
   const sun=node(0,1.91,-.18);hoop(gold,0,0,0,.15,0,0,sun);mesh(gemGeo,glow,0,0,0,.07,.10,.025,sun);for(let j=0;j<12;j++){const a=j*Math.PI/6;const r=block(gold,Math.sin(a)*.20,Math.cos(a)*.20,0,.01,.06,.014,sun);r.rotation.z=-a;}
  }else if(id==='rainwalker'){
   for(const side of[-1,1]){seam([side*.31,.61],[side*.08,.54],silver,.008);panel(silver,side*.23,.74,.12,.018,.043);tube([[side*.12,1.045,.43],[side*.14,.92,.47]],.008,ivory);orb(gold,side*.14,.91,.47,.014,.025,.012);}
   for(let j=0;j<11;j++){const a=j*2.4;orb(glow,Math.sin(a)*.48,1.76+Math.cos(a)*.07,Math.cos(a)*.4-.55,.009,.015,.009);}
   const clasp=node(0,.93,.49);hoop(silver,0,0,0,.022,0,0,clasp);
  }else if(id==='railconductor'){
   for(const side of[-1,1]){for(let j=0;j<3;j++)seam([side*.37,.99-j*.025],[side*.29,.96-j*.025],gold,.008);stitch([side*.30,.57],[side*.09,.57]);}
   const badge=node(-.22,.87,.427);hoop(gold,0,0,0,.06,0,0,badge);star(glow,0,0,.007,.036,badge);for(let j=0;j<5;j++){const a=j*Math.PI/2.5;stud(gold,Math.sin(a)*.064,Math.cos(a)*.064,.01,.007,badge);}
   for(let j=0;j<7;j++)block(gold,-.15+j*.05,1.19,-.65,.022,.008,.008);tube([[-.17,1.03,-.66],[0,.96,-.66],[.17,1.03,-.66]],.007,gold);
  }else if(id==='inkmonk'){
   for(const side of[-1,1]){for(let j=0;j<3;j++)seam([side*.27,.63+j*.03],[side*.10,.56+j*.03],dark,.005);}
   const beads=node(-.30,.84,.32);for(let j=0;j<11;j++){const a=j*Math.PI*2/11;orb(leather,Math.sin(a)*.10,Math.cos(a)*.12,0,.019,.019,.019,beads);}const seal=node(.24,.59,.385);block(dark,0,0,0,.065,.07,.018,seal);for(const x of[-.017,.017])tube([[x,-.02,.013],[x,.02,.013],[0,.02,.013]],.004,gold,seal);
   for(let j=0;j<7;j++)tube([[-.16+j*.05,1.35,-.59],[-.16+j*.05,1.43,-.59]],.005,gold);
  }else if(id==='carnivaljoker'){
   for(const side of[-1,1])for(let j=0;j<4;j++)plate([[0,.035],[.022,0],[0,-.035],[-.022,0]],.008,j%2?gold:lining,side*.24,.63+j*.079,.415);
   for(const side of[-1,1]){const n=node(side*.33,.59,-.31);hoop(gold,0,0,0,.027,0,0,n);orb(glow,0,-.04,0,.026,.026,.026,n);}
   for(let j=0;j<3;j++){const card=node((j-1)*.14,1.08,-.575);for(const side of[-1,1])star(cloth,side*.07,side*.14,-.01,.025,card);}
  }else if(id==='rescueworker'){
   for(const side of[-1,1]){for(let j=0;j<5;j++)seam([side*.29,.75+j*.021],[side*.20,.73+j*.021],silver,.004);}
   const gauge=node(-.30,.91,.37);hoop(silver,0,0,0,.051,0,0,gauge);orb(dark,0,0,0,.043,.043,.008,gauge);block(glow,0,.015,.013,.006,.03,.005,gauge);
   const scanner=node(.31,.65,.31);block(dark,0,0,0,.10,.15,.04,scanner);block(glow,0,.025,.025,.07,.045,.008,scanner);for(let j=0;j<3;j++)block(silver,0,-.026-j*.017,.024,.06,.006,.007,scanner);cylinder(dark,.025,.14,0,.009,.15,scanner);
   for(const side of[-1,1])hoop(glow,side*.14,1.23,-.54,.112,Math.PI/2);
  }else if(id==='cactusmariachi'){
   for(const side of[-1,1]){flower(sculpt,side*.28,.94,.37,.034,lining);for(let j=0;j<4;j++){const x=side*(.08+j*.05);seam([x,.59],[x+side*.02,.65],gold,.006);}}
   for(let j=0;j<9;j++){const a=j*Math.PI/4.5;leaf(lining,Math.sin(a)*.55,1.68,Math.cos(a)*.45-.03,.055).rotation.x=-Math.PI/2;}
   for(const side of[-1,1])for(let j=0;j<3;j++)orb(gold,side*.05,.87+j*.045,-.57,.018,.012,.018);
  }else if(id==='bathduck'){
   for(const side of[-1,1]){panel(lining,side*.23,.64,.13,.11,.035);for(let j=0;j<3;j++)stitch([side*.29,.62+j*.02],[side*.17,.62+j*.02],gold);}
   const tie=node(0,.75,.49);for(const side of[-1,1])plate([[0,0],[side*.10,.04],[side*.09,-.06]],.02,lining,0,0,0,tie);tail(.04,.73,.47,lining,.035,.12);
   const bottle=node(-.24,1.18,-.61);cylinder(glow,0,0,0,.055,.17,bottle);cylinder(gold,0,.10,0,.029,.045,bottle);block(ivory,0,0,-.055,.06,.07,.005,bottle);
  }else if(id==='retroarcade'){
   for(const side of[-1,1]){for(let j=0;j<3;j++)panel(j%2?glow:silver,side*.28,.71+j*.045,.035,.025,.045);}
   const antenna=node(.27,1.67,-.10);tube([[0,0,0],[.07,.19,0]],.012,silver,antenna);orb(glow,.07,.20,0,.035,.035,.035,antenna);motion(antenna,(o,t)=>o.rotation.z=Math.sin(t*2)*.07);
   for(const side of[-1,1]){tube([[side*.20,.80,-.68],[side*.20,1.35,-.68],[0,1.40,-.68]],.008,glow);for(let j=0;j<3;j++)block(silver,side*.13,.80+j*.035,-.67,.05,.009,.005);}
   for(let j=0;j<5;j++){const n=block(glow,-.08+j*.04,1.36,-.68,.023,.018,.008);motion(n,(o,t)=>o.visible=(Math.floor(t*4)+j)%5!==0);}
  }
 }

 refineRemainingDesigns(T,h);
}

// A bounded instanced motif adds a distinct moving signature to every outfit.
export function addTailoredMotif(T,{id,fx,own,materials,mobile,color,secondary}){
 const ids=['abyssdiver','sakurakimono','chronokeeper','starchef','piratecaptain','streetdj','honeykeeper','mushroomoracle','jellyveil','origamitsuru','patisserie','scarabpharaoh','rainwalker','railconductor','inkmonk','carnivaljoker','rescueworker','cactusmariachi','bathduck','retroarcade'];
 const kind=ids.indexOf(id),style=kind%5,shape=new T.Shape();
 if(kind>=5)return addDistinctPremiumAura(T,{id,fx,own,materials,mobile,color,secondary});
 if([1,9,14].includes(kind)){shape.moveTo(0,.10);shape.quadraticCurveTo(.12,.03,.035,-.07);shape.lineTo(0,-.04);shape.lineTo(-.025,-.09);shape.quadraticCurveTo(-.08,.03,0,.10);}
 else if([3,10,15].includes(kind)){for(let j=0;j<10;j++){const a=j*Math.PI/5,r=j%2?.035:.09;j?shape.lineTo(Math.sin(a)*r,Math.cos(a)*r):shape.moveTo(0,r);}shape.closePath();}
 else{shape.moveTo(0,.10);shape.lineTo(.065,0);shape.lineTo(0,-.10);shape.lineTo(-.065,0);shape.closePath();}
 const geometry=own([0,4,12,18].includes(kind)?new T.TorusGeometry(.065,.005,4,16):kind===5?new T.BoxGeometry(.035,.20,.035):[6,11].includes(kind)?new T.CylinderGeometry(.065,.065,.012,6):[7,8].includes(kind)?new T.OctahedronGeometry(.065):kind===19?new T.BoxGeometry(.065,.065,.065):new T.ShapeGeometry(shape));
 const material=new T.MeshBasicMaterial({color,transparent:true,opacity:.66,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});materials.add(material);
 const count=mobile?14:24,motifs=new T.InstancedMesh(geometry,material,count);motifs.name='tailored-signature-'+id;motifs.frustumCulled=false;fx.add(motifs);const dummy=new T.Object3D();
 for(let j=0;j<count;j++)motifs.setColorAt(j,j%3===0?secondary:color);
 return t=>{for(let j=0;j<count;j++){const a=j*2.39996+t*(style===2?.17:.30),rise=(j/count+t*.10)%1,r=.65+(j%3)*.055;let y=.10+rise*1.8,x=Math.cos(a)*r,z=Math.sin(a)*r;
   if([1,9,12,14,15].includes(kind))y=2-rise*1.85;
   if([4,5,10,11,16,17].includes(kind)){y=.07+Math.sin(t*1.7+j)*.025;x=Math.cos(a)*(.74+j%2*.15);z=Math.sin(a)*(.74+j%2*.15);}
   dummy.position.set(x,y,z);dummy.rotation.set(kind===6?Math.PI/2:Math.sin(t+j)*.4,a,kind===19?0:a*.6);dummy.scale.setScalar(.65+Math.sin(rise*Math.PI)*.45);if(kind===5){dummy.rotation.set(0,a,0);dummy.scale.y=.5+Math.abs(Math.sin(t*3+j))*.9;}dummy.updateMatrix();motifs.setMatrixAt(j,dummy.matrix);
  }motifs.instanceMatrix.needsUpdate=true;};
}


// One instanced draw for each signature; geometry has actual thematic silhouettes.
function addDistinctPremiumAura(T,{id,fx,own,materials,mobile,color,secondary}){
 const parts=[];
 const part=(g,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(sx,sy,sz)));parts.push(g);};
 const poly=points=>{const s=new T.Shape();points.forEach(([x,y],j)=>j?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ShapeGeometry(s);};
 const ring=(r,t=.006,n=24)=>new T.TorusGeometry(r,t,4,n);
 const stroke=(points,r=.006)=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),mobile?12:20,r,4,false);
 switch(id){
  case 'streetdj': part(new T.BoxGeometry(.025,.22,.025));for(const y of[-.065,0,.065])part(new T.BoxGeometry(.055,.012,.025),0,y);break;
  case 'honeykeeper': part(ring(.085,.006,6));part(ring(.045,.004,6));break;
  case 'mushroomoracle':part(new T.SphereGeometry(.085,12,6,0,Math.PI*2,0,Math.PI/2),0,.025,0,1,.6,1);part(new T.CylinderGeometry(.012,.02,.10,6),0,-.025);break;
  case 'jellyveil':part(new T.SphereGeometry(.075,12,6,0,Math.PI*2,0,Math.PI/2),0,.03,0,1,.6,1);for(let j=0;j<3;j++)part(stroke([[(j-1)*.044,.03,0],[(j-1)*.06,-.04,0],[(j-1)*.03,-.13,.015]],.003));break;
  case 'origamitsuru':for(const side of[-1,1])part(poly([[0,0],[side*.045,.055],[side*.18,.095],[side*.08,-.04]]),0,0,0,1,1,1,0,side*.3);part(poly([[-.03,-.01],[.02,.02],[.05,.12],[.09,.08],[.055,.07],[.03,-.04]]));break;
  case 'patisserie':part(new T.OctahedronGeometry(.06));for(let j=0;j<4;j++){const a=j*Math.PI/2;part(new T.BoxGeometry(.005,.05,.005),Math.sin(a)*.095,Math.cos(a)*.095,0,1,1,1,0,0,-a);}break;
  case 'scarabpharaoh':part(new T.SphereGeometry(.045,8,6),0,0,0,1,1.4,.35);for(const side of[-1,1])for(let j=0;j<3;j++)part(poly([[side*.03,.01],[side*.14,.065-j*.04],[side*.12,.005-j*.04],[side*.03,-.035]]));part(ring(.035,.004,16),0,.11);break;
  case 'rainwalker':part(poly([[0,.105],[-.038,-.015],[-.026,-.055],[0,-.066],[.026,-.055],[.038,-.015]]));break;
  case 'railconductor':{
   const s=new T.Shape();s.moveTo(-.10,-.05);s.lineTo(.10,-.05);s.lineTo(.10,-.016);s.quadraticCurveTo(.075,0,.10,.016);s.lineTo(.10,.05);s.lineTo(-.10,.05);s.lineTo(-.10,.016);s.quadraticCurveTo(-.075,0,-.10,-.016);s.closePath();
   for(const x of[-.045,.045]){const hole=new T.Path();hole.absarc(x,0,.013,0,Math.PI*2,true);s.holes.push(hole);}part(new T.ShapeGeometry(s));break;
  }
  case 'inkmonk':{const s=new T.Shape();s.moveTo(-.10,-.075);s.bezierCurveTo(.10,-.10,-.07,.04,.10,.11);s.bezierCurveTo(.03,.01,.10,-.13,-.10,-.075);part(new T.ShapeGeometry(s));break;}
  case 'carnivaljoker':{const s=new T.Shape();s.moveTo(-.055,-.085);s.lineTo(.055,-.085);s.lineTo(.055,.085);s.lineTo(-.055,.085);s.closePath();const h=new T.Path();h.moveTo(0,.039);h.lineTo(.024,0);h.lineTo(0,-.039);h.lineTo(-.024,0);h.closePath();s.holes.push(h);part(new T.ShapeGeometry(s));break;}
  case 'rescueworker':part(poly([[0,.13],[-.014,.025],[-.035,.025],[0,-.11],[.012,-.015],[.035,-.015]]));break;
  case 'cactusmariachi':for(let j=0;j<5;j++){const a=j*Math.PI/2.5;part(new T.SphereGeometry(1,8,5),Math.sin(a)*.047,Math.cos(a)*.047,0,.032,.045,.006,0,0,-a);}part(new T.SphereGeometry(.022,8,5),0,0,.005,1,1,.4);break;
  case 'bathduck':part(ring(.085,.004));part(stroke([[-.054,.025,.003],[-.035,.055,.003],[.003,.065,.003]],.004));part(ring(.025,.003,12),.092,-.05);break;
  case 'retroarcade':for(const [x,y]of[[-2,2],[2,2],[-1,1],[0,1],[1,1],[-2,0],[0,0],[2,0],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[-1,-2],[1,-2]])part(new T.BoxGeometry(.025,.025,.016),x*.028,y*.028);break;
 }
 const values={position:[],normal:[],uv:[]};
 for(const p of parts){const g=p.index?p.toNonIndexed():p;for(const key of Object.keys(values)){const a=g.getAttribute(key);if(a)for(const v of a.array)values[key].push(v);else for(let j=0;j<g.attributes.position.count*(key==='uv'?2:3);j++)values[key].push(0);}if(g!==p)g.dispose();p.dispose();}
 const geo=own(new T.BufferGeometry());for(const key of Object.keys(values))geo.setAttribute(key,new T.Float32BufferAttribute(values[key],key==='uv'?2:3));geo.computeBoundingSphere();
 const ink=id==='inkmonk',mat=new T.MeshBasicMaterial({color:ink?0x365463:0xffffff,transparent:true,opacity:ink?.72:.63,side:T.DoubleSide,depthWrite:false,blending:ink?T.NormalBlending:T.AdditiveBlending});materials.add(mat);
 const count=mobile?12:20,motif=new T.InstancedMesh(geo,mat,count);motif.name='tailored-signature-'+id;motif.frustumCulled=false;motif.instanceMatrix.setUsage(T.DynamicDrawUsage);fx.add(motif);
 const dummy=new T.Object3D();for(let j=0;j<count;j++)motif.setColorAt(j,j%3?color:secondary);
 return t=>{
  for(let j=0;j<count;j++){
   const phase=j/count,cycle=(phase+t*.12)%1,a=phase*Math.PI*2+t*.25,r=.78+Math.sin(j*2.4)*.07;
   let x=Math.cos(a)*r,z=Math.sin(a)*r,y=.18+cycle*1.8,scale=.5+.4*Math.sin(cycle*Math.PI);dummy.rotation.set(Math.sin(t+j)*.15,-a+.4,Math.sin(t*.6+j)*.25);dummy.scale.setScalar(scale);
   switch(id){
    case 'streetdj':y=.10;dummy.rotation.set(0,-a,0);dummy.scale.set(.8,.25+Math.abs(Math.sin(t*3+j*.5))*1.5,.8);break;
    case 'honeykeeper':x=Math.cos(a)*(.80+.08*Math.sin(t+j));y=.32+(j%4)*.34;dummy.rotation.set(0,-a,Math.PI/6);break;
    case 'mushroomoracle':y=.12+((phase+t*.07)%1)*1.7;dummy.scale.setScalar(.35+.5*Math.sin(cycle*Math.PI));break;
    case 'jellyveil':y=.20+((phase+t*.09)%1)*1.85;dummy.scale.set(.6,.6+Math.sin(t*2+j)*.10,.6);break;
    case 'origamitsuru':y=.28+(j%5)*.34+Math.sin(t*1.8+j)*.10;dummy.rotation.set(Math.sin(t*2+j)*.22,-a,Math.sin(t*1.4+j)*.15);break;
    case 'patisserie':y=.10+cycle*.95;dummy.rotation.set(t*.25+j,t*.3+j,t*.2);break;
    case 'scarabpharaoh':y=.24+(j%3)*.12;dummy.rotation.set(-.6,-a+.3,0);break;
    case 'rainwalker':y=2.15-((phase+t*.6)%1)*2.1;dummy.rotation.set(0,-a,.10);dummy.scale.setScalar(.50);break;
    case 'railconductor':y=.14+cycle*1.7;dummy.rotation.set(Math.sin(t+j)*.25,t*.35+j,j*.3);break;
    case 'inkmonk':y=.26+(j%6)*.19+Math.sin(a*2)*.10;dummy.rotation.set(0,-a,t*.18+j*.2);break;
    case 'carnivaljoker':y=.28+(j%5)*.32+Math.sin(t*1.5+j)*.07;dummy.rotation.set(Math.sin(t+j)*.15,t*.55+j,Math.sin(t+j)*.45);break;
    case 'rescueworker':y=.12+cycle*.85;dummy.rotation.set(0,-a,-Math.cos(a)*.4);dummy.scale.setScalar((1-cycle)*.65+.1);break;
    case 'cactusmariachi':y=1.90-cycle*1.8;x+=Math.sin(t+j)*.08;dummy.rotation.set(Math.sin(t+j)*.4,-a,t*.3+j);break;
    case 'bathduck':y=.14+cycle*1.9;dummy.scale.setScalar(.35+cycle*.70);dummy.rotation.set(0,-a,0);break;
    case 'retroarcade':x=Math.round(x*9)/9;z=Math.round(z*9)/9;y=.20+Math.round(cycle*14)/8;dummy.rotation.set(0,-a,0);dummy.scale.setScalar(.65);break;
   }
   // Tall effects orbit behind the visor; the wearer remains recognizable.
   if(y>1.04&&y<1.53&&z>0&&Math.abs(x)<.48)z=-z;
   dummy.position.set(x,y,z);dummy.updateMatrix();motif.setMatrixAt(j,dummy.matrix);
  }
  motif.instanceMatrix.needsUpdate=true;
 };
}
