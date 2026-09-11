import * as C from 'cannon-es';
import * as T from 'three';
import { geometry, facesOf } from './dice-geometry.ts';
import { evaluate, parseExpression } from './dice.ts';

export const STEP = 1 / 60;
export const MAX_STEPS = 720;
export type Pose = { p: number[]; q: number[] };
export type Motion = Pose & { v: number[]; w: number[] };
export type PhysicsRoll = { seed: number; steps: number; poses: Pose[]; diceScale?: number; release?: Motion[] };
export function physicalSides(sides: number[]) {
  return sides.flatMap(s => s === 100 ? [10, 10] : [s]);
}
function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const cache = new Map<number, { vertices: C.Vec3[]; faces: number[][]; normals: C.Vec3[] }>();
export function hull(sides: number) {
  if (cache.has(sides)) return cache.get(sides)!;
  const g = geometry(sides), faces = facesOf(g), vertices: C.Vec3[] = [];
  const indices = faces.map(f => {
    const u = f.points[0].clone().sub(f.center).normalize();
    const v = new T.Vector3().crossVectors(f.normal, u);
    const points = [...f.points].sort((a, b) =>
      Math.atan2(a.clone().sub(f.center).dot(v), a.clone().sub(f.center).dot(u)) -
      Math.atan2(b.clone().sub(f.center).dot(v), b.clone().sub(f.center).dot(u)));
    return points.map(p => {
      let i = vertices.findIndex(q => p.distanceTo(new T.Vector3(q.x, q.y, q.z)) < 0.0001);
      if (i < 0) { i = vertices.length; vertices.push(new C.Vec3(p.x, p.y, p.z)); }
      return i;
    });
  });
  g.dispose();
  const result = { vertices, faces: indices, normals: faces.map(f => new C.Vec3(f.normal.x, f.normal.y, f.normal.z)) };
  cache.set(sides, result);
  return result;
}
export function createTable(sides: number[], seed: number, diceScale = 1) {
  const rng = random(seed);
  const world = new C.World({ gravity: new C.Vec3(0, -24, 0), allowSleep: true });
  world.broadphase = new C.SAPBroadphase(world);
  (world.solver as C.GSSolver).iterations = 12;
  world.defaultContactMaterial.friction = 0.42;
  world.defaultContactMaterial.restitution = 0.28;
  const cols = Math.ceil(Math.sqrt(sides.length * 1.6));
  const rows = Math.ceil(sides.length / cols);
  const width = Math.max(9, diceScale === 1 ? cols * 2.5 + 3 : (cols - 1) * 5 + 5), depth = Math.max(6, diceScale === 1 ? rows * 2.5 + 3 : (rows - 1) * 5 + 5);
  function plane(position: C.Vec3, rotation: C.Vec3) {
    const body = new C.Body({ mass: 0, shape: new C.Plane(), position });
    body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    world.addBody(body);
  }
  plane(new C.Vec3(0, 0, 0), new C.Vec3(-Math.PI / 2, 0, 0));
  plane(new C.Vec3(-width / 2, 0, 0), new C.Vec3(0, Math.PI / 2, 0));
  plane(new C.Vec3(width / 2, 0, 0), new C.Vec3(0, -Math.PI / 2, 0));
  plane(new C.Vec3(0, 0, -depth / 2), new C.Vec3(0, 0, 0));
  plane(new C.Vec3(0, 0, depth / 2), new C.Vec3(0, Math.PI, 0));
  const bodies = sides.map((s, i) => {
    const data = hull(s);
    const shape = new C.ConvexPolyhedron({ vertices: data.vertices.map(v => v.scale(diceScale)), faces: data.faces.map(f => [...f]) });
    const body = new C.Body({ mass: 1, shape, linearDamping: 0.2, angularDamping: 0.4,
      // Shorter sleepTimeLimit only shortens how long a body that's already stopped
      // moving must wait before the simulation trusts it's settled - it doesn't touch
      // the fall/bounce itself, but it does shave real time off every roll (server
      // compute and the client's replay animation both stop as soon as all dice sleep).
      sleepSpeedLimit: 0.3, sleepTimeLimit: 0.15 });
    body.position.set(((i % cols) - (cols - 1) / 2) * 2.5 * diceScale, 2.5 * diceScale + rng() * 2,
      (Math.floor(i / cols) - (rows - 1) / 2) * 2.5 * diceScale);
    // Uniform orientation from a random unit quaternion.
    const u = rng(), a = 2 * Math.PI * rng(), b = 2 * Math.PI * rng();
    body.quaternion.set(Math.sqrt(1-u)*Math.sin(a), Math.sqrt(1-u)*Math.cos(a), Math.sqrt(u)*Math.sin(b), Math.sqrt(u)*Math.cos(b));
    body.velocity.set((rng()-.5)*6, 1+rng()*3, (rng()-.5)*6);
    body.angularVelocity.set((rng()-.5)*20, (rng()-.5)*20, (rng()-.5)*20);
    world.addBody(body);
    return body;
  });
  return { world, bodies, width, depth, sides };
}
export function faceValue(body: C.Body, sides: number) {
  const heights = hull(sides).normals.map(n => body.quaternion.vmult(n).y);
  // A tetrahedron rests on the face opposite its upper vertex.
  const target = sides === 4 ? Math.min(...heights) : Math.max(...heights);
  return heights.indexOf(target) + 1;
}
export function snapshot(body: C.Body): Pose {
  return { p: [body.position.x, body.position.y, body.position.z], q: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w] };
}
export function snapshotMotion(body: C.Body): Motion {
  return { ...snapshot(body), v: [body.velocity.x,body.velocity.y,body.velocity.z], w: [body.angularVelocity.x,body.angularVelocity.y,body.angularVelocity.z] };
}
export function isDeliberateThrow(body: C.Body) {
  return body.velocity.length() >= 2.5 || body.angularVelocity.length() >= 5;
}
export function replayTable(sides: number[], seed: number, release?: Motion[], diceScale = 1) {
  const table = createTable(physicalSides(sides), seed, diceScale);
  if (release) {
    if (!Array.isArray(release) || release.length !== table.bodies.length) throw Error('Invalid throw.');
    table.bodies.forEach((body,i)=> {
      const m=release[i];
      for (const [name,count] of [['p',3],['q',4],['v',3],['w',3]] as const)
        if (!Array.isArray(m?.[name]) || m[name].length!==count || !m[name].every(Number.isFinite)) throw Error('Invalid throw motion.');
      if (Math.abs(m.p[0])>table.width/2+1 || Math.abs(m.p[2])>table.depth/2+1 || m.p[1]<0 || m.p[1]>10 || Math.hypot(...m.v)>40 || Math.hypot(...m.w)>80 || Math.abs(Math.hypot(...m.q)-1)>.01) throw Error('Throw is outside the table limits.');
      body.position.set(m.p[0],m.p[1],m.p[2]);body.quaternion.set(m.q[0],m.q[1],m.q[2],m.q[3]);body.quaternion.normalize();
      body.velocity.set(m.v[0],m.v[1],m.v[2]);body.angularVelocity.set(m.w[0],m.w[1],m.w[2]);body.wakeUp();
    });
  }
  return table;
}
export function simulate(sides: number[], seed: number, release?: Motion[], diceScale = 1) {
  const table = replayTable(sides, seed, release, diceScale);
  let steps = 0;
  while (steps < MAX_STEPS) {
    table.world.step(STEP); steps++;
    if (table.bodies.every(b => b.sleepState === C.Body.SLEEPING)) break;
  }
  if (table.bodies.some(b => b.sleepState !== C.Body.SLEEPING)) throw Error('Dice did not settle. Roll again.');
  const values = table.bodies.map((b, i) => faceValue(b, table.sides[i]));
  let index = 0;
  const logical = sides.map(s => {
    if (s !== 100) return values[index++];
    const tens = values[index++] - 1, units = values[index++] - 1;
    return tens * 10 + units || 100;
  });
  return { values: logical, physics: { seed, steps, diceScale, poses: table.bodies.map(snapshot), ...(release ? { release } : {}) } };
}
export function evaluatePhysical(raw: string, diceScale = 1) {
  const parsed = parseExpression(raw);
  const sides = parsed.groups.flatMap(g => Array(g.count).fill(g.sides) as number[]);
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  let result: ReturnType<typeof simulate> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { result = simulate(sides, (seed + attempt) >>> 0, undefined, diceScale); break; }
    catch { /* Retry a physically unsettled/cocked throw with a fresh seed. */ }
  }
  if (!result) throw Error('The dice did not settle. Please roll again.');
  let i = 0;
  return { ...evaluate(raw, () => result.values[i++]), physics: result.physics };
}

export function evaluateThrow(raw: string, release: Motion[], diceScale = 1) {
  if (!Array.isArray(release)) throw Error('A mouse throw needs release motion.');
  const parsed=parseExpression(raw), sides=parsed.groups.flatMap(g=>Array(g.count).fill(g.sides) as number[]);
  const result=simulate(sides,123,release,diceScale);let i=0;
  return { ...evaluate(raw,()=>result.values[i++]), physics:result.physics };
}
