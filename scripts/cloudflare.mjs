import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function deploymentConfig(template, id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '') || /^0+-0+-0+-0+-0+$/.test(id))
    throw new Error('A real Cloudflare D1 database ID is required. Set CLOUDFLARE_DATABASE_ID or allow discovery of the live DB binding.');
  if (!/^database_id\s*=\s*"[^"]+"/m.test(template)) throw new Error('Missing D1 database_id in deployment template.');
  return template.replace(/^database_id\s*=\s*"[^"]+"/m, `database_id = "${id}"`);
}

async function prepare() {
  const template = await readFile('wrangler.deploy.toml', 'utf8');
  let id = process.env.CLOUDFLARE_DATABASE_ID;
  if (!id) {
    const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
    if (!token || !account) throw new Error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in GitHub Actions secrets (or CLOUDFLARE_DATABASE_ID for local Wrangler login).');
    if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('Invalid CLOUDFLARE_ACCOUNT_ID.');
    const worker = template.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${encodeURIComponent(worker)}/settings`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Cannot read existing Worker bindings (HTTP ${response.status}). Check Worker access or set CLOUDFLARE_DATABASE_ID.`);
    const data = await response.json();
    id = data.result?.bindings?.find((binding) => binding.type === 'd1' && binding.name === 'DB')?.id;
  }
  await writeFile('wrangler.runtime.toml', deploymentConfig(template, id));
  console.log('Deployment config ready using the existing D1 database.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepare().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
