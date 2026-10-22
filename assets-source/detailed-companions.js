/* DETAILED_COMPANIONS_V1_BEGIN
 * Small sculpted companions. All geometry and materials belong to one costume;
 * static pieces are batched by the caller and moving parts keep explicit pivots.
 */
function buildDetailedCompanion(THREE,kind,root,{shape,geometry,materials}){
  const kinds=['dragon','rover','pgho','pjel','pfrg','pbat','pmus','pgeo','pcld','pstr','pbal','pdol','pwol','pshp','pshk','pmsh','pbrd','pfsh','pcub','phrt','pflm','pice'];
  if(!kinds.includes(kind))return null;
  const rig={kind,legs:[],wings:[],wheels:[],tails:[],ears:[],eyes:[],phase:0,weight:0};
  const ink=0x182b40,ivory=0xfff5db,cream=0xffdfae,glint=0xf5ffff;let serial=0;
  const own=g=>(geometry['detail:'+kind+':'+serial++]=g,g);
  function mat(color,finish='satin'){
    const key='detail:'+color+':'+finish;
    return materials[key]||(materials[key]=new THREE.MeshStandardMaterial({color,roughness:finish==='metal'?.3:finish==='cloth'?.78:finish==='eye'?.14:.36,metalness:finish==='metal'?.58:finish==='eye'?.06:.025,side:THREE.DoubleSide}));
  }
  function mesh(g,color,parent=root,finish='satin'){const m=new THREE.Mesh(g,mat(color,finish));m.userData.lightCostume=true;m.castShadow=false;parent.add(m);return m;}
  function part(type,color,x,y,z,sx,sy,sz,parent=root,finish='satin'){const m=mesh(shape(type),color,parent,finish);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
  const ball=(color,x,y,z,sx,sy,sz,parent=root)=>part('sphere',color,x,y,z,sx,sy,sz,parent);
  const group=(x=0,y=0,z=0,parent=root)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
  function stroke(points,color,r=.009,parent=root){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(own(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),r,5,false)),color,parent);}
  function polygon(points,color,depth=.025,parent=root,bevel=.009){
    const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
    return mesh(own(new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:12})),color,parent);
  }
  function curved(path,color,depth=.016,parent=root){const s=new THREE.Shape();path(s);return mesh(own(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:10})),color,parent);}
  function body(top,bottom,x,y,z,sx,sy,sz,parent=root){
    const g=own(new THREE.SphereGeometry(1,18,12)),p=g.attributes.position,colors=new Float32Array(p.count*3),a=new THREE.Color(top),b=new THREE.Color(bottom),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const t=THREE.MathUtils.smoothstep(p.getY(i),-.7,.55);c.copy(b).lerp(a,t);colors.set([c.r,c.g,c.b],i*3);}
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const key='detail:gradient:'+top+':'+bottom;
    const material=materials[key]||(materials[key]=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.37,metalness:.035}));
    const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.lightCostume=true;parent.add(m);return m;
  }
  function eye(x,y,z,size=.043,parent=root){
    const e=group(x,y,z,parent);ball(ink,0,0,0,size,size*1.12,size*.58,e);ball(glint,-size*.27,size*.36,size*.5,size*.27,size*.28,size*.15,e);
    rig.eyes.push({node:e,scaleY:1});return e;
  }
  function face(y,z,spread=.075,size=.035,parent=root){eye(-spread,y,z,size,parent);eye(spread,y,z,size,parent);}
  function smile(y,z,width=.055,parent=root){stroke([[-width,y+.008,z],[0,y-.012,z+.005],[width,y+.008,z]],ink,.006,parent);}
  function joint(list,x,y,z,axis='y',side=1,parent=root,extra={}){const g=group(x,y,z,parent);list.push({node:g,axis,side,rotation:g.rotation.clone(),...extra});return g;}
  function leg(x,z,color,hoof=ivory,side=1){const g=joint(rig.legs,x,-.1,z,'x',side);ball(color,0,-.055,0,.05,.085,.05,g);ball(hoof,0,-.12,.025,.063,.035,.077,g);}
  function ears(color,inside,x=.14,y=.2,z=.05,parent=root){for(const side of[-1,1]){const e=joint(rig.ears,side*x,y,z,'z',side,parent);part('cone',color,0,.025,0,.075,.19,.065,e);part('cone',inside,0,.02,.047,.042,.12,.014,e);}}
  function fishTail(color,parent,z=-.26){
    const t=joint(rig.tails,0,0,z,'y',1,parent,{idle:.5,speed:.005,amplitude:.32});
    const f=curved(s=>{s.moveTo(0,0);s.bezierCurveTo(-.12,.07,-.19,.24,-.37,.26);s.bezierCurveTo(-.41,.12,-.25,.045,-.24,0);s.bezierCurveTo(-.28,-.07,-.39,-.13,-.36,-.25);s.bezierCurveTo(-.18,-.24,-.1,-.07,0,0);s.closePath();},color,.014,t);f.rotation.y=-Math.PI/2;
    for(const side of[-1,1])for(const h of[.10,.17,.23])stroke([[.012,0,0],[.012,side*h*.6,-.17],[.012,side*h,-.34]],0xffd69c,.005,t);
    return t;
  }
  function star(r,color,parent=root,depth=.045){const points=Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,d=i%2?r*.46:r;return[Math.cos(a)*d,Math.sin(a)*d];});return polygon(points,color,depth,parent,.018);}
  root.userData.detailedCompanion=1;
  if(kind==='dragon'){
    const jade=0x508e79,light=0xbfd39b;
    body(jade,light,0,-.025,-.06,.18,.17,.25);body(0x72ae8a,light,0,.13,.15,.19,.17,.18);ball(jade,0,.07,.29,.155,.09,.11);
    for(const y of[-.105,-.055,-.005]){ball(light,0,y,.14,.105,.033,.045);stroke([[-.08,y-.015,.17],[0,y-.025,.19],[.08,y-.015,.17]],jade,.005);}
    for(const side of[-1,1]){
      const horn=curved(s=>{s.moveTo(-.045,0);s.bezierCurveTo(-.07,.08,-.03,.19,.045,.24);s.quadraticCurveTo(.02,.08,.045,0);s.closePath();},ivory,.043);horn.position.set(side*.12,.24,.06);horn.rotation.z=-side*.23;horn.rotation.y=side*.25;
      ball(jade,side*.115,.22,.25,.076,.031,.039);const e=eye(side*.105,.183,.29,.037);e.rotation.y=side*.18;ball(ink,side*.07,.105,.385,.013,.010,.008);
      const wing=joint(rig.wings,side*.12,.04,-.12,'z',side,root,{idle:.08,speed:.004,amplitude:.17});
      const membrane=curved(s=>{s.moveTo(0,0);s.bezierCurveTo(.11,.22,.27,.31,.39,.29);s.lineTo(.33,-.045);s.quadraticCurveTo(.26,.03,.22,-.11);s.quadraticCurveTo(.14,-.025,.07,-.13);s.lineTo(0,0);s.closePath();},0x597e81,.018,wing);membrane.scale.x=side;wing.rotation.y=-side*.28;
      for(const [x,y]of[[.38,.28],[.33,-.045],[.22,-.11]])stroke([[0,0,.025],[side*x*.55,.13,.025],[side*x,y,.025]],0x92b49b,.008,wing);
      for(const z of[-.13,.12]){const limb=joint(rig.legs,side*.12,-.095,z,'x',side*(z<0?-1:1));ball(jade,0,-.055,0,.055,.08,.055,limb);ball(jade,0,-.12,.025,.064,.035,.08,limb);for(const dx of[-.027,.027])ball(ivory,dx,-.125,.09,.013,.014,.025,limb);}
      for(let i=0;i<3;i++)ball(jade,side*(.155+i*.005),.01-i*.02,-.10+i*.06,.027,.012,.027);
    }
    stroke([[-.10,.045,.37],[0,.03,.395],[.10,.045,.37]],0x2d665a,.006);
    const tail=joint(rig.tails,0,-.055,-.23,'y',1,root,{idle:.1,speed:.002,amplitude:.23});
    const t=curved(s=>{s.moveTo(-.055,.02);s.bezierCurveTo(-.035,-.12,.035,-.29,.13,-.37);s.bezierCurveTo(.10,-.18,.045,-.08,.055,.02);s.closePath();},jade,.055,tail);t.rotation.x=Math.PI/2;t.position.z=-.02;
    for(let i=0;i<3;i++){const spike=polygon([[-.033,0],[0,.08-i*.012],[.033,0]],0xc6bc7e,.024);spike.position.set(0,.14-i*.03,-.09-i*.10);spike.rotation.y=Math.PI/2;}
    const tip=polygon([[0,0],[-.065,.08],[.055,.12],[.10,.045]],0xbaa876,.025,tail);tip.rotation.x=Math.PI/2;tip.position.set(.075,.01,-.35);
  }else if(kind==='rover'){
    const steel=0xa5bac3,blue=0x52778c,ochre=0xcaa36d;
    part('box',steel,0,-.015,0,.38,.18,.43);
    part('box',0x697f8b,0,-.09,0,.30,.07,.48);part('box',ochre,0,.085,0,.34,.07,.32);
    for(const side of[-1,1]){
      stroke([[side*.12,-.07,.18],[side*.23,-.10,.07],[side*.23,-.10,-.18]],steel,.018);
      const panel=group(side*.145,.14,-.045);panel.rotation.z=-side*.08;part('box',ivory,0,0,0,.25,.025,.34,panel);part('box',blue,0,.017,0,.225,.008,.31,panel);
      for(const x of[-.065,0,.065])for(const z of[-.10,0,.10])part('box',0x97b5bd,x,.023,z,.004,.004,.09,panel);
      panel.updateWorldMatrix(true,true);for(const piece of [...panel.children])root.attach(piece);panel.removeFromParent();
      for(const z of[-.17,0,.17]){
        const wheel=joint(rig.wheels,side*.235,-.16,z,'x',side);
        part('cylinder',ink,0,0,0,.083,.065,.083,wheel).rotation.z=Math.PI/2;part('cylinder',steel,side*.039,0,0,.041,.016,.041,wheel,'metal').rotation.z=Math.PI/2;
        for(let i=0;i<10;i++){const a=i*Math.PI/5,lug=part('box',ink,0,Math.cos(a)*.079,Math.sin(a)*.079,.073,.018,.024,wheel);lug.rotation.x=a;}
      }
    }
    const mast=group(0,.11,.13);part('cylinder',steel,0,.11,0,.018,.22,.018,mast,'metal');part('box',ivory,0,.23,.005,.23,.10,.105,mast);part('box',ink,0,.23,.062,.19,.066,.018,mast);for(const x of[-.055,.055]){ball(0x86bec7,x,.23,.075,.029,.029,.010,mast);ball(glint,x-.008,.239,.084,.008,.008,.004,mast);}
    stroke([[-.1,.03,-.10],[-.14,.26,-.15],[-.14,.37,-.15]],ink,.007);ball(ochre,-.14,.38,-.15,.018,.018,.018);
    part('box',ink,0,-.10,.24,.31,.035,.03);for(const x of[-.13,.13])ball(glint,x,-.03,.221,.025,.017,.01);
  }else if(kind==='pfsh'){
    const f=group();f.rotation.y=-.45;
    body(0xf58b24,0xffe8bd,0,0,0,.205,.195,.285,f);ball(0xf7af43,0,.04,.2,.16,.15,.14,f);
    fishTail(0xea693d,f);
    const dorsal=curved(s=>{s.moveTo(-.19,0);s.quadraticCurveTo(-.1,.19,.12,.035);s.lineTo(.2,0);s.closePath();},0xf3aa45,.012,f);dorsal.rotation.y=-Math.PI/2;dorsal.position.y=.16;
    for(const side of[-1,1]){
      ball(0xffe4a1,side*.151,.062,.18,.067,.068,.035,f);const e=eye(side*.17,.066,.20,.039,f);e.rotation.y=side*.45;
      const fin=joint(rig.wings,side*.16,-.06,.02,'z',side,f,{idle:.6,speed:.006,amplitude:.22});
      const fan=curved(s=>{s.moveTo(0,0);s.quadraticCurveTo(.2,-.015,.18,-.19);s.quadraticCurveTo(.08,-.16,0,0);},0xffba5c,.012,fin);fan.scale.x=side;fan.rotation.y=side*.3;
      stroke([[side*.166,.02,.12],[side*.19,-.025,.08],[side*.16,-.075,.09]],0xc96936,.006,f);
      for(let row=0;row<2;row++)for(let i=0;i<3;i++)stroke([[side*(.196-row*.012),.03-row*.07,.035-i*.07],[side*(.204-row*.014),.005-row*.07,.01-i*.07],[side*(.196-row*.012),.03-row*.07,-.015-i*.07]],0xf8be61,.0035,f);
    }
    const lips=part('ring',0xd67b42,0,-.012,.326,.037,.025,.019,f);lips.rotation.x=.1;
    root.userData.floatHeight=.12;rig.floating=true;
  }else if(kind==='pshk'){
    const f=group();f.rotation.y=-.45;
    body(0x628da8,0xddeef0,0,-.015,0,.17,.16,.36,f);ball(0x85a8bc,0,.025,.26,.16,.13,.18,f);
    const tail=joint(rig.tails,0,-.015,-.31,'y',1,f,{idle:.5,speed:.004,amplitude:.3});
    const fluke=polygon([[0,0],[-.26,.26],[-.19,.045],[-.25,-.16],[-.04,-.065]],0x628da8,.028,tail);fluke.rotation.y=-Math.PI/2;
    const dorsal=polygon([[-.17,0],[.07,.24],[.15,-.015]],0x517d98,.025,f);dorsal.rotation.y=-Math.PI/2;dorsal.position.y=.115;
    for(const side of[-1,1]){eye(side*.125,.06,.342,.028,f);const fin=joint(rig.wings,side*.11,-.07,.03,'z',side,f,{idle:.3,speed:.004,amplitude:.16});const blade=polygon([[0,0],[side*.27,-.13],[side*.10,-.08]],0x648ca5,.018,fin);blade.rotation.x=-.3;for(let i=0;i<3;i++)stroke([[side*.155,.005,.11-i*.042],[side*.167,-.04,.095-i*.042]],0x2b586d,.005,f);}
    stroke([[-.09,-.04,.38],[0,-.065,.42],[.09,-.04,.38]],0x2c536b,.008,f);
    for(const x of[-.05,-.015,.02,.055])part('cone',ivory,x,-.057,.405,.012,.034,.012,f).rotation.z=Math.PI;
    root.userData.floatHeight=.1;rig.floating=true;
  }else if(kind==='pjel'){
    const profile=[[.025,-.015],[.22,-.015],[.255,.015],[.25,.075],[.21,.155],[.13,.21],[0,.23]];
    const bell=mesh(own(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),24)),0xd397d9);bell.material=mat(0xd397d9,'jelly');bell.material.transparent=true;bell.material.opacity=.86;bell.material.depthWrite=false;
    ball(0xffd2e9,0,.07,0,.16,.12,.16);part('ring',0xf8c1e8,0,.005,0,.245,.245,.12).rotation.x=Math.PI/2;
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7,x=Math.cos(a)*.13,z=Math.sin(a)*.13;const t=joint(rig.tails,x,-.025,z,'z',i%2?1:-1,root,{idle:1,speed:.003,amplitude:.15,phase:i*.8});stroke([[0,0,0],[.025,-.10,.012],[-.025,-.21,.03],[.018,-.32,.015]],i%2?0xd7a6ed:0xf5b4d8,.013,t);}
    face(.06,.252,.075,.033);smile(.005,.265,.025);for(const x of[-.13,.13])ball(0xf6a6cd,x,.012,.232,.033,.017,.015);
    root.userData.floatHeight=.2;rig.floating=true;
  }else if(kind==='pfrg'){
    body(0x62bc81,0xdff1ae,0,-.04,-.015,.22,.135,.23);ball(0x79cb8d,0,.045,.10,.20,.105,.15);
    for(const side of[-1,1]){ball(0x64b982,side*.13,.14,.12,.09,.10,.08);ball(ivory,side*.13,.159,.181,.059,.066,.025);eye(side*.13,.16,.204,.032);ball(0xf2b0a5,side*.17,.035,.207,.035,.019,.012);ball(0x479b67,side*.19,-.1,-.12,.105,.08,.13);leg(side*.12,.1,0x6dbc80,0x92d89b,side);}
    smile(.015,.239,.09);for(const x of[-.07,.07])ball(0x3e8a62,x,.085,-.13,.033,.014,.025);
  }else if(kind==='pbat'){
    body(0x40516e,0x8492b1,0,-.02,0,.105,.17,.105);ball(0x516080,0,.105,.025,.12,.105,.1);ears(0x4b5b7b,0xb98ba8,.085,.22,0);face(.12,.115,.048,.028);
    for(const side of[-1,1]){const w=joint(rig.wings,side*.065,.03,-.015,'z',side,root,{idle:1,speed:.013,amplitude:.26});const wing=curved(s=>{s.moveTo(0,0);s.quadraticCurveTo(.14,.16,.36,.12);s.lineTo(.31,-.08);s.quadraticCurveTo(.24,.01,.18,-.13);s.quadraticCurveTo(.12,-.03,.045,-.11);s.lineTo(0,0);s.closePath();},0x687397,.022,w);wing.scale.x=side;for(const p of[[.31,.11],[.25,-.02],[.17,-.09]])stroke([[0,0,.028],[side*p[0]*.6,.065,.028],[side*p[0],p[1],.028]],0x9ba5c0,.007,w);}
    for(const x of[-.025,.025])part('cone',ivory,x,.035,.118,.012,.034,.012).rotation.z=Math.PI;
    root.userData.floatHeight=.12;rig.floating=true;
  }else if(kind==='pmus'||kind==='pwol'){
    const wolf=kind==='pwol',fur=wolf?0x889bb7:0xb0adb9,light=wolf?0xe2ebef:0xeee3de;
    body(fur,light,0,-.035,-.05,.17,.15,.24);ball(fur,0,.07,.135,.18,.16,.16);ball(light,0,.015,.27,.12,.075,.085);ball(ink,0,.04,.337,.035,.025,.024);
    if(wolf)ears(fur,0xe4b5b2,.115,.22,.09);else for(const side of[-1,1]){ball(fur,side*.16,.22,.07,.10,.11,.045);ball(0xeab6c5,side*.16,.223,.107,.066,.077,.014);}
    face(.102,.253,.082,.034);for(const x of[-.12,.12])for(const z of[-.13,.12])leg(x,z,fur,light,(x<0?-1:1)*(z<0?-1:1));
    const t=joint(rig.tails,0,-.04,-.21,'y',1,root,{idle:.15,speed:.003,amplitude:.25});
    if(wolf){const plume=ball(fur,.02,.01,-.12,.09,.10,.23,t);plume.rotation.y=-.35;ball(light,.08,.018,-.28,.065,.073,.09,t);part('ring',0x387d88,0,-.02,.15,.132,.12,.10).rotation.x=Math.PI/2;ball(0xd3bb82,0,-.1,.28,.035,.04,.017);}
    else{stroke([[0,0,0],[.04,-.025,-.12],[.16,-.02,-.20],[.19,.03,-.12]],0xe4aab9,.014,t);for(const side of[-1,1])for(const dy of[-.012,.018])stroke([[side*.08,.005,.303],[side*.21,dy,.296]],0xc8c4cd,.003);}
    smile(-.005,.337,.033);
  }else if(kind==='pshp'){
    ball(0xeae7dc,0,-.01,-.055,.23,.17,.26);
    for(let i=0;i<14;i++){const a=i*Math.PI*2/7,y=i<7?.075:-.05;ball(i%3?ivory:0xe9e6d8,Math.cos(a)*.18,y,Math.sin(a)*.22-.04,.09,.085,.095);}
    ball(0x3b4451,0,.04,.23,.12,.13,.12);for(const side of[-1,1]){ball(0x444c59,side*.14,.08,.19,.09,.035,.06);for(const z of[-.15,.12])leg(side*.13,z,0x525765,0x303b4a,side*(z<0?-1:1));}
    ball(ivory,0,.17,.20,.115,.055,.08);face(.07,.335,.048,.026);part('ring',0xb29b69,0,-.035,.18,.11,.1,.075).rotation.x=Math.PI/2;ball(0xd2b877,0,-.1,.285,.035,.04,.028);
  }else if(kind==='pgeo'){
    const earth=group(0,.07,0);body(0x418cc4,0x70c3d1,0,0,0,.205,.205,.205,earth);
    const patch=points=>{const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),flat=new THREE.ShapeGeometry(s),p=flat.attributes.position,idx=flat.index,vertices=[];
      const surface=(a,b,c,i,j,n)=>{const u=i/n,v=j/n,lon=(a.x+(b.x-a.x)*u+(c.x-a.x)*v)*Math.PI/180,lat=(a.y+(b.y-a.y)*u+(c.y-a.y)*v)*Math.PI/180;vertices.push(.209*Math.sin(lon)*Math.cos(lat),.209*Math.sin(lat),.209*Math.cos(lon)*Math.cos(lat));};
      for(let t=0;t<idx.count;t+=3){const a=new THREE.Vector2(p.getX(idx.getX(t)),p.getY(idx.getX(t))),b=new THREE.Vector2(p.getX(idx.getX(t+1)),p.getY(idx.getX(t+1))),c=new THREE.Vector2(p.getX(idx.getX(t+2)),p.getY(idx.getX(t+2))),n=8;for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){surface(a,b,c,i,j,n);surface(a,b,c,i+1,j,n);surface(a,b,c,i,j+1,n);if(j<n-i-1){surface(a,b,c,i+1,j,n);surface(a,b,c,i+1,j+1,n);surface(a,b,c,i,j+1,n);}}}
      flat.dispose();const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();mesh(g,0x82c9a4,earth);};
    patch([[-20,36],[8,37],[30,20],[42,10],[25,-10],[18,-34],[2,-22],[-8,3],[-18,12]]);patch([[-78,9],[-45,-3],[-38,-18],[-67,-54],[-72,-20]]);patch([[-130,57],[-70,60],[-55,45],[-80,22],[-100,29]]);patch([[0,55],[35,70],[95,58],[135,45],[120,10],[80,7],[45,28],[20,42]]);patch([[112,-12],[145,-10],[154,-32],[125,-41]]);
    stroke(Array.from({length:25},(_,i)=>{const a=-Math.PI*.8+i/24*Math.PI*1.6;return[Math.sin(a)*.256,.07+Math.cos(a)*.256,0];}),0xc9ac6b,.014).rotation.z=-.3;
    part('cylinder',0x7e6851,0,-.215,0,.025,.1,.025);part('cylinder',0xb6a078,0,-.266,0,.13,.032,.10,root,'metal');
  }else if(kind==='pgho'){
    const g=own(new THREE.LatheGeometry([[.22,-.2],[.205,-.13],[.202,-.06],[.205,.02],[.195,.09],[.17,.16],[.12,.22],[.06,.257],[0,.27]].map(p=>new THREE.Vector2(...p)),28));const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-.12){const a=Math.atan2(p.getX(i),p.getZ(i));p.setY(i,y+Math.cos(a*5)*.026);}}g.computeVertexNormals();mesh(g,0xe4f1fb);
    face(.065,.19,.07,.034);ball(0x56758d,0,-.015,.208,.022,.028,.012);for(const x of[-.13,.13]){ball(0xebbbcf,x,.012,.174,.035,.018,.012);ball(0xe4f1fb,x*1.7,-.025,.01,.09,.043,.06);}
    root.userData.floatHeight=.09;rig.floating=true;
  }else if(kind==='pcld'){
    for(const [x,y,z,r]of[[-.17,0,0,.13],[-.07,.08,0,.15],[.09,.08,0,.15],[.19,.01,0,.11],[0,-.035,.045,.16]])body(0xf6fcff,0xb1d4e6,x,y,z,r,r*.82,r*.82);
    face(.025,.157,.062,.028);smile(-.022,.185,.03);
    for(const [i,x]of[-.12,.015,.145].entries()){const d=joint(rig.tails,x,-.11,0,'z',i%2?1:-1,root,{idle:1,speed:.003,amplitude:.13,phase:i});ball(0x81c2de,0,-.07,0,.027,.055,.027,d);part('cone',0x81c2de,0,-.015,0,.025,.058,.025,d);}
    root.userData.floatHeight=.12;rig.floating=true;
  }else if(kind==='pstr'||kind==='phrt'){
    if(kind==='pstr'){star(.285,0xe6b94e);const center=star(.205,0xffdc78,root,.018);center.position.z=.055;}
    else{const heart=curved(s=>{s.moveTo(0,-.235);s.bezierCurveTo(-.08,-.17,-.29,-.02,-.235,.14);s.bezierCurveTo(-.20,.27,-.05,.25,0,.15);s.bezierCurveTo(.09,.29,.25,.23,.25,.11);s.bezierCurveTo(.25,-.035,.07,-.18,0,-.235);s.closePath();},0xe98eaf,.09);heart.position.z=-.04;stroke([[-.17,.11,.075],[-.145,.18,.073],[-.095,.185,.071]],0xffd3dd,.012);}
    face(.015,.105,.067,.029);smile(-.047,.107,.03);for(const x of[-.12,.12])ball(kind==='pstr'?0xefac77:0xf1b8ca,x,-.032,.104,.025,.015,.01);
    root.userData.floatHeight=.09;rig.floating=true;
  }else if(kind==='pbal'){
    body(0xe9809e,0xf4aec0,0,.16,0,.19,.235,.17);part('cone',0xcc6b8c,0,-.09,0,.04,.07,.035).rotation.z=Math.PI;ball(glint,-.07,.27,.128,.028,.062,.013);
    const ribbon=joint(rig.tails,0,-.1,0,'z',1,root,{idle:1,speed:.002,amplitude:.1});stroke([[0,0,0],[.015,-.1,0],[-.05,-.19,.01],[.01,-.28,0],[.065,-.24,.01]],0xe3c194,.008,ribbon);face(.16,.158,.065,.027);smile(.102,.175,.028);rig.floating=true;root.userData.floatHeight=.1;
  }else if(kind==='pdol'){
    const g=own(new THREE.LatheGeometry([[0,-.24],[.14,-.24],[.19,-.15],[.16,-.015],[.11,.1],[.125,.18],[.085,.26],[0,.28]].map(p=>new THREE.Vector2(...p)),20));mesh(g,0xb66d86);
    ball(cream,0,.15,.093,.092,.095,.044);face(.16,.136,.035,.018);smile(.116,.139,.018);part('ring',0xe1b978,0,-.20,0,.15,.15,.1).rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(0xf0d6c2,Math.sin(a)*.045,-.045+Math.cos(a)*.045,.165,.025,.025,.012);}ball(0xd0a457,0,-.045,.18,.018,.018,.009);stroke([[-.055,.25,.07],[0,.215,.14],[.055,.25,.07]],0xe2b394,.009);
  }else if(kind==='pmsh'){
    const stem=own(new THREE.LatheGeometry([[.115,-.2],[.135,-.16],[.095,.015],[.08,.13]].map(p=>new THREE.Vector2(...p)),18));mesh(stem,ivory);
    const cap=own(new THREE.LatheGeometry([[0,.09],[.255,.09],[.27,.115],[.23,.20],[.14,.27],[0,.30]].map(p=>new THREE.Vector2(...p)),24));mesh(cap,0xbf6e77);
    for(const [x,y,z,r]of[[-.1,.247,.10,.05],[.11,.24,.1,.045],[0,.29,-.01,.055],[-.16,.19,-.10,.04],[.16,.18,-.1,.045]])ball(ivory,x,y,z,r,.012,r);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;stroke([[Math.cos(a)*.10,.084,Math.sin(a)*.10],[Math.cos(a)*.235,.084,Math.sin(a)*.235]],0xdcbfa6,.004);}
    face(-.045,.104,.045,.025);smile(-.09,.12,.025);for(const x of[-.065,.065])ball(0xe5c3b2,x,-.09,.084,.028,.014,.015);
  }else if(kind==='pbrd'){
    body(0xe5c65e,0xfff0bd,0,-.025,0,.18,.19,.19);ball(0xf1d579,0,.12,.06,.155,.14,.145);face(.14,.18,.065,.031);
    part('cone',0xcd8f4e,0,.075,.235,.045,.12,.045).rotation.x=Math.PI/2;
    for(const side of[-1,1]){const w=joint(rig.wings,side*.15,0,0,'z',side,root,{idle:.12,speed:.005,amplitude:.16});ball(0xc4aa57,side*.018,0,0,.057,.12,.13,w);for(let i=0;i<3;i++)stroke([[side*.04,.035,-.03+i*.04],[side*.05,-.065,-.045+i*.04]],0xf3dda2,.004,w);leg(side*.07,.03,0xc69d65,0xdbac65,side);}
    for(const x of[-.07,0,.07]){const feather=ball(0xbda563,x,-.06,-.20,.045,.035,.13);feather.rotation.x=.2;}
  }else if(kind==='pcub'){
    part('box',0x81b8d4,0,0,0,.34,.34,.34);part('box',0xbfe7f0,0,.165,0,.30,.035,.30);
    for(const side of[-1,1]){const shine=part('box',0xe5f9fc,side*.12,.07,.176,.012,.15,.009);shine.rotation.z=-.32;}
    face(.018,.18,.067,.032);smile(-.046,.183,.027);polygon([[0,.065],[.045,0],[0,-.065],[-.045,0]],0xb6e3ed,.009).position.set(0,.03,-.183);
    for(const x of[-.09,.09])ball(0x9acbdc,x,-.18,.025,.07,.025,.09);
  }else if(kind==='pflm'){
    const flame=(scale,color,z)=>{const f=curved(s=>{s.moveTo(0,-.19);s.bezierCurveTo(-.22,-.18,-.22,.02,-.08,.18);s.quadraticCurveTo(.025,.31,-.01,.36);s.bezierCurveTo(.20,.23,.05,.12,.15,.09);s.quadraticCurveTo(.27,-.12,0,-.19);s.closePath();},color,.045);f.scale.setScalar(scale);f.position.z=z;return f;};
    flame(1,0xe89658,0);flame(.69,0xf6c970,.055);flame(.4,0xffe7a2,.10);face(-.045,.15,.044,.025);smile(-.09,.154,.022);
    for(const [i,x]of[-.15,.13].entries()){const ember=joint(rig.tails,x,.19+i*.06,-.015,'z',i?1:-1,root,{idle:1,speed:.004,amplitude:.2});part('octa',0xf4c979,0,.03,0,.022,.045,.022,ember);}root.userData.floatHeight=.03;rig.floating=true;
  }else if(kind==='pice'){
    const crystal=polygon([[0,.29],[.16,.12],[.12,-.17],[0,-.24],[-.12,-.17],[-.16,.12]],0x92c4e1,.12);crystal.position.z=-.06;
    polygon([[0,.26],[0,-.2],[-.12,-.14],[-.15,.10]],0xc5e5f1,.01).position.z=.067;
    for(const [i,x]of[-.13,.12].entries()){const w=joint(rig.wings,x,-.02,0,'z',i?1:-1,root,{idle:.6,speed:.003,amplitude:.13});part('octa',0xc5e9f3,(i?1:-1)*.1,0,0,.11,.06,.04,w);}
    for(const x of[-.07,.07])part('octa',glint,x,.24,0,.035,.11,.035);face(.025,.09,.057,.027);smile(-.038,.092,.022);root.userData.floatHeight=.06;rig.floating=true;
  }
  root.position.y+=Number(root.userData.floatHeight)||0;
  return rig;
}
/* DETAILED_COMPANIONS_V1_END */
