# Current handoff - character action bars (2026-09-12)

- User requested a task roadmap and implementation. See `LLM-Docs/PLAY-ROADMAP.md` for the seven ordered phases and acceptance criteria. First increment: character action bars on `feature/character-action-bars`, based on `24dd5c4`.
- Shared component now serves the browser room and interactive desktop overlay. Supports profiles, editing, ordering, reminders, removal undo, confirmed profile deletion, import/export and same-origin window synchronization.
- New `rollparty:actions:v1` data is strictly validated. Existing `rollparty:presets:v1` data migrates once and is retained as a backup. Export contains action profiles only. Imports append with fresh IDs. Room identity and backend are unchanged. Desktop download handling permits only the exact character JSON filename/MIME from same-origin blobs, with a save dialog; the notebook folder behavior is preserved.
- Validated implementation `8d4df01` in GitHub run 34717031318: 27 web unit tests, 7 desktop tests, TypeScript, production build, local D1 integration, 3 browser tests, Windows portable build and actual EXE launch all passed. New source files also pass targeted lint. Browser/desktop/mobile screenshots inspected. Local Wrangler remains blocked by `uv_interface_addresses`; CI provided integration coverage. PR #6 is ready for review, not merged or deployed.
- This is the first feature increment; attack/damage links and temporary effects remain next in the roadmap. Cloudflare production has not been updated by this branch.

---

# Current handoff — feature briefing (2026-09-12)

- Delivered to `main` at `c11565d`, based on `82c19f5`.
- Read `LLM-Docs/ROADMAP.md` for the user's new Word briefing and checked-off work. All embedded mockups were inspected.
- Implemented full-container canvas/camera/interaction walls, stored validated physics bounds, larger practice d20 with actual settled-face console, exact Drakkenheim copy, smaller main dice and player-colored Last Roll label. Old rolls retain their recorded scale and physics.
- New rolls use sender viewport aspect; replays retain recorded walls while running and expand to the viewer's viewport for subsequent interaction. Throw requests carry the interaction bounds so releases outside the old central box remain valid.
- Validation: 23 web unit tests, 7 desktop unit tests, TypeScript, production build, local D1 multiplayer/API integration, and 2 Chromium browser tests pass. Browser tests exercise practice dragging and button rolling, desktop/browser settings sync, and full-height trays at desktop/mobile sizes. Screenshots inspected; mobile header overflow fixed.
- User explicitly authorized pushing to main; upload succeeded on 2026-09-12. Production deployment is not yet verified. Original Word document preserved; unrelated user deletion of the Word lock file left unstaged.

---

# Previous handoff - portable EXE and Cloudflare delivery (2026-09-12)

This section supersedes the historical installer/feature-branch instructions below.

- Active work: `portable-cloudflare-delivery`, based on latest main `0bb9d5d`.
- Desktop v0.7.0 is a single Windows x64 **portable EXE**, built with
  `cd desktop && npm run package:portable`. No installer target remains.
  It loads the same Cloudflare app as browsers; internet is required.
- `.github/workflows/build-desktop.yml` validates every PR/update (web unit tests,
  typecheck, production Worker build, isolated local D1 integration, browser and
  desktop-overlay tests; Windows portable build plus actual EXE launch check).
  Every main push releases the tested EXE and deploys the tested web assets.
  Production runs serialize; PRs cannot publish or access Cloudflare secrets.
- Production setup: repository Actions secrets `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID`. Optional variable `CLOUDFLARE_DATABASE_ID`, otherwise
  discovered from the existing live Worker's DB binding. Never recreate D1.
  `scripts/cloudflare.mjs` writes ignored `wrangler.runtime.toml` and refuses
  unresolved/all-zero database IDs. See `docs/cloudflare-deploy.md`.
- Hosting remains **Cloudflare only**. `pnpm run deploy` now builds, resolves DB,
  migrates and deploys. OpenAI Sites plugin and hosting-config build dependency
  removed; local D1 is declared directly in `vite.config.ts`.
- Shared UI: roll-history views extracted, settings synchronize across open
  windows, desktop grid reserves space for controls/presets, native stylesheet
  handles transparency only, history toggle targets current roll taskbar.
- Portable custom-origin builds modify only packaged files, not tracked source.
- Validation: 21 web unit tests, 7 desktop tests, typecheck and production
  Worker build pass. GitHub run 34678895473 passed the full local-D1 API
  integration, browser/desktop-overlay rendering and cross-window theme tests,
  plus the actual Windows portable EXE launch/preload check. The local sandbox
  cannot launch Wrangler dev or download Chromium; CI supplies those gates.
