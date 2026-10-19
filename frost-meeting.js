import * as THREE from 'three';

export function createFrostMeetingButton(definition, onPress) {
  const root = new THREE.Group();
  root.name = 'Central dome / emergency meeting button';
  root.position.set(definition.position[0], 0, -definition.position[1]);
  const metal = new THREE.MeshStandardMaterial({ color: '#677f91', metalness: 0.65, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#20384d', metalness: 0.5, roughness: 0.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#0c1d2a', roughness: 0.85 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#e84958', emissive: '#c52b41', emissiveIntensity: 0.25, clearcoat: 0.9, roughness: 0.27 });
  const light = new THREE.MeshStandardMaterial({ color: '#a3efda', emissive: '#64d5c7', emissiveIntensity: 0.5 });
  function mesh(geometry, material, y = 0, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.position.y = y;
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  mesh(new THREE.CylinderGeometry(0.88, 0.95, 0.2, 40), dark, 0.12);
  mesh(new THREE.CylinderGeometry(0.43, 0.55, 0.5, 32), metal, 0.45);
  mesh(new THREE.CylinderGeometry(0.87, 0.87, 0.16, 40), metal, 0.76);
  mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.065, 40), rubber, 0.867);
  const cap = mesh(new THREE.CylinderGeometry(0.31, 0.35, 0.15, 48), red, 0.96);
  const rim = mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 40), light, 0.91);
  rim.rotation.x = Math.PI / 2;
  const floorRing = mesh(new THREE.TorusGeometry(1.03, 0.018, 6, 64), light, 0.04);
  floorRing.rotation.x = Math.PI / 2;

  const hinge = new THREE.Group();
  hinge.position.set(0, 0.89, -0.48);
  hinge.rotation.x = -1.04;
  root.add(hinge);
  const glassGeometry = new THREE.BoxGeometry(1.04, 0.04, 1.0);
  const glass = mesh(glassGeometry, new THREE.MeshPhysicalMaterial({
    color: '#b3e1ef', transparent: true, opacity: 0.32, roughness: 0.13,
    clearcoat: 1, depthWrite: false, side: THREE.DoubleSide,
  }), 0, hinge);
  glass.position.z = 0.5;
  glass.castShadow = false;
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeometry), new THREE.LineBasicMaterial({ color: '#bad8e4' }));
  border.position.z = 0.5;
  hinge.add(border);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0a1b2a'; context.fillRect(0, 0, 512, 128);
  context.fillStyle = '#eaf6f4'; context.font = '700 66px "Noto Sans CJK JP", sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('緊急会議', 256, 66);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const plateMount = mesh(new THREE.BoxGeometry(1.12, 0.23, 0.12), dark, 0.75);
  plateMount.position.z = 0.86;
  const plate = mesh(new THREE.PlaneGeometry(1.0, 0.2), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), 0.75);
  plate.position.z = 0.925;
  const picker = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16), new THREE.MeshBasicMaterial({ visible: false }), 0.8);
  picker.castShadow = picker.receiveShadow = false;
  let pressedAt = -Infinity;
  let animating = false;
  let pressCount = 0;
  return {
    root,
    press() {
      if (animating) return false;
      pressedAt = performance.now();
      animating = true;
      pressCount++;
      onPress?.();
      return true;
    },
    update(time) {
      if (!animating) return false;
      const age = time - pressedAt;
      cap.position.y = 0.96 - Math.sin(Math.min(1, age / 600) * Math.PI) * 0.11;
      red.emissiveIntensity = 0.25 + Math.max(0, 1 - age / 1600) * 1.3;
      if (age > 1600) { animating = false; cap.position.y = 0.96; red.emissiveIntensity = 0.25; }
      return true;
    },
    pick(raycaster) {
      root.updateMatrixWorld(true);
      const hit = raycaster.intersectObject(picker, false)[0];
      return hit ? { task: definition, distance: hit.distance } : null;
    },
    get pressed() { return animating; },
    get pressCount() { return pressCount; },
    dispose() { texture.dispose(); },
  };
}
