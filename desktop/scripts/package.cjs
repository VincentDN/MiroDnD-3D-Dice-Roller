const { build, Platform, Arch } = require('electron-builder');
const fs = require('node:fs/promises');
const path = require('node:path');
const { updateSiteOrigin } = require('./set-site-origin.cjs');

// Configure the packaged copy, never mutate tracked source while building.
build({
  targets: Platform.WINDOWS.createTarget(['portable'], Arch.x64),
  publish: 'never',
  config: {
    asar: false,
    afterPack: async ({ appOutDir }) => {
      const origin = process.env.ROLLPARTY_SITE_ORIGIN;
      if (!origin) return;
      const file = path.join(appOutDir, 'resources', 'app', 'config.cjs');
      await fs.writeFile(file, updateSiteOrigin(await fs.readFile(file, 'utf8'), origin));
    },
  },
}).catch((error) => { console.error(error); process.exitCode = 1; });
