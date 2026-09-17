import type { SavedAction } from './action-profiles.ts';
import type { RoleId } from './roles.ts';
import type { DiceAppearance } from './dice-appearance.ts';

type PresetAction = Omit<SavedAction, 'id'>;
export type RoleSeed = { name: string; actions: PresetAction[]; appearance?: DiceAppearance };

function action(
  name: string,
  expression: string,
  note: string,
  color: string,
  color2: string,
  damage?: { name: string; expression: string }[],
): PresetAction {
  return { name, expression, note, color, colorMode: 'gradient', color2, ...(damage ? { damage } : {}) };
}

// One sensible, level-appropriate set per class - a quick starting point,
// not a build guide. Every action is a normal saved action: editable,
// removable and reorderable like anything a player saves themselves.
const CLASS_ACTIONS: Record<Exclude<RoleId, 'custom' | 'dm'>, PresetAction[]> = {
  barbarian: [
    action('Greataxe', '1d20+5', 'Attack roll', '#d23b3b', '#ff8a3d', [
      { name: 'Slashing damage', expression: '1d12+3' },
    ]),
    action('Reckless Attack', '2d20kh1+5', 'Advantage; attacks against you have advantage until your next turn', '#d23b3b', '#ff8a3d', [
      { name: 'Slashing damage', expression: '1d12+3' },
    ]),
    action('Strength Save', '1d20+5', '', '#d23b3b', '#ff8a3d'),
    action('Athletics Check', '1d20+7', '', '#d23b3b', '#ff8a3d'),
    action('Intimidation', '1d20+2', '', '#d23b3b', '#ff8a3d'),
  ],
  wizard: [
    action('Fire Bolt', '1d20+7', 'Spell attack roll', '#3fb6e0', '#823dce', [
      { name: 'Fire damage', expression: '2d10' },
    ]),
    action('Magic Missile', '3d4+3', 'Force damage, always hits', '#3fb6e0', '#823dce'),
    action('Intelligence Save', '1d20+3', '', '#3fb6e0', '#823dce'),
    action('Arcana Check', '1d20+7', '', '#3fb6e0', '#823dce'),
    action('Concentration Save', '1d20+3', 'DC 10 or half the damage taken, whichever is higher', '#3fb6e0', '#823dce'),
  ],
  cleric: [
    action('Guiding Bolt', '1d20+5', 'Spell attack roll', '#e8c55c', '#fff3b0', [
      { name: 'Radiant damage', expression: '4d6' },
    ]),
    action('Cure Wounds', '1d8+3', 'Healing, touch range', '#e8c55c', '#fff3b0'),
    action('Wisdom Save', '1d20+4', '', '#e8c55c', '#fff3b0'),
    action('Religion Check', '1d20+4', '', '#e8c55c', '#fff3b0'),
  ],
  monk: [
    action('Unarmed Strike', '1d20+6', 'Attack roll', '#3fae5c', '#8de0a0', [
      { name: 'Bludgeoning damage', expression: '1d6+4' },
    ]),
    action('Flurry of Blows', '2d20kh1+6', 'Advantage; costs 1 ki point', '#3fae5c', '#8de0a0', [
      { name: 'Bludgeoning damage', expression: '1d6+4' },
    ]),
    action('Dexterity Save', '1d20+6', '', '#3fae5c', '#8de0a0'),
    action('Acrobatics Check', '1d20+6', '', '#3fae5c', '#8de0a0'),
  ],
};

// The DM's own request: a plain row of d20 modifiers, positive shading
// green (brighter with a bigger bonus) and negative shading red (more
// saturated with a bigger penalty) so the row reads at a glance.
const POSITIVE_SHADES = ['#4bbf6c', '#5cd47e', '#6eea90', '#7dfaa0', '#8effb0'];
const NEGATIVE_SHADES = ['#e07c7c', '#e05c5c', '#e03c3c', '#c81f1f', '#a30d0d'];
const DM_ACTIONS: PresetAction[] = [
  ...[1, 2, 3, 4, 5].map((n) => action(`d20+${n}`, `1d20+${n}`, '', '#1f5c34', POSITIVE_SHADES[n - 1])),
  ...[1, 2, 3, 4, 5].map((n) => action(`d20-${n}`, `1d20-${n}`, '', '#5c1f1f', NEGATIVE_SHADES[n - 1])),
];

const CLASS_APPEARANCE: Record<Exclude<RoleId, 'custom'>, DiceAppearance> = {
  dm: { style: 'metallic', body: '#e0b23c', numbers: '#241a04', secondary: '#8f6a1a', sparkle: '#fff3c4', intensity: 0.5 },
  barbarian: { style: 'metallic', body: '#d23b3b', numbers: '#ffffff', secondary: '#7a1010', sparkle: '#ff8a3d', intensity: 0.55 },
  wizard: { style: 'sparkly', body: '#3fb6e0', numbers: '#ffffff', secondary: '#823dce', sparkle: '#ffffff', intensity: 0.6 },
  cleric: { style: 'sparkly', body: '#e8c55c', numbers: '#3a2c02', secondary: '#fff3b0', sparkle: '#ffffff', intensity: 0.55 },
  monk: { style: 'classic', body: '#3fae5c', numbers: '#ffffff', secondary: '#1f5c34', sparkle: '#8de0a0', intensity: 0.45 },
};

const ROLE_NAMES: Record<Exclude<RoleId, 'custom'>, string> = {
  dm: 'DM',
  barbarian: 'Barbarian',
  wizard: 'Wizard',
  cleric: 'Cleric',
  monk: 'Monk',
};

export function roleProfileSeed(role: RoleId): RoleSeed | undefined {
  if (role === 'custom') return undefined;
  const actions = role === 'dm' ? DM_ACTIONS : CLASS_ACTIONS[role];
  return { name: ROLE_NAMES[role], actions, appearance: CLASS_APPEARANCE[role] };
}
