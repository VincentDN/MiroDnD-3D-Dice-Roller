const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { SITE_ORIGIN } = require('../config.cjs');
const dir = mkdtempSync(path.join(tmpdir(), 'vvr-portable-'));
const report = path.join(dir, 'launch.json');
const executable = path.resolve(__dirname, '../release/VincentsVibeRoller.exe');
const child = spawn(executable, ['--disable-gpu', `--smoke-test=${report}`], {
  env: { ...process.env, VVR_SMOKE_TEST: '1' }, stdio: 'inherit',
});
const timeout = setTimeout(() => {
  console.error('Portable executable did not finish its launch check within 120s.');
  spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  process.exitCode = 1;
}, 120000);
child.on('error', (error) => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('exit', (code) => {
  clearTimeout(timeout);
  try {
    assert.equal(code, 0, 'Portable launcher exit status');
    assert.deepEqual(JSON.parse(readFileSync(report, 'utf8')), { ok: true, siteOrigin: process.env.ROLLPARTY_SITE_ORIGIN || SITE_ORIGIN });
    console.log('PASS: actual portable EXE launches Electron and loads the packaged controls.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { rmSync(dir, { recursive: true, force: true }); }
});
