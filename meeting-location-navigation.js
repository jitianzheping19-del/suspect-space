// Geometry shared by testimony validation and drawing. No player positions.
const caches=new WeakMap(),wallCaches=new WeakMap();
function wallsNear(layout,a,b=a){
 let bins=wallCaches.get(layout);if(!bins){bins=new Map();for(const w of layout.walls||[]){if(w.interiorEquipment)continue;for(let x=Math.floor((Math.min(w.ax,w.bx)-.02)/2);x<=Math.floor((Math.max(w.ax,w.bx)+.02)/2);x++)for(let z=Math.floor((Math.min(w.az,w.bz)-.02)/2);z<=Math.floor((Math.max(w.az,w.bz)+.02)/2);z++){const key=x+":"+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(w);}}wallCaches.set(layout,bins);}
 const x0=Math.floor((Math.min(a.x,b.x)-.02)/2),x1=Math.floor((Math.max(a.x,b.x)+.02)/2),z0=Math.floor((Math.min(a.z,b.z)-.02)/2),z1=Math.floor((Math.max(a.z,b.z)+.02)/2);
 if(x0===x1&&z0===z1)return bins.get(x0+":"+z0)||[];const found=new Set();for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const w of bins.get(x+":"+z)||[])found.add(w);return [...found];
}
function inRing(ring,x,z){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];const cross=(x-a.x)*(b.z-a.z)-(z-a.z)*(b.x-a.x);if(Math.abs(cross)<1e-7&&x>=Math.min(a.x,b.x)-1e-7&&x<=Math.max(a.x,b.x)+1e-7&&z>=Math.min(a.z,b.z)-1e-7&&z<=Math.max(a.z,b.z)+1e-7)return true;if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
export function containsLocation(region,x,z){
 if(!region)return false;
 const inside=region.polygon?.length>2?inRing(region.polygon,x,z):Math.abs(x-region.x)<=region.w/2&&Math.abs(z-region.z)<=region.d/2;
 return inside&&!(region.holes||[]).some(hole=>inRing(hole,x,z));
}
export function locationWalkable(layout,p){
 if(![...layout.rooms,...(layout.corridors||[])].some(r=>containsLocation(r,p.x,p.z)))return false;
 return !wallsNear(layout,p).some(w=>{if(w.interiorEquipment||p.x<Math.min(w.ax,w.bx)-.02||p.x>Math.max(w.ax,w.bx)+.02||p.z<Math.min(w.az,w.bz)-.02||p.z>Math.max(w.az,w.bz)+.02)return false;const dx=w.bx-w.ax,dz=w.bz-w.az,len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((p.x-w.ax)*dx+(p.z-w.az)*dz)/len)):0;return Math.hypot(p.x-w.ax-dx*t,p.z-w.az-dz*t)<.015;});
}
export function locationRoomAnchor(room){
 if(containsLocation(room,room.x,room.z))return {x:room.x,z:room.z};
 let best=null,dist=Infinity;const step=Math.max(.2,Math.max(room.w||1,room.d||1)/70);
 for(let x=room.x-room.w/2;x<=room.x+room.w/2;x+=step)for(let z=room.z-room.d/2;z<=room.z+room.d/2;z+=step){const d=Math.hypot(x-room.x,z-room.z);if(d<dist&&containsLocation(room,x,z)){best={x,z};dist=d;}}
 return best;
}
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function crosses(a,b,w){const c={x:w.ax,z:w.az},d={x:w.bx,z:w.bz};return cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10;}
export function locationSegmentClear(layout,a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
 for(let i=0;i<=n;i++)if(!locationWalkable(layout,{x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;
 return !wallsNear(layout,a,b).some(w=>!w.interiorEquipment&&Math.max(w.ax,w.bx)>=Math.min(a.x,b.x)&&Math.min(w.ax,w.bx)<=Math.max(a.x,b.x)&&Math.max(w.az,w.bz)>=Math.min(a.z,b.z)&&Math.min(w.az,w.bz)<=Math.max(a.z,b.z)&&crosses(a,b,w));
}
function grid(layout){
 if(caches.has(layout))return caches.get(layout);
 const b=layout.bounds,step=Math.max(.25,Math.min(.5,Math.max(b.maxX-b.minX,b.maxZ-b.minZ)/220)),cols=Math.ceil((b.maxX-b.minX)/step)+1,rows=Math.ceil((b.maxZ-b.minZ)/step)+1;
 const valid=new Uint8Array(cols*rows),point=id=>({x:b.minX+id%cols*step,z:b.minZ+Math.floor(id/cols)*step});
 for(let i=0;i<valid.length;i++)valid[i]=+locationWalkable(layout,point(i));
 const graph={step,cols,rows,valid,point,paths:new Map(),edges:new Map()};caches.set(layout,graph);return graph;
}
export function locationPath(layout,a,b){
 if(!locationWalkable(layout,a)||!locationWalkable(layout,b))return null;
 if(locationSegmentClear(layout,a,b))return [a,b];
 const g=grid(layout),{step,cols,rows,valid,point}=g;
 const nearest=p=>{const col=Math.round((p.x-layout.bounds.minX)/step),row=Math.round((p.z-layout.bounds.minZ)/step);let best=-1,d=Infinity;for(let y=Math.max(0,row-4);y<=Math.min(rows-1,row+4);y++)for(let x=Math.max(0,col-4);x<=Math.min(cols-1,col+4);x++){const id=y*cols+x,q=point(id),dist=Math.hypot(p.x-q.x,p.z-q.z);if(valid[id]&&dist<d&&locationSegmentClear(layout,p,q)){best=id;d=dist;}}return best;};
 const start=nearest(a),end=nearest(b);if(start<0||end<0)return null;
 const key=[a.x,a.z,b.x,b.z].join(':');if(g.paths.has(key))return g.paths.get(key);
 const heap=[],push=(id,cost)=>{let i=heap.length;heap.push({id,cost});while(i){const p=(i-1)>>1;if(heap[p].cost<=cost)break;heap[i]=heap[p];i=p;}heap[i]={id,cost};},pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].cost<heap[c].cost)c++;if(heap[c].cost>=last.cost)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
 const visited=new Uint8Array(valid.length),distance=new Float64Array(valid.length);distance.fill(Infinity);const parent=new Int32Array(valid.length);parent.fill(-1);distance[start]=0;const goal=point(end);push(start,0);
 while(heap.length){const {id}=pop();if(visited[id])continue;visited[id]=1;if(id===end)break;const x=id%cols,y=Math.floor(id/cols),p=point(id);
  let edges=g.edges.get(id);if(!edges){edges=[];for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||!valid[n])continue;if(locationSegmentClear(layout,p,point(n)))edges.push([n,Math.hypot(dx,dy)*step]);}g.edges.set(id,edges);}
  for(const[n,cost]of edges){const d=distance[id]+cost;if(d>=distance[n])continue;distance[n]=d;parent[n]=id;const q=point(n);push(n,d+Math.hypot(q.x-goal.x,q.z-goal.z));}
 }
 if(!Number.isFinite(distance[end])){g.paths.set(key,null);return null;}
 const ids=[];for(let id=end;id>=0;id=parent[id]){ids.push(id);if(id===start)break;}ids.reverse();const path=[a,...ids.map(point),b],simple=[path[0]];
 // Only collapse straight runs; retain corners and room changes.
 const region=p=>layout.rooms.find(r=>containsLocation(r,p.x,p.z))?.id||'corridor';
 for(let i=1;i<path.length-1;i++){const prev=simple.at(-1),p=path[i],next=path[i+1];if(Math.abs(cross(prev,p,next))<1e-8&&region(prev)===region(p)&&region(p)===region(next))continue;simple.push(p);}simple.push(b);
 if(g.paths.size>512)g.paths.clear();g.paths.set(key,simple);return simple;
}
