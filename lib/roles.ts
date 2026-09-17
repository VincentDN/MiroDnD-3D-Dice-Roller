export type RoleId = 'dm' | 'barbarian' | 'wizard' | 'cleric' | 'monk' | 'custom';
export type Role = {
  id: Exclude<RoleId, 'custom'>;
  name: string;
  color: string;
  description: string;
};

// Generic party roles - no portraits, no per-person identity data. "Create
// Player" (id 'custom') is handled separately: it carries no fixed color,
// the player picks any hex directly (see roleAndColor() server-side and
// RolePicker client-side).
export const ROLES: Role[] = [
  { id: 'dm', name: 'DM', color: '#e0b23c', description: 'Runs the table.' },
  { id: 'barbarian', name: 'Barbarian', color: '#d23b3b', description: 'Rage and reckless attacks.' },
  { id: 'wizard', name: 'Wizard', color: '#3fb6e0', description: 'Spells and arcane knowledge.' },
  { id: 'cleric', name: 'Cleric', color: '#e8c55c', description: 'Healing and radiant magic.' },
  { id: 'monk', name: 'Monk', color: '#3fae5c', description: 'Martial arts and ki.' },
];

export const CUSTOM_ROLE_ID: RoleId = 'custom';
export const DEFAULT_ROLE_ID: RoleId = CUSTOM_ROLE_ID;
// Matches the app's own purple accent (--primary in app/globals.css), so a
// fresh "Create Player" die reads as on-brand rather than an arbitrary hue.
export const DEFAULT_CUSTOM_COLOR = '#c44dff';

export function roleById(id: string | null | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id);
}

export function isRoleId(id: unknown): id is RoleId {
  return id === CUSTOM_ROLE_ID || ROLES.some((r) => r.id === id);
}

export function isFixedRoleId(id: unknown): id is Role['id'] {
  return ROLES.some((r) => r.id === id);
}
