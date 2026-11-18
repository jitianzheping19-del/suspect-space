// One mipmapped sample carries the colour variation, surface slope and roughness.
// UVs and authored prints stay attached to the garment as its limbs move.
const outfitFinishPixels=new Map(),outfitFinishTextures=new WeakMap();
function outfitFinishMap(T,finish){
 let maps=outfitFinishTextures.get(T.DataTexture);
 if(!maps){maps=new Map();outfitFinishTextures.set(T.DataTexture,maps);}
 let entry=maps.get(finish);
 if(entry)return entry;
 const size=128,tau=2*Math.PI;
 let pixels=outfitFinishPixels.get(finish);
 if(!pixels){
  const heights=new Float32Array(size*size);
  const hash=(x,y)=>{const h=Math.imul((x&127)+1,73856093)^Math.imul((y&127)+1,19349663);return ((Math.imul(h^(h>>>13),1597334677)>>>0)/4294967296);};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const u=x/size,v=y/size,grain=hash(x,y);
   let h;
   if(finish==='cloth'){
    const warp=Math.cos(tau*(u*16+.12*Math.sin(tau*v*8))),weft=Math.cos(tau*(v*16+.12*Math.sin(tau*u*8)));
    const twill=.5+.5*Math.cos(tau*(u-v)*4);
    h=.48+.23*(warp*twill+weft*(1-twill))+.09*twill+.05*(grain-.5);
   }else if(finish==='metal'){
    h=.5+.18*Math.sin(tau*(v*32+.18*Math.sin(tau*2*u)))+.14*Math.sin(tau*(v*13+u))+.12*(hash(0,y)-.5)+.07*(grain-.5);
   }else{
    const cellX=Math.floor(x/8),cellY=Math.floor(y/8);let nearest=4,next=4;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const cx=cellX+dx,cy=cellY+dy,jx=hash(cx&15,cy&15),jy=hash((cx&15)+37,(cy&15)+19);
     const distance=(cx+.2+.6*jx-x/8)**2+(cy+.2+.6*jy-y/8)**2;
     if(distance<nearest){next=nearest;nearest=distance;}else next=Math.min(next,distance);
    }
    h=.27+.44*Math.min(1,(next-nearest)*3)+.09*(grain-.5);
   }
   heights[y*size+x]=h;
  }
  pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x,h=heights[i],dx=heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size],dy=heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x];
   pixels[4*i]=Math.round(255*h);
   pixels[4*i+1]=Math.round(127.5+120*dx);pixels[4*i+2]=Math.round(127.5+120*dy);pixels[4*i+3]=255;
  }
  outfitFinishPixels.set(finish,pixels);
 }
 const texture=new T.DataTexture(pixels,size,size);texture.name='Outfit '+finish;texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 entry={texture,users:0};maps.set(finish,entry);return entry;
}

