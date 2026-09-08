import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { geometry, facesOf } from '../lib/dice-geometry.ts';
test('all rendered polyhedra have the correct number of planar numbered faces', () => {
  for (const s of [4, 6, 8, 10, 12, 20]) {
    const g = geometry(s),
      faces = facesOf(g);
    assert.equal(faces.length, s, 'd' + s);
    for (const f of faces) {
      const target = new T.Quaternion().setFromUnitVectors(
        f.normal,
        new T.Vector3(0, 1, 0),
      );
      assert(f.normal.clone().applyQuaternion(target).y > 0.99999);
      for (const p of f.points)
        assert(Math.abs(f.normal.dot(p.clone().sub(f.center))) < 0.00001);
    }
    g.dispose();
  }
});
