export function playerIsReconnecting(player,stamp){return !!player&&player.online===false&&player.disconnectMode==='temporary'&&stamp-Number(player.updatedAt)>=0&&stamp-Number(player.updatedAt)<15000;}
export function createConnectionIndicator(THREE){
 const root=new THREE.Group();root.name='connection-recovering';root.visible=false;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=56;const g=canvas.getContext('2d');g.font='700 31px sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=6;g.strokeStyle='#091724';g.strokeText('接続中',128,28);g.fillStyle='#f5d18a';g.fillText('接続中',128,28);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));label.scale.set(1.7,.372,1);label.position.y=3.15;label.renderOrder=1002;root.add(label);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,6,24,Math.PI*1.55),new THREE.MeshBasicMaterial({color:0xf5d18a,depthTest:false,depthWrite:false,transparent:true,opacity:.9}));ring.position.y=2.77;ring.renderOrder=1001;root.add(ring);
 return{root,update(stamp,show,camera){root.visible=!!show;if(!show)return;if(camera)ring.quaternion.copy(camera.quaternion);ring.rotateZ(-stamp*.004);},dispose(){texture.dispose();label.material.dispose();ring.geometry.dispose();ring.material.dispose();root.removeFromParent();}};
}
