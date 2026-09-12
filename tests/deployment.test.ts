import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfig } from '../scripts/cloudflare.mjs';

test('deployment refuses a missing/placeholder DB instead of deploying against the wrong database', () => {
  const template = 'name = "roller"\ndatabase_id = "00000000-0000-0000-0000-000000000000"\n';
  for (const id of [undefined, '', '00000000-0000-0000-0000-000000000000', 'bad"\nname = "other'])
    assert.throws(() => deploymentConfig(template, id));
  const id = '12345678-1234-1234-1234-123456789abc';
  assert.equal(deploymentConfig(template, id), `name = "roller"\ndatabase_id = "${id}"\n`);
});