export function finishCostumeMaterials(T,group){
 const seen=new Set();
 group.traverse(node=>{
  if(!node.isMesh||!node.geometry?.attributes.uv)return;
  for(const m of [].concat(node.material||[])){
   if(seen.has(m)||!m.isMeshStandardMaterial||m.transparent||m.wireframe||m.normalMap||m.bumpMap||m.userData.outfitSurface||m.onBeforeCompile!==T.Material.prototype.onBeforeCompile)continue;
   seen.add(m);
   if(m.emissive?.getHex()&&m.emissiveIntensity>.18)continue;
   const requested=m.userData.costumeFinish;
   const finish=requested==='fabric'?'cloth':requested||(m.metalness>=.45?'metal':m.roughness>=.48?'cloth':'enamel');
   if(finish==='enamel'){m.envMapIntensity*=1.13;continue;}
   if(!['cloth','metal','leather'].includes(finish))continue;
   const entry=outfitFinishMap(T,finish);entry.users++;
   m.userData.outfitSurface=finish;
   const tuning=finish==='metal'?[1.25,.12,.32,.11]:finish==='leather'?[1.8,.30,.24,.20]:[2.1,.34,.18,.16];
   m.onBeforeCompile=shader=>{
    shader.uniforms.outfitFinish={value:entry.texture};shader.uniforms.outfitTuning={value:tuning};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 outfitUV;')
     .replace('#include <uv_vertex>','#include <uv_vertex>\noutfitUV=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D outfitFinish;uniform vec4 outfitTuning;varying vec2 outfitUV;')
     .replace('#include <color_fragment>',`#include <color_fragment>
       vec3 outfitSample=texture2D(outfitFinish,outfitUV*outfitTuning.x).rgb;
       diffuseColor.rgb*=1.+(outfitSample.r-.5)*outfitTuning.y;`)
     .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
       roughnessFactor=clamp(roughnessFactor+(outfitSample.r-.5)*outfitTuning.z,.055,1.);`)
     .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
       vec3 dpX=dFdx(vViewPosition),dpY=dFdy(vViewPosition);
       vec3 rowX=cross(normal,dpY),rowY=cross(dpX,normal);
       vec2 uvX=dFdx(outfitUV),uvY=dFdy(outfitUV);
       vec3 threadU=rowX*uvX.x+rowY*uvY.x,threadV=rowX*uvX.y+rowY*uvY.y;
       float invScale=inversesqrt(max(max(dot(threadU,threadU),dot(threadV,threadV)),1e-12));
       vec2 slope=(outfitSample.gb*2.-1.)*outfitTuning.w;
       normal=normalize(normal+(threadU*slope.x+threadV*slope.y)*invScale);`);
   };
   m.customProgramCacheKey=()=> 'space-outfit-surface-v1';
   const release=()=>{m.removeEventListener('dispose',release);if(--entry.users===0){entry.texture.dispose();outfitFinishTextures.get(T.DataTexture).delete(finish);}};
   m.addEventListener('dispose',release);
  }
 });
}

// Flat faces, narrow bevels and clipped corners keep plates and buckles legible at small sizes.
export function createCostumeBlock(T){
 const positions=[],normals=[],uvs=[],indices=[],half=.5,inset=.455;
 function face(points,normal){
  const n=new T.Vector3(...normal).normalize(),a=new T.Vector3(...points[0]);
  const cross=new T.Vector3(...points[1]).sub(a).cross(new T.Vector3(...points[2]).sub(a));
  if(cross.dot(n)<0)points.reverse();
  const base=positions.length/3,axis=Math.abs(n.z)>.5?2:Math.abs(n.y)>.5?1:0;
  for(const point of points){positions.push(...point);normals.push(n.x,n.y,n.z);uvs.push(.5+point[axis===0?2:0],.5+point[axis===1?2:1]);}
  for(let i=1;i+1<points.length;i++)indices.push(base,base+i,base+i+1);
 }
 for(let axis=0;axis<3;axis++){
  const a=(axis+1)%3,b=(axis+2)%3;
  for(const sign of [-1,1]){
   const normal=[0,0,0];normal[axis]=sign;
   const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const p=[0,0,0];p[axis]=sign*half;p[a]=x*inset;p[b]=y*inset;return p;});
   face(corners,normal);
  }
  for(const x of [-1,1])for(const y of [-1,1]){
   const normal=[0,0,0];normal[a]=x;normal[b]=y;
   const points=[[-1,0],[1,0],[1,1],[-1,1]].map(([end,side])=>{const p=[0,0,0];p[axis]=end*inset;p[a]=x*(side?inset:half);p[b]=y*(side?half:inset);return p;});
   face(points,normal);
  }
 }
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
  face([[x*half,y*inset,z*inset],[x*inset,y*half,z*inset],[x*inset,y*inset,z*half]],[x,y,z]);
 }
 const geometry=new T.BufferGeometry();geometry.setIndex(indices);geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));return geometry;
}
