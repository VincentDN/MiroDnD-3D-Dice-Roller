// Read-only production health check: no fake rooms or rolls in the live database.
import { createRequire } from 'node:module';
const { SITE_ORIGIN } = createRequire(import.meta.url)('../desktop/config.cjs');
for (let attempt = 0; attempt < 10; attempt++) {
  try {
    const page = await fetch(SITE_ORIGIN, { signal: AbortSignal.timeout(10000) });
    if (!page.ok || !(await page.text()).includes('VincentsVibeRoller')) throw new Error('Lobby unavailable');
    const response = await fetch(`${SITE_ORIGIN}/api/health`, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Production database/schema unavailable');
    if (process.env.GITHUB_SHA && data.revision !== process.env.GITHUB_SHA) throw new Error('Production is still serving a different revision');
    console.log(`PASS: ${SITE_ORIGIN} lobby and room API respond.`);
    process.exit(0);
  } catch (error) {
    if (attempt === 9) throw error;
    await new Promise((r) => setTimeout(r, 3000));
  }
}
