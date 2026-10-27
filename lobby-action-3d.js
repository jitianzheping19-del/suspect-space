import {createActionHud3D} from './action-hud-3d.js';
// One tiny canvas; shares the existing frame scheduler, DOM hit target and HUD models.
export function createLobbyAction3D({THREE,button,isActive,isObscured}){
 const size=new THREE.Vector2();let renderer=null,hud=null,canvas=null,last=-Infinity,failed=false;
 function hide(){if(canvas)canvas.hidden=true;delete button.dataset.lobbyThree;}
 function dispose(){hide();hud?.dispose();hud=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;canvas?.remove();canvas=null;}
 return{draw(stamp){if(failed)return;const box=button.getBoundingClientRect();if(!isActive()||isObscured()||!box.width||!box.height||getComputedStyle(button).visibility==='hidden'||button.closest('.hidden')){hide();return;}if(document.hidden||stamp-last<33)return;last=stamp;
 try{if(!renderer){canvas=document.createElement('canvas');canvas.className='lobbyActionCanvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'default'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;hud=createActionHud3D({THREE,renderer,root:button,isActive:()=>isActive()&&!isObscured(),isObscured,stateAttribute:'lobbyThreeActions',actions:{lobbyUseBtn:{kind:'use',color:0x71e7d3,faceColor:0x07584e,external:true}}});}
 canvas.hidden=false;canvas.style.left=box.left-4+'px';canvas.style.top=box.top-4+'px';canvas.style.width=box.width+8+'px';canvas.style.height=box.height+8+'px';const w=Math.round(box.width+8),h=Math.round(box.height+8),currentSize=renderer.getSize(size);if(currentSize.x!==w||currentSize.y!==h){renderer.setSize(w,h,false);hud.invalidate();}
 renderer.setClearColor(0x000000,0);renderer.clear();hud.draw(stamp);if(hud.getStats().active)button.dataset.lobbyThree='true';else hide();
 }catch(error){failed=true;dispose();console.warn('ロビーの使用ボタンを通常表示に戻しました',error);}},dispose,getStats:()=>hud?.getStats()||{active:false}};
}
