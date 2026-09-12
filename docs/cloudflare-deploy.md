# Browser and Windows delivery

Production: https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev

The React/Vinext frontend and `/api/session` backend run together on **Cloudflare Workers with static assets and D1**. The browser loads that app directly. The portable Windows executable adds the transparent overlay, tray controls and notebook folder picker around the same hosted app. Both require an internet connection. Shared room results remain server-authoritative.

## Automatic delivery

`.github/workflows/build-desktop.yml` runs for **every PR update** and **every push to main**, without path filters:

1. Test dice rules, physics, settings and deployment config; typecheck and build the Worker.
2. Migrate an isolated local D1 database and test multiplayer APIs plus actual browser/desktop-overlay rendering.
3. Build a single Windows x64 portable EXE on Windows, launch that actual executable to verify its packaged controls load, and upload it with a SHA-256 checksum.
4. On main only, publish a unique GitHub Release from those tested artifacts, migrate the existing production database, deploy the tested web artifact and check the live lobby/API.

A PR has a downloadable `VincentsVibeRoller-Windows` workflow artifact. GitHub wraps artifacts in a ZIP; extract it once and run the EXE. It connects to production; the PR's web code is tested against isolated local D1. PR code never receives production credentials. **Merging the PR publishes the executable and updates the live site automatically.** Unmerged PRs do not replace production. Manual workflow runs publish only when run on main.

The stable download is:
https://github.com/VincentDN/MiroDnD-3D-Dice-Roller/releases/latest/download/VincentsVibeRoller.exe

Each release tag includes the workflow run number, so web-only merges also produce a traceable fresh EXE. Re-running the same workflow replaces only that run's assets. Production runs are serialized; a newer merge cannot cancel an in-progress migration/deploy.

## One-time GitHub configuration

In the repository, **Settings → Secrets and variables → Actions**, add:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare API token restricted to the production account, with Workers Scripts Edit and D1 Edit permissions |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Production Cloudflare account ID |
| Variable, optional | `CLOUDFLARE_DATABASE_ID` | Existing production D1 database UUID |

When the database variable is absent, the deploy script reads the existing Worker's `DB` binding through the Cloudflare API. It fails clearly if that binding cannot be resolved. It **never creates or replaces a production database**. The generated `wrangler.runtime.toml` is ignored by Git. The all-zero ID in `wrangler.deploy.toml` is a template, not a deployable production ID.

The workflow requests `contents: write` only for its release job. It needs Actions enabled. For enforced merge checks, select **Browser and Worker** and **Portable Windows EXE** in the repository's branch rules. If Cloudflare Workers Builds is also connected to this repo, disable its production auto-deploy to avoid two independent pipelines racing.

Cloudflare credentials must be configured before the first successful automatic web deployment. Missing credentials fail the deploy job with a precise message; they are never silently skipped. The verified EXE release can already exist if the subsequent Cloudflare step fails. Fix the configuration and rerun failed jobs.

## Local development and tests

Node 24+, pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
pnpm exec playwright install chromium
node scripts/test-integration.mjs --browser
```

The integration runner creates a temporary local database, applies every migration, starts the built Worker, tests the session API and browser modes, then stops the Worker. It never uses remote D1.

For interactive development, run `pnpm dev`. Local bindings are defined in `vite.config.ts`; apply migrations to its local database as documented in the root README. OpenAI Sites is no longer a build dependency or deployment target.

## Manual production deployment

Set the account/API-token variables above in your shell, then:

```sh
pnpm run deploy
```

This builds, resolves the existing production database, applies outstanding migrations and deploys. With an interactive `wrangler login` instead of an API token, provide `CLOUDFLARE_DATABASE_ID` explicitly. `pnpm run cf:d1:migrate` applies only the schema. `pnpm run deploy:built` deploys an already-tested `dist/` artifact, as CI does.

The config deliberately uses `wrangler.deploy.toml` rather than `wrangler.toml`, avoiding auto-discovery conflicts with the Vite Cloudflare plugin's local DB binding. Do not deploy through OpenAI Sites.

For another Cloudflare deployment, change the Worker name and provide its existing database ID. Package a matching portable EXE with `ROLLPARTY_SITE_ORIGIN=https://your-worker.example npm run package:portable` inside `desktop/`. The override affects the packaged copy only; tracked source is unchanged.
