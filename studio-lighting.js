// Three's CubeUV layout stores six 16px faces per column, with progressively
// rougher reflections in the following columns. Analytic studio lights let us
// fill that small atlas once without rendering or filtering a second scene.
export function setStudioLighting(THREE, renderer, scene, intensity = 0.7, preset) {
  preset ??= globalThis.__spaceRenderQuality?.preset;
  if (preset === undefined) {
    try { preset = localStorage.getItem('space-suspect-render-preset-v1'); } catch {}
  }
  const cache = setStudioLighting.textures ??= new WeakMap();
  let texture = cache.get(renderer);
  if (preset === 'low' || preset === 'ultralow') {
    if (texture && scene.environment === texture) scene.environment = null;
    return;
  }
  if (scene.environment && scene.environment !== texture) return;
  const tile = 16, width = tile * 3 * 7, height = tile * 4;
  if (!setStudioLighting.pixels) {
    const pixels = new Uint8Array(width * height * 4);
    const direction = new THREE.Vector3();
    const key = new THREE.Vector3(-0.65, 0.68, 0.34).normalize();
    const rim = new THREE.Vector3(0.78, 0.42, -0.46).normalize();
    for (let level = 0; level < 7; level++) {
      const spread = [0, .03, .08, .15, .26, .39, .6][level];
      for (let face = 0; face < 6; face++) {
        for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) {
          // The outer texels continue around face edges for bilinear sampling.
          const u = 2 * (x - .5) / (tile - 2) - 1, v = 2 * (y - .5) / (tile - 2) - 1;
          switch (face) {
            case 0: direction.set(1, v, u); break;
            case 1: direction.set(-u, 1, -v); break;
            case 2: direction.set(-u, v, 1); break;
            case 3: direction.set(-1, v, -u); break;
            case 4: direction.set(-u, -1, v); break;
            case 5: direction.set(u, v, -1); break;
          }
          direction.normalize();
          const sky = .5 + .5 * direction.y * (1 - spread);
          const warm = .9 / (1 + 12 * spread) * Math.exp((direction.dot(key) - 1) / (.055 + spread));
          const cool = .7 / (1 + 16 * spread) * Math.exp((direction.dot(rim) - 1) / (.035 + spread));
          const offset = 4 * ((level * 3 + face % 3) * tile + x + (Math.floor(face / 3) * tile + y) * width);
          pixels[offset] = 255 * Math.min(1, .02 + .12 * sky + warm + .53 * cool);
          pixels[offset + 1] = 255 * Math.min(1, .025 + .15 * sky + .88 * warm + .79 * cool);
          pixels[offset + 2] = 255 * Math.min(1, .035 + .19 * sky + .73 * warm + cool);
          pixels[offset + 3] = 255;
        }
      }
    }
    setStudioLighting.pixels = pixels;
  }
  if (!texture) {
    texture = new THREE.DataTexture(setStudioLighting.pixels, width, height);
    texture.name = 'Studio reflections';
    texture.mapping = THREE.CubeUVReflectionMapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.needsUpdate = true;
    cache.set(renderer, texture);
  }
  scene.environment = texture;
  scene.environmentIntensity = intensity;
}
