import * as T from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
type Face = { normal: T.Vector3; center: T.Vector3; points: T.Vector3[] };
export function facesOf(source: T.BufferGeometry): Face[] {
  const g = source.index ? source.toNonIndexed() : source;
  const pos = g.getAttribute('position');
  const faces: Face[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const points = [0, 1, 2].map((j) =>
      new T.Vector3().fromBufferAttribute(pos, i + j),
    );
    const n = points[1]
      .clone()
      .sub(points[0])
      .cross(points[2].clone().sub(points[0]))
      .normalize();
    let f = faces.find((f) => f.normal.dot(n) > 0.99999);
    if (!f) {
      f = { normal: n, center: new T.Vector3(), points: [] };
      faces.push(f);
    }
    for (const p of points)
      if (!f.points.some((q) => q.distanceTo(p) < 0.0001)) f.points.push(p);
  }
  for (const f of faces)
    f.center.copy(
      f.points
        .reduce((s, p) => s.add(p), new T.Vector3())
        .divideScalar(f.points.length),
    );
  if (g !== source) g.dispose();
  return faces;
}
export function geometry(sides: number): T.BufferGeometry {
  if (sides === 4) return new T.TetrahedronGeometry(1);
  if (sides === 6) return new T.BoxGeometry(1.4, 1.4, 1.4);
  if (sides === 8) return new T.OctahedronGeometry(1);
  if (sides === 12) return new T.DodecahedronGeometry(1);
  if (sides === 20) return new T.IcosahedronGeometry(1);
  // Polar dual of a pentagonal antiprism: ten congruent kite faces.
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5;
    return new T.Vector3(Math.cos(a), i % 2 ? 0.5 : -0.5, Math.sin(a));
  });
  const anti = new ConvexGeometry(points);
  const vertices = facesOf(anti).map((f) =>
    f.normal.clone().divideScalar(f.normal.dot(f.center)),
  );
  anti.dispose();
  const g = new ConvexGeometry(vertices);
  g.computeBoundingSphere();
  g.scale(
    1 / g.boundingSphere!.radius,
    1 / g.boundingSphere!.radius,
    1 / g.boundingSphere!.radius,
  );
  return g;
}
