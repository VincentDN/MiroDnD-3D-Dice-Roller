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
  { id: 'star-gods-hunger', name: "The Star God's Hunger", file: '/avatars/star-gods-hunger.png', color: '#c44dff' },
  { id: 'teddy', name: 'Teddy', file: '/avatars/teddy.png', color: '#d23b3b' },
  { id: 'saravi', name: 'Saravi', file: '/avatars/saravi.png', color: '#3fb6e0' },
  { id: 'tom-varn', name: 'Tom Varn', file: '/avatars/tom-varn.png', color: '#3fae5c' },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function avatarById(id: string | null | undefined): Avatar | undefined {
  return AVATARS.find((a) => a.id === id);
}

export function isAvatarId(id: unknown): id is string {
  return typeof id === 'string' && AVATARS.some((a) => a.id === id);
}
