import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pointInPolygon } from './frost-navigation.js';

export const frostRoomFinishes = {
  dome: '#779da5', hangar: '#7d8c95', observatory: '#637c96', comms: '#6e8997',
  medical: '#9bbfbe', habitat: '#83a68d', laboratory: '#95adb8', specimen: '#8799b7',
  power: '#979b86', drill: '#9c9582', deep: '#728b96',
};
const accents = {
  dome: '#88efdc', hangar: '#f3c36f', observatory: '#a3b9ff', comms: '#7ccce9',
  medical: '#8ef0d0', habitat: '#a8e28f', laboratory: '#a3d6ee', specimen: '#b7abf0',
  power: '#e5dc8f', drill: '#f0b577', deep: '#87d6dc',
};

// Furniture is static art. Positions and solid footprints come from the same
// authored layout as navigation; no gameplay state is stored in these meshes.
// Thousands of parts share a small number of instanced geometry/material draws.
export function createFrostInteriors(data, wallLayer) {
  const root = new THREE.Group(); root.name = 'FROST research base interiors';
  const architecture = new THREE.Group(); architecture.name = 'Insulated wall panels and observation glazing';
  wallLayer.add(architecture);
  const unit = {
    box: new THREE.BoxGeometry(1, 1, 1),
    rounded: new RoundedBoxGeometry(1, 1, 1, 1, .055),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 16),
    sphere: new THREE.SphereGeometry(.5, 12, 8),
    cone: new THREE.ConeGeometry(.5, 1, 12),
    ring: new THREE.TorusGeometry(.5, .035, 6, 32).rotateX(Math.PI / 2),
    floorRing: new THREE.RingGeometry(.485, .5, 64).rotateX(-Math.PI / 2),
    crystal: new THREE.IcosahedronGeometry(.5, 0),
  };
  const material = {
    paint: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .52, metalness: .18 }),
    metal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .33, metalness: .67 }),
    soft: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, metalness: .02 }),
    glass: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .16, metalness: .58 }),
    light: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  };
  const batches = new Map(), matrix = new THREE.Matrix4(), euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const color = new THREE.Color(), identity = new THREE.Matrix4();
  let basis = identity, layer = root, roomId = 'dome';
  function part(shape, finish, tint, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
    const key = [layer === architecture ? 'wall' : 'room', shape, finish].join(':');
    if (!batches.has(key)) batches.set(key, { shape, finish, layer, matrices: [], colors: [] });
    position.set(x, y, z); scale.set(w, h, d); quaternion.setFromEuler(euler.set(rx, ry, rz));
    matrix.compose(position, quaternion, scale).premultiply(basis);
    batches.get(key).matrices.push(matrix.clone()); batches.get(key).colors.push(tint);
  }
  const box = (w, h, d, x, y, z, tint = '#d9e5e9', finish = 'paint', rx = 0, ry = 0, rz = 0) => part('box', finish, tint, x, y, z, w, h, d, rx, ry, rz);
  const rounded = (w, h, d, x, y, z, tint = '#d9e5e9', finish = 'paint', rx = 0, ry = 0, rz = 0) => part('rounded', finish, tint, x, y, z, w, h, d, rx, ry, rz);
  const cylinder = (r, h, x, y, z, tint = '#a5b8c3', finish = 'metal', rx = 0, ry = 0, rz = 0) => part('cylinder', finish, tint, x, y, z, r * 2, h, r * 2, rx, ry, rz);
  const ring = (r, x, y, z, tint = '#7fd8d9') => part('ring', 'metal', tint, x, y, z, r * 2, 1, r * 2);
  const sphere = (w, h, d, x, y, z, tint, finish = 'paint', rz = 0) => part('sphere', finish, tint, x, y, z, w, h, d, 0, 0, rz);
  const light = (w, h, d, x, y, z, tint = accents[roomId]) => box(w, h, d, x, y, z, tint, 'light');
  const dark = '#233b4d', rubber = '#203240', white = '#dae6e9', steel = '#9caeb9', orange = '#dba565';
  function pipe(a, b, radius = .045, tint = steel) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    position.copy(av).add(bv).multiplyScalar(.5); scale.set(radius * 2, delta.length(), radius * 2);
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    matrix.compose(position, quaternion, scale).premultiply(basis);
    const key = [layer === architecture ? 'wall' : 'room', 'cylinder', 'metal'].join(':');
    if (!batches.has(key)) batches.set(key, { shape: 'cylinder', finish: 'metal', layer, matrices: [], colors: [] });
    batches.get(key).matrices.push(matrix.clone()); batches.get(key).colors.push(tint);
  }

  const atlas = document.createElement('canvas'); atlas.width = 2048; atlas.height = 1024;
  const ctx = atlas.getContext('2d');
  data.rooms.forEach((room, i) => {
    const x = i % 4 * 512, y = Math.floor(i / 4) * 256, accent = accents[room.id];
    ctx.fillStyle = '#0c2233'; ctx.fillRect(x, y, 512, 256);
    ctx.fillStyle = accent; ctx.fillRect(x + 20, y + 18, 472, 5);
    ctx.font = '600 23px sans-serif'; ctx.fillText('FROST  /  SECTOR ' + String(i + 1).padStart(2, '0'), x + 24, y + 58);
    ctx.fillStyle = '#e0eff2'; ctx.font = '600 40px sans-serif'; ctx.fillText(room.name, x + 24, y + 112, 470);
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath();
    for (let n = 0; n < 48; n++) { const px = x + 24 + n * 9.8, py = y + 172 + Math.sin(n * .42 + i) * 18; if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    ctx.fillStyle = accent; for (let n = 0; n < 20; n++) ctx.fillRect(x + 24 + n * 23, y + 222, 12, 8);
  });
  const screenTexture = new THREE.CanvasTexture(atlas); screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screens = [];
  const textures = [screenTexture];
  function screen(w, h, x, y, z, rx = 0, ry = 0) {
    box(w + .12, h + .12, .1, x, y, z - .04, dark, 'paint', rx, ry);
    const index = data.rooms.findIndex(r => r.id === roomId), col = index % 4, row = Math.floor(index / 4);
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let v = 0; v < uv.count; v++) uv.setXY(v, (col + uv.getX(v)) / 4, 1 - (row + 1 - uv.getY(v)) / 4);
    quaternion.setFromEuler(euler.set(rx, ry, 0));
    matrix.compose(position.set(x, y, z + .015), quaternion, scale.set(1, 1, 1)).premultiply(basis);
    geo.applyMatrix4(matrix); screens.push(geo);
  }
  function legs(w, d, top = .8) {
    for (const x of [-w / 2 + .12, w / 2 - .12]) for (const z of [-d / 2 + .12, d / 2 - .12]) {
      box(.09, top, .09, x, top / 2, z, steel, 'metal');
      rounded(.16, .07, .16, x, .07, z, rubber, 'soft');
    }
  }
  function vents(w, y, z, x = 0) {
    for (let n = 0; n < 5; n++) box(w, .018, .025, x, y + n * .065, z, dark, 'soft');
  }
  function leaves(x, y, z, size = .35) {
    cylinder(.065, .4, x, y + .2, z, '#537a5f', 'soft');
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      sphere(size, .13, size * .6, x + Math.cos(a) * size * .3, y + .25 + i * .045, z + Math.sin(a) * size * .3, i % 2 ? '#7daf6d' : '#a5ce83', 'soft', Math.sin(a) * .5);
    }
  }

  // Low relief floor details never change walkability or cover a vent opening.
  for (const room of data.rooms) {
    roomId = room.id;
    const ringPoints = room.outline;
    for (let i = 0; i < ringPoints.length; i++) {
      const a = ringPoints[i], b = ringPoints[(i + 1) % ringPoints.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .05) continue;
      box(length, .012, .045, (a[0] + b[0]) / 2, .05, -(a[1] + b[1]) / 2, accents[room.id], 'light', 0, Math.atan2(b[1] - a[1], b[0] - a[0]));
    }
  }
  roomId = 'dome';
  for (const r of [1.5, 1.7, 5.25]) part('floorRing', 'paint', r > 5 ? '#8aabb1' : '#b8c9cd', 0, .052, 0, r * 2, 1, r * 2);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    box(.07, .014, .24, Math.cos(a) * 1.9, .055, Math.sin(a) * 1.9, '#a4d5cf', 'light', 0, -a);
  }
  for (const route of data.routes) {
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, yaw = Math.atan2(dy, dx);
      for (let t = 1.4; t < len - .5; t += 3.6) {
        const x = a[0] + dx * t, y = a[1] + dy * t;
        if (data.rooms.some(room => pointInPolygon(x, y, room))) continue;
        box(.44, .012, 1.9, x, .047, -y, '#405864', 'metal', 0, yaw);
        for (const sign of [-1, 1]) light(.7, .013, .06, x - dy * .96 * sign, .058, -y - dx * .96 * sign, '#82c4cc');
        for (let n = -3; n <= 3; n++) box(.025, .018, 1.65, x + dx * n * .052, .056, -y - dy * n * .052, '#819ba5', 'metal', 0, yaw);
      }
    }
  }

  // Insulated modular wall panels follow the actual exterior/courtyard edges.
  // A doorway is an opening in that union, so a panel cannot bridge it.
  layer = architecture;
  for (const ringPoints of [data.floor.outline, ...data.floor.holes]) {
    for (let i = 0; i < ringPoints.length; i++) {
      const a = ringPoints[i], b = ringPoints[(i + 1) % ringPoints.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < .7) continue;
      const pieces = Math.max(1, Math.ceil(len / 2.6)), width = len / pieces, nx = -dy / len, ny = dx / len;
      const yaw = Math.atan2(dy, dx);
      for (let j = 0; j < pieces; j++) {
        const t = (j + .5) / pieces, x = a[0] + dx * t + nx * .025, y = a[1] + dy * t + ny * .025;
        box(width - .12, 2.18, .035, x, 1.67, -y, j % 3 ? '#a5b8c5' : '#91a9ba', 'paint', 0, yaw);
        box(.065, 2.95, .12, a[0] + dx * j / pieces, 1.5, -(a[1] + dy * j / pieces), '#4d6a80', 'metal', 0, yaw);
        box(width - .3, .035, .05, x + nx * .01, .38, -y - ny * .01, '#b5cfda', 'metal', 0, yaw);
      }
    }
  }
  // Faceted glazing makes the observatory's curved northern wall distinct.
  const windowCanvas = document.createElement('canvas'); windowCanvas.width = 2048; windowCanvas.height = 512;
  const windowContext = windowCanvas.getContext('2d'), sky = windowContext.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#102c43'); sky.addColorStop(.6, '#507b91'); sky.addColorStop(1, '#a1c2d0');
  windowContext.fillStyle = sky; windowContext.fillRect(0, 0, 2048, 512);
  windowContext.fillStyle = '#b8d9e5';
  for (let i = 0; i < 70; i++) windowContext.fillRect(i * 379 % 2048, i * 97 % 210, i % 5 ? 2 : 4, 2);
  for (let ridge = 0; ridge < 3; ridge++) {
    windowContext.beginPath(); windowContext.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 64) windowContext.lineTo(x, 280 + ridge * 68 - Math.abs(Math.sin(x * .011 + ridge * 5.4)) * (100 - ridge * 19));
    windowContext.lineTo(2048, 512); windowContext.closePath(); windowContext.fillStyle = ['#5e879e', '#88adbd', '#bdd2da'][ridge]; windowContext.fill();
  }
  const windowTexture = new THREE.CanvasTexture(windowCanvas); windowTexture.colorSpace = THREE.SRGBColorSpace; textures.push(windowTexture);
  const windowPanes = [];
  for (let i = 0; i < 5; i++) {
    const a = (30 + i * 30) * Math.PI / 180, x = 19 + Math.cos(a) * 5.7, py = 21 + Math.sin(a) * 5.7, yaw = a - Math.PI / 2;
    box(2.55, 1.7, .08, x, 1.86, -py, '#425e78', 'metal', 0, yaw);
    box(2.35, 1.49, .1, x, 1.86, -py, '#284b66', 'glass', 0, yaw);
    const pane = new THREE.PlaneGeometry(2.3, 1.43), uv = pane.attributes.uv;
    for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v)) / 5);
    quaternion.setFromEuler(euler.set(0, yaw, 0));
    matrix.compose(position.set(x - Math.cos(a) * .062, 1.86, -py + Math.sin(a) * .062), quaternion, scale.set(1, 1, 1));
    pane.applyMatrix4(matrix); windowPanes.push(pane);
    for (const sign of [-1, 1]) box(.035, 1.45, .12, x + Math.cos(a - Math.PI / 2) * sign * 1.1, 1.86, -py - Math.sin(a - Math.PI / 2) * sign * 1.1, '#a6c4d3', 'metal', 0, yaw);
  }
  const glazing = new THREE.Mesh(mergeGeometries(windowPanes), new THREE.MeshBasicMaterial({ map: windowTexture, color: '#a5bdcc', toneMapped: false }));
  glazing.name = 'Polar landscape through observation glazing'; architecture.add(glazing); windowPanes.forEach(pane => pane.dispose());
  layer = root;

  for (const prop of data.props || []) {
    roomId = prop.roomId;
    basis = new THREE.Matrix4().makeRotationY(prop.rotation * Math.PI / 180);
    basis.setPosition(prop.position[0], .035, -prop.position[1]);
    const w = prop.width, d = prop.depth, accent = accents[roomId];
    // A recessed service mat grounds every object without protruding through
    // the visual footprint used by the collision proxy.
    rounded(w, .045, d, 0, .02, 0, '#385363', 'soft');
    if (prop.kind === 'bench') {
      const side = prop.position[0] > 0 ? 1 : -1;
      legs(w * .8, d * .9, .42); rounded(w * .86, .19, d * .92, 0, .54, 0, '#3d6b79', 'soft');
      rounded(.14, .62, d * .92, side * w * .37, .85, 0, '#587f8b', 'soft');
      light(.035, .035, d * .7, -side * w * .35, .45, 0, accent);
    } else if (['snowcat', 'rover'].includes(prop.kind)) {
      const large = prop.kind === 'snowcat', wheelR = large ? .27 : .19;
      rounded(w * .82, .55, d * .69, 0, .7, 0, large ? '#d2b474' : '#d7e3e6');
      rounded(w * .42, .7, d * .65, -w * .15, 1.22, 0, white);
      rounded(w * .25, .43, d * .67, -w * .15, 1.25, 0, '#2b566d', 'glass');
      for (const sign of [-1, 1]) {
        if (large) rounded(w * .94, .45, .28, 0, .32, sign * d * .39, rubber, 'soft');
        for (let n = 0; n < (large ? 4 : 3); n++) {
          const x = (-.33 + n / (large ? 3 : 2) * .66) * w;
          cylinder(wheelR, .22, x, .29, sign * d * .4, rubber, 'soft', Math.PI / 2);
          cylinder(wheelR * .5, .24, x, .29, sign * d * .4, steel, 'metal', Math.PI / 2);
        }
        light(.11, .1, .18, w * .4, .83, sign * d * .24, '#d9f3ef');
      }
      box(w * .13, .16, d * .56, w * .2, 1.05, 0, '#6f8795', 'metal');
      pipe([-w * .3, 1.53, 0], [-w * .3, 2.06, 0], .025); light(.06, .09, .06, -w * .3, 2.1, 0, orange);
      if (large) box(.14, .42, d * .9, w * .46, .45, 0, '#9bafbb', 'metal', 0, 0, -.2);
    } else if (prop.kind === 'cargo') {
      const rows = w > 1.4 ? 2 : 1;
      for (let i = 0; i < rows; i++) {
        const cw = w / rows * .88, x = (i - (rows - 1) / 2) * w / rows;
        rounded(cw, .86, d * .87, x, .55, 0, i ? '#8ca4b0' : '#bd9867');
        box(cw * .7, .025, d * .9, x, 1.0, 0, steel, 'metal');
        for (const sign of [-1, 1]) box(.065, .89, d * .91, x + sign * cw * .32, .55, 0, dark, 'soft');
        rounded(cw * .38, .15, .03, x, .65, d * .45, '#c8d6d8');
      }
    } else if (prop.kind === 'telescope') {
      cylinder(.72, .18, 0, .14, 0, dark); ring(.68, 0, .25, 0, accent);
      cylinder(.24, 1.1, 0, .8, 0, steel); cylinder(.36, .16, 0, 1.25, 0, '#5c7b90');
      const a = [.6, 1.45, .35], b = [-.55, 2.42, -.45];
      pipe(a, b, .3, white); pipe([.58, 1.5, .34], [-.6, 2.47, -.48], .21, '#779caf');
      sphere(.52, .14, .42, -.57, 2.48, -.45, '#87d7ea', 'glass', -.6);
      pipe([0, 1.25, 0], [.45, 1.35, .05], .09); cylinder(.25, .24, .52, 1.18, .14, dark);
      box(.65, .13, .4, .58, 1.0, .46, steel); screen(.5, .32, .58, 1.3, .52);
    } else if (['server', 'locker', 'medicine-cabinet', 'instrument', 'freezer'].includes(prop.kind)) {
      const h = prop.kind === 'server' ? 2.35 : prop.kind === 'freezer' ? 1.3 : 1.8;
      rounded(w * .91, h, d * .9, 0, h / 2 + .08, 0, prop.kind === 'server' ? '#445f75' : white);
      box(w * .8, h * .78, .04, 0, h * .5 + .16, d * .46, '#2d485d', 'glass');
      if (prop.kind === 'server') {
        for (let i = 0; i < 8; i++) {
          box(w * .76, .15, .06, 0, .35 + i * .23, d * .49, '#243a4c');
          light(w * .3, .02, .07, -w * .18, .35 + i * .23, d * .5, i === 5 ? orange : accent);
        }
      } else {
        screen(w * .5, .32, 0, h * .72, d * .49); vents(w * .55, .23, d * .49);
        box(.045, .26, .075, w * .3, h * .48, d * .49, steel, 'metal');
      }
      light(w * .65, .04, .025, 0, h + .07, d * .47, accent);
    } else if (prop.kind === 'medical-bed') {
      legs(w * .82, d * .9, .55); rounded(w * .85, .2, d * .93, 0, .64, 0, white);
      rounded(w * .75, .16, d * .86, 0, .81, 0, '#87c2c7', 'soft');
      rounded(w * .64, .15, .38, 0, .94, -d * .28, '#e4edef', 'soft');
      for (const sign of [-1, 1]) { pipe([sign * w * .43, .72, -d * .25], [sign * w * .43, .72, d * .25]); pipe([sign * w * .43, .72, -d * .25], [sign * w * .43, 1.0, -d * .25]); }
      pipe([w * .35, .1, -d * .38], [w * .35, 1.75, -d * .38], .035);
      screen(.44, .32, .2, 1.6, -d * .34); light(.09, .05, .08, 0, .72, d * .45, accent);
    } else if (['hydroponics', 'planter'].includes(prop.kind)) {
      const tall = prop.kind === 'hydroponics';
      rounded(w * .9, .48, d * .9, 0, .35, 0, '#d2dfd7'); box(w * .78, .05, d * .8, 0, .61, 0, '#32483b', 'soft');
      for (let i = 0; i < (tall ? 5 : 2); i++) leaves((i % 2 - .5) * w * .34, .6, (i / (tall ? 4 : 1) - .5) * d * .63, tall ? .4 : .28);
      if (tall) {
        for (const z of [-d * .4, d * .4]) { pipe([-w * .42, .2, z], [-w * .42, 1.9, z]); pipe([-w * .42, 1.9, z], [w * .42, 1.9, z]); }
        for (const x of [-w * .3, w * .3]) light(.09, .05, d * .8, x, 1.86, 0, '#e6d6ed');
      }
    } else if (prop.kind === 'bunk') {
      for (const y of [.45, 1.4]) {
        rounded(w * .9, .18, d * .9, 0, y, 0, '#b5c8d1'); rounded(w * .8, .12, d * .82, 0, y + .14, 0, '#688f9b', 'soft');
        rounded(w * .34, .13, d * .68, -w * .23, y + .23, 0, white, 'soft');
      }
      for (const x of [-w * .43, w * .43]) for (const z of [-d * .43, d * .43]) box(.07, 1.85, .07, x, .96, z, steel, 'metal');
      light(w * .72, .025, .04, 0, 1.25, -d * .42, accent);
    } else if (prop.kind === 'lab-bench') {
      rounded(w * .95, .85, d * .9, 0, .49, 0, white); rounded(w, .14, d, 0, .99, 0, '#405e71', 'metal');
      for (let i = 0; i < 3; i++) { box(.018, .64, .03, (i - .5) * w / 3, .5, d * .46, '#7b96a4'); box(w / 4, .035, .07, (i - 1) * w / 3, .74, d * .48, steel); }
      cylinder(.23, .055, -w * .28, 1.09, 0, '#c3d1d8'); pipe([-w * .28, 1.1, -.12], [-w * .28, 1.62, -.12], .07);
      pipe([-w * .28, 1.62, -.12], [-w * .16, 1.45, .08], .09); cylinder(.065, .16, -w * .16, 1.38, .08, dark);
      for (let i = 0; i < 5; i++) { cylinder(.055, .22 + i % 2 * .06, i * .13, 1.2, .14, '#9bbfc5', 'glass'); cylinder(.048, .03, i * .13, 1.34 + i % 2 * .06, .14, accent, 'paint'); }
      screen(.55, .36, w * .31, 1.35, -.12); light(w * .8, .035, .03, 0, .92, d * .49, accent);
    } else if (prop.kind === 'cryopod') {
      const r = Math.min(w, d) * .43;
      cylinder(r, .16, 0, .13, 0, '#50697e'); cylinder(r * .92, 1.72, 0, 1.05, 0, '#6c99a7', 'glass');
      cylinder(r, .18, 0, 1.99, 0, white); ring(r * .97, 0, .26, 0, accent); ring(r * .97, 0, 1.85, 0, accent);
      for (const sign of [-1, 1]) box(.045, 1.55, .07, sign * r * .85, 1.08, r * .43, steel, 'metal');
      sphere(r * .9, .8, r * .75, 0, 1.1, r * .65, '#99d0c7', 'glass');
      light(.08, .14, .04, 0, 1.95, r, '#a6f0d3');
    } else if (prop.kind === 'sample-rack') {
      legs(w, d, 1.75);
      for (let i = 0; i < 4; i++) {
        box(w * .94, .075, d * .9, 0, .25 + i * .46, 0, '#8da3b1', 'metal');
        for (const sign of [-1, 1]) { cylinder(.11, .23, sign * w * .24, .4 + i * .46, 0, '#b0d4d9', 'glass'); part('crystal', 'paint', i % 2 ? '#d9c4a0' : '#8eacb6', sign * w * .24, .45 + i * .46, .02, .12, .18, .15); }
      }
    } else if (['generator', 'coolant'].includes(prop.kind)) {
      const big = prop.kind === 'generator', r = Math.min(w, d) * .4, h = big ? 2.2 : 1.55;
      cylinder(r, .16, 0, .16, 0, dark); cylinder(r * .7, h * .82, 0, h * .5, 0, big ? '#729eab' : '#9eaeb5');
      for (let i = 0; i < 6; i++) { ring(r * .93, 0, .32 + i * h * .13, 0, steel); light(r * .19, .1, r * .12, 0, .34 + i * h * .13, r * .74, accent); }
      cylinder(r, .16, 0, h, 0, white); screen(r * 1.1, .3, 0, h * .57, r * .9);
      for (const sign of [-1, 1]) pipe([sign * r * .9, .22, -.08], [sign * r * .9, h - .08, -.08], .04);
    } else if (prop.kind === 'drill-rig') {
      box(w * .92, .15, d * .9, 0, .18, 0, '#5d7585', 'metal');
      for (const x of [-w * .39, w * .39]) box(.14, 2.7, .2, x, 1.48, -d * .29, '#d6b477');
      box(w * .92, .23, .32, 0, 2.72, -d * .26, '#d6b477'); rounded(.55, .55, .6, 0, 2.3, -.16, '#728e9f');
      cylinder(.14, 1.5, 0, 1.25, 0, steel); part('cone', 'metal', '#a5bac3', 0, .48, 0, .36, .5, .36, Math.PI, 0, 0);
      for (let i = 0; i < 7; i++) box(.43, .06, .14, 0, .7 + i * .16, 0, '#9cb1bd', 'metal', .17, i * .65, 0);
      light(w * .61, .04, .06, 0, 2.55, -.05, '#ffe1a7');
    } else if (prop.kind === 'compressor') {
      cylinder(d * .3, w * .8, 0, .75, 0, '#668b9d', 'paint', 0, 0, Math.PI / 2);
      for (const sign of [-1, 1]) cylinder(d * .32, .09, sign * w * .35, .75, 0, steel, 'metal', 0, 0, Math.PI / 2);
      legs(w * .8, d * .6, .5); rounded(w * .3, .38, d * .48, w * .22, 1.2, 0, white);
      pipe([-w * .3, 1.1, 0], [-w * .3, 1.45, 0], .05); ring(.15, -w * .3, 1.45, 0, orange);
    } else if (prop.kind === 'barrels') {
      for (const sign of [-1, 1]) {
        const x = sign * w * .23, r = w * .21; cylinder(r, .82, x, .5, 0, '#b59870', 'paint');
        for (const y of [.2, .76]) ring(r, x, y, 0, dark); cylinder(r * .9, .04, x, .94, 0, steel);
      }
    } else if (prop.kind === 'mission-desk') {
      legs(w * .8, d * .8, .85); rounded(w * .95, .16, d * .92, 0, .96, 0, '#879da9', 'metal');
      for (let i = 0; i < 3; i++) { const x = (i - 1) * w * .29; pipe([x, 1.0, -.22], [x, 1.4, -.22], .03); screen(w * .25, .47, x, 1.5, -.18); box(w * .22, .03, .2, x, 1.06, .18, dark); }
      cylinder(.26, .1, 0, .48, d * .2, '#4d7684', 'soft'); cylinder(.06, .38, 0, .24, d * .2, steel);
    }
  }
  basis = identity;

  // Ice and snow around the base provide a cold setting without adding
  // navigable floor or extra simulation objects outside the approved map.
  const terrain = new THREE.Shape([[-42, -39], [42, -39], [42, 35], [-42, 35]].map(p => new THREE.Vector2(...p)));
  for (const vent of data.vents) terrain.holes.push(new THREE.Path(vent.opening.outline.map(p => new THREE.Vector2(...p))));
  const snowGeometry = new THREE.ShapeGeometry(terrain).rotateX(-Math.PI / 2);
  const snowMaterial = new THREE.MeshStandardMaterial({ color: '#688c9a', roughness: .97, metalness: .02 });
  const snow = new THREE.Mesh(snowGeometry, snowMaterial); snow.position.y = -.27; snow.receiveShadow = true; snow.name = 'Ice shelf beneath the station'; root.add(snow);
  for (let i = 0; i < 55; i++) {
    const x = Math.sin(i * 12.93) * 38, y = Math.cos(i * 7.43) * 33;
    if (pointInPolygon(x, y, data.floor)) continue;
    // Check the entire small rock footprint, not only its centre.
    if ([-1.8, 0, 1.8].some(dx => [-1.8, 0, 1.8].some(dy => pointInPolygon(x + dx, y + dy, data.floor)))) continue;
    const size = .8 + (i % 4) * .4;
    part('crystal', 'paint', i % 3 ? '#93b5c1' : '#c7dade', x, -.05 + size * .35, -y, size * 1.8, size, size * 1.2, .1, i, .2);
  }

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(unit[batch.shape], material[batch.finish], batch.matrices.length);
    mesh.name = 'FROST ' + (batch.layer === architecture ? 'walls' : 'equipment') + ' / ' + batch.shape + ' / ' + batch.finish;
    batch.matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, color.set(batch.colors[i])); });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = batch.finish !== 'light' && batch.shape !== 'floorRing'; mesh.receiveShadow = batch.finish !== 'light';
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); batch.layer.add(mesh);
  }
  if (screens.length) {
    const screenGeometry = mergeGeometries(screens, false);
    screens.forEach(g => g.dispose());
    const display = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
    display.name = 'Shared research equipment screen atlas'; root.add(display);
  }
  root.userData.propCount = data.props?.length || 0;
  root.userData.drawBatches = batches.size + 3;
  return { root, architecture, textures, propCount: root.userData.propCount };
}
