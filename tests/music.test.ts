import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultMusic, validateMusic, readMusic, livePosition, MAX_BOOKMARKS } from '../lib/music.ts';

function valid() {
  return {
    trackId: 'tavern.mp3',
    trackName: 'tavern',
    playing: true,
    position: 12.5,
    shuffle: false,
    bookmarks: [],
  };
}

test('defaultMusic has no track and is not playing', () => {
  assert.deepEqual(defaultMusic(), {
    trackId: null,
    trackName: '',
    playing: false,
    position: 0,
    shuffle: false,
    bookmarks: [],
    updated: 0,
  });
});

test('validateMusic accepts a well-formed state and strips any client-sent updated timestamp', () => {
  const result = validateMusic({ ...valid(), updated: 999 });
  assert.deepEqual(result, valid());
  assert.equal((result as any).updated, undefined);
});

test('validateMusic accepts a null trackId (no track selected)', () => {
  assert.equal(validateMusic({ ...valid(), trackId: null }).trackId, null);
});

test('validateMusic rejects malformed input', () => {
  for (const bad of [
    null,
    undefined,
    'nope',
    { ...valid(), trackId: 123 },
    { ...valid(), trackId: 'x'.repeat(301) },
    { ...valid(), playing: 'yes' },
    { ...valid(), shuffle: 1 },
    { ...valid(), position: -1 },
    { ...valid(), position: Infinity },
    { ...valid(), position: 'soon' },
    { ...valid(), bookmarks: 'nope' },
    { ...valid(), bookmarks: Array(MAX_BOOKMARKS + 1).fill({}) },
  ])
    assert.throws(() => validateMusic(bad));
});

test('validateMusic validates every bookmark field, including required non-empty id/name/trackId', () => {
  const bookmark = { id: 'b1', name: 'Ambush', trackId: 'battle.mp3', trackName: 'battle', position: 4 };
  assert.deepEqual(validateMusic({ ...valid(), bookmarks: [bookmark] }).bookmarks, [bookmark]);
  for (const bad of [
    { ...bookmark, id: '' },
    { ...bookmark, name: '' },
    { ...bookmark, trackId: '' },
    { ...bookmark, position: -1 },
    { ...bookmark, name: 'x'.repeat(61) },
  ])
    assert.throws(() => validateMusic({ ...valid(), bookmarks: [bad] }));
});

test('readMusic falls back to defaults for missing/corrupt/invalid stored state, and round-trips valid state', () => {
  assert.deepEqual(readMusic(null), defaultMusic());
  assert.deepEqual(readMusic('{not json'), defaultMusic());
  assert.deepEqual(readMusic(JSON.stringify({ ...valid(), playing: 'nope' })), defaultMusic());
  const stored = { ...valid(), updated: 12345 };
  assert.deepEqual(readMusic(JSON.stringify(stored)), stored);
});

test('livePosition holds still while paused and advances with server clock while playing', () => {
  const paused = { ...defaultMusic(), trackId: 't', playing: false, position: 30, updated: 1000 };
  assert.equal(livePosition(paused, 50000), 30);
  const playing = { ...defaultMusic(), trackId: 't', playing: true, position: 30, updated: 1000 };
  assert.equal(livePosition(playing, 1000), 30);
  assert.equal(livePosition(playing, 6000), 35);
});
