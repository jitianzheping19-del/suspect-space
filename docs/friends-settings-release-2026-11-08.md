# Friends settings release — 2026-11-08

Friends now lives in Settings with List, Add and Requests tabs. Players can filter by name or online status, preview search results before sending requests, review sent requests, accept or decline incoming requests, join available rooms and confirm removal. Buttons, cards, inputs and selection states match the other settings panels.

The release includes the friend service, per-account request/read state, notifications, the status control next to Close, lobby status labels and the settings visibility fix required for touch interaction. Soccer and costume changes from the development snapshot are excluded.

## Verification

- Production build via `npm run build`.
- `tools/check-friends-ui.cjs`: touch flows at 320/390/844/1024 widths, search-before-send, duplicate-name results, online filtering/joining, sent requests, removal cancel/failure/retry, unread state and account changes.
- `tools/check-built-friends.cjs`: built application settings at 390/844/1024 widths, navigation, close, layout and status placement; production account traffic blocked.
- `tools/check-modal-freeze.cjs`: simultaneous overlays and reopening settle without freezing.
- `tools/check-friend-rules.mjs`: service against the local RTDB emulator, including mutual acceptance, read state, duplicate prevention and denial of third-party access. An optional first argument selects an alternate rules file.

## Live database integration

Both deployed databases had unconditional root reads/writes, differing from the repository rules. Deploying the entire repository rules would change access to unrelated features. The release configuration instead moves the existing access to a fallback child rule, gives `onlineUsers` the same access plus `online`/`name` indexes, and applies the repository's owner-only rules specifically to `friendEdges`.

Whole-root client reads/writes are denied so they cannot bypass the new friend restrictions. Existing game operations use named paths or atomic multi-path updates; those operations remain available. Candidate live rules passed the friend tests plus local checks for existing room/profile/invitation access, multi-path updates, indexed name lookup and denial of anonymous friend/root access. No production player data was changed during verification.

Original live rules, deployment configurations and candidate rules are kept in the release checkout's ignored `tmp/friends-check` directory. Future rules releases must account for the existing live configuration rather than restoring unconditional root access.
