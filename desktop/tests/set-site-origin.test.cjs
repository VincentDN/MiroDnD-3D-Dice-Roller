const { test } = require('node:test');
const assert = require('node:assert/strict');
const { updateSiteOrigin } = require('../scripts/set-site-origin.cjs');

const sample = "const SITE_ORIGIN = 'https://rollparty-dnd.vdn1561.chatgpt.site';\n\nfunction isRoomSite(raw) {\n";

test('swaps only the SITE_ORIGIN constant for a valid https origin', () => {
  const next = updateSiteOrigin(sample, 'https://dice.example.com');
  assert.match(next, /^const SITE_ORIGIN = 'https:\/\/dice\.example\.com';$/m);
  assert.equal(next.slice(next.indexOf('\n')), sample.slice(sample.indexOf('\n')));
});
test('rejects origins with a path, trailing slash, or wrong protocol', () => {
  for (const bad of ['http://dice.example.com', 'https://dice.example.com/', 'https://dice.example.com/room', 'not-a-url', ''])
    assert.throws(() => updateSiteOrigin(sample, bad));
});
test('fails loudly instead of silently no-op-ing when the constant cannot be found', () => {
  assert.throws(() => updateSiteOrigin('no such constant here', 'https://dice.example.com'));
});
