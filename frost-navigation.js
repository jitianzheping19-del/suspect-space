// Positions are plain simulation state, independent of Three.js objects.
// Plan (x, y) corresponds to world (x, z = -y).
export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if ((a[1] > y) !== (b[1] > y)
      && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInPolygon(x, y, polygon) {
  return pointInRing(x, y, polygon.outline)
    && !(polygon.holes || []).some((ring) => pointInRing(x, y, ring));
}

export function createFrostNavigation(data) {
  const doors = data.doors.map((door) => {
    const tx = (door.b[0] - door.a[0]) / door.width;
    const tz = -(door.b[1] - door.a[1]) / door.width;
    return {
      ...door,
      x: (door.a[0] + door.b[0]) / 2,
      z: -(door.a[1] + door.b[1]) / 2,
      tx, tz, nx: -tz, nz: tx,
      open: 0,
      target: 0,
    };
  });

  function doorClear(x, z) {
    for (const door of doors) {
      const dx = x - door.x;
      const dz = z - door.z;
      const normal = dx * door.nx + dz * door.nz;
      if (Math.abs(normal) >= data.walkerRadius + 0.07) continue;
      const along = dx * door.tx + dz * door.tz;
      const halfLeaf = (door.width / 2 - 0.035) / 2;
      for (const sign of [-1, 1]) {
        const centre = sign * (door.width / 4 + door.open * door.width / 2);
        const distanceX = Math.max(0, Math.abs(along - centre) - halfLeaf);
        const distanceZ = Math.max(0, Math.abs(normal) - 0.07);
        if (distanceX ** 2 + distanceZ ** 2 < data.walkerRadius ** 2) return false;
      }
    }
    return true;
  }

  function canStand(x, z) {
    return pointInPolygon(x, -z, data.navigation) && doorClear(x, z);
  }

  function move(position, dx, dz) {
    // Substeps prevent crossing a wall when a frame stalls. The eroded floor
    // already accounts for the walker's radius at every edge and courtyard.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      const x = position.x + sx;
      const z = position.z + sz;
      if (canStand(x, z)) {
        position.x = x;
        position.z = z;
      } else if (Math.abs(sx) > Math.abs(sz)) {
        if (canStand(x, position.z)) position.x = x;
        if (canStand(position.x, z)) position.z = z;
      } else {
        if (canStand(position.x, z)) position.z = z;
        if (canStand(x, position.z)) position.x = x;
      }
    }
    return position;
  }

  function roomAt(x, z) {
    return data.rooms.find((room) => pointInRing(x, -z, room.outline)) || null;
  }

  function updateDoors(position, dt) {
    let changed = false;
    for (const door of doors) {
      const dx = position ? position.x - door.x : Infinity;
      const dz = position ? position.z - door.z : Infinity;
      const near = position && Math.abs(dx * door.nx + dz * door.nz) < 3.5
        && Math.abs(dx * door.tx + dz * door.tz) < door.width / 2 + 0.9;
      door.target = near ? 1 : 0;
      const difference = door.target - door.open;
      if (Math.abs(difference) < 0.0005) {
        if (door.open !== door.target) changed = true;
        door.open = door.target;
      } else {
        door.open += difference * (1 - Math.exp(-dt * (near ? 12 : 4)));
        changed = true;
      }
    }
    return changed;
  }

  return { canStand, move, roomAt, doors, updateDoors };
}
