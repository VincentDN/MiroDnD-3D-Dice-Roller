import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseExpression, randomDie, SIDES } from '../lib/dice.ts';
test('all dice have inclusive bounds', () => {
  for (const s of SIDES) {
    for (let i = 0; i < 300; i++) {
      const n = randomDie(s);
      assert(n >= 1 && n <= s);
    }
    assert.equal(evaluate('1d' + s, () => s).total, s);
  }
});
test('advantage and disadvantage keep correct die including ties', () => {
  let i = 0;
  const r = evaluate('2d20kh1+5', () => [3, 19][i++]);
  assert.equal(r.total, 24);
  assert.deepEqual(
    r.dice.map((d) => d.kept),
    [false, true],
  );
  i = 0;
  assert.equal(evaluate('2d20kl1-2', () => [3, 19][i++]).total, 1);
  assert.equal(evaluate('2d20kh1', () => 10).total, 10);
});
test('mixed pools and keep highest for ability scores', () => {
  assert.equal(evaluate('2d6+1d4+3', (s) => s).total, 19);
  assert.equal(evaluate('4d6kh3', () => 6).total, 18);
  assert.equal(evaluate('d100', () => 100).total, 100);
});
test('malformed and excessive rolls rejected', () => {
  for (const e of [
    '0d6',
    '41d20',
    '2d20kh3',
    'd7',
    '1d6++2',
    '-1d6',
    '1d6+',
    '1d6foo',
    '1d6+10000',
    '20d6+21d4',
    '2d20kl0',
    '',
  ])
    assert.throws(() => parseExpression(e), e);
});
