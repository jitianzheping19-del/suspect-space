// Keep the model facing forward until the player drags or scrolls it.
export function installGachaPreviewControls(canvas, model) {
 model.rotation.y = 0;
 canvas.tabIndex = 0;
 canvas.setAttribute('aria-label', '3D衣装。左右にドラッグ・スクロール、または矢印キーで回転。Homeキーで正面に戻す');
 canvas.style.touchAction = 'none';canvas.style.cursor = 'grab';
 let pointer = null, lastX = 0;
 const down = event => {
  if (pointer !== null || event.button !== 0) return;
  pointer = event.pointerId;lastX = event.clientX;
  canvas.setPointerCapture(pointer);canvas.style.cursor = 'grabbing';
 };
 const move = event => {
  if (event.pointerId !== pointer) return;
  model.rotation.y += (event.clientX - lastX) * .012;lastX = event.clientX;
 };
 const end = event => {
  if (event.pointerId !== pointer) return;
  const id = pointer;pointer = null;canvas.style.cursor = 'grab';
  if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
 };
 const wheel = event => {
  event.preventDefault();
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  model.rotation.y += Math.max(-150, Math.min(150, delta * (event.deltaMode ? 16 : 1))) * .006;
 };
 const key = event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
  event.preventDefault();event.stopPropagation();
  model.rotation.y = event.key === 'Home' ? 0 : model.rotation.y + (event.key === 'ArrowLeft' ? -.15 : .15);
 };
 const handlers = {pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end,wheel,keydown:key};
 for (const [type, handler] of Object.entries(handlers)) canvas.addEventListener(type, handler, {passive:false});
 return () => {
  if (pointer !== null) end({pointerId:pointer});
  for (const [type, handler] of Object.entries(handlers)) canvas.removeEventListener(type, handler);
 };
}

export function fitGachaPreview(THREE, renderer, camera, model, container) {
 // Particle trails park inactive points far below the floor; frame the clothing,
 // not those effect buffers or transparent glow shells.
 model.updateWorldMatrix(true,true);
 const box = new THREE.Box3(), part = new THREE.Box3();
 model.traverseVisible(node => {
  if (!node.isMesh || node.isInstancedMesh || !node.geometry) return;
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  if (materials.every(material => material.transparent)) return;
  node.geometry.computeBoundingBox();part.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);box.union(part);
 });
 if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0,1,0),new THREE.Vector3(1,2,1));
 const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
 // Include the depth so a side view still fits after a manual turn.
 const width = Math.max(size.x, size.z), depth = Math.max(size.x, size.z) / 2;
 const resize = () => {
  const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
  renderer.setSize(w, h, false);camera.aspect = w / h;
  const halfFov = Math.tan(camera.fov * Math.PI / 360);
  const distance = Math.max(size.y / 2 / halfFov, width / 2 / halfFov / camera.aspect) * 1.05 + size.z / 2;
  camera.position.set(center.x, center.y, center.z + distance);camera.far = Math.max(30, distance + depth + 10);
  camera.lookAt(center);camera.updateProjectionMatrix();
 };
 resize();const observer = new ResizeObserver(resize);observer.observe(container);
 return () => observer.disconnect();
}
