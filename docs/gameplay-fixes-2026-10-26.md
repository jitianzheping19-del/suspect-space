# Gameplay and presentation changes

## Lobby, costumes and pets

- Removed the ascent-only chase camera. First-person, overhead and normal third-person camera selection now applies throughout the course.
- Replaced the spiral with switchbacks, straight traverses and crossings at different heights. Thirty landings use six object treatments: cargo containers, solar panels, catwalks, engine decks, strapped pallets and transfer junctions. Their visible rectangular decks match collision/support bounds. Jump physics and falling back to the lounge are unchanged.
- Moved the wardrobe console, arrow, label and collision objects from x=-3.8 to -2.2. Reduced update-board and wardrobe interaction radii so the use action has distinct approach areas.
- Preserved the seventh costume component (clothing dye) when the lobby builds the local player's outfit. Remote outfits already preserved it.
- Pets start following at a smaller separation and accelerate faster, retaining the 1.25-unit body clearance. Main game and embedded lobby use the same following changes.

## Tasks and abilities

- Source review found 20 distinct Skeld task interactions covering all 14 room IDs. No extra repeated mechanisms were added.
- Moved the reactor circuit task to the upper entrance-side area (reference-image coordinate 88,280). Removed the obsolete extra reactor station model and its duplicate station registration. The circuit now uses the same one-station rendering path as the other tasks.
- Vitals consoles close after five seconds. The scientist's active vitals interval is also capped at five seconds; cooldown values are unchanged.
- Trigger Happy fires two clips per use at the existing 85ms interval. The settings label identifies clip size, and the role preview displays the total. Bullet geometry is larger; collision radius settings remain unchanged.
- Jump Dancer adds a visual turn, body sway and raised-arm choreography around the existing shared jump, without changing collision coordinates.

## Photographs

- The photo library is available before the first capture and sits above the meeting scene. Its gallery and full-size viewer have explicit close buttons.
- Captures redraw the game scene directly, hiding ghost avatars, labels, target outlines and reconnection indicators. DOM HUDs and the separate action-HUD scene are excluded. JPEGs are size-bounded before transmission.
- During meetings, players can publish photos through the existing text-chat command as a short photo reference. Living/ghost chat channel rules stay in place. Both the DOM meeting and embedded 3D meeting show clickable thumbnails.
- Image bytes travel in bounded 2KB chunks on the existing reliable WebRTC control channel. The host relays only to the selected room members. No new Firebase image paths or database rules are required.
- Images live in a bounded local cache for the room/round; an image owner can answer later requests while connected. Sending a photo requires an available WebRTC control connection. Old photos cannot be recovered after every holder leaves/reloads; no durable photo storage was introduced.

## Network recovery and animation timing

- A shared teleport-event ID no longer invalidates everyone's pose scope. Authoritative teleports reset only their affected avatar buffers and stale cached poses.
- Timestamp checks reject older coordinates consistently. Brief receive gaps no longer discard interpolation or force a snap at 4.5 units. Moderate recovery corrections blend out over 240ms. Explicit teleport events still apply immediately.
- Connection freshness allows 2.5 seconds of transient delay, and a partial-coverage packet no longer immediately erases the last known complete-coverage time. Normal position packets still use the existing 60Hz pacing.
- Established data channels that receive nothing for eight seconds are rebuilt, allowing a five-second grace period after the page resumes. A previously working connection gets a two-second retry; failed initial negotiation keeps its 30-second backoff to avoid repeated signaling traffic.
- Kill playback advances at 1.16 times the former rate, trims 80ms at the beginning and 140ms at the end, and catches up to wall time across slow presentation frames. Its completion clears the old death-intro pause. Finished acknowledgements can release the victory presentation immediately instead of retaining a duration floor.
- Faction and role announcements have separate finite entrance animations and decorative arcs. Countdown and role-screen durations are unchanged. Reduced-motion mode suppresses the transitions.

## Validation status

Game/browser/automated tests were not run, as requested. Production compilation is used only to check that the edited modules package successfully. Device-specific networking, multiple real participants and the revised platform route still require actual play verification. No deployment was requested in this turn.
