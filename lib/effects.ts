// Temporary roll effects (advantage/disadvantage, Bless/Guidance/Bardic
// Inspiration-style bonus dice) - entirely client-side. The server never
// knows "Bless" exists; these just transform the expression string before
// it's sent, the same way the free-form roll box already lets a player
// type any dice notation. Kept device-local, scoped per room+player, the
// same way the roll notebook is - these are temporary in-game conditions
// for one character in one session, not a device-wide preference.
export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';
export type Effect = {
  id: string;
  name: string;
  die: string;
  persistent: boolean;
  active: boolean;
};
export type EffectsState = {
  advantage: AdvantageMode;
  effects: Effect[];
};
export const MAX_EFFECTS = 8;
const MAX_NAME = 24;
const DIE_PATTERN = /^\d{1,2}d(4|6|8|10|12|20|100)$/;

export function defaultEffects(): EffectsState {
  return {
    advantage: 'normal',
    effects: [
      { id: 'bless', name: 'Bless', die: '1d4', persistent: true, active: false },
      { id: 'guidance', name: 'Guidance', die: '1d4', persistent: false, active: false },
      { id: 'bardic', name: 'Bardic Inspiration', die: '1d6', persistent: false, active: false },
    ],
  };
}
function str(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw Error(`${field} is invalid.`);
  return value.trim();
}
function validateEffect(value: unknown): Effect {
  if (!value || typeof value !== 'object') throw Error('Invalid effect.');
  const v = value as Record<string, unknown>;
  const die = str(v.die, 10, 'Effect die').toLowerCase();
  if (!DIE_PATTERN.test(die)) throw Error('Effect die must look like 1d4, 2d6, etc.');
  if (typeof v.persistent !== 'boolean' || typeof v.active !== 'boolean')
    throw Error('Invalid effect.');
  return {
    id: str(v.id, 40, 'Effect id'),
    name: str(v.name, MAX_NAME, 'Effect name'),
    die,
    persistent: v.persistent,
    active: v.active,
  };
}
function isAdvantageMode(value: unknown): value is AdvantageMode {
  return value === 'normal' || value === 'advantage' || value === 'disadvantage';
}
export function validateEffects(value: unknown): EffectsState {
  if (!value || typeof value !== 'object') throw Error('Invalid effects.');
  const v = value as Record<string, unknown>;
  if (!isAdvantageMode(v.advantage)) throw Error('Invalid advantage state.');
  if (!Array.isArray(v.effects) || v.effects.length > MAX_EFFECTS)
    throw Error(`Use up to ${MAX_EFFECTS} effects.`);
  return { advantage: v.advantage, effects: v.effects.map(validateEffect) };
}
export function readEffects(raw: string | null): EffectsState {
  if (!raw) return defaultEffects();
  try {
    return validateEffects(JSON.parse(raw));
  } catch {
    return defaultEffects();
  }
}
export function writeEffects(state: EffectsState): string {
  return JSON.stringify(state);
}

// Only ever applied to a primary check/attack/save roll (never a damage
// roll - see roll()'s `!options?.linkedTo` gate in app/page.tsx) so this
// never has to guess "is this expression a d20 roll" for damage's sake.
// Advantage/disadvantage only transforms a *plain* single d20 - a saved
// action already shaped like `2d20kh1+5` (e.g. Reckless Attack) is left
// alone rather than guessed at, and that's visible in the roll preview.
export function applyEffects(
  expression: string,
  state: EffectsState,
): { expression: string; changed: boolean; consumed: string[] } {
  let next = expression;
  let changed = false;
  const consumed: string[] = [];
  if (state.advantage !== 'normal') {
    const m = /^1d20((?:[+-]\d+)*)$/.exec(next.replace(/\s/g, ''));
    if (m) {
      next = `2d20${state.advantage === 'advantage' ? 'kh' : 'kl'}1${m[1]}`;
      changed = true;
    }
  }
  for (const effect of state.effects) {
    if (!effect.active) continue;
    next = `${next}+${effect.die}`;
    changed = true;
    if (!effect.persistent) consumed.push(effect.id);
  }
  return { expression: next, changed, consumed };
}
// Deactivates the one-use effects a roll actually consumed - called only
// after that roll's request has genuinely succeeded, never on a failed
// attempt, so a retry can't lose (or double-spend) a bonus.
export function consumeEffects(state: EffectsState, consumed: string[]): EffectsState {
  if (!consumed.length) return state;
  const ids = new Set(consumed);
  return { ...state, effects: state.effects.map((e) => (ids.has(e.id) ? { ...e, active: false } : e)) };
}
