# MiroDnD-3D-Dice-Roller
A screen overlay dice roller we use to play Dungeons and Dragons on Miro

## Play online

[Open VincentsVibeRoller](https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev), enter a name, pick your party role (sets your dice color and hotbar), and create a room. Use **Invite players** to share the room. Players need only the invite link and a browser.

- Numbered 3D d4, d6, d8, d10, d12, d20 and percentile dice.
- Mixed dice pools and modifiers: `2d6+1d4+3`.
- **QR (Quickroll)** below the normal Roll button prints the current roll directly, without animation or reveal delay - a distinct rolling-dice sound effect plays first, then the usual result cue. Results are generated on the server and shared in room history.
- Advantage: `2d20kh1+5`; disadvantage: `2d20kl1+5`.
- Ability scores: `4d6kh3`. Keep highest/lowest supports any pool.
- Up to 40 logical dice in one roll; d100 displays a tens and a units d10. 00 + 0 means 100.
- Per-player names and colors; persistent shared history (latest 100 rolls shown).
- Server-simulated rigid-body throws using cannon-es: gravity, convex dice collisions, friction and restitution determine the face values. Clients replay the seeded throw and settle to the authoritative physical poses. Drag settled dice to reposition them; a deliberate throw creates a new server-confirmed shared roll, preserving the earlier entry. These are simulated physical dice, not cryptographically uniform dice draws.
- Every client polls the shared D1 room about every 1.2 seconds, queues new animations, and reconnects automatically. This is near-real-time synchronization, not WebSockets.

## Transparent desktop window over Miro

**Cloning for testing?** Open [`portable/VincentsVibeRoller.exe`](portable/VincentsVibeRoller.exe) after cloning or pulling. The repository includes the latest verified portable Windows app, with no build tools or Git LFS required. Close the app before pulling updates. Successful main releases automatically refresh the EXE, checksum and build details in [`portable/`](portable/README.md).

