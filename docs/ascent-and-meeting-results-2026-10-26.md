# Ascent silhouettes and meeting results

- The meeting map action lives in the top-right body HUD, beside the microphone. The ordinary play-mode map button is hidden during meetings so two map controls cannot compete. Room cleanup also hides the detached meeting action.
- The ascent retains thirty landings but now cycles ten recognizable objects: cargo container, round drum, narrow beam, hexagonal relay, wheeled cargo wagon, H-shaped deck, triangular wing, gear, solar wing and cross-shaped junction. The summit has a broad landing.
- Horizontal route coordinates expand by 10% around (0,4). Footprints have distinct sizes and geometric step numbers. Heights, jump force, gravity and falling to the lounge are unchanged.
- Cylinders and polygonal slabs use instanced geometry. The support and side-collision checks use the same circle/polygon outlines, including the recesses of the H and cross shapes. This avoids invisible rectangular support around the new silhouettes. The existing small landing tolerance remains.
- Role and faction announcements rotate their outer arcs in opposite directions through one full turn over the existing screen duration. Reduced-motion preferences keep the arcs still.
- Ejection result text waits until at least 850ms after death and 150ms after the mechanical effect's former finish time. The controller keeps the scene active until the deferred result has been shown.
- Result text reveals grapheme by grapheme from left to right, preserving role colors and stable line positions. One short-lived timer drives the letters; reduced-motion mode shows the complete text. The remaining-impostor line and result-reading acknowledgement follow the final letter.
- Ejected actors' identity labels are suppressed at death and on frames where the actor is hidden. This is enforced in the ejection layout and final render alignment so later state snapshots cannot make a detached name or role label reappear.

No gameplay tests or browser automation were run, per the user's instruction. Production compilation and the requested deployment are used to publish the change; actual-device jumping and meeting timing still require play verification.
