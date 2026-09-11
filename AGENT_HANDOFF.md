# Agent handoff plan — Settings, Installer, Cloudflare Pages

This file is the shared state for AI coding agents (Claude, ChatGPT/Codex, or
anyone else) working on this repo across sessions that can run out of
tokens/turns mid-task. If you are an agent picking this up: **read the
"Status" section first**, then the relevant workstream section, then get to
work. When you stop (finished a chunk, or about to run out of budget),
**update the Status section and commit+push before you end your turn.** The
git history and this file are the only handoff mechanism — there is no other
shared memory between agents or sessions.

## Ground rules for tag-teaming

1. **One branch, small commits.** Work happens on `feature/settings-installer-cf-pages`
   (created off `main`). Do not open a fresh branch per session — pull this
   one, keep going. Commit after every coherent, working chunk (a component,
   a passing test file, a config change) rather than batching everything into
   one giant commit. A half-done feature committed with passing tests is
   recoverable; a half-done feature sitting only in an agent's context window
   is lost the moment that session ends.
2. **Push before you stop.** `git push -u origin feature/settings-installer-cf-pages`
   after every commit (or at least before ending a session). If you ran out
   of budget mid-edit with a broken build, still commit with a message like
   `WIP: <what's broken>` so the next agent can `git diff` to see exactly
   where things were left, rather than re-deriving it.
