// The surface, floating props and player support share the same travelling wave.
export function lobbyPoolWave(x,z,time){
 const px=x-7.8,pz=z-8.45,amplitude=.08+.06*Math.sin(time*.45),a=px*1.3+pz*.8-time*1.8,b=px*2.4-pz*1.9+time*2.1;
 return {height:.05+amplitude*Math.sin(a)+.025*Math.sin(b),dx:amplitude*1.3*Math.cos(a)+.06*Math.cos(b),dz:amplitude*.8*Math.cos(a)-.0475*Math.cos(b)};
}
export function sampleLobbyPool(x,z,time){
 const px=x-7.8,pz=z-8.45;if(Math.abs(px)>=2.65||Math.abs(pz)>=2.6)return null;
 const wave=lobbyPoolWave(x,z,time);
 return {...wave,feet:wave.height-.55,currentX:-pz*.22,currentZ:px*.22};
}
export function driftLobbyPool(position,dt,time,canMove){
 const water=sampleLobbyPool(position.x,position.z,time);if(!water||position.y>water.feet+.3||dt<=0)return false;
 const step=Math.min(dt,.05),x=Math.max(5.23,Math.min(10.37,position.x+water.currentX*step)),z=Math.max(5.93,Math.min(10.97,position.z+water.currentZ*step));let moved=false;
 if(canMove(x,position.z)&&x!==position.x){position.x=x;moved=true;}
 if(canMove(position.x,z)&&z!==position.z){position.z=z;moved=true;}
 return moved;
}
