// Pure helper used when packaging a custom deployment.
function updateSiteOrigin(source, origin) {
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) {
    throw new Error('ROLLPARTY_SITE_ORIGIN must look like https://your-domain.example (no path, no trailing slash).');
  }
  const next = source.replace(/^const SITE_ORIGIN = '.*';$/m, `const SITE_ORIGIN = '${origin}';`);
  if (!/^const SITE_ORIGIN = '.*';$/m.test(source)) throw new Error('Could not find SITE_ORIGIN in config.cjs to update.');
  return next;
}

module.exports = { updateSiteOrigin };
