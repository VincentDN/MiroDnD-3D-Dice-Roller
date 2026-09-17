import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultEffects,
  validateEffects,
  readEffects,
  writeEffects,
  applyEffects,
  consumeEffects,
  MAX_EFFECTS,
  type EffectsState,
} from '../lib/effects.ts';

test('defaultEffects starts normal with Bless/Guidance/Bardic Inspiration present but inactive', () => {
  const state = defaultEffects();
  assert.equal(state.advantage, 'normal');
  assert.deepEqual(
    state.effects.map((e) => [e.name, e.active]),
    [
      ['Bless', false],
      ['Guidance', false],
      ['Bardic Inspiration', false],
    ],
  );
});

test('advantage/disadvantage transforms a plain single d20 roll, with or without a modifier', () => {
  const advantage: EffectsState = { advantage: 'advantage', effects: [] };
  assert.deepEqual(applyEffects('1d20+5', advantage), { expression: '2d20kh1+5', changed: true, consumed: [] });
  assert.deepEqual(applyEffects('1d20', advantage), { expression: '2d20kh1', changed: true, consumed: [] });
  assert.deepEqual(applyEffects('1d20-2', advantage), { expression: '2d20kh1-2', changed: true, consumed: [] });
  const disadvantage: EffectsState = { advantage: 'disadvantage', effects: [] };
  assert.deepEqual(applyEffects('1d20+5', disadvantage), { expression: '2d20kl1+5', changed: true, consumed: [] });
});

test('advantage never touches an expression that is not a plain single d20 - never silently guesses', () => {
  const advantage: EffectsState = { advantage: 'advantage', effects: [] };
  for (const expr of ['2d20kh1+5', '2d6+3', '1d20+1d4+5', '40d20'])
    assert.deepEqual(applyEffects(expr, advantage), { expression: expr, changed: false, consumed: [] });
});

test('normal advantage mode never changes the expression', () => {
  assert.deepEqual(applyEffects('1d20+5', { advantage: 'normal', effects: [] }), {
    expression: '1d20+5',
    changed: false,
    consumed: [],
  });
});

test('active named effects append their die and report one-use ones as consumed', () => {
  const state: EffectsState = {
    advantage: 'normal',
    effects: [
      { id: 'bless', name: 'Bless', die: '1d4', persistent: true, active: true },
      { id: 'guidance', name: 'Guidance', die: '1d4', persistent: false, active: true },
      { id: 'unused', name: 'Unused', die: '1d6', persistent: false, active: false },
    ],
  };
  const result = applyEffects('1d20+5', state);
  assert.equal(result.expression, '1d20+5+1d4+1d4');
  assert.equal(result.changed, true);
  assert.deepEqual(result.consumed, ['guidance']);
});

test('advantage and named effects compose - advantage transforms the base d20, then dice are appended', () => {
  const state: EffectsState = {
    advantage: 'advantage',
    effects: [{ id: 'bless', name: 'Bless', die: '1d4', persistent: true, active: true }],
  };
  assert.equal(applyEffects('1d20+5', state).expression, '2d20kh1+5+1d4');
});

test('consumeEffects deactivates only the given one-use effects, leaving persistent/inactive ones untouched', () => {
  const state: EffectsState = {
    advantage: 'advantage',
    effects: [
      { id: 'bless', name: 'Bless', die: '1d4', persistent: true, active: true },
      { id: 'guidance', name: 'Guidance', die: '1d4', persistent: false, active: true },
    ],
  };
  const after = consumeEffects(state, ['guidance']);
  assert.equal(after.advantage, 'advantage');
  assert.equal(after.effects.find((e) => e.id === 'bless')!.active, true);
  assert.equal(after.effects.find((e) => e.id === 'guidance')!.active, false);
  // A failed roll never calls consumeEffects at all, so nothing is lost - but
  // consuming an empty list is also a safe no-op (same object back).
  assert.equal(consumeEffects(state, []), state);
});

test('validateEffects rejects malformed state and enforces the effect cap', () => {
  for (const bad of [
    null,
    { advantage: 'maybe', effects: [] },
    { advantage: 'normal', effects: 'nope' },
    { advantage: 'normal', effects: Array(MAX_EFFECTS + 1).fill(defaultEffects().effects[0]) },
    { advantage: 'normal', effects: [{ id: 'x', name: 'X', die: 'red', persistent: true, active: false }] },
    { advantage: 'normal', effects: [{ id: 'x', name: '', die: '1d4', persistent: true, active: false }] },
  ])
    assert.throws(() => validateEffects(bad));
});

test('readEffects falls back to defaults for missing/corrupt/invalid data and round-trips valid state', () => {
  assert.deepEqual(readEffects(null), defaultEffects());
  assert.deepEqual(readEffects('{bad'), defaultEffects());
  const custom: EffectsState = {
    advantage: 'disadvantage',
    effects: [{ id: 'a', name: 'Poisoned', die: '1d4', persistent: true, active: true }],
  };
  assert.deepEqual(readEffects(writeEffects(custom)), custom);
});
