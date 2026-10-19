import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Every console shares its body geometry and one screen atlas. The close-up
// task uses the actual game's 3D machine; this is its small world representation.
export function createFrostTaskStations(tasks, taskState) {
  const root = new THREE.Group();
  root.name = 'FROST task stations';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const position = new THREE.Vector3(), scale = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0);
  const atlas = document.createElement('canvas');
  atlas.width = 2048;
  atlas.height = 2048;
  const context = atlas.getContext('2d');
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  function batch(name, perTask, options, shape = geometry) {
    const mesh = new THREE.InstancedMesh(shape, new THREE.MeshStandardMaterial(options), tasks.length * perTask);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
  const body = batch('Console bases and pedestals', 2, { color: '#334a60', metalness: 0.45, roughness: 0.43 });
  const heads = batch('Console housings', 1, { color: '#476378', metalness: 0.5, roughness: 0.38 });
  const bezels = batch('Console screen surrounds', 1, { color: '#112332', metalness: 0.2, roughness: 0.65 });
  const trays = batch('Console controls', 1, { color: '#7893a3', metalness: 0.5, roughness: 0.4 });
  const buttons = batch('Console keys', 3, { color: '#a5cbd1', metalness: 0.2, roughness: 0.45 });
  const lights = batch('Console status lights', 1, { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 0.5 });

  function transform(task, x, y, z, w, h, d) {
    const [nx, ny] = task.facing;
    rotation.setFromAxisAngle(axis, Math.atan2(nx, -ny));
    position.set(task.position[0] - ny * x + nx * z, y, -task.position[1] - nx * x - ny * z);
    scale.set(w, h, d);
    return matrix.compose(position, rotation, scale);
  }
  const screens = [];
  tasks.forEach((task, index) => {
    body.setMatrixAt(index * 2, transform(task, 0, 0.11, 0, 1.48, 0.18, 0.82));
    body.setMatrixAt(index * 2 + 1, transform(task, 0, 0.58, -0.08, 0.62, 0.84, 0.38));
    heads.setMatrixAt(index, transform(task, 0, 1.45, -0.08, 1.45, 0.98, 0.32));
    bezels.setMatrixAt(index, transform(task, 0, 1.45, 0.105, 1.3, 0.83, 0.06));
    trays.setMatrixAt(index, transform(task, 0, 0.98, 0.12, 1.44, 0.1, 0.62));
    for (let key = 0; key < 3; key++) buttons.setMatrixAt(index * 3 + key,
      transform(task, (key - 1) * 0.28, 1.047, 0.26, 0.18, 0.04, 0.14));
    lights.setMatrixAt(index, transform(task, 0, 1.98, -0.08, 0.75, 0.045, 0.34));
    const screen = new THREE.PlaneGeometry(1.18, 0.7);
    const uv = screen.attributes.uv;
    const column = index % 4, row = Math.floor(index / 4);
    for (let vertex = 0; vertex < uv.count; vertex++) {
      uv.setXY(vertex, (column + 0.035 + uv.getX(vertex) * 0.93) / 4,
        1 - (row + 0.06 + (1 - uv.getY(vertex)) * 0.88) / 8);
    }
    screen.applyMatrix4(transform(task, 0, 1.45, 0.142, 1, 1, 1));
    screens.push(screen);
  });
  const screenMesh = new THREE.Mesh(mergeGeometries(screens), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screenMesh.name = 'Task screen atlas';
  root.add(screenMesh);
  for (const screen of screens) screen.dispose();
  const picker = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ visible: false }), tasks.length);
  picker.name = 'Task interaction volumes';
  picker.frustumCulled = false;
  tasks.forEach((task, index) => picker.setMatrixAt(index, transform(task, 0, 1, 0.05, 1.65, 2.1, 0.95)));
  root.add(picker);
  const palette = { task: '#77dcca', complete: '#9cebb5', standby: '#64899c', emergency: '#ff9b76' };
  const color = new THREE.Color();

  function refresh() {
    context.clearRect(0, 0, atlas.width, atlas.height);
    tasks.forEach((task, index) => {
      const status = taskState.status(task), accent = palette[status];
      const x = index % 4 * 512, y = Math.floor(index / 4) * 256;
      context.fillStyle = '#061a28';
      context.fillRect(x, y, 512, 256);
      context.fillStyle = accent;
      context.fillRect(x + 22, y + 22, 468, 4);
      context.textAlign = 'left';
      context.fillStyle = accent;
      context.font = '600 21px sans-serif';
      context.fillText(task.sabotage ? 'EMERGENCY SYSTEM' : 'RESEARCH TERMINAL', x + 30, y + 60);
      context.fillStyle = '#e5f2f6';
      context.font = '700 30px "Noto Sans JP", "Noto Sans CJK JP", sans-serif';
      context.fillText(task.name, x + 30, y + 110, 450);
      context.strokeStyle = accent;
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < 64; i++) {
        const value = Math.sin(i * 0.34 + index) * 12 + (i % 19 === 0 ? 20 : 0);
        const px = x + 32 + i * 7, py = y + 165 + value;
        if (i) context.lineTo(px, py); else context.moveTo(px, py);
      }
      context.stroke();
      context.font = '600 22px sans-serif';
      context.fillStyle = accent;
      context.fillText(({ task: 'READY', complete: 'COMPLETE', standby: 'STANDBY', emergency: 'REPAIR REQUIRED' })[status], x + 30, y + 225);
      lights.setColorAt(index, color.set(accent));
    });
    lights.instanceColor.needsUpdate = true;
    texture.needsUpdate = true;
  }
  refresh();
  for (const mesh of [body, heads, bezels, trays, buttons, lights, picker]) mesh.instanceMatrix.needsUpdate = true;

  return {
    root, refresh,
    pick(raycaster) {
      root.updateMatrixWorld(true);
      const hit = raycaster.intersectObject(picker, false)[0];
      return hit ? { task: tasks[hit.instanceId], distance: hit.distance } : null;
    },
    dispose() { texture.dispose(); },
  };
}
