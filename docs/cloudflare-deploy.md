# Deploying to your own Cloudflare account

This app is currently hosted through OpenAI's "Sites" control plane
(`.openai/hosting.json`, the `project_id` in that file). This doc covers
deploying it independently, to your own Cloudflare account and domain.

## Why Workers, not "Pages"

The app isn't a static site - `app/api/session/route.ts` is a real server
endpoint backed by a Cloudflare D1 database (room/player/roll state), so
whatever hosts it needs to run that server code, not just serve files.
Cloudflare's own current guidance is to use **Workers with static assets**
for exactly this shape of app (a static frontend plus some dynamic routes,
backed by D1) rather than the older, separate Pages product - Pages still
works and isn't going away, but Cloudflare has said new investment and
features go to Workers. `pnpm run build` already produces a
Workers-with-assets build (see `dist/server/wrangler.json` after building:
it has a `main` worker script, an `assets` directory, and a `d1_databases`
binding - the same shape this repo's own `wrangler.deploy.toml` uses), so this is
also the least-friction path: no build-output restructuring needed.

If you specifically want the Pages *product* (e.g. for its git-push preview
deployments in the dashboard), the Advanced Mode docs are here:
https://developers.cloudflare.com/pages/functions/advanced-mode/ - you'd
copy `dist/server/index.js` into `dist/client/_worker.js` after building and
run `wrangler pages deploy dist/client` instead of the steps below. That
path isn't set up in this repo because Workers-with-assets is simpler and is
what Cloudflare recommends for this app's shape.

## One-time setup

```sh
pnpm install
wrangler login          # opens a browser to authorize this CLI against your Cloudflare account
pnpm run cf:d1:create   # creates a D1 database named "vincentsviberoller"
```

`cf:d1:create` prints a `database_id`. Put it in `wrangler.deploy.toml` at the repo
root, replacing the `00000000-...` placeholder under `[[d1_databases]]`.

Apply the schema to that new (empty) database:

```sh
pnpm run cf:d1:migrate
```

That's `wrangler d1 migrations apply`, which tracks what's already applied in
a `d1_migrations` bookkeeping table it creates on your database, so it's
safe to re-run any time - it only applies whatever's new in `drizzle/`
(currently the rooms/players/rolls tables, plus the `avatar` column added
since). After a schema change (`db/schema.ts` + `pnpm run db:generate`),
just re-run `pnpm run cf:d1:migrate`.

## Build and deploy

```sh
pnpm run deploy
```

This runs `vinext build` then `wrangler deploy --config wrangler.deploy.toml`.
It's not named plain `wrangler.toml` on purpose: the local dev build
(`pnpm dev`/`pnpm build`/`pnpm start`, via `@cloudflare/vite-plugin` in
`vite.config.ts`) auto-loads a root `wrangler.toml` as a base config and
would merge its own D1 binding on top, duplicating the `DB` binding and
breaking local dev - so the deploy config lives under a different filename
and is only used when explicitly passed with `--config`. Wrangler prints a
`*.workers.dev` URL when it finishes - open it to confirm the lobby loads
and you can create a room.

## Attaching your dev domain

You need the domain (or a subdomain of one) added to your Cloudflare
account first (Cloudflare dashboard → **Add a domain**, or use a subdomain
of a zone you already manage there). Then either:

- **Dashboard**: Workers & Pages → your worker (`vincentsviberoller`) →
  **Settings → Domains & Routes → Add → Custom domain**, or
- **wrangler.deploy.toml**: uncomment the `[[routes]]` block at the bottom of the
  file, set `pattern` to your domain, and re-run `pnpm run deploy`.

Either way, Cloudflare provisions the certificate automatically - no manual
DNS/TLS steps beyond having the domain on your account.

## Pointing the desktop app at it

`desktop/config.cjs` hardcodes `SITE_ORIGIN` to the current OpenAI-hosted
domain. Building the desktop app against your own deployment instead:

```sh
cd desktop
ROLLPARTY_SITE_ORIGIN=https://your-domain.example npm run package:installer
```

`scripts/set-site-origin.cjs` rewrites `config.cjs`'s `SITE_ORIGIN` constant
before packaging when that env var is set (no-op, so the default build is
unaffected, if you leave it unset). It edits `desktop/config.cjs` on disk;
`git checkout desktop/config.cjs` afterwards if you don't want to commit
that change, or commit it if this *is* your project's new permanent domain.

## Local development against your own database

`pnpm run dev` / `pnpm run start` still use `.openai/hosting.json` and a
local D1 binding for development regardless of this doc - that's unrelated
to the deploy path above and doesn't need to change for local work.
