# Departure lounge revision

## Appearance

- Dark stone floor with a flush ivory marble medallion and champagne metal inlay.
- Cargo crates replaced by a low marble table and a metal centrepiece.
- Four upholstered teal banquettes, separate cushions, armrests and foot lighting.
- Observation windows with glass, metal mullions and a distant ringed planet.
- Open suspended light rings, warm lighting and a marble wardrobe console.
- Pool surround, rear leisure deck, circuit entrance and lobby controls use the same palette.

The floor footprint, recessed pool, entrance, wardrobe, results monitor, updates terminal and circuit door retain their established locations. New table collisions and bot route exclusions agree; parent seat coordinates now agree with the rendered bench positions.

## Rendering

`assets-source/lobby-lounge.html` is the editable lobby source. Run:

```sh
node tools/sync-lobby-lounge.mjs
npm run build
```

The sync command updates only the lobby asset in each existing embedded bundle, retaining all other decoded assets. It does not change the packaging format. Materials, generated textures and shared geometry are created once. The environment map is prefiltered once at startup, not rendered each frame. Indirect floor lighting uses static transparent planes; no extra canvas, render loop, Firebase listeners or position messages are introduced.

The gameplay Three.js HUD, matching menu surfaces and previously prepared runtime optimizations are included in this release. Local production build completed. Design renders are in `tmp/luxury-lobby-final.png` and `tmp/luxury-lobby-mobile.png`; these are local art previews, not multiplayer or real-device test results.

Backup before this revision: `/workspace/backups/pre-luxury-lobby-20261018/worktree.tar.gz`.
