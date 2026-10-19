import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import data from './frost-map-data.json';

export { data as frostMapData };

function shapeFrom(polygon) {
  const shape = new THREE.Shape(polygon.outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const ring of polygon.holes || []) {
    shape.holes.push(new THREE.Path(ring.map(([x, y]) => new THREE.Vector2(x, y))));
  }
  return shape;
}

function flatGeometry(polygon) {
  return new THREE.ShapeGeometry(shapeFrom(polygon)).rotateX(-Math.PI / 2);
}

function extrudedGeometry(polygons, height) {
  const pieces = polygons.map((polygon) => new THREE.ExtrudeGeometry(shapeFrom(polygon), {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  }).rotateX(-Math.PI / 2));
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  return merged;
}

function floorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e6edf3';
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = '#adbcc9';
  context.lineWidth = 2;
  context.strokeRect(1, 1, 254, 254);
  context.strokeStyle = '#dbe4eb';
  context.lineWidth = 1;
  context.strokeRect(5, 5, 246, 246);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.5, 0.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function wallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e6edf3';
  context.fillRect(0, 0, 256, 256);
  context.fillStyle = '#d5dfe7';
  context.fillRect(0, 0, 3, 256);
  context.fillStyle = '#f3f7fa';
  context.fillRect(4, 0, 1, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function labelTexture(room) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 112px "Noto Sans JP", "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
  context.fillStyle = room.id === 'dome' ? '#baffec' : '#e6f0f6';
  context.fillText(room.name, 512, 112);
  context.fillStyle = '#74cec6';
  context.fillRect(466, 198, 92, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createFrostMap() {
  const root = new THREE.Group();
  root.name = 'FROST / approved layout 07';
  const labels = new THREE.Group();
  labels.name = 'Floor wayfinding';
  const textures = [];
  const tileTexture = floorTexture();
  const panelTexture = wallTexture();
  textures.push(tileTexture, panelTexture);

  function mesh(name, geometry, material, y = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.y = y;
    object.receiveShadow = true;
    root.add(object);
    return object;
  }

  const foundation = mesh('Continuous floor slab', extrudedGeometry([data.renderFloor || data.floor], 0.22),
    new THREE.MeshStandardMaterial({ color: '#172c3e', roughness: 0.85 }), -0.22);
  foundation.castShadow = true;

  const floor = mesh('Walkable floor', flatGeometry(data.renderFloor || data.floor),
    new THREE.MeshStandardMaterial({ color: '#3d596b', map: tileTexture, roughness: 0.82 }), 0.016);

  for (const room of data.rooms) {
    mesh(room.name + ' / floor', flatGeometry(room.renderFloor || room), new THREE.MeshStandardMaterial({
      color: new THREE.Color(room.color).lerp(new THREE.Color('#6e8c9c'), 0.26),
      map: tileTexture,
      roughness: 0.8,
    }), 0.03);
    const texture = labelTexture(room);
    textures.push(texture);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    label.name = room.name;
    label.rotation.x = -Math.PI / 2;
    label.position.set(room.label[0], 0.045, -room.label[1]);
    labels.add(label);
  }
  root.add(labels);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#9eafbf', map: panelTexture, roughness: 0.67, metalness: 0.12,
  });
  const walls = mesh('All exterior and courtyard walls',
    extrudedGeometry(data.walls, data.wallHeight), wallMaterial);
  walls.castShadow = true;

  mesh('Wall base', extrudedGeometry(data.walls, 0.18),
    new THREE.MeshStandardMaterial({ color: '#344b5f', roughness: 0.68,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0.006);
  mesh('Wall cap', extrudedGeometry(data.walls, 0.075),
    new THREE.MeshStandardMaterial({ color: '#d6e7ef', roughness: 0.4, metalness: 0.2 }), data.wallHeight);

  // An integral wall trim follows the same footprint, so there are no beams
  // or thresholds across a doorway. It remains subtle at eye level.
  mesh('Continuous upper wall trim', extrudedGeometry(data.walls, 0.045),
    new THREE.MeshStandardMaterial({
      color: '#70c8cd', emissive: '#4eb3bf', emissiveIntensity: 0.65, roughness: 0.45,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), data.wallHeight - 0.22);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(walls.geometry, 32),
    new THREE.LineBasicMaterial({ color: '#8fa8ba', transparent: true, opacity: 0.22 }));
  edges.name = 'Wall corners';
  root.add(edges);

  function dispose() {
    const geometries = new Set();
    const materials = new Set();
    root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || [])) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }

  return { root, floor, walls, labels, dispose };
}
