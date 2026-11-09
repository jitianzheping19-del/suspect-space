import * as T from 'three';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';

// Render actual Three.js meshes once as vector images. No WebGL context or
// animation loop is added to a meeting; callers reuse the resulting images.
export function renderRoomIcons(catalog){
 const renderer=new SVGRenderer();renderer.setSize(96,96);renderer.setPrecision(2);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.25,1.25,1.25,-1.25,.1,30);
 camera.position.set(3.4,3,5.3);camera.lookAt(0,.57,0);scene.add(new T.AmbientLight(0xffffff,.7));
 const key=new T.DirectionalLight(0xffffff,1.15);key.position.set(-3,6,5);scene.add(key);
 const materials=new Map(),geometries=new Map(),urls=new Map();
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshLambertMaterial({color,flatShading:true}));return materials.get(color);};
 const geometry=(key,create)=>{if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);};
 const mesh=(parent,g,c,x,y,z,sx=1,sy=sx,sz=sx)=>{const m=new T.Mesh(g,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
 const cube=geometry('box',()=>new T.BoxGeometry(1,1,1));
 const box=(p,c,x,y,z,w,h,d)=>mesh(p,cube,c,x,y,z,w,h,d);
 const cyl=(p,c,x,y,z,r,h)=>mesh(p,geometry('cylinder',()=>new T.CylinderGeometry(1,1,1,12)),c,x,y,z,r,h,r);
 const ball=(p,c,x,y,z,r,s=1)=>mesh(p,geometry('sphere',()=>new T.SphereGeometry(1,10,6)),c,x,y,z,r,r*s,r);
 const ring=(p,c,x,y,z,r)=>mesh(p,geometry('ring',()=>new T.TorusGeometry(1,.13,5,16)),c,x,y,z,r);
 const slab=(p,c,pts,x=0,y=0,z=0)=>{const id=JSON.stringify(pts),g=geometry(id,()=>{const s=new T.Shape();pts.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();return new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false});});return mesh(p,g,c,x,y,z);};
 const white='#e5f1f5',ink='#193348',steel='#92adbe',screen='#64d5ed',red='#f17c88';
 const line=(p,c,a,b,r=.045)=>{const delta=new T.Vector3(...b).sub(new T.Vector3(...a));const m=cyl(p,c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,delta.length());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
 const cross=(p,x,y,z)=>{box(p,white,x,y,z,.46,.14,.08);box(p,white,x,y,z,.14,.46,.08);};
 const crate=(p,c,x,y,z,s=.7)=>{box(p,c,x,y,z,s,s,s);box(p,white,x,y,z+s/2+.01,s*.8,.07,.035);box(p,white,x,y,z+s/2+.02,.07,s*.8,.035);};
 const monitor=(p,c,x=0,y=.75,z=0)=>{box(p,ink,x,y,z,1.12,.76,.18);box(p,c,x,y,z+.12,.9,.55,.06);box(p,steel,x,y-.48,z,.16,.3,.18);box(p,steel,x,y-.6,z,.65,.08,.4);};
 const table=(p,c)=>{cyl(p,steel,0,.38,0,.14,.6);cyl(p,c,0,.73,0,.72,.12);for(const side of[-1,1]){box(p,c,side*.78,.38,0,.28,.13,.4);box(p,steel,side*.78,.2,0,.09,.3,.09);}};
 const bed=(p,c)=>{box(p,steel,0,.35,0,1.15,.18,1.25);box(p,c,0,.5,.16,1.05,.16,.88);box(p,white,0,.57,-.4,.92,.2,.3);for(const x of[-.44,.44])for(const z of[-.46,.46])box(p,ink,x,.17,z,.1,.28,.1);};
 try{
 for(const spec of catalog){
  const p=new T.Group(),c=spec.color;scene.add(p);cyl(p,ink,0,.02,0,.95,.1);cyl(p,c,0,.085,0,.87,.045);
  switch(spec.kind){
   case 'cafeteria':table(p,c);cyl(p,white,.2,.82,0,.2,.035);ball(p,red,-.2,.89,.16,.11);break;
   case 'meeting':table(p,c);cyl(p,ink,0,.85,0,.24,.12);cyl(p,red,0,.95,0,.17,.09);break;
   case 'engine':{const m=cyl(p,c,0,.65,0,.43,1.18);m.rotation.z=Math.PI/2;for(const x of[-.45,0,.45]){const r=ring(p,steel,x,.65,0,.45);r.rotation.y=Math.PI/2;}box(p,ink,0,.22,0,1.3,.15,.6);box(p,screen,.15,1.12,0,.4,.17,.25);break;}
   case 'reactor':cyl(p,steel,0,.22,0,.47,.2);cyl(p,c,0,.7,0,.33,.86);cyl(p,white,0,1.18,0,.47,.15);for(const x of[-.3,.3])box(p,screen,x,.7,.29,.07,.65,.08);break;
   case 'security':line(p,steel,[0,.15,0],[0,.85,0],.09);box(p,c,0,1,0,1.15,.5,.48);const lens=cyl(p,ink,.3,1,.32,.19,.24);lens.rotation.x=Math.PI/2;ball(p,screen,.3,1,.46,.12);break;
   case 'medical':bed(p,c);box(p,red,-.38,1,-.43,.58,.5,.1);cross(p,-.38,1,-.35);break;
   case 'electrical':case 'power':box(p,steel,0,.69,0,1.08,1.07,.55);box(p,ink,0,.69,.3,.9,.87,.06);slab(p,c,[[.08,1.1],[-.28,.6],[-.03,.6],[-.1,.28],[.3,.79],[.06,.79]],0,0,.36);if(spec.kind==='power')for(const x of[-.6,.6])cyl(p,c,x,.45,0,.12,.62);break;
   case 'storage':crate(p,c,0,.56,0,.85);break;
   case 'cargo':crate(p,c,-.32,.46,.22,.64);crate(p,white,.35,.43,-.24,.58);crate(p,c,.32,.94,-.24,.43);break;
   case 'admin':monitor(p,c);for(const x of[-.25,0,.25]){ball(p,white,x,.82,.18,.055);box(p,white,x,.66,.18,.1,.12,.035);}break;
   case 'communications':{line(p,steel,[0,.15,0],[0,.7,0],.08);const dish=cyl(p,c,0,.9,0,.55,.12);dish.rotation.x=Math.PI/3;const r=ring(p,white,0,.9,.04,.42);r.rotation.x=-Math.PI/6;line(p,white,[0,.87,.08],[0,1.32,.4],.045);ball(p,red,0,1.32,.4,.09);break;}
   case 'weapons':cyl(p,steel,0,.26,0,.53,.26);ball(p,c,0,.61,0,.42);line(p,ink,[0,.66,.12],[.55,1.05,.64],.17);break;
   case 'oxygen':for(const x of[-.28,.28]){cyl(p,c,x,.68,0,.23,.92);ball(p,white,x,1.14,0,.23,.45);box(p,steel,x,1.32,0,.2,.15,.13);}break;
   case 'navigation':{const dial=cyl(p,ink,0,.64,0,.66,.16);dial.rotation.x=Math.PI/2;ring(p,c,0,.64,.11,.6);slab(p,red,[[0,1.15],[-.16,.49],[0,.61],[.16,.49]],0,0,.16);box(p,steel,0,.22,0,.15,.22,.16);break;}
   case 'shields':slab(p,c,[[-.59,1.25],[.59,1.25],[.49,.58],[0,.18],[-.49,.58]],0,0,0);slab(p,white,[[-.38,1.09],[.38,1.09],[.3,.66],[0,.41],[-.3,.66]],0,0,.13);break;
   case 'lift':box(p,steel,0,.75,-.25,1.2,1.2,.15);box(p,ink,0,.74,-.13,.92,1.03,.09);box(p,c,0,.35,.04,.88,.12,.65);for(const x of[-.6,.6])box(p,c,x,.75,.05,.09,1.2,.12);slab(p,white,[[-.2,.94],[0,1.17],[.2,.94]],0,0,.05);break;
   case 'passage':box(p,steel,0,.6,0,.1,1,.1);box(p,c,0,1.02,0,1.3,.4,.16);slab(p,white,[[-.38,.97],[.17,.97],[.17,.88],[.43,1.02],[.17,1.17],[.17,1.08],[-.38,1.08]],0,0,.1);break;
   case 'vault':box(p,c,0,.72,0,1.22,1.12,.7);box(p,ink,0,.72,.38,.98,.88,.07);ring(p,white,.12,.72,.46,.26);line(p,white,[-.14,.72,.48],[.38,.72,.48],.035);line(p,white,[.12,.46,.48],[.12,.98,.48],.035);break;
   case 'records':box(p,steel,0,.72,-.15,1.2,1.15,.65);for(const y of[.48,.96]){for(let i=0;i<4;i++)box(p,[c,red,screen,white][i],-.42+i*.27,y,.22,.2,.36,.28);box(p,ink,0,y-.23,.22,1.15,.06,.45);}break;
   case 'lounge':box(p,c,0,.45,0,1.32,.32,.73);box(p,c,0,.79,-.28,1.32,.57,.22);for(const x of[-.63,.63])box(p,white,x,.62,.09,.18,.4,.75);box(p,steel,0,.23,0,1.2,.15,.63);break;
   case 'toilets':box(p,white,0,.84,-.36,.74,.8,.3);ball(p,white,0,.5,.16,.44,.62);const seat=ring(p,ink,0,.68,.18,.3);seat.rotation.x=Math.PI/2;cyl(p,white,0,.27,.1,.21,.3);box(p,c,.2,1.2,-.35,.14,.04,.13);break;
   case 'showers':line(p,steel,[-.3,.15,-.2],[-.3,1.3,-.2],.07);line(p,steel,[-.3,1.3,-.2],[.3,1.3,.1],.07);cyl(p,white,.3,1.25,.1,.28,.08);for(const x of[.13,.3,.47])line(p,c,[x,1.12,.1],[x,.53,.1],.024);break;
   case 'ventilation':box(p,steel,0,.75,0,1.2,1.14,.22);ring(p,ink,0,.75,.15,.47);for(let i=0;i<4;i++){const blade=box(p,c,0,.75,.19,.16,.77,.09);blade.rotation.z=i*Math.PI/2+.55;}ball(p,white,0,.75,.24,.12);break;
   case 'dormitory':bed(p,c);break;
   case 'darkroom':box(p,c,0,.7,0,1.2,.75,.53);box(p,ink,-.32,1.13,0,.4,.16,.3);const cameraLens=cyl(p,ink,.16,.7,.37,.29,.3);cameraLens.rotation.x=Math.PI/2;ball(p,screen,.16,.7,.55,.19,.9);break;
   case 'cockpit':monitor(p,c,0,.9,-.2);ring(p,white,0,.64,.47,.31);line(p,white,[0,.64,.47],[0,.35,.2],.06);break;
   case 'armory':box(p,ink,0,.75,-.16,1.2,1.18,.15);for(const x of[-.3,.3]){box(p,c,x,.75,.03,.17,.9,.14);box(p,white,x,.35,.1,.36,.14,.18);box(p,steel,x,1.26,.03,.11,.16,.1);}break;
   case 'kitchen':box(p,steel,0,.36,0,1.28,.42,.85);cyl(p,ink,-.2,.66,0,.42,.13);line(p,c,[.05,.68,0],[.8,.68,.18],.075);ball(p,white,-.2,.74,.04,.2,.24);ball(p,'#f2cd72',-.2,.78,.04,.09,.4);break;
   case 'viewing':line(p,steel,[0,.68,0],[-.42,.15,.35]);line(p,steel,[0,.68,0],[.42,.15,.35]);line(p,steel,[0,.68,0],[0,.15,-.4]);line(p,c,[-.5,1.15,-.12],[.5,.86,.12],.23);break;
   case 'portraits':box(p,c,0,.78,0,1.02,1.23,.14);box(p,ink,0,.78,.09,.8,1.02,.06);ball(p,white,0,.98,.18,.2);box(p,steel,0,.58,.17,.52,.4,.12);break;
   case 'dome':{const dome=mesh(p,geometry('dome',()=>new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2)),c,0,.2,0,.78);const r=ring(p,white,0,.22,0,.79);r.rotation.x=Math.PI/2;box(p,ink,0,.39,.69,.34,.43,.13);break;}
   case 'hangar':{const ship=ball(p,white,0,.55,0,.32,1.7);ship.rotation.x=Math.PI/2;box(p,c,0,.44,.05,1.4,.1,.62);ball(p,screen,0,.69,.21,.18,.5);for(const x of[-.5,.5])line(p,steel,[x,.4,-.4],[x,.4,.4],.12);break;}
   case 'habitat':box(p,c,0,.57,0,1.07,.75,.87);slab(p,white,[[-.67,.95],[0,1.4],[.67,.95]],0,0,-.44).scale.z=7;box(p,ink,0,.47,.46,.27,.54,.05);break;
   case 'laboratory':cyl(p,white,0,1.03,0,.18,.5);mesh(p,geometry('flask',()=>new T.ConeGeometry(.52,.85,12)),c,0,.6,0);cyl(p,white,0,1.3,0,.24,.08);break;
   case 'specimen':for(const [i,x]of[-.4,0,.4].entries()){cyl(p,[c,screen,red][i],x,.65,0,.13,.85);cyl(p,white,x,1.12,0,.16,.13);}box(p,steel,0,.32,0,1.24,.14,.45);break;
   case 'drill':box(p,c,0,.99,0,.68,.49,.6);mesh(p,geometry('drill',()=>new T.ConeGeometry(.32,.72,10)),steel,0,.43,0).rotation.z=Math.PI;for(const x of[-.65,.65])line(p,ink,[x,.15,0],[x,.85,0],.09);line(p,steel,[-.65,.85,0],[.65,.85,0],.08);break;
   case 'deep':for(const [x,z,r]of[[-.32,0,.32],[.25,.18,.26],[.12,-.27,.37]]){const crystal=mesh(p,geometry('crystal',()=>new T.OctahedronGeometry(1)),c,x,r*1.7,z,r,r*1.6,r);crystal.rotation.z=x*.5;}break;
   default:throw new Error('Unknown room icon: '+spec.kind);
  }
  renderer.render(scene,camera);renderer.domElement.style.background='none';renderer.domElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
  urls.set(spec.kind,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderer.domElement.outerHTML));scene.remove(p);
 }
 return urls;
 }finally{for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();scene.clear();renderer.clear();}
}