**[Download the standalone Windows EXE](https://github.com/VincentDN/MiroDnD-3D-Dice-Roller/releases/latest/download/VincentsVibeRoller.exe)** - download and run, no installer, administrator rights or build tools needed. It is unsigned. Both the browser and EXE require an internet connection to the shared Cloudflare room service.

Every PR builds and launch-tests the EXE and tests the browser/Worker. Every merge to `main` publishes a new portable release and deploys the tested Cloudflare site once the repository's Cloudflare secrets are configured. See [automatic delivery and setup](docs/cloudflare-deploy.md).

The native Windows host is in [`desktop/`](desktop/README.md). It opens a transparent, always-on-top, interactive window initially in the **lower left** of your selected monitor. Drag its header to move it, or use its corner grip to resize it. Roll directly in the overlay. Dice use a fixed orthographic projection; their apparent size does not change while moving. The desktop tray has a purple backdrop, collision sounds, a result ping and a brass fanfare for a kept natural 20. Save named combinations directly in the overlay; presets and mute preference persist on this device. Create or join a room in the app, roll, then return to Miro. Everyone's new rolls appear over your desktop while receiving mouse input inside its own window. No OBS setup is required. See the desktop guide for packaging and the Windows acceptance check.

## Party roles and class hotbars

Instead of picking a raw color, each player picks a generic party role - **DM**, **Barbarian**, **Wizard**, **Cleric**, **Monk**, or **Create Player** (pick any dice color yourself) - and their dice color follows from that automatically, defined in `lib/roles.ts`. Picking a class role the first time also seeds a matching character hotbar (attacks, saves, checks) with a class-appropriate color/gradient, from `lib/role-presets.ts`; the DM instead gets a plain `d20+1`..`d20+5` / `d20-1`..`d20-5` modifier row. Re-picking the same role never re-seeds or overwrites your edits.

## Character actions

Both the browser room and Windows overlay offer a **Character actions** bar. Open **Manage actions** to save the current dice expression with a name and optional reminder, edit actions, drag the grip handle or use the up/down buttons to reorder them, or organize them into character profiles. Every hotbar button also carries a small pencil icon for a one-click jump straight to its editor. Click an action to roll it immediately with its name recorded in the shared history. Choosing a character profile does not change your room player identity.

Collections support up to 12 characters and 30 actions per character. Existing saved combinations are automatically copied into **My character**, with the old data retained as a backup. Actions are saved on this device and synchronize between windows of the same browser/app. Browser and Windows app storage are separate: use **Export characters** / **Import characters** to transfer your JSON collection. Imports add characters without replacing existing ones; malformed files are rejected. The file contains no room invitations, player credentials or roll history.

## Roll effects

The **Roll effects** panel gives every player a persistent Advantage/Normal/Disadvantage toggle plus named bonus-die effects (Bless, Guidance, Bardic Inspiration, or any custom one you add) that apply to any subsequent roll - the free-form form, Quickroll, or a saved action - until you turn them off. A **persistent** effect (Bless) stays active across rolls; a **one-use** effect (Guidance, Bardic Inspiration) turns itself off the moment it's spent on a successful roll, and never spends itself on a failed or retried request. Advantage/disadvantage only transforms a plain `1d20` roll - never a saved action already shaped like `2d20kh1+5`, and never a linked damage roll - and a live preview always shows the exact expression about to be rolled before you commit to it. Effects are saved on this device per room and character, like the roll notebook.

## DM soundboard

The DM role gets an extra **Soundboard** section next to the character actions: a handful of fun synthesized cues (drumroll, dramatic sting, applause, sad trombone, rimshot) to play at the table, defined alongside the rest of the dice audio in `lib/dice-audio.ts`. No external audio files - everything is generated with the Web Audio API, same as the existing dice and result sounds.

## Table music

The **Music** panel lets the DM point at a local folder of audio files (Chromium-based browsers only - Chrome, Edge, or this app's own desktop window), pick tracks, shuffle and save named bookmarks. The current track, position and shuffle state broadcast to the room the same way rolls do; anyone (DM or player) who separately points their own browser at a matching folder hears it in sync, computed from a server timestamp rather than trusting any client's clock. Players only ever get volume and mute - the server itself rejects a track/bookmark change from anyone whose stored role isn't `dm`. No audio is ever uploaded or stored server-side, only an opaque filename-derived track id.

## Hidden rolls

Check **Hide from party** next to Roll dice (or the eye icon in the desktop hotbar) to roll for only yourself and the DM - a secret Perception or Stealth check, say. A hidden roll never reaches another player's history, notebook or export at all - not a placeholder, the whole record - and an unauthenticated OBS/overlay spectator link never sees one either. Only the DM or the original roller can **Reveal** it, which is a deliberate, one-way action: once revealed, it's public for good.

See the [faster play roadmap](LLM-Docs/PLAY-ROADMAP.md) and the [grand roadmap](LLM-Docs/GRAND-ROADMAP.md) for what's next.

## Personal roll notebook

Open **My roll notes** in the console to comment on your own rolls and choose **Save Markdown** to export them. The latest 1,000 rolls are stored on this device for each room and player. Comments remain after reload; export a file to keep a lasting session record.

## OBS overlay

Inside a room, select **Overlay → Copy overlay link**. Add this URL as an OBS **Browser Source**, set the width and height to your canvas (e.g. 1920 × 1080), and place the source above your Miro capture. The background is transparent. Dice and console panels resize independently, with roll history in a bottom taskbar.

A regular browser window cannot be transparent and always-on-top over arbitrary desktop apps. OBS overlays appear in its composition/output. Use the desktop host above for dice on your own desktop. The host works over Miro without modifying Miro or installing a Miro integration.

The overlay is a viewer. Use the normal room page on your computer or phone to roll. Its taskbar shows recent rolls. Existing history appears on connection, while only new rolls animate.

## Room access and data

The site entry page is public. Room keys are 256-bit random capability tokens carried in URL fragments; the server stores their SHA-256 hashes. Anyone holding a room link can read its history and join. An overlay link carries the same room access, so treat it as an invite. There is no public room directory.

Player credentials are distinct random tokens stored only in the browser and hashed in D1. The server authenticates profile changes and rolls; retries reuse a request ID to avoid duplicate results. Player names are display names, not verified identities. Clearing browser storage loses your player credential; you can rejoin as a new player. Rooms and history persist until the deployment's database is removed; this version has no room deletion UI. The app is designed for small trusted parties (50 participants per room), not an untrusted public multiplayer service.

## Development

Requires Node 24+ and pnpm. Install with `pnpm install`, then run `pnpm dev`.
For the first local run, generate the build once with `pnpm build`, then apply every migration in `drizzle/`, in order, to the preview's database:

```sh
for f in drizzle/*.sql; do pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$f"; done
```

If your Wrangler resolves relative paths against its configuration directory, use an absolute project path for `--persist-to`. Adding a schema change later (`db/schema.ts` + `pnpm run db:generate`) adds a new numbered file to `drizzle/`; re-run the loop above (or just the new file) to apply it locally.

- `pnpm build`: Cloudflare Worker and browser assets.
- `pnpm exec tsc --noEmit`: type validation.
- `node --experimental-strip-types --test tests/dice.test.ts tests/geometry.test.ts tests/physics.test.ts tests/interaction.test.ts tests/notebook.test.ts`: dice rules and face geometry.
- `node tests/session.mjs`: integration test against the running local server. Creates an isolated test room, verifies two players observe identical results, retry deduplication, profile persistence, and access isolation.

Stack: React, Vinext, Three.js, Cloudflare Workers and D1. `vite.config.ts` configures local D1; `wrangler.deploy.toml` is the production template. OpenAI Sites is no longer needed for building or deployment. Schema migrations are in `drizzle/`. No application secrets are required in the source. Hosted credentials are managed outside Git.

To deploy your own copy to a different Cloudflare account/domain, see [`docs/cloudflare-deploy.md`](docs/cloudflare-deploy.md).

The optional WebMCP `roll_dice` tool is registered only after joining a room, feature-detected, and uses the same validated action as the UI.
