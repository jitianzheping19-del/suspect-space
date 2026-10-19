import { createFrostMap, frostMapData as data } from './frost-map.js';
import { createFrostMeetingButton } from './frost-meeting.js';
import { createFrostGameLayout } from './frost-game-layout.js';
import { createFrostTaskStations } from './frost-task-stations.js';

export const frostGameLayout = createFrostGameLayout(data);

export function buildFrostGameMap() {
  const map = createFrostMap();
  map.root.userData.mapSpecific = 'frost';
  const meeting = createFrostMeetingButton(data.meeting);
  map.root.add(meeting.root);
  let completed = {}, sabotage = null, previousKey = '';
  const stations = createFrostTaskStations(data.tasks, { status(task) {
    if (!task.sabotage) return completed[task.id] ? 'complete' : 'task';
    if (task.sabotage !== sabotage?.type) return 'standby';
    return (sabotage.panels?.[task.id] || sabotage.switches?.[task.id]) ? 'complete' : 'emergency';
  } });
  map.root.add(stations.root);
  return { root: map.root, layout: frostGameLayout, colliders: frostGameLayout.colliders,
    layers: { walls: map.wallLayer },
    syncTasks(tasks, incident) {
      const key = JSON.stringify([tasks || {}, incident?.id, incident?.type, incident?.panels, incident?.switches]);
      if (key === previousKey) return;
      previousKey = key; completed = tasks || {}; sabotage = incident || null; stations.refresh();
    },
    dispose() { stations.dispose(); meeting.dispose(); map.dispose(); },
  };
}
