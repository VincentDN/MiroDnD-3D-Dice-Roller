import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleTo } from '../lib/roll-visibility.ts';

const publicRoll = { visibility: undefined, playerId: 'p1' };
const hiddenRoll = { visibility: 'dm', playerId: 'p1' };

test('a public roll (no visibility field) is visible to anyone, including an unresolved viewer', () => {
  assert.equal(visibleTo(publicRoll, null), true);
  assert.equal(visibleTo(publicRoll, { id: 'p2', role: null }), true);
});

test('a hidden roll is invisible to an unresolved viewer (no valid player credential)', () => {
  assert.equal(visibleTo(hiddenRoll, null), false);
});

test('a hidden roll is invisible to another player who is not the DM', () => {
  assert.equal(visibleTo(hiddenRoll, { id: 'p2', role: null }), false);
  assert.equal(visibleTo(hiddenRoll, { id: 'p2', role: 'barbarian' }), false);
});

test('a hidden roll is visible to its own roller', () => {
  assert.equal(visibleTo(hiddenRoll, { id: 'p1', role: null }), true);
});

test('a hidden roll is visible to any player whose role is dm, even if they did not roll it', () => {
  assert.equal(visibleTo(hiddenRoll, { id: 'p2', role: 'dm' }), true);
});
