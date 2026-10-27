export function planGachaRoute(start,goal,obstacles){
 const step=.4,cache=new Map(),key=(x,z)=>x+','+z;
 const free=(ix,iz)=>{const k=key(ix,iz);if(cache.has(k))return cache.get(k);const x=ix*step,z=iz*step;let ok=x>=-11.2&&x<=11.2&&z>=-5.2&&z<=13.2&&!(Math.abs(x-7.8)<2.95&&Math.abs(z-8.45)<2.95);if(ok)for(const o of obstacles){if(o.top<=.08||(o.ascent&&o.bottom>1.9))continue;const dx=Math.max(0,Math.abs(x-o.x)-o.w/2),dz=Math.max(0,Math.abs(z-o.z)-o.d/2);if(dx*dx+dz*dz<.45*.45){ok=false;break;}}cache.set(k,ok);return ok;};
 let sx=Math.round(start.x/step),sz=Math.round(start.z/step);if(!free(sx,sz)){let best=null;for(let r=1;r<=5&&!best;r++)for(let dx=-r;dx<=r&&!best;dx++)for(let dz=-r;dz<=r;dz++)if(free(sx+dx,sz+dz)){best=[sx+dx,sz+dz];break;}if(!best)return[];[sx,sz]=best;}
 const gx=Math.round(goal.x/step),gz=Math.round(goal.z/step);if(!free(gx,gz))return[];
 const queue=[[sx,sz]],parents=new Map([[key(sx,sz),null]]);let found=false;
 for(let head=0;head<queue.length;head++){const [x,z]=queue[head];if(x===gx&&z===gz){found=true;break;}for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(parents.has(k)||!free(nx,nz))continue;parents.set(k,[x,z]);queue.push([nx,nz]);}}
 if(!found)return[];const path=[];let node=[gx,gz];while(node){path.push({x:node[0]*step,z:node[1]*step});node=parents.get(key(...node));}return path.reverse();
}
