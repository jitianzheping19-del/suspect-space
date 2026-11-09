# 2026-11-09: ghost controls, meeting ballots, sabotage and role introductions

Isolated working copy: `/workspace/vote-ghost-controls-2026-11-09`.
Base: `/workspace/gacha-preview-controls-2026-11-08`, commit `1f29d89c06d8f37e3d2ccdd1e491ac3274d443be`.
This work does not modify the other working copies or deploy the game.

Changes:
- Hide the report button throughout ghost/spectator states, including interim UI renders; reject ghost report input.
- Missing and invalid ballots contribute no votes. Explicit skips remain skip votes. Preserve abstention counts in results and history, including anonymous ballots and the 3D meeting view.
- Strong, slowly pulsing deadline glow only for living eligible players who can vote during the final ten seconds; stop on vote, death, expiry and results. Respect reduced motion.
- Add live team task progress to the ghost observation panel, including while following another player.
- Use the direct pointer handler for sabotage, preserving joystick capture and suppressing duplicate clicks.
- Keep Doorer's default and runtime cooldown at ten seconds and make reset-to-default restore ten seconds.
- Share 84 rewritten introductions between reveal, role list and practice. Keep cooldown controls/previews in host settings; omit those setting values from the role viewer.

Canonical changed files: `index.html`, `assets-source/meeting-scene.html`, `match-recap.js`, `responsive-game-ui.css`.
New runtime module: `role-introductions.js`.
Copy for review: `docs/role-introductions-2026-11-09.md`.
New regression check: `tools/check-vote-ghost-controls.cjs`.
Generated compatibility entrypoints and embedded scenes are synchronized by `npm run build`.

Validation:
- `npm run build` (log: `build-vote-ghost.log`).
- `SABOTAGE_QA_BUILD=1 node tools/check-vote-ghost-controls.cjs` (log: `qa-vote-ghost.log`, screenshots: `qa-results/`). Uses a private local database fixture, not real rooms.
- `node tools/check-role-mini.mjs`, `node tools/check-role-expansion.mjs` (24 scenarios), `node tools/check-meeting-build.mjs`.
- The existing sabotage check was also run against the base handlers to establish current behavior; the new check additionally asserts that the moving finger remains held through opening and activating sabotage.
