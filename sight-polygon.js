// Exact 2D sight intersections, with the same rays and endpoint samples as the
// original mask. Angular buckets only prune walls that a ray cannot intersect.
// Float64 buffers and candidate lists are reused between mask refreshes.
const TAU = Math.PI * 2;
const ascending = (a, b) => a - b;
const normalizedAngle = angle => (angle % TAU + TAU) % TAU;

export class SightPolygonSolver {
  constructor(rayCount = 256) {
    this.rayCount = rayCount;
    this.bucketCount = 256;
    this.angleScale = this.bucketCount / TAU;
    this.buckets = Array.from({length: this.bucketCount}, () => []);
    this.angles = [];
    this.segments = new Float64Array(0);
    this.points = new Float64Array(0);
    this.result = {points: this.points, count: 0, segmentChecks: 0, naiveSegmentChecks: 0};
  }

  solve(walls, originX, originZ, radius) {
    const {buckets, angles, bucketCount, angleScale} = this;
    for (const bucket of buckets) bucket.length = 0;
    angles.length = 0;
    for (let i = 0; i < this.rayCount; i++) angles.push(i * TAU / this.rayCount);
    if (this.segments.length < walls.length * 5) {
      this.segments = new Float64Array(Math.max(walls.length * 5, this.segments.length * 2));
    }
    const segments = this.segments;
    const radiusSquared = radius * radius;
    let count = 0;
    for (const wall of walls) {
      const qx = wall.ax - originX, qz = wall.az - originZ;
      const sx = wall.bx - wall.ax, sz = wall.bz - wall.az;
      const ex = wall.bx - originX, ez = wall.bz - originZ;
      const a = Math.atan2(qz, qx), b = Math.atan2(ez, ex);
      angles.push(a - .00001, a, a + .00001, b - .00001, b, b + .00001);
      const offset = count++ * 5;
      segments[offset] = qx; segments[offset + 1] = qz;
      segments[offset + 2] = sx; segments[offset + 3] = sz;
      segments[offset + 4] = qx * sz - qz * sx;
      const lengthSquared = sx * sx + sz * sz;
      const u = Math.max(0, Math.min(1, -(qx * sx + qz * sz) / (lengthSquared || 1)));
      const nearX = qx + sx * u, nearZ = qz + sz * u;
      const distanceSquared = nearX * nearX + nearZ * nearZ;
      // Preserve all endpoint rays, including endpoints beyond the sight circle.
      // A segment beyond that circle cannot reduce any ray's initial reach.
      if (distanceSquared > radiusSquared + Math.max(1e-12, radiusSquared * 1e-12)) continue;
      if (distanceSquared < 1e-16) {
        // The viewer may stand on an endpoint/door. Every direction is relevant.
        for (const bucket of buckets) bucket.push(offset);
        continue;
      }
      const delta = Math.atan2(qx * ez - qz * ex, qx * ex + qz * ez);
      const start = Math.floor((Math.min(a, a + delta) - 1e-9) * angleScale);
      const end = Math.floor((Math.max(a, a + delta) + 1e-9) * angleScale);
      for (let bin = start; bin <= end; bin++) {
        buckets[(bin % bucketCount + bucketCount) % bucketCount].push(offset);
      }
    }
    for (let i = 0; i < angles.length; i++) angles[i] = normalizedAngle(angles[i]);
    angles.sort(ascending);
    if (this.points.length < angles.length * 2) {
      this.points = new Float64Array(Math.max(angles.length * 2, this.points.length * 2));
    }
    const points = this.points;
    let checks = 0;
    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i], dx = Math.cos(angle), dz = Math.sin(angle);
      const candidates = buckets[Math.min(bucketCount - 1, Math.floor(angle * angleScale))];
      let reach = radius;
      checks += candidates.length;
      for (const offset of candidates) {
        const qx = segments[offset], qz = segments[offset + 1];
        const sx = segments[offset + 2], sz = segments[offset + 3];
        const den = dx * sz - dz * sx;
        if (Math.abs(den) < 1e-10) continue;
        const t = segments[offset + 4] / den, u = (qx * dz - qz * dx) / den;
        if (t >= 0 && u >= 0 && u <= 1) reach = Math.min(reach, t);
      }
      points[i * 2] = dx * reach; points[i * 2 + 1] = dz * reach;
    }
    Object.assign(this.result, {points, count: angles.length,
      segmentChecks: checks, naiveSegmentChecks: angles.length * walls.length});
    return this.result;
  }
}
