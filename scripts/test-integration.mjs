import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
const state = await mkdtemp(resolve(tmpdir(), 'vvr-d1-'));
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
function run(args, env = process.env) {
  return new Promise((yes, no) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env });
    child.on('error', no);
    child.on('exit', (code) => code === 0 ? yes() : no(new Error(`Command failed: ${args[0]} (${code})`)));
  });
}
let server;
try {
  await run([wrangler, 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.deploy.toml', '--persist-to', state]);
  server = spawn(process.execPath, [wrangler, 'dev', '--config', 'wrangler.deploy.toml', '--port', '8787', '--ip', '127.0.0.1', '--persist-to', state], { stdio: 'inherit' });
  let serverError;
  server.on('error', (error) => { serverError = error; });
  const origin = 'http://127.0.0.1:8787';
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error('Local Worker exited before readiness.');
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('Local Worker did not become ready.');
  const health = await fetch(`${origin}/api/health`);
  if (!health.ok || !(await health.json()).ok) throw new Error('Built Worker health/schema check failed.');
  const env = { ...process.env, TEST_ORIGIN: origin };
  await run(['tests/session.mjs'], env);
  if (process.argv.includes('--browser')) await run(['node_modules/@playwright/test/cli.js', 'test'], env);
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((r) => { server.once('exit', r); setTimeout(r, 5000).unref(); });
  }
  await rm(state, { recursive: true, force: true });
}
