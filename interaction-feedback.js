import './interaction-feedback.css';

// A hold never sends a command. Only a release on the original control commits.
export function installActionPreview({describe,active,cancelSelection,selectionOpen}){
 const ids=new Set(['abilityBtn','killBtn','killSecondBtn','taskBtn','reportBtn','jackalSidekickBtn']);
 let held=null,preview=null,suppressUntil=0;
 const events=new AbortController(),cancelledPointers=new Set();
 const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
 const cancel=document.createElement('button');cancel.id='actionCancel';cancel.type='button';cancel.textContent='取り消す';cancel.hidden=true;
 const hint=document.createElement('p');hint.id='actionPreviewHint';hint.hidden=true;hint.setAttribute('role','status');
 document.body.append(cancel,hint);
 const hide=(node,value)=>{if(node.hidden!==value)node.hidden=value;};
 function clear(){if(held){clearTimeout(held.timer);cancelledPointers.add(held.id);if(cancelledPointers.size>16)cancelledPointers.delete(cancelledPointers.values().next().value);suppressUntil=performance.now()+800;}held=null;preview=null;hide(hint,true);hide(cancel,!selectionOpen());}
 function abort(){suppressUntil=performance.now()+800;clear();cancelSelection();hide(cancel,true);}
 cancel.onclick=abort;
 listen(document,'pointerdown',e=>{
  const button=e.target.closest?.('button');if(!ids.has(button?.id)||!active())return;
  cancelledPointers.delete(e.pointerId);
  if(held){e.preventDefault();e.stopImmediatePropagation();return;}
  e.preventDefault();e.stopImmediatePropagation();
  held={id:e.pointerId,button,x:e.clientX,y:e.clientY,at:performance.now(),timer:setTimeout(()=>{
   if(!held)return;preview=held.button.id;hide(hint,false);hide(cancel,false);sync();
  },240)};
 },{capture:true,passive:false});
 function release(e,cancelled=false){
  if(cancelledPointers.delete(e.pointerId)){e.preventDefault();e.stopImmediatePropagation();suppressUntil=performance.now()+800;return;}
  if(!held||e.pointerId!==held.id)return;
  const h=held,rect=h.button.getBoundingClientRect();
  const inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  e.preventDefault();e.stopImmediatePropagation();suppressUntil=performance.now()+800;clear();cancelledPointers.delete(e.pointerId);
  if(!cancelled&&inside&&!h.button.disabled&&active())h.button.click();
 }
 listen(document,'pointerup',e=>release(e),{capture:true,passive:false});
 listen(document,'pointercancel',e=>release(e,true),{capture:true,passive:false});
 listen(document,'click',e=>{if(e.isTrusted&&performance.now()<suppressUntil&&ids.has(e.target.closest?.('button')?.id)){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 listen(document,'keydown',e=>{if(e.key==='Escape'&&(held||selectionOpen())){e.preventDefault();e.stopImmediatePropagation();abort();}},{capture:true});
 listen(window,'blur',abort);listen(document,'visibilitychange',()=>{if(document.hidden)abort();});
 listen(window,'spacesuspect:room-leave',abort);
 function sync(){if(!active()&&held)clear();hide(cancel,!preview&&!selectionOpen());if(preview){const spec=describe(preview),text=(spec?.label||'対象を確認')+' ／ ボタンの外で離すと取消';if(hint.textContent!==text)hint.textContent=text;}}
 return{sync,clear,dispose(){abort();events.abort();cancelledPointers.clear();cancel.remove();hint.remove();},get preview(){return preview;},get held(){return held?.button.id||null;}};
}

export function createInteractionVisuals(T,scene,maxTargets=18){
 const root=new T.Group();root.name='local-interaction-feedback';scene.add(root);
 const boxes=Array.from({length:Math.max(3,Math.min(32,maxTargets))},()=>{const b=new T.Box3Helper(new T.Box3(),0x64e3ae);b.material.depthWrite=false;b.visible=false;root.add(b);return b;});
 const points=new Float32Array(65*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(points,3));
 const fillPoints=new Float32Array(64*9),fillGeometry=new T.BufferGeometry();fillGeometry.setAttribute('position',new T.BufferAttribute(fillPoints,3));
 const fill=new T.Mesh(fillGeometry,new T.MeshBasicMaterial({color:0x78c8ff,transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false}));fill.frustumCulled=false;root.add(fill);fill.visible=false;
 const ring=new T.Line(geometry,new T.LineBasicMaterial({color:0x78c8ff,transparent:true,opacity:.9,depthWrite:false}));ring.frustumCulled=false;root.add(ring);ring.visible=false;
 let lastAt=-Infinity;
 function update({enabled,targets=[],preview,position,yaw=0,wallBetween=()=>false,time=performance.now()}){
  root.visible=enabled;if(!enabled)return;
  // Reuse the same bounded GPU buffers; no allocations or global mesh traversal per frame.
  for(let i=0;i<boxes.length;i++){const target=targets[i],box=boxes[i];box.visible=!!target;if(!target)continue;
   box.material.color.set(target.color||0x64e3ae);
   if(target.object){target.object.updateWorldMatrix(true,true);box.box.setFromObject(target.object);}
   else{const at=target.position;box.box.min.set(at.x-.45,.05,at.z-.45);box.box.max.set(at.x+.45,1.6,at.z+.45);}
   if(box.box.isEmpty())box.visible=false;else box.box.expandByScalar(.06);
  }
  ring.visible=!!preview?.radius||!!preview?.polygon?.length;fill.visible=ring.visible;if(!ring.visible)return;
  if(time-lastAt<70)return;lastAt=time;
  for(let i=0;i<65;i++){
   if(preview.polygon?.length){const polygon=preview.polygon,n=polygon.length,k=i/64*n,index=Math.min(n-1,Math.floor(k)),f=k-index,a=polygon[index],b=polygon[(index+1)%n];points[i*3]=a.x+(b.x-a.x)*f;points[i*3+1]=.09;points[i*3+2]=a.z+(b.z-a.z)*f;continue;}
   if(preview.beam){const corners=[[-preview.width,preview.start],[preview.width,preview.start],[preview.width,preview.radius],[-preview.width,preview.radius],[-preview.width,preview.start]],segment=Math.min(3,Math.floor(i/16)),f=(i-segment*16)/16,a=corners[segment],b=corners[segment+1],x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
    points[i*3]=position.x+Math.cos(yaw)*x+Math.sin(yaw)*z;points[i*3+1]=.09;points[i*3+2]=position.z-Math.sin(yaw)*x+Math.cos(yaw)*z;continue;}
   const angle=i/64*Math.PI*2;let distance=preview.radius;
   if(preview.walls!==false){const at=r=>({x:position.x+Math.sin(angle)*r,z:position.z+Math.cos(angle)*r});if(wallBetween(position,at(distance))){let lo=0,hi=distance;for(let n=0;n<9;n++){const mid=(lo+hi)/2;if(wallBetween(position,at(mid)))hi=mid;else lo=mid;}distance=lo;}}
   points[i*3]=position.x+Math.sin(angle)*distance;points[i*3+1]=.09;points[i*3+2]=position.z+Math.cos(angle)*distance;
  }
  let cx=position.x,cz=position.z;if(preview.beam||preview.polygon){cx=0;cz=0;for(let i=0;i<64;i++){cx+=points[i*3]/64;cz+=points[i*3+2]/64;}}
  for(let i=0;i<64;i++){const k=i*9;fillPoints.set([cx,.075,cz,points[i*3],.075,points[i*3+2],points[(i+1)*3],.075,points[(i+1)*3+2]],k);}
  geometry.attributes.position.needsUpdate=true;fillGeometry.attributes.position.needsUpdate=true;
 }
 return{root,update,dispose(){root.removeFromParent();geometry.dispose();ring.material.dispose();fillGeometry.dispose();fill.material.dispose();for(const b of boxes){b.geometry.dispose();b.material.dispose();}}};
}

export function createNotificationCounter(windowMs=6000){let last=null;return{push(text,kind,at=Date.now()){const same=last&&last.text===text&&last.kind===kind&&at-last.at<=windowMs;last={text,kind,at,count:same?last.count+1:1};return last.count;},clear(){last=null;}};}
