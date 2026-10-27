export function firstPersonLook(yaw,pitch,dx,dy,sensitivity=1){
  const scale=Math.max(.2,Math.min(3,Number(sensitivity)||1));
  return{yaw:Math.atan2(Math.sin(yaw-dx*.0025*scale),Math.cos(yaw-dx*.0025*scale)),pitch:Math.max(-1.10,Math.min(1.10,pitch-dy*.0022*scale))};
}
export function firstPersonMove(right,forward,yaw){
  const length=Math.hypot(right,forward),scale=length>1?1/length:1;
  return{x:(Math.cos(yaw)*right+Math.sin(yaw)*forward)*scale,z:(-Math.sin(yaw)*right+Math.cos(yaw)*forward)*scale};
}
