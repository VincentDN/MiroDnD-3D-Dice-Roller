import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATARS, DEFAULT_AVATAR_ID, avatarById, isAvatarId } from '../lib/avatars.ts';

test('every avatar has a unique id, a distinct color, and a public file path', () => {
  assert(AVATARS.length >= 1);
  assert.equal(new Set(AVATARS.map((a) => a.id)).size, AVATARS.length);
  assert.equal(new Set(AVATARS.map((a) => a.color)).size, AVATARS.length);
  for (const a of AVATARS) assert.match(a.file, /^\/avatars\/[a-z0-9-]+\.png$/);
});
test('avatarById finds a known avatar and rejects everything else', () => {
  assert.equal(avatarById(DEFAULT_AVATAR_ID), AVATARS[0]);
  assert.equal(avatarById('not-a-real-avatar'), undefined);
  assert.equal(avatarById(null), undefined);
  assert.equal(avatarById(undefined), undefined);
});
test('isAvatarId is a safe type guard for untrusted input', () => {
  assert.equal(isAvatarId(DEFAULT_AVATAR_ID), true);
  for (const bad of ['nope', '', 123, null, undefined, {}, ['arcane-scion']]) assert.equal(isAvatarId(bad), false);
});
