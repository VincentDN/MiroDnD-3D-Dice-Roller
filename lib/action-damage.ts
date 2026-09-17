import { parseExpression } from './dice.ts';
import { validateAppearance, type DiceAppearance } from './dice-appearance.ts';
export type DamageGroup = {
  name: string;
  expression: string;
  appearance?: DiceAppearance;
};
export type ActionRollOptions = {
  appearance?: DiceAppearance;
  damage?: DamageGroup[];
  linkedTo?: string;
  damageIndex?: number;
  critical?: boolean;
  visibility?: 'dm';
};
export function validateDamage(value: unknown): DamageGroup[] {
  if (!Array.isArray(value) || value.length > 6)
    throw Error('Use up to six damage groups.');
  return value.map((g) => {
    if (
      !g ||
      typeof g.name !== 'string' ||
      !g.name.trim() ||
      g.name.length > 40
    )
      throw Error('Name each damage group (40 characters maximum).');
    const expression = parseExpression(g.expression).expression;
    return {
      name: g.name.trim(),
      expression,
      ...(g.appearance ? { appearance: validateAppearance(g.appearance) } : {}),
    };
  });
}
export function criticalExpression(expression: string) {
  const p = parseExpression(expression);
  return parseExpression(
    p.groups
      .map((g) => `${g.count * 2}d${g.sides}${g.keep ? g.keep + g.amount : ''}`)
      .join('+') +
      (p.modifier ? `${p.modifier > 0 ? '+' : ''}${p.modifier}` : ''),
  ).expression;
}
