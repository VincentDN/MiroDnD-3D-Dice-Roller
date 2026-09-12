import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS_KEY,
  loadCollection,
  parseCollection,
  appendImport,
  actionFields,
  moveAction,
  type ActionCollection,
} from '../lib/action-profiles.ts';
const legacy = JSON.stringify({
  version: 1,
  presets: [
    { id: 'old', name: 'Sword', expression: '1d20+5' },
    { id: 'old2', name: 'Perception', expression: '2d20kh1+3' },
  ],
});

void test('legacy presets migrate in order and new profiles take precedence over the legacy backup', () => {
  const migrated = loadCollection(null, legacy);
  assert.equal(ACTIONS_KEY, 'rollparty:actions:v1');
  assert.deepEqual(
    migrated.profiles[0].actions.map((a) => [a.name, a.expression, a.note]),
    [
      ['Sword', '1d20+5', ''],
      ['Perception', '2d20kh1+3', ''],
    ],
  );
  migrated.profiles[0].actions[0].name = 'Edited';
  assert.equal(
    loadCollection(JSON.stringify(migrated), legacy).profiles[0].actions[0]
      .name,
    'Edited',
  );
  assert.throws(() => loadCollection('{bad', legacy), /valid/);
});
void test('portable round-trip preserves characters, order, expressions and reminders; imports append fresh IDs', () => {
  const current = loadCollection(null, legacy);
  current.profiles[0].actions[0].note = 'Two hands';
  let id = 0;
  const result = appendImport(
    current,
    JSON.stringify(current),
    () => `new-${id++}`,
  );
  assert.equal(result.profiles.length, 2);
  assert.deepEqual(result.profiles[0], current.profiles[0]);
  assert.equal(result.activeId, 'new-0');
  assert.equal(result.profiles[1].actions[0].note, 'Two hands');
  assert.notEqual(
    result.profiles[0].actions[0].id,
    result.profiles[1].actions[0].id,
  );
  assert.deepEqual(parseCollection(JSON.stringify(result)), result);
});
void test('invalid imports are atomic, bounded and reject duplicate IDs and unsupported dice', () => {
  const current = loadCollection(null, legacy),
    before = JSON.stringify(current);
  for (const mutate of [
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.version = 99;
    },
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.activeId = 'missing';
    },
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.profiles[0].actions[1].id = v.profiles[0].actions[0].id;
    },
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.profiles[0].actions[1].expression = '999d20';
    },
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.profiles[0].actions[0].note = 'x'.repeat(241);
    },
    (v: Omit<ActionCollection, 'version'> & { version: number }) => {
      v.profiles[0].actions = Array(31).fill(v.profiles[0].actions[0]);
    },
  ]) {
    const incoming = JSON.parse(before);
    mutate(incoming);
    assert.throws(() => appendImport(current, JSON.stringify(incoming)));
    assert.equal(JSON.stringify(current), before);
  }
  assert.throws(() => parseCollection(' '.repeat(256001)), /large/);
  const full = {
    ...current,
    profiles: Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      name: `PC ${i}`,
      actions: [],
    })),
    activeId: 'p0',
  };
  assert.throws(() => appendImport(full, before), /exceed/);
});
void test('reordering keeps actions intact and handles boundary moves without losing an item', () => {
  const actions = loadCollection(null, legacy).profiles[0].actions;
  const moved = moveAction(actions, actions[1].id, -1);
  assert.deepEqual(moved, [actions[1], actions[0]]);
  assert.deepEqual(moveAction(moved, moved[0].id, 1), actions);
  assert.deepEqual(moveAction(actions, actions[0].id, -1), actions);
  assert.deepEqual(moveAction(actions, 'unknown', 1), actions);
  assert.deepEqual(actionFields(' Sword ', ' 1D20 + 5 ', ' Two hands '), {
    name: 'Sword',
    expression: '1d20+5',
    note: 'Two hands',
  });
});
