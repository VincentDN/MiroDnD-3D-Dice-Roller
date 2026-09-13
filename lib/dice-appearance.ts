export const STYLES = [
  'classic',
  'dark',
  'sparkly',
  'gradient',
  'metallic',
] as const;
export type DiceAppearance = {
  style: (typeof STYLES)[number];
  body: string;
  numbers: string;
  secondary: string;
  sparkle: string;
  intensity: number;
};
export const defaultAppearance = (body = '#32a6c8'): DiceAppearance => ({
  style: 'classic',
  body,
  numbers: '#ffffff',
  secondary: '#823dce',
  sparkle: '#ffffff',
  intensity: 0.45,
});
export function validateAppearance(value: unknown): DiceAppearance {
  if (!value || typeof value !== 'object')
    throw Error('Invalid dice appearance.');
  const a = value as DiceAppearance;
  if (
    !STYLES.includes(a.style) ||
    ![a.body, a.numbers, a.secondary, a.sparkle].every(
      (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c),
    ) ||
    !Number.isFinite(a.intensity) ||
    a.intensity < 0 ||
    a.intensity > 1
  )
    throw Error('Invalid dice appearance.');
  return {
    style: a.style,
    body: a.body,
    numbers: a.numbers,
    secondary: a.secondary,
    sparkle: a.sparkle,
    intensity: a.intensity,
  };
}
export function safeAppearance(value: unknown, color: string) {
  try {
    return validateAppearance(value);
  } catch {
    return defaultAppearance(color);
  }
}
export function readableNumbers(body: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(body.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.179
    ? '#101820'
    : '#ffffff';
}
