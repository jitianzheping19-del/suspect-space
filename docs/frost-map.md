# FROST: approved layout 07

`frost-walls-preview.html` is a standalone Three.js architectural preview. It
contains the approved eleven rooms, nineteen corridor segments, continuous
walls, floors and thirty automatic sliding doors. Each room has two normal task
stations, with nine emergency panels across oxygen, lights, cooling and comms.
It does not connect to the live game or Firebase; completion and sabotage are
local preview state. The live game uses the separate adapter described below.

The game entries now expose **フロスト** in room settings (`mapMode: frost`).
`frost-game-layout.js` converts this same floorplan into the game's room, wall,
spawn, door, vent and minimap coordinates. `frost-game-map.js` reuses the rendered
floor/walls and central meeting button. Existing host-authoritative door and
vent rules remain responsible for actual matches.

The live map has 22 distinct normal tasks, two in every room, plus nine emergency
stations. Their close-up procedural Three.js machines and rules are shared with
the standalone preview. See `docs/frost-task-concepts-v1.md` for the mechanisms.

The base is furnished with 29 solid room-specific equipment groups: a snowcat
and cargo in the hangar, the observatory telescope, medical bed, hydroponic rack,
bunks, laboratory benches, cryopods, generator, drilling rig and survey rover.
`assets-source/frost-interior-layout-v1.json` owns their positions and footprints.
The exporter checks wall/door/console/vent clearance, keeps every corridor and
interaction approach reachable, and excludes tiny inaccessible spaces behind
cabinets from preview navigation. The game adapter uses the same footprints for
host and client collision; the furniture never adds network state.

`frost-interiors.js` builds the equipment and modular insulated wall faces using
shared instanced shapes/materials. Room colours, floor inlays, corridor grates,
window scenery and the exterior ice shelf distinguish the frozen research base.
Furniture screens share one atlas, observation glazing another, with no remote
model or texture download. Architectural panels follow the wall presentation
layer, so the game's shorter walls keep their panels aligned in both cameras.

The central dome has a protected red meeting button. In the preview it presses,
lights up and shows a meeting signal; it does not start a multiplayer meeting.
The pedestal has walking collision and room spawns remain clear of it.

The approved ten vents form three independent chains: hangar–habitat–observatory,
medical–laboratory–specimen, and comms–drill–deep–power. There is no central dome
vent. `assets-source/frost-vent-layout-v1.json` is the approved position/connection
source; the exporter validates room containment, clearance from consoles and
doors, and a walkable exit toward the room interior. The metal grates have real
openings through the floor slab, while closed grates remain walkable.

`frost-vent-state.js` separates entry, occupancy, travel and exit. Entry opens only
the source hatch, travel keeps every hatch closed, and exit opens only the current
hatch. The player stays hidden throughout occupancy and travel. The first-person
preview lowers the camera into the shaft; it has no multiplayer avatar. Ten world
vents use five visible instanced batches in `frost-vents.js`. The compact vent
panel updates only on a phase/destination change and shows adjacent destinations.

Reproduce `public/frost-vent-proposal-v1.{png,svg}` with
`python tools/draw-frost-vent-proposal.py`. The drawing checks that the connecting
duct paths follow the approved floorplan as well as task/door clearance.

## Editing the map

- `assets-source/frost-layout-v7.json`: room outlines and corridor centrelines in
  metres. Plan `(x, y)` becomes world `(x, 0, -y)`; north is negative world Z.
- `tools/export-frost-map.py`: unions the floor, places walls outside its edges,
  extracts door openings, and erodes the floor by the walker's 0.46 m radius.
  Route endpoints already extend into their rooms; do not extend them again.
- `frost-map-data.json`: committed generated geometry. Pages needs no Python.
- `frost-map.js` / `frost-doors.js`: Three.js rendering and instanced door leaves.
- `frost-navigation.js`: plain position, door animation and collision state,
  independent of render objects. Door collision follows the sliding panels.
- `assets-source/frost-task-layout.json`: room-specific task types, positions
  and facing directions. The exporter checks footprints, approaches and routes.
- `assets-source/frost-interior-layout-v1.json`: solid furniture footprints.
- `frost-interiors.js`: batched equipment, wall finishes, glazing and ice shelf.
- `frost-task-state.js`, `frost-task-stations.js`, `frost-tasks.js`: local task
  rules, batched world consoles, and task dialog integration.
- `tools/export-task-machine.mjs`: extracts the original game's interactive 3D
  machines at build time. Art and picking retain a single source in the game;
  the adapter also attaches local labels to their correct machine groups.

After editing the source, run `python tools/export-frost-map.py` using Python 3
and Shapely 2.2.0. The exporter rejects disconnected floors, blocked routes and
room separations below five metres. The walls are 3.2 m high and 0.26 m thick.

## Preview and verification

Run `npm run build`, then `npx vite preview --host 127.0.0.1 --port 4173`. Open
`http://127.0.0.1:4173/suspect-space/frost-walls-preview.html`.

`全体` rotates the model; `真上` shows the floorplan; `歩く` enters a first-person
walk. Use WASD/arrow keys and drag to look, or the touch joystick and a second
finger to look. The room selector moves to a room. Doors open on approach and
close after departure. Double-clicking a clear floor in the desktop overview
also starts a walk at that point.

Click a console in the overview, or approach it while walking and press `使用`
or E. Use the sabotage selector to inspect the four emergency systems. Oxygen
requires both panels, lights all four circuits, and cooling both hand scanners.
In this single-user placement preview, the two scanners are inspected in turn;
this does not simulate a multiplayer partner or change the live game's rules.

Click a grate in the overview, or approach it in walking mode and press `ベント`
or F/E. The panel allows travel to adjacent vents in the same chain. Press `出る`
or F to exit. Walking, meeting and task input are blocked while underground;
changing the preview view or room safely resets vent occupancy.

With Playwright installed, run `node tools/check-frost-walls.cjs`. It walks every
route in both directions, checks collisions and rendered door openings, and
captures desktop, iPad and landscape phone views, including multitouch and
WebGL context recovery. `FROST_QA_URL` and `FROST_QA_OUT` override the URL and
artifact directory.

`node tools/check-frost-tasks.cjs` completes all 22 task rules, checks invalid and
expired input, and operates the 3D machines and four emergency systems through
mouse/keyboard. It also checks touch completion on a phone.

`node tools/check-frost-vents.cjs` checks all ten entries/exits and fourteen
directed links, including invalid moves, hidden state and animation isolation.
It then uses actual buttons/keyboard/touch in desktop, iPad and landscape phone
WebGL views to traverse all three chains and verify stable panel placement and
walkable exits. `FROST_QA_SIMULATION_ONLY=1` runs the plain state checks alone.
