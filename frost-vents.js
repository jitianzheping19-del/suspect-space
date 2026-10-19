import * as THREE from 'three';

// All ten hatches share geometry/materials. Moving lids only rewrite matrices;
// traveling between vents never opens a lid or allocates render objects.
export function createFrostVents(definitions, state) {
  const root = new THREE.Group();
  root.name = 'FROST / 10 vents, 3 networks';
  const box = new THREE.BoxGeometry(1, 1, 1);
  const metal = new THREE.MeshStandardMaterial({ color: '#8194a3', metalness: .72, roughness: .38 });
  const dark = new THREE.MeshStandardMaterial({ color: '#142a39', metalness: .5, roughness: .66 });
  const black = new THREE.MeshStandardMaterial({ color: '#030c14', roughness: 1 });
  const accent = new THREE.MeshStandardMaterial({ color: '#bddce3', emissive: '#729baf', emissiveIntensity: .38, metalness: .35, roughness: .5 });
  const bolt = new THREE.MeshStandardMaterial({ color: '#2e4455', metalness: .85, roughness: .32 });
  const transform = new THREE.Object3D();
  const part = new THREE.Object3D();
  const hinge = new THREE.Object3D();
  const combined = new THREE.Matrix4();

  function batch(name, material, count, shadows = true) {
    const mesh = new THREE.InstancedMesh(box, material, count);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = shadows;
    // Hatches change bounds as they open. Their small fixed global count makes
    // keeping this batch visible cheaper than rebuilding bounds every frame.
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
  const frames = batch('Vent frame and well lining', dark, definitions.length * 8);
  const bottoms = batch('Dark shaft bottoms', black, definitions.length);
  const lights = batch('Vent network markers and shaft strips', accent, definitions.length * 6, false);
  const bolts = batch('Recessed frame bolts', bolt, definitions.length * 4);
  const lids = batch('Hinged vent grates', metal, definitions.length * 15);
  lids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const picker = batch('Vent interaction volumes', new THREE.MeshBasicMaterial({ visible: false }), definitions.length, false);
  const transforms = [];

  function write(mesh, index, parent, x, y, z, sx, sy, sz) {
    part.position.set(x, y, z);
    part.rotation.set(0, 0, 0);
    part.scale.set(sx, sy, sz);
    part.updateMatrix();
    mesh.setMatrixAt(index, combined.multiplyMatrices(parent, part.matrix));
  }

  definitions.forEach((vent, index) => {
    transform.position.set(vent.position[0], 0, -vent.position[1]);
    // Local +Z faces the room interior, local -Z holds the lid hinge.
    transform.rotation.set(0, Math.atan2(vent.facing[0], -vent.facing[1]), 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    const matrix = transform.matrix.clone();
    transforms.push(matrix);
    let i = index * 8;
    for (const sign of [-1, 1]) {
      write(frames, i++, matrix, sign * .575, .035, 0, .11, .09, 1.08);
      write(frames, i++, matrix, 0, .035, sign * .475, 1.04, .09, .13);
      write(frames, i++, matrix, sign * .54, -.82, 0, .04, 1.65, .84);
      write(frames, i++, matrix, 0, -.82, sign * .44, 1.12, 1.65, .04);
    }
    write(bottoms, index, matrix, 0, -1.67, 0, 1.12, .05, .92);
    write(picker, index, matrix, 0, .065, 0, 1.26, .18, 1.08);
    const color = new THREE.Color(vent.color);
    for (const [j, sign] of [-1, 1].entries()) {
      write(lights, index * 6 + j, matrix, sign * .574, .085, 0, .028, .014, .43);
      write(lights, index * 6 + 2 + j, matrix, sign * .514, -.38, 0, .012, .023, .67);
      write(lights, index * 6 + 4 + j, matrix, 0, -.38, sign * .414, .87, .023, .012);
    }
    for (let j = 0; j < 6; j++) {
      lights.setColorAt(index * 6 + j, color);
    }
    let j = index * 4;
    for (const x of [-.575, .575]) {
      for (const z of [-.46, .46]) write(bolts, j++, matrix, x, .087, z, .045, .018, .045);
    }
  });

  let lastSignature = '';
  function sync() {
    const angles = definitions.map((vent) => state.lidAngle(vent.id));
    const signature = angles.join(',');
    if (signature === lastSignature) return false;
    lastSignature = signature;
    definitions.forEach((vent, index) => {
      hinge.position.set(0, .067, -.42);
      hinge.rotation.set(-angles[index], 0, 0);
      hinge.scale.set(1, 1, 1);
      hinge.updateMatrix();
      const matrix = new THREE.Matrix4().multiplyMatrices(transforms[index], hinge.matrix);
      let i = index * 15;
      for (const sign of [-1, 1]) {
        write(lids, i++, matrix, sign * .475, 0, .42, .085, .055, .84);
        write(lids, i++, matrix, 0, 0, .42 + sign * .38, .88, .055, .08);
      }
      for (let j = 0; j < 11; j++) {
        write(lids, i++, matrix, 0, .002, .095 + j * .065, .88, .045, .035);
      }
    });
    lids.instanceMatrix.needsUpdate = true;
    return true;
  }
  sync();
  return {
    root, sync,
    nearest(walker, roomId) {
      if (state.vented) return null;
      let nearest = null, distance = 2.25;
      for (const vent of definitions) {
        if (vent.roomId !== roomId) continue;
        const d = Math.hypot(walker.x - vent.position[0], walker.z + vent.position[1]);
        if (d < distance) { distance = d; nearest = vent; }
      }
      return nearest;
    },
    pick(raycaster) {
      root.updateMatrixWorld(true);
      const hit = raycaster.intersectObject(picker, false)[0];
      return hit ? { task: definitions[hit.instanceId], distance: hit.distance } : null;
    },
  };
}