- PR #5: https://github.com/VincentDN/MiroDnD-3D-Dice-Roller/pull/5.
  Cloudflare credentials are unavailable in the agent session; the first main
  workflow will verify whether repository Actions secrets are configured.
  Check its deploy job before claiming the live site was updated.

---

## Historical context (superseded where the current handoff differs)

# Agent handoff plan — Settings, Installer, Cloudflare Pages

This file is the shared state for AI coding agents (Claude, ChatGPT/Codex, or
anyone else) working on this repo across sessions that can run out of
tokens/turns mid-task. If you are an agent picking this up: **read the
"Status" section first**, then the relevant workstream section, then get to
work. When you stop (finished a chunk, or about to run out of budget),
**update the Status section and commit+push before you end your turn.** The
git history and this file are the only handoff mechanism — there is no other
shared memory between agents or sessions.

## ⚠️ Deployment: Cloudflare only — do NOT use the OpenAI Sites "publish" action

This project was originally built and hosted via OpenAI's own "Sites"
publish workflow (`.openai/hosting.json` still exists in the repo from that
era). **That is no longer how this app is deployed, as of 2026-09-11.** The
live production site is a Cloudflare Worker the user deployed and controls
themselves:

- **Production URL**: `https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev`
- **Deploy path**: `pnpm run deploy` (runs `vinext build` then
  `wrangler deploy --config wrangler.deploy.toml`) — see
  `docs/cloudflare-deploy.md` for the full walkthrough, including D1
  migrations via `pnpm run cf:d1:migrate`.
- The desktop Electron app is a thin shell that remote-loads whatever URL
  `desktop/config.cjs`'s `SITE_ORIGIN` points at — currently the Cloudflare
  URL above. It does **not** bundle web code, so merging/pushing to `main`
  alone never updates what users actually see; only an actual
  `pnpm run deploy` (which needs the user's own Cloudflare credentials —
  agents cannot run it unattended) does that.

