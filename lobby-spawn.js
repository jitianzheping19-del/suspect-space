// A deterministic preference, followed by the nearest unoccupied safe floor.
// Shared with the lobby iframe so its entrance walk ends at the chosen spot.
export function chooseLobbyEntryPoint(id, occupied = [], preferred) {
  let hash = 0;
  for (const ch of String(id || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const origin = preferred || { x: ((hash % 5) - 2) * .48, z: -4.45 };
  const valid = ({x, z}) => {
    if (x < -10.6 || x > 10.6 || z < -4.6 || z > 11.8) return false;
    if (Math.abs(x) < 1.9 && Math.abs(z - .7) < 1.9) return false;
    if (Math.hypot(x + 3.8, z + 3.8) < 2.2 || Math.hypot(x - 3.75, z + 5.42) < 2.05) return false;
    if (Math.hypot(x + 6.3, z + 5.1) < 1.35 || Math.abs(Math.abs(x) - 8.5) < 1.3 && Math.abs(z - 3.55) < 1.3) return false;
    if (Math.abs(x - 10.8) < 1.55 && (Math.abs(z + 1.725) < 1.8 || Math.abs(z - 2.1) < 1.6)) return false;
    return true;
  };
  const others = occupied.filter(p => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.z)));
  const clearance = p => others.reduce((gap, q) => Math.min(gap, Math.hypot(p.x - Number(q.x), p.z - Number(q.z))), Infinity);
  if (valid(origin) && clearance(origin) >= 1.65) return {x: origin.x, z: origin.z};
  const candidates = [];
  for (let row = 0; row < 10; row++) for (let col = -6; col <= 6; col++) {
    const p = {x: col * 1.7, z: -4.45 + row * 1.75};
    if (valid(p)) candidates.push(p);
  }
  candidates.sort((a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z));
  return candidates.find(p => clearance(p) >= 1.65) || candidates.sort((a, b) => clearance(b) - clearance(a))[0] || {x: 0, z: -4.45};
}