3. **Update the Status section below** every time you finish or hand off a
   chunk of work: check off what's done, note what's in progress, note any
   decisions you made that the next agent needs to know about (e.g. "chose
   colors X/Y/Z for Drakkenheim theme because...").
4. **Keep `npm test` (root) and `npm test` (in `desktop/`) green** before
   handing off. If you must hand off with red tests, say so explicitly in
   Status — never leave it ambiguous.
5. **Don't re-architect what you don't need to.** This is an existing,
   working app (see Architecture below). Extend it; don't rewrite it.

## Architecture notes (read before touching code)

- This is a `vinext` (OpenAI "Sites") app: Next.js-app-router-shaped code
  (`app/page.tsx`, `app/layout.tsx`, `app/api/session/route.ts`) built by
  Vite + the `vinext` plugin, deployed as a Cloudflare Worker with a D1
  database binding. It is **not** a plain static site — `app/api/session`
  is a real server endpoint backed by D1 (rooms/players/rolls tables via
  Drizzle, see `db/schema.ts`, `drizzle/0000_slow_thunderball.sql`). Any
  "make it static" work means "deployable via Cloudflare Pages" (which
  supports a `_worker.js` / Pages Functions alongside static assets), not
  "remove the backend" — the shared multiplayer dice rolls need it.
- `app/page.tsx` is one large client component holding almost all web app
  state and UI (lobby, room, overlay, desktop-overlay variants all render
  from this one file via `overlay`/`desktop` URL flags). `app/globals.css`
  is one large hand-written stylesheet using mostly *hardcoded hex colors*,
  with only a handful of CSS custom properties defined in `:root` (see the
  `@theme inline` / `:root,.dark{--background:...}` block at the top).
- `lib/dice-audio.ts` is a hand-rolled WebAudio synth (no audio files) for
  impact/result sounds. Volume was previously fixed (`gain.value = .5`,
  binary mute via `setSoundEnabled`).
- `desktop/` is a **separate** Electron app (own `package.json`, not part of
  the pnpm workspace) that remote-loads the deployed web app
  (`desktop/config.cjs` → `SITE_ORIGIN`, currently hardcoded to
  `https://rollparty-dnd.vdn1561.chatgpt.site`). It has three trust tiers:
  - `desktop/controls.html` + `controls.js` + `preload.cjs`: the **local,
    trusted** control panel. Only this context gets a `contextBridge` API
    (`window.rollparty`) and only after `ipcMain.handle` validates the
    sender is this exact window (see `handle()` in `main.cjs`). Native
    filesystem/dialog access belongs here.
  - `overlay` window: loads the **remote but same-origin** site
    (`isRoomSite` validated) with a narrow `overlay-preload.cjs` bridge
    (currently: resize only). Extending this bridge is acceptable *only*
    for narrow, validated capabilities, since this is our own app code even
    though it's fetched remotely.
  - `room` window: loads the remote site with **no preload bridge at all**.
    Never add one here.
  - Packaging is currently `electron-packager` producing a raw folder/ZIP
    (`npm run package:win`), not a real installer — no NSIS/Inno Setup, no
    Start Menu shortcut, no uninstaller. `desktop/tests/*.test.cjs` mock the
    whole Electron API and load `main.cjs` via `vm.runInNewContext` — follow
    that pattern for new IPC handler tests.
- Rolls/presets/notes/sound-pref are all stored in **browser localStorage**,
  namespaced `rollparty:*` (see `PRESET_KEY` in `lib/dice-presets.ts`,
  `rollparty:sound`, `rollparty:notes:<room>:<player>` in
  `components/roll-notebook.tsx`). Follow this convention for new settings
  (`rollparty:settings` is used for the new Settings feature — see below).

## Workstream 1 — Settings (volume, saved roll path, 3 UI themes)

Goal: a Settings panel reachable from the header (gear icon next to the
existing mute button) with:

1. **Volume**: a slider (not just mute/unmute) plus a "Test" button that
   plays a sample cue at the current volume immediately, without needing to
   roll dice. Implementation: `lib/dice-audio.ts` gets a `setVolume(0..1)`
   export and a `testSound()` export (plays the "ping" result cue, bypassing
   the fresh-roll dedup in `ResultSounds`). Persist volume in
   `lib/settings.ts` under `rollparty:settings`.
2. **Saved roll path**: where roll-notebook Markdown exports go.
   - Web/browser build: browsers don't allow apps to pick an arbitrary save
     path for security reasons — the setting there is necessarily just
     informational (points at the browser's download folder/behavior).
   - Desktop (Electron) build: this is real. Add a "Roll notebook" section
     to `desktop/controls.html`/`controls.js` (the trusted local panel) with
     a folder picker (`dialog.showOpenDialog`, `properties:['openDirectory']`)
     and persist the chosen path (JSON file under `app.getPath('userData')`).
     Update the `will-download` handler in `main.cjs` so that when a path is
     configured, exports save there directly (`item.setSavePath(...)`)
     instead of showing an OS save dialog every time; keep the current
     save-dialog behavior as the fallback when nothing is configured.
   - Do **not** punch a filesystem-access hole into the remote web page or
     the overlay bridge for this — it belongs in the trusted local panel per
     the trust tiers above.
3. **3 UI themes**: `default` (existing dark purple/blue — keep as is),
   `drakkenheim`, `miro-light`, selectable in the Settings panel and
   persisted (`rollparty:settings`). Apply via a `data-theme` attribute on
   `<html>` (set in a small effect in `app/page.tsx` or a theme-init script
   in `app/layout.tsx` to avoid a flash of the wrong theme). Implementation
   approach: introduce semantic CSS custom properties for the *major*
   surfaces already visually dominant in `app/globals.css` (app/body
   background, header, primary button, dice tray gradient, the
   roller/party/history panel backgrounds+borders, inputs, footer, overlay
   console, toast/notice) and override them per `[data-theme=...]` block.
   You do not need to convert every single hardcoded hex in the file — cover
   what's actually visible so switching themes reads as a real reskin, not a
   tint.
   - **Drakkenheim** theme: inspired by the "Dungeons of Drakkenheim" actual
     -play setting's toxic-magic-corrupted ruined-city aesthetic — near-black
     grime, sickly/acid green as the accent (magical corruption), a muted
     blood-red as a secondary danger color, pale sickly-green-tinted text.
     This is a color-palette-level homage (mood/colors only) — do not copy
     or embed any actual Drakkenheim artwork/logos/handout images; there are
     none in this repo and none should be added.
   - **Miro Light** theme: light theme echoing Miro's own web app chrome —
     light neutral gray canvas background, white panel/card surfaces, Miro's
     blue as the primary accent, subtle light borders, dark (not pure black)
     body text. Again: palette/mood-level inspiration, not copied assets.

## Workstream 2 — Real Windows installer

`desktop/package.json`'s `package:win` only zips a folder via
`electron-packager` — no Start Menu entry, no uninstaller. Add
`electron-builder` with an NSIS target (`"target": "nsis"`, one-click or
assisted, your call — assisted (`oneClick: false`) is friendlier for a
family/friend-group app since it lets the user pick a folder + desktop
shortcut). Keep the existing `icon.ico`. Update `desktop/README.md`'s
"Development and packaging" section to document the new `npm run
package:installer` (or similar) script and what it produces
(`release/VincentsVibeRoller-Setup-<version>.exe` or similar). The build
stays unsigned (no code-signing cert available) — keep the README's existing
"this build is unsigned" caveat.

## Workstream 3 — Cloudflare Pages deploy path

Currently the app is wired to OpenAI's "Sites" hosting control plane
(`.openai/hosting.json`, `project_id`) and the desktop app hardcodes
`SITE_ORIGIN = 'https://rollparty-dnd.vdn1561.chatgpt.site'` in
`desktop/config.cjs`. The user wants to deploy this themselves to a Cloudflare
Pages project under their own dev domain, independent of that platform.

1. Make `SITE_ORIGIN` configurable instead of a hardcoded literal — e.g. read
   from an env var at Electron build/package time (baked into `config.cjs`
   via a small build step, or a `.env`-driven constant) with the current
   value as the default, so the desktop app can point at whatever domain the
   user actually deploys to.
2. Add a Cloudflare Pages deploy path: the Vite Cloudflare plugin already
   produces a Workers-shaped build (`dist/client` assets + `dist/server` /
   `_worker.js`-style output) — confirm the exact `vinext build` output
   layout and add a `pages:deploy` npm script using `wrangler pages deploy`
   pointing at the built assets directory, with the D1 binding (`DB`)
   configured for the Pages project (via `wrangler.toml` `[[d1_databases]]`
   under Pages config, or documented dashboard steps — Pages bindings are
   configured per-project, not purely from a committed file, so document
   the dashboard steps precisely).
3. Write clear, step-by-step deploy docs (README section or a new
   `docs/cloudflare-pages-deploy.md`): create the Pages project, create/point
   at a D1 database and run `drizzle/0000_slow_thunderball.sql`, set the `DB`
   binding, add a custom domain, and update `SITE_ORIGIN` for the desktop
   build to match. The user said "I'll deploy it" — your job is to make the
   repo deploy-ready and documented, not to run the actual deploy (no
   Cloudflare credentials are available to agents working on this repo).

## Status

_Update this section on every handoff. Newest entry at the top._

- **2026-09-11 (Claude):** All three workstreams implemented and pushed to
  this branch. Summary of what landed (see commit log for exact diffs):
  - **Workstream 1 (settings)**: `lib/settings.ts` (persisted
    theme+volume), `lib/dice-audio.ts` gained `setVolume()`/`testSound()`,
    `components/settings-panel.tsx` (gear button next to the mute toggle,
    both in the header and the desktop overlay), three themes wired via
    `[data-theme]` on `<html>` with semantic CSS custom properties in
    `app/globals.css` (default/drakkenheim/miro-light) and a flash-prevention
    inline script in `app/layout.tsx`. Desktop roll-notebook save folder:
    `desktop/main.cjs` (settings.json under userData, IPC handlers,
    `will-download` silent-save), `desktop/preload.cjs`, `desktop/controls
    .html`/`.js`. Verified in a real browser via Playwright (all 3 themes,
    mobile width, no console errors) and `node --test` (17/17 root, 4/4
    desktop at that point).
  - **Workstream 2 (installer)**: `desktop/package.json` `build` config +
    `electron-builder` devDependency + `package:installer` script (NSIS,
    assisted install, no admin rights, publish disabled). **Verified
    end-to-end**: actually built a real ~112MB NSIS installer .exe in this
    sandbox (had to `apt-get install wine64 wine32:i386` and symlink
    `/usr/bin/wine` to the 32-bit binary, since electron-builder's NSIS step
    needs to run a 32-bit Windows tool even for an unsigned build - that
    tooling is sandbox-local, not part of any commit; a real Windows machine
    or `windows-latest` CI runner needs none of it).
  - **Workstream 3 (Cloudflare)**: `wrangler.deploy.toml` (deliberately not
    `wrangler.toml` - see the comment at its top and
    `docs/cloudflare-deploy.md` for why: the plain filename collides with
    `@cloudflare/vite-plugin`'s auto-loaded base config and breaks local
    dev), `pnpm run deploy`, `pnpm run cf:d1:create`/`cf:d1:migrate`,
    `docs/cloudflare-deploy.md` (full walkthrough + the Workers-vs-Pages
    reasoning, sourced from Cloudflare's current docs via WebSearch, not
    assumed), `desktop/scripts/set-site-origin.cjs` (bakes a custom
    `SITE_ORIGIN` into the desktop build via `ROLLPARTY_SITE_ORIGIN` env
    var, no-op by default). Verified: `wrangler deploy --dry-run` resolves
    correctly against the new config, and confirmed local dev
    (`pnpm build && pnpm start`) still works after the rename fix.
  - **Not done / left for the user or a future agent**: nobody has actually
    run the Cloudflare deploy for real (needs the user's own Cloudflare
    account/credentials - out of scope for an agent to do unattended). The
    NSIS installer's *native* Windows behavior (install/uninstall/shortcuts)
    is unverified beyond "electron-builder produced a well-formed PE32 NSIS
    executable" - same caveat the existing `package:win` flow already
    carries per `desktop/README.md`'s Windows acceptance check section.
  - All tests green at hand-off: `node --test tests/*.test.ts` in the repo
    root (17/17) and `node --test tests/*.test.cjs` in `desktop/` (7/7).
    `pnpm run build` and `npx tsc --noEmit` both clean.
