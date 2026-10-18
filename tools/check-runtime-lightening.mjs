import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {SightPolygonSolver} from '../sight-polygon.js';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const between = (text, start, end) => {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, start); return text.slice(a, b);
};
const map = {Math, Number, Map, Set}; vm.createContext(map);
vm.runInContext(between(source, 'const MAP_WORLD_SCALE=', '    const ROLE_LABELS =') +
  between(source, '    const SPEED =', 'let WALLS=buildSkeldWalls();') +
  'globalThis.skeld={walls:buildSkeldWalls(),regions:WALKABLE_REGIONS};', map);
const airship = JSON.parse(source.match(/const AIRSHIP_MAP_DATA=(.*);/)[1]);
const scale = Number(source.match(/const AIRSHIP_WORLD_SCALE=([\d.]+);/)[1]);
const airshipWalls = airship.walls.map(([ax,az,bx,bz]) => ({ax:ax*scale,az:az*scale,bx:bx*scale,bz:bz*scale}));

// Previous shipped intersection loop is the independent reference. Keep every
// base ray and every +/- epsilon endpoint, not just an approximate silhouette.
function reference(walls, x, z, radius) {
  const angles = [], result = [];
  for (let i = 0; i < 256; i++) angles.push(i * Math.PI * 2 / 256);
  for (const wall of walls) for (const [px,pz] of [[wall.ax,wall.az],[wall.bx,wall.bz]]) {
    const a = Math.atan2(pz-z, px-x); angles.push(a-.00001,a,a+.00001);
  }
  for (let i=0;i<angles.length;i++) angles[i]=(angles[i]%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  angles.sort((a,b)=>a-b);
  for (const angle of angles) {
    const dx=Math.cos(angle),dz=Math.sin(angle);let reach=radius;
    for (const w of walls) {
      const sx=w.bx-w.ax,sz=w.bz-w.az,den=dx*sz-dz*sx;
      if(Math.abs(den)<1e-10)continue;
      const qx=w.ax-x,qz=w.az-z,t=(qx*sz-qz*sx)/den,u=(qx*dz-qz*dx)/den;
      if(t>=0&&u>=0&&u<=1)reach=Math.min(reach,t);
    }
    result.push(dx*reach,dz*reach);
  }
  return result;
}
let seed=0x5017;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const solver = new SightPolygonSolver(), cases=[];
let checkedPoints=0, maxError=0;
function compare(walls,x,z,radius) {
  const expected=reference(walls,x,z,radius), actual=solver.solve(walls,x,z,radius);
  assert.equal(actual.count*2,expected.length,'endpoint rays changed');
  for(let i=0;i<expected.length;i++) {
    const error=Math.abs(expected[i]-actual.points[i]);maxError=Math.max(maxError,error);
    assert(error<=1e-9,`visibility changed at ${x},${z}, component ${i}: ${expected[i]} / ${actual.points[i]}`);
  }
  checkedPoints+=actual.count;
}
for (const [name,walls] of [['skeld',map.skeld.walls],['airship',airshipWalls]]) {
  const centres=name==='skeld'?map.skeld.regions:airship.rooms.map(r=>({x:r.x*scale,z:r.z*scale}));
  let naive=0,checks=0;
  for(let i=0;i<180;i++) {
    const r=centres[i%centres.length],x=r.x+(random()-.5)*8,z=r.z+(random()-.5)*8,radius=3+random()*7;
    const nearby=walls.filter(w=>Math.max(w.ax,w.bx)>=x-radius&&Math.min(w.ax,w.bx)<=x+radius&&Math.max(w.az,w.bz)>=z-radius&&Math.min(w.az,w.bz)<=z+radius);
    compare(nearby,x,z,radius);
    naive+=solver.result.naiveSegmentChecks;checks+=solver.result.segmentChecks;
    cases.push({name,walls:nearby,x,z,radius});
  }
  console.log('PASS',name,'unchanged sight polygon; intersection checks',checks,'/',naive);
}
// Closing/opening doors, cross-origin segments, grazing rays, reversed endpoints,
// zero-length walls, and the angular wrap at -PI/PI and 0/2PI.
for (let i=0;i<500;i++) {
  const walls=Array.from({length:10+Math.floor(random()*45)},()=>({ax:(random()-.5)*28,az:(random()-.5)*28,bx:(random()-.5)*28,bz:(random()-.5)*28}));
  walls.push({ax:-4,az:0,bx:4,bz:0},{ax:0,az:0,bx:0,bz:0},{ax:-5,az:-1e-11,bx:-5,bz:1e-11});
  const gap=(i%20)/20;
  walls.push({ax:1,az:-3,bx:1,bz:-gap},{ax:1,az:gap,bx:1,bz:3});
  compare(walls,i%3?0:1e-9,i%4?0:-1e-9,1+random()*30);
}
compare([],0,0,9);
const stats=[];
for (const name of ['skeld','airship']) {
  const rows=cases.filter(c=>c.name===name);
  const time=fn=>{const start=performance.now();for(let i=0;i<4;i++)for(const c of rows)fn(c.walls,c.x,c.z,c.radius);return performance.now()-start;};
  const oldTimes=[],newTimes=[];
  for(let i=0;i<5;i++){oldTimes.push(time(reference));newTimes.push(time((...args)=>solver.solve(...args)));}
  const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const before=median(oldTimes),after=median(newTimes);
  let oldChecks=0,newChecks=0;
  for(const c of rows){const r=solver.solve(c.walls,c.x,c.z,c.radius);oldChecks+=r.naiveSegmentChecks;newChecks+=r.segmentChecks;}
  stats.push({map:name,cases:rows.length,maskRefreshes:rows.length*4,beforeMs:before,afterMs:after,
    cpuReductionPercent:100*(1-after/before),intersectionReductionPercent:100*(1-newChecks/oldChecks)});
}

let footprintChecks=0;
for(const file of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']) {
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const c={rawWalkable:map.rawWalkable,PLAYER_RADIUS:.32};vm.createContext(c);
  vm.runInContext(between(html,'const FOOTPRINT_UNIT_SAMPLES=', '\n// プレイヤーの円形フットプリント'),c);
  // Check against the original independent thirteen-point boundary condition.
  for(let i=0;i<4000;i++) {
    const r=map.skeld.regions[i%map.skeld.regions.length],x=r.x+(random()-.5)*r.w,z=r.z+(random()-.5)*r.d,radius=.1+random()*.9;
    let expected=map.rawWalkable(x,z);
    for(let j=0;j<12;j++) {const a=j/12*Math.PI*2;expected&&=map.rawWalkable(x+Math.cos(a)*radius,z+Math.sin(a)*radius);}
    assert.equal(c.footprintWalkable(x,z,radius),expected,file+' walking boundary changed');footprintChecks++;
  }
  assert(html.includes('solver:new SightPolygonSolver()')&&html.includes('pass.solver.solve(nearby,position.x,position.z,range)'));
}
const result={sightCases:861,sightVerticesChecked:checkedPoints,maxCoordinateError:maxError,footprintChecks,benchmarks:stats};
mkdirSync(new URL('../tmp/',import.meta.url),{recursive:true});
writeFileSync(new URL('../tmp/runtime-lightening-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
