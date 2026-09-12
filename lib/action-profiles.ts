import { parseExpression } from './dice.ts';
import { readPresets } from './dice-presets.ts';

export const ACTIONS_KEY = 'rollparty:actions:v1';
export const MAX_PROFILES = 12;
export const MAX_ACTIONS = 30;
export const MAX_IMPORT_BYTES = 256_000;
export type SavedAction = {
  id: string;
  name: string;
  expression: string;
  note: string;
};
export type ActionProfile = {
  id: string;
  name: string;
  actions: SavedAction[];
};
export type ActionCollection = {
  version: 1;
  activeId: string;
  profiles: ActionProfile[];
};

function text(
  value: unknown,
  max: number,
  field: string,
  empty = false,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (!empty && !value.trim())
  )
    throw Error(
      `${field} must contain ${empty ? '0' : '1'}–${max} characters.`,
    );
  return value.trim();
}
export function actionFields(
  name: unknown,
  expression: unknown,
  note: unknown = '',
) {
  return {
    name: text(name, 32, 'Action name'),
    expression: parseExpression(text(expression, 120, 'Dice expression'))
      .expression,
    note: text(note, 240, 'Reminder', true),
  };
}
export function profileName(name: unknown) {
  return text(name, 40, 'Character name');
}

// Strict validation is shared by storage and file import. Reject the whole file,
// rather than silently discarding invalid actions from somebody's backup.
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid character or action record.');
  return value as Record<string, unknown>;
}
export function parseCollection(raw: string): ActionCollection {
  if (raw.length > MAX_IMPORT_BYTES)
    throw Error('Action file is too large (maximum 256 KB).');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Error('Choose a valid action profiles JSON file.');
  }
  const value = record(parsed);
  if (
    value.version !== 1 ||
    !Array.isArray(value.profiles) ||
    !value.profiles.length ||
    value.profiles.length > MAX_PROFILES
  )
    throw Error(
      'Action file must contain version 1 and 1–12 character profiles.',
    );
  const ids = new Set<string>();
  const id = (input: unknown) => {
    const result = text(input, 80, 'ID');
    if (ids.has(result)) throw Error('Action file contains duplicate IDs.');
    ids.add(result);
    return result;
  };
  const profiles = value.profiles.map((input: unknown): ActionProfile => {
    const p = record(input);
    if (!p || !Array.isArray(p.actions) || p.actions.length > MAX_ACTIONS)
      throw Error('Each character can hold up to 30 actions.');
    return {
      id: id(p.id),
      name: profileName(p.name),
      actions: p.actions.map((input: unknown) => {
        const a = record(input);
        if (!a) throw Error('Invalid action.');
        return {
          id: id(a.id),
          ...actionFields(a.name, a.expression, a.note ?? ''),
        };
      }),
    };
  });
  if (!profiles.some((p: ActionProfile) => p.id === value.activeId))
    throw Error('The selected character is missing from the action file.');
  return {
    version: 1,
    activeId: text(value.activeId, 80, 'Selected character'),
    profiles,
  };
}
export function loadCollection(
  raw: string | null,
  legacy: string | null,
): ActionCollection {
  if (raw !== null) return parseCollection(raw);
  return {
    version: 1,
    activeId: 'default',
    profiles: [
      {
        id: 'default',
        name: 'My character',
        actions: readPresets(legacy).map((p, i) => ({
          ...p,
          id: `legacy-${i}`,
          note: '',
        })),
      },
    ],
  };
}
export function appendImport(
  current: ActionCollection,
  raw: string,
  uuid = () => crypto.randomUUID(),
): ActionCollection {
  const incoming = parseCollection(raw);
  if (current.profiles.length + incoming.profiles.length > MAX_PROFILES)
    throw Error(
      'Import would exceed 12 characters. Remove an unused character first.',
    );
  const profiles = incoming.profiles.map((p) => ({
    ...p,
    id: uuid(),
    actions: p.actions.map((a) => ({ ...a, id: uuid() })),
  }));
  return {
    ...current,
    activeId: profiles[0].id,
    profiles: [...current.profiles, ...profiles],
  };
}
export function moveAction(
  actions: SavedAction[],
  id: string,
  delta: -1 | 1,
): SavedAction[] {
  const from = actions.findIndex((a) => a.id === id),
    to = from + delta;
  if (from < 0 || to < 0 || to >= actions.length) return actions;
  const next = [...actions];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
