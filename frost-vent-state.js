// Vent occupancy and travel are plain simulation state, independent of Three.js.
// A traversal never plays either hatch animation. Only entry/exit owns a lid.
export const FROST_VENT_TIMING = Object.freeze({ entering: 720, traveling: 360, exiting: 720 });

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

export function createFrostVentState(definitions) {
  const vents = new Map(definitions.map((vent) => [vent.id, vent]));
  if (vents.size !== definitions.length) throw new Error('Duplicate vent ID');
  for (const vent of definitions) {
    for (const id of vent.links) {
      const other = vents.get(id);
      if (!other || other.network !== vent.network || !other.links.includes(vent.id)) {
        throw new Error('Invalid vent connection: ' + vent.id);
      }
    }
  }
  let phase = 'outside';
  let activeId = null;
  let destinationId = null;
  let startedAt = 0;
  let progress = 0;
  let origin = null;
  let pose = null;

  function centre(vent) { return { x: vent.position[0], z: -vent.position[1], height: -0.7 }; }

  return {
    enter(id, walker, time) {
      if (phase !== 'outside' || !vents.has(id) || !Number.isFinite(time)
        || !Number.isFinite(walker?.x) || !Number.isFinite(walker?.z)) return false;
      activeId = id;
      destinationId = null;
      startedAt = time;
      progress = 0;
      phase = 'entering';
      origin = { x: walker.x, z: walker.z, height: 1.65 };
      pose = { ...origin };
      return true;
    },
    travel(id, time) {
      if (phase !== 'inside' || !vents.get(activeId).links.includes(id) || !Number.isFinite(time)) return false;
      phase = 'traveling';
      destinationId = id;
      startedAt = time;
      progress = 0;
      origin = centre(vents.get(activeId));
      return true;
    },
    exit(time) {
      if (phase !== 'inside' || !Number.isFinite(time)) return false;
      phase = 'exiting';
      startedAt = time;
      progress = 0;
      origin = centre(vents.get(activeId));
      return true;
    },
    update(time) {
      if (phase === 'outside' || phase === 'inside') return false;
      if (!Number.isFinite(time)) return false;
      progress = clamp((time - startedAt) / FROST_VENT_TIMING[phase]);
      const vent = vents.get(activeId);
      if (phase === 'entering') {
        const target = centre(vent);
        pose = {
          x: lerp(origin.x, target.x, smooth(0, .65, progress)),
          z: lerp(origin.z, target.z, smooth(0, .65, progress)),
          height: lerp(1.65, target.height, smooth(.22, .82, progress)),
        };
      } else if (phase === 'traveling') {
        const target = centre(vents.get(destinationId));
        const t = smooth(0, 1, progress);
        pose = { x: lerp(origin.x, target.x, t), z: lerp(origin.z, target.z, t), height: -0.7 };
      } else {
        pose = {
          x: lerp(origin.x, vent.exit[0], smooth(.45, 1, progress)),
          z: lerp(origin.z, -vent.exit[1], smooth(.45, 1, progress)),
          height: lerp(-0.7, 1.65, smooth(.18, .72, progress)),
        };
      }
      if (progress === 1) {
        if (phase === 'traveling') {
          activeId = destinationId;
          destinationId = null;
          pose = centre(vents.get(activeId));
          phase = 'inside';
        } else if (phase === 'entering') { pose = centre(vent); phase = 'inside'; }
        else {
          pose = { x: vent.exit[0], z: -vent.exit[1], height: 1.65 };
          phase = 'outside'; activeId = null;
        }
      }
      return true;
    },
    reset() {
      phase = 'outside'; activeId = destinationId = null;
      progress = 0; origin = pose = null;
    },
    get phase() { return phase; },
    get activeId() { return activeId; },
    get vented() { return phase !== 'outside'; },
    get hidden() { return phase !== 'outside'; },
    get pose() { return pose ? { ...pose } : null; },
    get destinations() {
      return activeId ? vents.get(activeId).links.map((id) => vents.get(id)) : [];
    },
    lidAngle(id) {
      if (id !== activeId || (phase !== 'entering' && phase !== 'exiting')) return 0;
      return 1.32 * smooth(0, .18, progress) * (1 - smooth(.72, 1, progress));
    },
    snapshot() {
      return { phase, activeId, destinationId, progress, playerHidden: this.hidden,
        pose: this.pose, destinations: this.destinations.map((vent) => vent.id),
        lids: definitions.map(({ id }) => ({ id, angle: this.lidAngle(id) })) };
    },
  };
}
