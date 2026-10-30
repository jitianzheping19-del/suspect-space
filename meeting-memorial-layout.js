// Preserve the same overhead viewing angle as the row becomes wider. Changing
// only camera Z makes long rows increasingly side-on.
export function memorialCameraPose(count,aspect,fov=35){
 const elevation=52*Math.PI/180,yaw=-8*Math.PI/180,ce=Math.cos(elevation),se=Math.sin(elevation),cy=Math.cos(yaw),sy=Math.sin(yaw);
 const direction={x:sy*ce,y:se,z:cy*ce},target={x:0,y:1,z:0};
 const halfWidth=((Math.max(1,count)-1)*2.65+2.5)/2,tanV=Math.tan(fov*Math.PI/360),tanH=tanV*Math.max(.1,aspect);
 let distance=1;
 for(const x of [-halfWidth,halfWidth])for(const y of [-.1,3])for(const z of [-1.9,1.8]){
  const dy=y-target.y,horizontal=x*cy-z*sy,vertical=-x*se*sy+dy*ce-z*se,depth=x*direction.x+dy*direction.y+z*direction.z;
  distance=Math.max(distance,depth+Math.max(Math.abs(horizontal)*1.12/tanH,Math.abs(vertical)*1.12/tanV));
 }
 return{x:direction.x*distance,y:target.y+direction.y*distance,z:direction.z*distance,target,elevation:52};
}
