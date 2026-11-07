import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {deferredFeature} from '../optional-features.js';
const code=(await readFile(new URL('../interaction-feedback.js',import.meta.url),'utf8')).replace("import './interaction-feedback.css';",'');
const {createNotificationCounter,createInteractionVisuals}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const counter=createNotificationCounter();assert.equal(counter.push('切断','error',0),1);assert.equal(counter.push('切断','error',1),2);assert.equal(counter.push('権限','error',2),1);counter.clear();assert.equal(counter.push('切断','error',3),1);assert.equal(counter.push('切断','error',7000),1);
let finish,created=0,opens=0,visible;
const lazy=deferredFeature(()=>new Promise(r=>finish=r),()=>{created++;return{open(){opens++;},sync(v){visible=v;},close(){},reset(){}};});
assert.equal(created,0);lazy.sync(false);assert.equal(created,0);lazy.sync(true);const open=lazy.open();await Promise.resolve();lazy.reset();lazy.sync(false);finish({});await open;assert.equal(created,1);assert.equal(opens,0);assert.equal(visible,false);lazy.sync(true);await lazy.open();assert.equal(opens,1);
const scene=new THREE.Scene(),visual=createInteractionVisuals(THREE,scene),position={x:0,z:0};
visual.update({enabled:true,position,preview:{radius:8},wallBetween:(a,b)=>b.x>2,time:100});
const ring=visual.root.children.find(o=>o.type==='Line'),p=ring.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(p.getX(i)<=2.001,'range cannot cross blocking wall');
visual.update({enabled:true,position,yaw:0,preview:{radius:80,beam:true,start:2.6,width:3.4},time:200});assert(Math.abs(p.getZ(0)-2.6)<.001);assert(Math.abs(p.getZ(32)-80)<.001);
visual.update({enabled:false,position});assert.equal(visual.root.visible,false);visual.dispose();assert.equal(scene.children.length,0);
// Exercise the real camera clipper at a wall and at the near-plane edge.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),start=html.indexOf('    function inputClipCameraRay('),end=html.indexOf('\nfunction beginVentTraversal',start);
const make=new Function('inputCameraClippedPosition','wallsInBounds',html.slice(start,end)+';return inputClipCameraRay;');
const clip=make(new THREE.Vector3(),()=>[{ax:-2,az:2,bx:2,bz:2,h:4}]);
assert(clip(new THREE.Vector3(0,1,0),new THREE.Vector3(0,2,4),1).z<2);
const corner=make(new THREE.Vector3(),()=>[{ax:.2,az:2,bx:2,bz:2,h:4}]);assert(corner(new THREE.Vector3(0,1,0),new THREE.Vector3(0,2,4),1).z<2,'near-plane edge collides even when center ray misses');
assert.equal(clip(new THREE.Vector3(0,6,0),new THREE.Vector3(0,8,4),6).z,4,'camera can pass above wall');
console.log('PASS notification grouping, lazy-load stale-open cancellation, range occlusion, beam dimensions, visual cleanup, camera wall/corner/above-wall');
const meeting=await readFile(new URL('../assets-source/meeting-scene.html',import.meta.url),'utf8');
const boxSource=meeting.slice(meeting.indexOf('const mrBoxGeometries='),meeting.indexOf('function mrRing('));
const chairSource=meeting.slice(meeting.indexOf('const sharedMeetingChair='),meeting.indexOf('const metal=',meeting.indexOf('const sharedMeetingChair=')));
const materials=Object.fromEntries(['dark','edge','trim','steel'].map(key=>[key,new THREE.MeshStandardMaterial()]));
const mrMesh=(geometry,material,parent)=>{const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;};
const chair=new Function('THREE','mrMats','scene','mrMesh',boxSource+chairSource+';return sharedMeetingChair;')(THREE,materials,new THREE.Scene(),mrMesh);
assert.equal(chair.children.length,4,'chair is batched by its four materials');const clone=chair.clone(true);chair.children.forEach((mesh,i)=>assert.equal(mesh.geometry,clone.children[i].geometry,'chair copies share buffers'));
const crewSource=meeting.slice(meeting.indexOf('function makeCrew('),meeting.indexOf('/* ---------- particles ---------- */'));
const makeCrew=new Function('THREE',crewSource+';return makeCrew;')(THREE);
for(let i=0;i<10;i++){const crew=makeCrew(),resources=new Set();crew.root.traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.material)resources.add(n.material);});let freed=0;for(const r of resources)r.addEventListener('dispose',()=>freed++);crew.dispose();assert.equal(freed,resources.size,'all owned avatar buffers/materials are freed');}
console.log('PASS shared chair geometry, four material batches, repeated avatar resource disposal');
const doorBuilder=html.slice(html.indexOf('function mergeShipDoorSection('),html.indexOf('function updateShipDoorProgressMarkers('));
const doorUpdate=html.slice(html.indexOf('function updateShipDoorVisuals('),html.indexOf('\nlet app, auth, db, uid;',html.indexOf('function updateShipDoorVisuals(')));
const doorCheck=new Function('THREE',`
${doorBuilder}
const door={id:'test',x:0,z:0,tx:1,tz:0,w:2,map:'classic'},game={phase:'play',round:1,settings:{viewMode:'3d'}},code='test',shipRoot=new THREE.Group(),shipDoorVisuals=new Map();
let shipDoorVisualRoot,shipDoorVisualMap='',shipDoorCollisionKey='',shipDoorVisualRound='',openness=1,state={closed:false};
const now=()=>1000,isWaitingLobbyForRunningMatch=()=>false,shipDoorLayout=()=>({map:'classic',doors:[door]}),shipDoorState=()=>state,shipDoorOpenAmount=()=>openness,updateShipDoorProgressMarkers=()=>{};
${doorUpdate}
return {set(open,s){openness=open;state=s;updateShipDoorVisuals(.016);const v=shipDoorVisuals.get('test');return{root:v.root.visible,leaves:v.leaves.map(l=>l.mesh.visible),lamp:v.light.color.getHex(),floor:v.floorLight.color.getHex()};}};
`)(THREE);
assert.deepEqual(doorCheck.set(1,{closed:false}),{root:true,leaves:[false,false],lamp:0x66edc1,floor:0x66edc1});
assert.deepEqual(doorCheck.set(0,{closed:true}),{root:true,leaves:[true,true],lamp:0xff5a5d,floor:0xff5a5d});
assert.equal(doorCheck.set(.5,{closed:true,openingAt:100}).lamp,0xffcf67);
console.log('PASS fully open doors keep green lamps/floor, closed doors are red, opening doors are amber');
