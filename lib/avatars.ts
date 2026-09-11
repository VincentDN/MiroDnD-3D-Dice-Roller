export type Avatar = {
  id: string;
  name: string;
  /** Public path to the portrait. Missing/broken files fall back to an icon badge - see components/avatar.tsx. */
  file: string;
  color: string;
};

// Drop the real portrait files in public/avatars/ using these exact names and
// they replace the icon-badge fallback automatically - no code change needed.
// Server-safe: no UI imports here (this is also used by app/api/session/route.ts).
export const AVATARS: Avatar[] = [
  { id: 'arcane-scion', name: 'Arcane Scion', file: '/avatars/arcane-scion.png', color: '#3fb6e0' },
  { id: 'ringmaster', name: 'Ringmaster', file: '/avatars/ringmaster.png', color: '#d23b3b' },
  { id: 'warborn', name: 'Warborn', file: '/avatars/warborn.png', color: '#e8ac3a' },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function avatarById(id: string | null | undefined): Avatar | undefined {
  return AVATARS.find((a) => a.id === id);
}

export function isAvatarId(id: unknown): id is string {
  return typeof id === 'string' && AVATARS.some((a) => a.id === id);
}
