# Vent, tablet controls and meeting presentation

Implemented changes:

- Vent traversal uses a 1.45 world-unit presentation depth instead of 2.6 for both entering and leaving. Duration, game state and hidden-in-vent rules stay the same.
- Tablet touch layouts enlarge the existing action grid to a 90px row height and up to 540px width, preserving its grid slots and anchors. The joystick and knob scale by 1.18; the lobby use button is 126 by 75px. Phone and mouse layouts retain their existing sizing.
- Lobby ascent horizontal coordinates expand by 1.18 around (0, 4). Pad dimensions, heights, jump physics and fall behavior stay the same. The entry sign and chase-camera entry check use the transformed first pad.
- The classic map electrical entrance uses a horizontal 36px doorway span. Door rendering and collision use the same updated segment endpoints.
- Meeting name, role, vote and speech sprites stack using their projected heights, replacing fixed pixel spacing. The camera angle determines their projected size each presentation frame.
- Meeting keyboard focus is cleared on leaving the voting phase and on meeting scene teardown, including the embedded chat input.
- Kill cinematics use role-tinted metal side panels, concentric arcs and one-shot light streaks behind the actors. The backdrop no longer samples a blurred live game frame. Reduced-motion settings suppress the new transitions.

The editable meeting and lobby scenes were synchronized into all four game HTML entry points. No tests, browser playtests or deployment were run for this change.

The subsequent countdown revision uses all three proposed directions in different phases; see `countdown-presentation-2026-10-25.md`.
