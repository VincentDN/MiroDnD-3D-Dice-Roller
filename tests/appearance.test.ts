import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultAppearance,
  validateAppearance,
  safeAppearance,
} from '../lib/dice-appearance.ts';
import { parseCollection, appendImport } from '../lib/action-profiles.ts';
import { criticalExpression } from '../lib/action-damage.ts';
import { geometry } from '../lib/dice-geometry.ts';
import { diceMaterial } from '../lib/dice-material.ts';

test('appearance round trips through profiles and imports without changing old actions', () => {
  const appearance = {
    ...defaultAppearance(),
    style: 'gradient' as const,
    body: '#ff0033',
    numbers: '#112233',
  };
  const raw = JSON.stringify({
    version: 1,
    activeId: 'p',
    profiles: [
      {
        id: 'p',
        name: 'Wizard',
        appearance,
        styles: [{ name: 'Fire', appearance }],
        actions: [
          {
            id: 'a',
            name: 'Firebolt',
            color: '#112233',
            colorMode: 'gradient',
            color2: '#445566',
            expression: '1d20+4',
            note: '',
            appearance,
            damage: [{ name: 'Fire', expression: '1d10', appearance }],
          },
        ],
      },
    ],
  });
  const parsed = parseCollection(raw);
  assert.deepEqual(
    parsed.profiles[0].actions[0].damage?.[0].appearance,
    appearance,
  );
  assert.equal(parsed.profiles[0].actions[0].color2, '#445566');
  assert.equal(parsed.profiles[0].actions[0].appearance?.body, '#ff0033');
  const imported = appendImport(parsed, raw, () => crypto.randomUUID());
  assert.equal(imported.profiles.length, 2);
  assert.deepEqual(imported.profiles[1].styles, parsed.profiles[0].styles);
  assert.throws(() => validateAppearance({ ...appearance, body: 'url(evil)' }));
  assert.throws(() =>
    validateAppearance({ ...appearance, intensity: Infinity }),
  );
  assert.equal(safeAppearance({ style: 'future' }, '#123456').body, '#123456');
});
test('critical damage doubles each dice group but leaves flat bonuses unchanged', () => {
  assert.equal(criticalExpression('2d6+1d4+3'), '4d6+2d4+3');
  assert.equal(criticalExpression('1d8-2'), '2d8-2');
  assert.throws(() => criticalExpression('40d20'));
});
test('materials never alter polyhedron vertex positions or numbering topology', () => {
  for (const sides of [4, 6, 8, 10, 12, 20])
    for (const style of ['classic', 'dark', 'gradient', 'metallic'] as const) {
      const g = geometry(sides);
      const positions = Array.from(g.getAttribute('position').array);
      const material = diceMaterial(
        g,
        { ...defaultAppearance(), style },
        true,
        false,
      );
      assert.deepEqual(Array.from(g.getAttribute('position').array), positions);
      material.dispose();
      g.dispose();
    }
});
