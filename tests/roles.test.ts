import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, CUSTOM_ROLE_ID, DEFAULT_ROLE_ID, roleById, isRoleId, isFixedRoleId } from '../lib/roles.ts';

test('every fixed role has a unique id and a distinct color', () => {
  assert(ROLES.length >= 1);
  assert.equal(new Set(ROLES.map((r) => r.id)).size, ROLES.length);
  assert.equal(new Set(ROLES.map((r) => r.color)).size, ROLES.length);
});
test('roleById finds a known fixed role and rejects everything else, including custom', () => {
  assert.equal(roleById('dm'), ROLES[0]);
  assert.equal(roleById(CUSTOM_ROLE_ID), undefined);
  assert.equal(roleById('not-a-real-role'), undefined);
  assert.equal(roleById(null), undefined);
});
test('isRoleId accepts fixed roles and the custom sentinel; isFixedRoleId rejects custom', () => {
  assert.equal(isRoleId('barbarian'), true);
  assert.equal(isRoleId(CUSTOM_ROLE_ID), true);
  assert.equal(isRoleId(DEFAULT_ROLE_ID), true);
  for (const bad of ['nope', '', 123, null, undefined, {}, ['dm']]) assert.equal(isRoleId(bad), false);
  assert.equal(isFixedRoleId('wizard'), true);
  assert.equal(isFixedRoleId(CUSTOM_ROLE_ID), false);
});
