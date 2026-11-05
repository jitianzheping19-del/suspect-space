# Soccer controls, match setup and animation update

The host can toggle bots before starting and choose 0–10 field bots per team. Enabled bot matches also have one goalkeeper per team; disabling bots removes both field bots and keepers. Human players and field bots determine court size: the standard 18 × 26 court expands to 19.8 × 35.1 at ten participants and 20.7 × 41.6 at sixteen. Goals retain their dimensions and move with the end lines. Kickoff formations spread across the expanded court.

Controls:

- Flick toward a teammate, hold the direction still for at least 350 ms, then release to send a through pass. The forward destination line lights up beside the ordinary pass line. Moving more than 10 px or changing receiver resets the hold. Release/cancellation and receiver availability are checked separately.
- With possession, trace a full circle on the left stick to perform scissors. Pull the stick behind the player's facing direction to retreat with repeated sole touches.
- Double-tap feint within the existing 300 ms window for the hidden nutmeg. The ball must reach a nearby opponent in front. Their widened stance has a finite reaction window; the ball remains available to other players. The hidden action is intentionally absent from the tutorial.
- Dash and slide keep separate fixed positions in attack and defense. Switching possession while a finger is down does not change that finger's action.

Slide contact uses a swept path and knocks the opponent down with finite recovery. Overlap resolution covers identical coordinates and crowded boundaries. Costume attachments follow torso poses. The local motion check allows an overlapping player to move away instead of trapping them indefinitely.

Reachable loose balls automatically select head, chest, knee, foot or sole reception by height and speed. Aerial shots select a diving header in front, an overhead behind, or a jumping volley at foot height. Heel-lift contact precedes the overhead windup; foot alignment, landing and get-up phases are included. Pressing has four pose variants.

The top-right tutorial has five categories and 21 H264 videos rendered from the game scene, including five trap examples and the heel-lift/overhead sequence. Opening it releases held movement/press inputs. Lobby chat skips unchanged snapshots and reconciles changed rows, preserving existing message elements and scroll position.

Verification scripts cover rules, host setup, touch gestures, 350 ms boundaries, double taps, cancellation, fixed button bounds, scene overlap recovery, costume restoration, two aim lines, all tutorial video playback under a Pages subpath, chat DOM stability, mixed-rate matches and delayed/lost/duplicated network messages. Browser touch checks cover portrait phone, short landscape phone and tablet sizes. Automated checks use Chromium; physical iOS device verification remains separate.

Build with `npm run build`. Regenerate clips using `node tools/render-soccer-tutorial.cjs` (or `CLIP=heelOverhead` for one clip). Run the new checks with the `tools/check-soccer-expansion*`, `check-soccer-setup-ui.cjs`, `check-soccer-tutorial.cjs` and `check-lobby-chat-stability.cjs` scripts. Tutorial playback verification expects the build to exist.
