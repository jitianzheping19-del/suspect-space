// Durable routes contain only compact floor coordinates. Render objects stay
// local; moving a bitten player never requires a database write per frame.
const MAX_ROUTE_POINTS = 1024;
const SAVE_INTERVAL_MS = 2000;
const point = pose => {
  const x = Number(pose?.x), z = Number(pose?.z);
  return Number.isFinite(x) && Number.isFinite(z)
    ? [Math.round(x * 100) / 100, Math.round(z * 100) / 100, 0] : null;
};
const readPoints = trail => Array.isArray(trail?.points)
  ? trail.points.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [p[0], p[1], p[2] ? 1 : 0])
  : point(trail) ? [point(trail)] : [];

export class VampireRouteRecorder {
  constructor() { this.routes = new Map(); }

  begin(game, victimId, pose, stamp, id) {
    const start = point(pose);
    if (!start || !game.players?.[victimId]) return;
    game.players[victimId].vampireRouteId = id;
    (game.bloodTrails ||= {})[id] = {
      id, victimId, at: stamp, savedAt: stamp, recording: true,
      visibleMeeting: (Number(game.meetingCount) || 0) + 1,
      x: start[0], z: start[1], points: [start],
    };
    this.routes.set(id, { points: [start], gap: false, revision: Number(game.players[victimId].ventRevision) || 0 });
  }

  local(id, trail) {
    let route = this.routes.get(id);
    if (!route) { route = { points: readPoints(trail), gap: false, revision: null }; this.routes.set(id, route); }
    return route;
  }

  append(route, pose, force = false) {
    const next = point(pose);
    if (!next) return false;
    const last = route.points.at(-1), distance = last ? Math.hypot(next[0] - last[0], next[1] - last[1]) : Infinity;
    if (distance < (force ? .01 : .2)) return false;
    // Teleports and vent travel must not draw a trail through walls.
    next[2] = route.gap || distance > 8 ? 1 : 0;
    route.gap = false;
    route.points.push(next);
    if (route.points.length > MAX_ROUTE_POINTS) {
      // Preserve endpoints and discontinuities when bounding unusually long routes.
      route.points = route.points.filter((p, i, all) => i === 0 || i === all.length - 1 || i % 2 === 0 || p[2] || all[i + 1]?.[2]);
    }
    return true;
  }

  sample(game, locate, stamp) {
    let changed = false;
    for (const id of this.routes.keys()) if (!game.bloodTrails?.[id]) this.routes.delete(id);
    if (game.phase !== "play") return false;
    for (const [victimId, victim] of Object.entries(game.players || {})) {
      const id = victim.vampireRouteId, trail = game.bloodTrails?.[id];
      if (!trail?.recording) continue;
      const route = this.local(id, trail), revision = Number(victim.ventRevision) || 0;
      if (route.revision !== null && revision !== route.revision) route.gap = true;
      route.revision = revision;
      if (!victim.vampireDeathAt) {
        this.finish(game, victimId, locate(victimId, victim), stamp); changed = true; continue;
      }
      if (victim.ventId) { route.gap = true; continue; }
      if (!victim.alive || victim.observer || victim.disconnected) {
        this.finish(game, victimId, null, stamp); changed = true; continue;
      }
      this.append(route, locate(victimId, victim));
      if (stamp - Number(trail.savedAt || trail.at || 0) >= SAVE_INTERVAL_MS &&
          JSON.stringify(trail.points) !== JSON.stringify(route.points)) {
        trail.points = route.points.map(p => [...p]); trail.savedAt = stamp; changed = true;
      }
    }
    return changed;
  }

  finish(game, victimId, pose, stamp) {
    const victim = game.players?.[victimId], id = victim?.vampireRouteId, trail = game.bloodTrails?.[id];
    if (!trail) return false;
    const route = this.local(id, trail);
    this.append(route, pose, true);
    trail.points = route.points.map(p => [...p]);
    const last = trail.points.at(-1);
    if (last) { trail.x = last[0]; trail.z = last[1]; }
    trail.recording = false; trail.savedAt = stamp;
    delete victim.vampireRouteId;
    return true;
  }
}

export function vampireRouteVisible(game, trail) {
  return game.phase === "play" && trail?.recording !== true &&
    (Number(game.meetingCount) || 0) >= (Number(trail?.visibleMeeting) || Infinity);
}

export function vampireRouteSegments(trail) {
  const segments = [];
  for (const p of readPoints(trail)) {
    if (!segments.length || p[2]) segments.push([]);
    segments.at(-1).push(p);
  }
  return segments;
}

export function* vampireRouteDots(trail, spacing = .55) {
  for (const segment of vampireRouteSegments(trail)) {
    if (!segment.length) continue;
    yield segment[0];
    let carry = 0;
    for (let i = 1; i < segment.length; i++) {
      const a = segment[i - 1], b = segment[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!length) continue;
      for (let d = spacing - carry; d <= length; d += spacing) {
        yield [a[0] + (b[0] - a[0]) * d / length, a[1] + (b[1] - a[1]) * d / length];
      }
      carry = (carry + length) % spacing;
    }
  }
}
