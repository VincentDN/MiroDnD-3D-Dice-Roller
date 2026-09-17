// Shared room music state. The server never sees or stores actual audio -
// only an opaque track id (a relative filename each client resolves against
// its own locally-chosen folder) plus bookmarks that reference the same ids.
// Position/playing are relayed with a server-set timestamp so every client
// computes the same live position instead of trusting client clocks.
export const MAX_BOOKMARKS = 30;
const MAX_TRACK_ID = 300;
const MAX_NAME = 200;
const MAX_BOOKMARK_NAME = 60;
const MAX_POSITION = 24 * 3600; // seconds - generous ceiling, not a real limit

export type Bookmark = {
  id: string;
  name: string;
  trackId: string;
  trackName: string;
  position: number;
};
export type MusicState = {
  trackId: string | null;
  trackName: string;
  playing: boolean;
  position: number;
  shuffle: boolean;
  bookmarks: Bookmark[];
  updated: number;
};

export function defaultMusic(): MusicState {
  return {
    trackId: null,
    trackName: '',
    playing: false,
    position: 0,
    shuffle: false,
    bookmarks: [],
    updated: 0,
  };
}

function str(value: unknown, max: number, field: string, empty = true): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    throw Error(`${field} is invalid.`);
  return value;
}
function position(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_POSITION)
    throw Error('Invalid track position.');
  return value;
}
function bookmark(value: unknown): Bookmark {
  if (!value || typeof value !== 'object') throw Error('Invalid bookmark.');
  const b = value as Record<string, unknown>;
  return {
    id: str(b.id, 80, 'Bookmark id', false),
    name: str(b.name, MAX_BOOKMARK_NAME, 'Bookmark name', false),
    trackId: str(b.trackId, MAX_TRACK_ID, 'Bookmark track', false),
    trackName: str(b.trackName, MAX_NAME, 'Bookmark track name'),
    position: position(b.position),
  };
}
// `updated` is deliberately not accepted from the client - the server always
// stamps it itself, the same way roll `created` timestamps are server-set.
export function validateMusic(value: unknown): Omit<MusicState, 'updated'> {
  if (!value || typeof value !== 'object') throw Error('Invalid music state.');
  const v = value as Record<string, unknown>;
  if (v.trackId !== null && typeof v.trackId !== 'string')
    throw Error('Invalid track id.');
  if (typeof v.trackId === 'string' && v.trackId.length > MAX_TRACK_ID)
    throw Error('Invalid track id.');
  if (typeof v.playing !== 'boolean') throw Error('Invalid playing state.');
  if (typeof v.shuffle !== 'boolean') throw Error('Invalid shuffle state.');
  if (!Array.isArray(v.bookmarks) || v.bookmarks.length > MAX_BOOKMARKS)
    throw Error(`Use up to ${MAX_BOOKMARKS} bookmarks.`);
  return {
    trackId: v.trackId as string | null,
    trackName: str(v.trackName, MAX_NAME, 'Track name'),
    playing: v.playing,
    position: position(v.position),
    shuffle: v.shuffle,
    bookmarks: v.bookmarks.map(bookmark),
  };
}
export function readMusic(raw: string | null): MusicState {
  if (!raw) return defaultMusic();
  try {
    const parsed = JSON.parse(raw);
    return { ...validateMusic(parsed), updated: Number(parsed.updated) || 0 };
  } catch {
    return defaultMusic();
  }
}
// The live position a client should show/seek to right now, given the last
// broadcast state and the server clock skew is assumed negligible.
export function livePosition(music: MusicState, now = Date.now()): number {
  if (!music.playing) return music.position;
  return music.position + (now - music.updated) / 1000;
}
