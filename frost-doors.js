import * as THREE from 'three';

// Shared instanced geometry keeps all thirty automatic doors inexpensive.
// The leaf positions use exactly the same opening fraction as collision.
export function createFrostDoors(doors) {
  const root = new THREE.Group();
  root.name = 'Automatic sliding doors';
  const box = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);
  const count = doors.length;

  function instances(name, number, options) {
    const mesh = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial(options), number);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Leaves slide beyond their initial bounds, into the adjacent wall.
    // Avoid stale per-instance culling bounds during automatic animation.
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }

  const frames = instances('Door jambs and lintels', count * 3, {
    color: '#405a70', roughness: 0.5, metalness: 0.3,
  });
  const indicators = instances('Door header lights', count, {
    color: '#b1eadc', emissive: '#60d3bc', emissiveIntensity: 0.7, roughness: 0.5,
  });
  const panels = instances('Sliding door leaves', count * 2, {
    color: '#62869b', roughness: 0.47, metalness: 0.22,
  });
  const windows = instances('Inset door windows', count * 2, {
    color: '#123447', emissive: '#205064', emissiveIntensity: 0.35,
    roughness: 0.23, metalness: 0.28,
  });
  const stripes = instances('Door leaf edge lights', count * 2, {
    color: '#a4e2d9', emissive: '#73bfbd', emissiveIntensity: 0.3, roughness: 0.5,
  });
  const kickplates = instances('Door kickplates', count * 2, {
    color: '#354d63', roughness: 0.4, metalness: 0.4,
  });

  function place(mesh, index, door, x, y, z, width, height, depth) {
    position.set(door.x + door.tx * x + door.nx * z, y,
      door.z + door.tz * x + door.nz * z);
    rotation.setFromAxisAngle(axis, Math.atan2(-door.tz, door.tx));
    scale.set(width, height, depth);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  }

  doors.forEach((door, index) => {
    place(frames, index * 3, door, -door.width / 2 - 0.05, 1.6, 0, 0.14, 3.2, 0.36);
    place(frames, index * 3 + 1, door, door.width / 2 + 0.05, 1.6, 0, 0.14, 3.2, 0.36);
    place(frames, index * 3 + 2, door, 0, 3.06, 0, door.width + 0.24, 0.28, 0.36);
    place(indicators, index, door, 0, 3.065, 0, door.width - 0.35, 0.045, 0.375);
  });
  frames.instanceMatrix.needsUpdate = true;
  indicators.instanceMatrix.needsUpdate = true;

  function sync() {
    doors.forEach((door, index) => {
      for (const [side, sign] of [[0, -1], [1, 1]]) {
        const number = index * 2 + side;
        const centre = sign * (door.width / 4 + door.open * door.width / 2);
        const width = door.width / 2 - 0.035;
        place(panels, number, door, centre, 1.455, 0, width, 2.91, 0.12);
        place(windows, number, door, centre, 1.85, 0, width - 0.22, 0.72, 0.135);
        place(stripes, number, door, centre - sign * (width / 2 - 0.055),
          1.5, 0, 0.03, 2.5, 0.138);
        place(kickplates, number, door, centre, 0.27, 0, width - 0.12, 0.19, 0.135);
      }
    });
    for (const mesh of [panels, windows, stripes, kickplates]) mesh.instanceMatrix.needsUpdate = true;
  }
  sync();
  return { root, sync };
}