**If you are ChatGPT/Codex (or any agent with a built-in "publish this
site" / OpenAI Sites action available): do not invoke it for this repo.**
Publishing via OpenAI Sites would (a) deploy to a domain nobody uses or
tests anymore, and (b) has already caused real confusion once — see the
2026-09-11 "third session" Status entry below, where a merged bugfix
appeared not to work because the live site was still on the old OpenAI
Sites domain. The `.openai/hosting.json` file and `vinext`/`@openai/
sites-vite-plugin` build tooling are kept only because they're part of how
the app is *built* locally (dev server, `vinext build`) — they are not the
deploy target. Point people who ask "how do I make my changes live" at
`pnpm run deploy` / `docs/cloudflare-deploy.md`, never at a Sites publish
button.

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

- This is a `vinext` (OpenAI "Sites" **build tooling** — not hosting; see the
  callout above) app: Next.js-app-router-shaped code (`app/page.tsx`,
  `app/layout.tsx`, `app/api/session/route.ts`) built by Vite + the `vinext`
  plugin, deployed as a Cloudflare Worker with a D1 database binding. It is
  **not** a plain static site — `app/api/session`
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
  (`desktop/config.cjs` → `SITE_ORIGIN`, currently hardcoded to the live
  Cloudflare deployment, `https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev` -
  this used to point at an OpenAI Sites-hosted domain; that's no longer
  used, see docs/cloudflare-deploy.md). It has three trust tiers:
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

_Done as of 2026-09-11 — the live site now runs on Cloudflare
(`https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev`), OpenAI Sites
is no longer used for production, and `desktop/config.cjs`'s `SITE_ORIGIN`
points there by default. Left below verbatim as the original plan/rationale;
see the Status section above for the current state._

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

- **2026-09-11 (Claude, fourth session):** Docs-only pass: added the
  "⚠️ Deployment: Cloudflare only" callout near the top of this file (right
  after the intro, before Ground rules) so it's impossible to miss on a
  cold read — explicitly tells any agent, ChatGPT/Codex's built-in OpenAI
  Sites "publish" action included, not to use that action for this repo.
  Also tightened the Architecture-notes line that called this "a `vinext`
  (OpenAI Sites) app" to clarify that refers to *build tooling* only, and
  reworded `desktop/README.md`'s "existing published site" /
  "matching web update" phrasing (the exact ambiguous wording that
  contributed to the deployment-gap confusion in the entry below) to
  explicitly name the Cloudflare deploy path and `pnpm run deploy`.

- **2026-09-11 (Claude, third session):** Two things happened:
  1. Merged everything from the feature branch into `main` and pushed. Added
     `.github/workflows/build-desktop.yml`: a windows-latest CI job that
     builds the NSIS installer and publishes it to a GitHub Release
     (`desktop-v<version>`, currently 0.6.0) on every push to `main` that
     touches `desktop/`. Verified the release + `.exe` actually exist
     (112MB, correct name) via the GitHub API after the run completed.
  2. **Important finding**: the user reported the dice-physics restart bug
     ("still present in 0.6.0") even after the fix above was merged. Root
     cause turned out to be a **deployment gap, not a code bug**: the
     desktop app doesn't bundle the web code - it's a thin Electron shell
     that loads the *live hosted site* (`desktop/config.cjs`'s
     `SITE_ORIGIN`). That was still pointed at the old OpenAI Sites-hosted
     domain, and merging to `main` on GitHub never redeploys that (it's a
     separate, manual "web publication" step on OpenAI's platform that this
     repo has no automation for - see an earlier PR description in this
     repo's own history: "Requires the matching web publication..."). So
     "testing the browser" and "testing the .exe" were both exercising
     stale, pre-fix code the whole time, regardless of what was merged here.
     The user has since deployed their own copy to Cloudflare
     (`https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev`, via the
     `pnpm run deploy` path from Workstream 3) and asked to make that the
     app's native default, replacing OpenAI Sites entirely. Updated:
     `desktop/config.cjs` (`SITE_ORIGIN`), `wrangler.deploy.toml` (`name`),
     `README.md`, `docs/cloudflare-deploy.md`, and the desktop tests that
     referenced the old domain.
  - **Open item for whoever picks this up next**: the physics "dice reset
    mid-air and re-roll" bug needs to be **re-verified against this new
    live deployment** (which now actually contains the `roll?.id`-keying
    fix from the previous session) before concluding whether it's actually
    fixed or whether a second mechanism is still at play. Don't assume it's
    fixed just because the fix is merged - confirm against whatever site
    `desktop/config.cjs`'s `SITE_ORIGIN` currently points at, live, first.

- **2026-09-11 (Claude, follow-up session):** The original three workstreams
  below are done and merged into this branch's history. This session did
  additional feature/bugfix work requested after that, also on this same
  branch:
  - **Icon-based dice color**: replaced the raw dice-color swatch picker
    with an icon picker (`lib/avatars.ts`, `components/avatar.tsx`) - the
    dice color is now derived from the chosen icon everywhere, including
    server-side (`app/api/session/route.ts` derives color from `avatar` and
    ignores a mismatched client-sent color). Only 3 icons exist right now
    (Arcane Scion / Ringmaster / Warborn) and render as themed icon-badge
    fallbacks since no portrait art files exist yet - drop real PNGs at the
    exact paths named in `public/avatars/README.md` to upgrade them, no
    code changes needed. Added a nullable `avatar` column
    (`drizzle/0001_blue_zzzax.sql`).
  - **Fixed a dice-physics bug**: the animation could restart mid-roll
    (dice reset to mid-air and re-rolled) because `components/dice-stage.tsx`'s
    effect was keyed on the whole `roll` object rather than `roll?.id`, so
    any same-id-but-different-reference roll object retriggered a full
    replay. Also fixed `last.current` (poll cursor) only being updated
    inside `poll()`, which caused an every-roll redundant re-fetch of the
    roll just submitted. See the commit for the full reasoning chain and
    how it was investigated (could not get a hard deterministic repro
    locally, but the object-identity-churn fix is correct regardless of
    the exact trigger, per React's own guidance on effect dependencies).
  - **Physics performance**: `sleepTimeLimit` on dice bodies (`lib/dice-physics.ts`)
    was 0.4s (24 frames of dead time after a die visibly stops, on every
    single die, every roll) - cut to 0.15s. Measured directly: worst case
    (40d20) dropped from ~433ms/610 steps to ~234ms/210 steps of server
    compute, small rolls unaffected (already ~30ms). If dice ever start
    looking less "settled" before the result locks in, this is the knob to
    revisit.
  - **Overlay mode is now 3 resizable panels**: dice table / console /
    saved-rolls-as-a-bottom-taskbar, replacing the old single fixed corner
    block. See `components/resizable-panel.tsx` (`ResizablePanel` for the
    two floating panels via native CSS `resize`, `ResizableTaskbar` for the
    bottom bar via a custom drag grip since native resize can't grow from a
    top edge). Position is fixed per panel; only sizing is interactive -
    free dragging/repositioning was not requested and isn't implemented.
  - All verified: `node --test` 20/20 (root) + 7/7 (desktop), `tsc --noEmit`
    clean, `pnpm run build` clean, live Playwright checks (screenshots,
    console-error capture) for the icon picker, both overlay variants, and
    repeated/rapid rolling.

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

