import { createFrostMap, frostMapData as data } from './frost-map.js';
import { createFrostMeetingButton } from './frost-meeting.js';
import { createFrostGameLayout } from './frost-game-layout.js';

export const frostGameLayout = createFrostGameLayout(data);

export function buildFrostGameMap() {
  const map = createFrostMap();
  map.root.userData.mapSpecific = 'frost';
  const meeting = createFrostMeetingButton(data.meeting);
  map.root.add(meeting.root);
  return { root: map.root, layout: frostGameLayout, colliders: frostGameLayout.colliders,
    layers: { walls: map.wallLayer },
    dispose() { meeting.dispose(); map.dispose(); },
  };
}
