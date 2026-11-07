import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {sampleSoccerComboPose} from '../lobby-soccer-combinations.js';
import {soccerIceWallPieces} from '../lobby-soccer-ultimate.js';
import {soccerSecretActive} from '../lobby-soccer-secret.js';
import {soccerPitch} from '../lobby-soccer-match.js';
const ultimate=await readFile(new URL('../assets-source/lobby-soccer-ultimate-fx.js',import.meta.url),'utf8');
const source=ultimate+'\n'+await readFile(new URL('../assets-source/lobby-soccer-secret-fx.js',import.meta.url),'utf8');
const make=new Function('soccerSecretActive','soccerPitch','soccerIceWallPieces','sampleSoccerComboPose',source+';return createSoccerSecretFX;')(soccerSecretActive,soccerPitch,soccerIceWallPieces,sampleSoccerComboPose);
const root=new THREE.Group(),fx=make(THREE,root),group=root.getObjectByName('soccer-secret-effects');
const ball=new THREE.Vector3(23,1,10),players={self:{x:23,z:8,yaw:0},ally:{x:25,z:15,yaw:1}};
const g={id:'first',status:'playing',secretMode:true,members:{self:0,ally:0},ball:{fire:true,resetUntil:0},secretPowers:{}};
const snapshot=()=>{let meshes=0,geos=new Set(),mats=new Set();group.traverse(n=>{if(n.geometry&&!n.isSprite){meshes++;geos.add(n.geometry);for(const a of Object.values(n.geometry.attributes))assert([...a.array].every(Number.isFinite));}if(n.material)mats.add(n.material);});return {meshes,geos,mats};};
for(const dt of [1000/60,1000/30,100]){
 for(let i=0;i<100;i++){ball.set(23+i*.07,1+Math.sin(i*.1)*.3,10+i*.13);fx.update(g,players,100000+i*dt,ball);}
 const ribbon=group.getObjectByName('soccer-fire-ribbon-0');assert(ribbon.visible);assert(ribbon.geometry.drawRange.count>0&&ribbon.geometry.drawRange.count<=31*6);snapshot();
}
ball.set(80,1,80);fx.update(g,players,120000,ball);
assert.equal(group.getObjectByName('soccer-fire-ribbon-0').geometry.drawRange.count,0,'teleport never draws a cross-field trail');
g.ball.fire=false;g.secretChain={count:2,at:120010};g.flight={target:'ally'};fx.update(g,players,120010,ball);assert(group.getObjectByName('soccer-fire-core').visible);
g.ball.dribbler='self';fx.update(g,players,120020,ball);assert(!group.getObjectByName('soccer-fire-core').visible);
delete g.ball.dribbler;g.flight=null;
for(const [i,kind]of ['taichi','belly','iron','relay'].entries()){
 const at=130000+i*3000;g.secretPowers.self={kind,at,until:at+900};
 if(kind==='iron')g.finishes={self:{sky:true,x:23,z:8,airX:24,airZ:9,airY:12,at,contactAt:at+550,until:at+1550}};
 fx.update(g,players,at+400,ball);const node=group.getObjectByName('soccer-secret-self');assert(node.visible);
 if(kind==='iron')assert(node.position.y>8);
 const before=snapshot();
 for(let j=1;j<12;j++)fx.update(g,players,at+400+j*10,ball);
 const after=snapshot();assert.equal(after.meshes,before.meshes);assert.deepEqual(after.geos,before.geos);assert.deepEqual(after.mats,before.mats,'animation reuses its resources');
}
for(const [i,kind]of ['thunder','meteor','cyclone','ice','dragon','drive'].entries()){
 const at=141000+i*700;g.secretPowers={self:{kind,at,releaseAt:at+300,until:at+1400,x:23,z:9.6,yaw:0}};
 fx.update(g,players,at+250,ball);const n=group.getObjectByName('soccer-ultimate-self');assert(n?.visible,kind);
 const before=snapshot();for(let j=0;j<10;j++)fx.update(g,players,at+260+j*5,ball);
 const after=snapshot();assert.deepEqual(after.geos,before.geos);assert.deepEqual(after.mats,before.mats);snapshot();
 if(['thunder','meteor','dragon','drive'].includes(kind)){g.ball.secretShot={kind,from:'self',at:at+300,until:at+2000};g.ball.lastTouch='self';g.ball.vz=20;fx.update(g,players,at+400,ball);assert(group.getObjectByName('soccer-ultimate-ball')?.visible);snapshot();delete g.ball.secretShot;}
}
for(const [i,kind]of ['twin','twinOverhead'].entries()){
 const at=146000+i*1600;g.secretPowers={};g.secretCombo={kind,ids:['self','ally'],at,until:at+1350};g.finishes={};
 for(const [j,id]of ['self','ally'].entries())g.finishes[id]={combo:true,at,contactAt:at+400,until:at+1350,x:23+j,z:10,airX:23.5,airZ:10,airY:3,yaw:0,side:j?1:-1};
 fx.update(g,players,at+300,ball);for(const id of ['self','ally'])assert(group.getObjectByName('soccer-ultimate-combo-'+id)?.visible);
 const before=snapshot();for(let j=0;j<10;j++)fx.update(g,players,at+310+j*5,ball);const after=snapshot();assert.deepEqual(before.geos,after.geos);assert.deepEqual(before.mats,after.mats);
 g.ball.secretShot={kind,from:'self',at:at+400,until:at+2000};fx.update(g,players,at+450,ball);assert(group.getObjectByName('soccer-ultimate-ball')?.visible);delete g.ball.secretShot;
}
g.secretImpact={at:149000,x:23,z:10};g.secretGoalMove={at:149000,until:155000,team:0};g.secretGoalOffsets=[2.4,0];
fx.update(g,players,149200,ball);assert(group.getObjectByName('soccer-secret-impact').visible);assert.equal(group.getObjectByName('soccer-secret-moving-goal').position.x,25.4);
g.status='finished';fx.update(g,players,149300,ball);assert(!group.visible);assert(!group.getObjectByName('soccer-secret-self'));assert(!group.getObjectByName('soccer-ultimate-combo-self'));
g.status='playing';g.id='next';g.secretPowers={};g.secretImpact=null;g.secretGoalMove=null;g.secretChain=null;g.secretCombo=null;fx.update(g,players,150000,ball);
assert(!group.getObjectByName('soccer-fire-core').visible);assert(!group.getObjectByName('soccer-secret-impact'));
const resources=snapshot(),disposed=[];for(const resource of [...resources.geos,...resources.mats])resource.addEventListener('dispose',()=>disposed.push(resource));
fx.dispose();assert.equal(root.children.length,0);assert.equal(new Set(disposed).size,resources.geos.size+resources.mats.size);
fx.dispose();assert.equal(disposed.length,new Set(disposed).size,'dispose is idempotent');
console.log('PASS fire/relay trails at three frame rates, teleport reset, distinct powers, bounded resource use, goal warning, match cleanup and disposal');
