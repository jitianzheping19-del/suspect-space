import assert from 'node:assert/strict';
import {renderGhostSightOverlay,renderGhostWorld} from '../ghost-sight-overlay.js';
const layers=()=>({mask:1,enable(n){this.mask|=1<<n;},set(n){this.mask=1<<n;}});
const mesh=()=>({layers:layers(),children:[],userData:{},traverse(fn){fn(this);for(const child of this.children)child.traverse(fn);},visible:true});
const avatar=mesh(),body=mesh(),wall=mesh(),light=mesh();avatar.children.push(body);const camera={layers:layers()},scene={background:'background'},renders=[];
const renderer={autoClear:true,shadowMap:{autoUpdate:true,needsUpdate:true},clearDepth(){renders.push('clearDepth');},render(scene,camera){renders.push({avatar:!!(body.layers.mask&camera.layers.mask),wall:!!(wall.layers.mask&camera.layers.mask),light:!!(light.layers.mask&camera.layers.mask),background:scene.background});}};
renderGhostSightOverlay(renderer,scene,camera,new Map([['a',avatar]]),[light]);assert.equal(renders[0],'clearDepth');assert.deepEqual(renders[1],{avatar:true,wall:false,light:true,background:null});assert.equal(camera.layers.mask,1);assert.equal(light.layers.mask,1);assert.equal(scene.background,'background');assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,true);
assert(body.layers.mask&1,'normal living-player render layers must remain intact');const changedCostume=mesh();avatar.children.push(changedCostume);avatar.userData.costumeRoot=changedCostume;renderGhostSightOverlay(renderer,scene,camera,new Map([['a',avatar]]),[light]);assert(changedCostume.layers.mask&(1<<29),'new costumes must join the ghost pass');
avatar.visible=false;const before=renders.length;renderGhostSightOverlay(renderer,scene,camera,new Map([['a',avatar]]),[light]);assert.equal(renders.length,before,'hidden vent bodies must remain hidden');
console.log('PASS ghost-only wall bypass, character self-depth, lights/background/render-state restoration, costume updates and hidden-player rules');

avatar.visible=true;const passes=[];const r={...renderer,render(){passes.push(avatar.visible);}};renderGhostWorld(r,scene,camera,new Map([['a',avatar]]),[light]);assert.deepEqual(passes,[false,true],'the world pass must not draw player meshes a second time');assert.equal(avatar.visible,true);console.log('PASS ghost wall pass renders each player once and restores visibility');
