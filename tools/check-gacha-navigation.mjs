import assert from 'node:assert/strict';import {planGachaRoute} from '../gacha-navigation.js';
const obstacles=[{x:-11.35,z:6,w:1.3,d:1.5,top:2.92},{x:-11.1,z:9.3,w:1.7,d:1.85,top:3.3},{x:-6,z:1,w:3,d:7,top:2},{x:0,z:.7,w:2.4,d:2.4,top:.64}];
for(const z of [6,9.3]){const p=planGachaRoute({x:-2.2,z:-2.8},{x:-9.6,z},obstacles);assert(p.length>0);assert(Math.hypot(p.at(-1).x+9.6,p.at(-1).z-z)<.3);for(const q of p)for(const o of obstacles){const dx=Math.max(0,Math.abs(q.x-o.x)-o.w/2),dz=Math.max(0,Math.abs(q.z-o.z)-o.d/2);assert(dx*dx+dz*dz>=.45*.45);}}
assert.deepEqual(planGachaRoute({x:50,z:50},{x:-9.6,z:6},obstacles),[]);console.log('PASS both gacha paths avoid blocking furniture and machine footprints; outside lobby returns no fake route');
