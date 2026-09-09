# MiroDnD-3D-Dice-Roller
A screen overlay dice roller we use to play Dungeons and Dragons on Miro

## Play online

[Open Rollparty](https://rollparty-dnd.vdn1561.chatgpt.site), enter a name, choose a dice color, and create a room. Use **Invite players** to share the room. Players need only the invite link and a browser.

- Numbered 3D d4, d6, d8, d10, d12, d20 and percentile dice.
- Mixed dice pools and modifiers: `2d6+1d4+3`.
- Advantage: `2d20kh1+5`; disadvantage: `2d20kl1+5`.
- Ability scores: `4d6kh3`. Keep highest/lowest supports any pool.
- Up to 40 logical dice in one roll; d100 displays a tens and a units d10. 00 + 0 means 100.
- Per-player names and colors; persistent shared history (latest 100 rolls shown).
- Server-generated results using cryptographic rejection sampling. The 3D animation settles the matching numbered face upward. This is a deterministic visual roll, not a rigid-body physics simulation.
- Every client polls the shared D1 room about every 1.2 seconds, queues new animations, and reconnects automatically. This is near-real-time synchronization, not WebSockets.

## Transparent desktop window over Miro

The native Windows host is in [`desktop/`](desktop/README.md). It opens a transparent, always-on-top, click-through window in the **lower-left quarter** of your selected monitor. Create or join a room in the app, roll, then return to Miro. Everyone's new rolls appear over your desktop without blocking mouse input. No OBS setup is required. See the desktop guide for packaging and the Windows acceptance check.

## OBS overlay

Inside a room, select **Overlay → Copy overlay link**. Add this URL as an OBS **Browser Source**, set the width and height to your canvas (e.g. 1920 × 1080), and place the source above your Miro capture. The background is transparent; the dice and compact console are anchored to the bottom right.

A regular browser window cannot be transparent and always-on-top over arbitrary desktop apps. OBS overlays appear in its composition/output. Use the desktop host above for dice on your own desktop. The host works over Miro without modifying Miro or installing a Miro integration.

The overlay is a viewer. Use the normal room page on your computer or phone to roll. Its console shows the three newest rolls. Existing history appears on connection, while only new rolls animate.

## Room access and data

The site entry page is public. Room keys are 256-bit random capability tokens carried in URL fragments; the server stores their SHA-256 hashes. Anyone holding a room link can read its history and join. An overlay link carries the same room access, so treat it as an invite. There is no public room directory.

Player credentials are distinct random tokens stored only in the browser and hashed in D1. The server authenticates profile changes and rolls; retries reuse a request ID to avoid duplicate results. Player names are display names, not verified identities. Clearing browser storage loses your player credential; you can rejoin as a new player. Rooms and history persist until the deployment's database is removed; this version has no room deletion UI. The app is designed for small trusted parties (50 participants per room), not an untrusted public multiplayer service.

## Development

Requires Node 24+ and pnpm. Install with `pnpm install`, then run `pnpm dev`.
For the first local run, generate the build once with `pnpm build`, then apply the migration to the preview's database:

```sh
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_slow_thunderball.sql
```

If your Wrangler resolves relative paths against its configuration directory, use an absolute project path for `--persist-to`.

- `pnpm build`: Cloudflare Worker and browser assets.
- `pnpm exec tsc --noEmit`: type validation.
- `node --experimental-strip-types --test tests/dice.test.ts tests/geometry.test.ts`: dice rules and face geometry.
- `node tests/session.mjs`: integration test against the running local server. Creates an isolated test room, verifies two players observe identical results, retry deduplication, profile persistence, and access isolation.

Stack: React, Vinext, Three.js, Cloudflare Workers and D1. The logical Sites binding is in `.openai/hosting.json`; schema migrations are in `drizzle/`. No application secrets are required in the source. Hosted credentials are managed outside Git.

The optional WebMCP `roll_dice` tool is registered only after joining a room, feature-detected, and uses the same validated action as the UI.
