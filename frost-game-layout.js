// Game coordinates use (x, z); the authored plan uses (x, y) with north up.
// This adapter is shared by the renderer, host rules, minimap and pathfinding.
import { pointInPolygon } from './frost-navigation.js';

const point = ([x, y]) => ({ x, z: -y });
function region(source, id, label = '') {
  const polygon = source.outline.map(point);
  const xs = polygon.map((p) => p.x), zs = polygon.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  return { id, name: label || id, label, color: source.color || '#486b80', polygon,
    holes: (source.holes || []).map((ring) => ring.map(point)),
    x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ };
}

export function createFrostGameLayout(data) {
  const rooms = data.rooms.map((room) => region(room, room.id, room.name));
  const corridors = data.routes.map((route) => region(route.floor, route.id));
  const walls = [];
  for (const ring of [data.floor.outline, ...data.floor.holes]) {
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length], az = -a[1], bz = -b[1];
      const dx = b[0] - a[0], dz = bz - az;
      walls.push({ ax: a[0], az, bx: b[0], bz, x: (a[0] + b[0]) / 2, z: (az + bz) / 2,
        w: Math.hypot(dx, dz), d: data.wallThickness, angle: -Math.atan2(dz, dx) });
    });
  }
  const tasks = data.tasks.filter((task) => !task.sabotage).map((task) => ({
    ...task, ...point(task.position), room: task.roomId, mapMode: 'frost',
  }));
  const emergencyPanels = data.tasks.filter((task) => task.sabotage).map((task) => ({
    ...task, ...point(task.position), room: task.sabotage, mapMode: 'frost',
  }));
  const vents = data.vents.map((vent) => ({ ...vent, ...point(vent.position), room: vent.roomName,
    rotationY: Math.atan2(vent.facing[0], -vent.facing[1]), exitPoint: point(vent.exit) }));
  const doors = data.doors.map((door) => {
    const a = point(door.a), b = point(door.b);
    return { id: 'frost-' + door.id, map: 'frost', roomIds: [door.roomId], groupId: 'frost-' + door.roomId,
      x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, w: door.width, d: .24,
      ax: a.x, az: a.z, bx: b.x, bz: b.z, tx: (b.x - a.x) / door.width, tz: (b.z - a.z) / door.width };
  });
  const colliders = [{ ...point(data.meeting.position), radius: data.meeting.radius }];
  for (const task of data.tasks) {
    const points = task.footprint.outline.map(point), xs = points.map((p) => p.x), zs = points.map((p) => p.z);
    colliders.push({ ...point(task.position), w: Math.max(...xs) - Math.min(...xs), d: Math.max(...zs) - Math.min(...zs) });
  }
  for (const prop of data.props || []) {
    colliders.push({ id: prop.id, roomId: prop.roomId, kind: prop.kind,
      ...point(prop.position), w: prop.width, d: prop.depth });
  }
  const spawnPoints = [];
  for (const radius of [2.8, 4.1, 4.8]) {
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2 + (radius === 4.1 ? .17 : 0);
      const x = data.meeting.position[0] + Math.cos(angle) * radius;
      const y = data.meeting.position[1] + Math.sin(angle) * radius;
      if (!pointInPolygon(x, y, data.navigation)) continue;
      if (spawnPoints.some((p) => Math.hypot(p.x - x, p.z + y) < .85)) continue;
      spawnPoints.push({ x, z: -y });
    }
  }
  if (spawnPoints.length < 20) throw new Error('FROST spawn capacity is below 20');
  return { id: 'frost', name: data.name, rooms, corridors, walls, tasks, emergencyPanels, vents, doors,
    colliders, spawnPoints, meetingPoint: point(data.meeting.position),
    bounds: { minX: data.bounds[0] - 1, maxX: data.bounds[2] + 1,
      minZ: -data.bounds[3] - 1, maxZ: -data.bounds[1] + 1 } };
}

export function requiredTaskIdsFor(tasks) {
  const legacy = ['power', 'numbers', 'card'].filter((id) => tasks.some((task) => task.id === id));
  return legacy.length ? legacy : tasks.slice(0, 3).map((task) => task.id);
}
