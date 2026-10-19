# FROST: approved layout 07

`frost-walls-preview.html` is a standalone Three.js architectural preview. It
contains the approved eleven rooms, nineteen corridor segments, continuous
walls, floors and thirty automatic sliding doors. Each room has two normal task
stations, with nine emergency panels across oxygen, lights, cooling and comms.
It does not connect to the live game or Firebase; completion and sabotage are
local preview state. Multiplayer integration is later work.

The central dome has a protected red meeting button. In the preview it presses,
lights up and shows a meeting signal; it does not start a multiplayer meeting.
The pedestal has walking collision and room spawns remain clear of it.

`docs/frost-vent-proposal-v1.json` and `public/frost-vent-proposal-v1.{png,svg}`
are review-only plans for ten vents in three separate chains. The map runtime
does not import them. Reproduce the drawings with
`python tools/draw-frost-vent-proposal.py`; it checks room containment, task/door
clearance and that each proposed connection follows the approved floorplan.

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

With Playwright installed, run `node tools/check-frost-walls.cjs`. It walks every
route in both directions, checks collisions and rendered door openings, and
captures desktop, iPad and landscape phone views, including multitouch and
WebGL context recovery. `FROST_QA_URL` and `FROST_QA_OUT` override the URL and
artifact directory.

`node tools/check-frost-tasks.cjs` completes every task rule, checks invalid and
expired input, and operates all seven 3D task types plus the four emergency
systems through mouse/keyboard. It also checks touch completion on a phone.
