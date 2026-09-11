import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '../lib/settings.ts';

test('settings round-trip through storage and fall back to defaults when corrupt', () => {
  assert.deepEqual(readSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(readSettings('not-json'), DEFAULT_SETTINGS);
  assert.deepEqual(readSettings(JSON.stringify({ version: 2, theme: 'drakkenheim' })), DEFAULT_SETTINGS);
  const saved = { theme: 'drakkenheim' as const, volume: 0.4 };
  assert.deepEqual(readSettings(writeSettings(saved)), saved);
});
test('settings clamp volume and reject unknown themes rather than throwing', () => {
  assert.equal(readSettings(JSON.stringify({ version: 1, theme: 'evil', volume: 5 })).theme, 'default');
  assert.equal(readSettings(JSON.stringify({ version: 1, theme: 'miro-light', volume: 5 })).volume, 1);
  assert.equal(readSettings(JSON.stringify({ version: 1, theme: 'default', volume: -5 })).volume, 0);
  assert.equal(readSettings(JSON.stringify({ version: 1, theme: 'default', volume: 'loud' })).volume, DEFAULT_SETTINGS.volume);
});
