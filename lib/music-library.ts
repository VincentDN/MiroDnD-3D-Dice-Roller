'use client';
// Local-only: resolves a player's own chosen folder of audio files against
// the room's shared "now playing" state (lib/music.ts). The folder itself,
// and its file listing, never leave this device - only the currently
// selected track's filename/display name and any bookmarks are shared.
export type Track = { id: string; name: string; handle: FileSystemFileHandle };

const DB_NAME = 'rollparty-music';
const STORE = 'handles';
const KEY = 'folder';
const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|flac|opus|aac)$/i;

export function supported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFolder(handle: FileSystemDirectoryHandle) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSavedFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    try {
      return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  } catch {
    // IndexedDB is optional convenience (remembering the folder across
    // reloads) - never block picking/playing music if it's unavailable.
    return null;
  }
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ id: 'rollparty-music', mode: 'read' });
  await saveFolder(handle).catch(() => {});
  return handle;
}

export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'read' } as const;
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  try {
    return (await handle.requestPermission(opts)) === 'granted';
  } catch {
    return false;
  }
}

export async function listTracks(handle: FileSystemDirectoryHandle): Promise<Track[]> {
  const tracks: Track[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && AUDIO_EXT.test(entry.name))
      tracks.push({
        id: entry.name,
        name: entry.name.replace(AUDIO_EXT, ''),
        handle: entry as FileSystemFileHandle,
      });
  }
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}
