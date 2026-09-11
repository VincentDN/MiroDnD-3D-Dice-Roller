// Bakes a custom site origin into config.cjs before packaging, so the
// desktop app can point at your own Cloudflare deployment instead of the
// OpenAI-hosted default. No-op unless ROLLPARTY_SITE_ORIGIN is set, so the
// default `npm run package:win` / `package:installer` behavior is unchanged.
//
//   ROLLPARTY_SITE_ORIGIN=https://dice.example.com npm run package:installer
//
// This edits desktop/config.cjs on disk. `git diff desktop/config.cjs` after
// a custom build; `git checkout desktop/config.cjs` to revert it.
const fs = require('node:fs');
const path = require('node:path');

function updateSiteOrigin(source, origin) {
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) {
    throw new Error('ROLLPARTY_SITE_ORIGIN must look like https://your-domain.example (no path, no trailing slash).');
  }
  const next = source.replace(/^const SITE_ORIGIN = '.*';$/m, `const SITE_ORIGIN = '${origin}';`);
  if (next === source) throw new Error('Could not find SITE_ORIGIN in config.cjs to update.');
  return next;
}

function main() {
  const origin = process.env.ROLLPARTY_SITE_ORIGIN;
  if (!origin) return; // Nothing to do: keep the committed default.
  const target = path.join(__dirname, '..', 'config.cjs');
  fs.writeFileSync(target, updateSiteOrigin(fs.readFileSync(target, 'utf8'), origin));
  console.log(`desktop/config.cjs SITE_ORIGIN set to ${origin}`);
}

if (require.main === module) main();
module.exports = { updateSiteOrigin };
