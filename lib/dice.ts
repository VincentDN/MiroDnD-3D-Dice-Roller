export const SIDES = [4, 6, 8, 10, 12, 20, 100];
export type Die = { sides: number; value: number; kept: boolean };
export type Roll = {
  id: string;
  seq?: number;
  physics?: { seed: number; steps: number; poses: { p: number[]; q: number[] }[] };
  name: string;
  color: string;
  expression: string;
  label: string;
  dice: Die[];
  modifier: number;
  total: number;
  created: number;
};
export function parseExpression(raw: string) {
  if (typeof raw !== 'string' || raw.length > 120)
    throw Error('Enter dice such as 2d20kh1+5 or 2d6+1d4+3.');
  const expression = raw.toLowerCase().replace(/\s/g, '');
  const parts = expression.match(/[+-]?[^+-]+/g);
  if (!parts || parts.join('') !== expression)
    throw Error('Invalid dice expression.');
  let count = 0,
    modifier = 0;
  const groups: {
    count: number;
    sides: number;
    keep?: string;
    amount: number;
  }[] = [];
  for (const part of parts) {
    const match = part.match(
      /^\+?(\d*)d(4|6|8|10|12|20|100)(?:(kh|kl)(\d+))?$/,
    );
    if (match) {
      const n = Number(match[1] || 1),
        sides = Number(match[2]),
        amount = Number(match[4] || n);
      if (n < 1 || n > 40 || amount < 1 || amount > n)
        throw Error('Use 1–40 dice and a valid keep count.');
      count += n;
      groups.push({ count: n, sides, keep: match[3], amount });
    } else if (/^[+-]?\d{1,4}$/.test(part)) {
      modifier += Number(part);
    } else
      throw Error(
        'Use d4, d6, d8, d10, d12, d20, d100; kh or kl; and a numeric modifier.',
      );
  }
  if (!count || count > 40 || Math.abs(modifier) > 9999)
    throw Error('Roll 1–40 dice with a modifier up to 9999.');
  return { expression, groups, modifier };
}
export function randomDie(sides: number) {
  const a = new Uint32Array(1),
    limit = 2 ** 32 - (2 ** 32 % sides);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limit);
  return (a[0] % sides) + 1;
}
export function evaluate(raw: string, random = randomDie) {
  const parsed = parseExpression(raw);
  const dice: Die[] = [];
  for (const g of parsed.groups) {
    const group = Array.from({ length: g.count }, () => ({
      sides: g.sides,
      value: random(g.sides),
      kept: true,
    }));
    if (g.keep) {
      const ordered = group
        .map((d, i) => ({ value: d.value, i }))
        .sort((a, b) =>
          g.keep === 'kh' ? b.value - a.value : a.value - b.value,
        );
      const kept = new Set(ordered.slice(0, g.amount).map((d) => d.i));
      group.forEach((d, i) => (d.kept = kept.has(i)));
    }
    dice.push(...group);
  }
  return {
    expression: parsed.expression,
    dice,
    modifier: parsed.modifier,
    total: dice.reduce((s, d) => s + (d.kept ? d.value : 0), parsed.modifier),
  };
}
