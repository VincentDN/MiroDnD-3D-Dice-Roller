import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from 'cannon-es';
import { simulate, createTable, replayTable, evaluatePhysical, evaluateThrow, snapshotMotion, validateBounds, physicalSides, STEP, faceValue, hull } from '../lib/dice-physics.ts';

test('every supported die settles under gravity; replay matches authoritative faces and poses', () => {
  const sides = [4,6,8,10,12,20,100];
  const result = simulate(sides,123);
  assert(result.physics.steps > 1);
  const replay = createTable(physicalSides(sides),123);
  for(let i=0;i<result.physics.steps;i++) replay.world.step(STEP);
  let physical=0;
  sides.forEach((s,i)=> {
    const first=faceValue(replay.bodies[physical],replay.sides[physical++]);
    const actual=s===100 ? ((first-1)*10+faceValue(replay.bodies[physical++],10)-1 || 100) : first;
    assert.equal(actual,result.values[i]);
    assert(actual>=1 && actual<=s);
  });
  replay.bodies.forEach((b,i)=> {
    assert(b.sleepState===C.Body.SLEEPING);
    assert.deepEqual([b.position.x,b.position.y,b.position.z],result.physics.poses[i].p);
    assert(b.position.y > 0);
  });
});
test('colliders have the expected face count and point outward',()=> {
  for(const s of [4,6,8,10,12,20]) {
    const h=hull(s);assert.equal(h.faces.length,s);
    h.faces.forEach((face,i)=>assert(h.normals[i].dot(h.vertices[face[0]])>0));
  }
});
test('a mouse joint can move a die, which falls back to the table on release',()=> {
  const table=createTable([6],123);
  for(let i=0;i<240;i++)table.world.step(STEP);
  const b=table.bodies[0];const before=b.position.x;
  const anchor=new C.Body({mass:0,type:C.Body.KINEMATIC,position:new C.Vec3(2,2,0)});
  table.world.addBody(anchor);b.wakeUp();
  const joint=new C.PointToPointConstraint(b,new C.Vec3(),anchor,new C.Vec3(),100);
  table.world.addConstraint(joint);
  for(let i=0;i<90;i++)table.world.step(STEP);
  assert(Math.abs(b.position.x-before)>.3);assert(b.position.y>1);
  table.world.removeConstraint(joint);
  for(let i=0;i<300;i++)table.world.step(STEP);
  assert(b.position.y<1.1);assert(b.position.y>0);
});
test('maximum percentile pool can resolve eighty physical dice',()=> {
  const result=simulate(Array(40).fill(100),123);
  assert.equal(result.values.length,40);assert.equal(result.physics.poses.length,80);
  assert(result.values.every(v=>v>=1&&v<=100));
});

test('viewport-sized rolls replay identical faces and poses on a wide table', () => {
  const result = evaluatePhysical('2d20', 1, 3);
  assert.equal(result.physics.bounds!.width / result.physics.bounds!.depth, 3);
  const table = replayTable([20,20], result.physics.seed, undefined, 1, result.physics.bounds);
  for (let i = 0; i < result.physics.steps; i++) table.world.step(STEP);
  assert.deepEqual(table.bodies.map(body => [body.position.x,body.position.y,body.position.z]), result.physics.poses.map(pose => pose.p));
  assert.throws(() => validateBounds({width: NaN, depth: 12}));
  assert.throws(() => validateBounds({width: 10000, depth: 12}));
  assert.throws(() => evaluatePhysical('1d20', 1, Infinity));
});

test('expanded walls accept edge throws and contain the resting die', () => {
  const table = createTable([20], 123);
  const bounds = {width: 36, depth: 12};
  table.resize(bounds);
  const body = table.bodies[0];
  body.position.set(16, 2, 0); body.velocity.set(8, 1, 0);
  const release = table.bodies.map(snapshotMotion);
  assert.throws(() => evaluateThrow('1d20', release));
  const result = evaluateThrow('1d20', release, 1, bounds);
  assert.deepEqual(result.physics.bounds, bounds);
  assert(result.physics.poses[0].p[0] > 4.5);
  assert(result.physics.poses[0].p[0] < 18);
  for (let i = 0; i < 500; i++) table.world.step(STEP);
  assert(body.position.x < 18 && body.position.x > 4.5);
});
