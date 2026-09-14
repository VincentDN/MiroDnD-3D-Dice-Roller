# VincentsVibeRoller Desktop for Windows

Two synced, independently movable windows: a clickable hotbar and a dice table with console. The table passes mouse clicks through to Miro by default. No OBS setup is required.

## Run

1. Download the new **v0.7.2** `VincentsVibeRoller.exe` from GitHub Releases. The split windows require the updated EXE.
2. Launch it and create or join a room using the controls or an invite link.
3. Roll from the **hotbar**. The **table** shows shared dice, results and history. Both windows use the same character actions and preferences.
4. To drag dice, move/resize the table or scroll its console, choose **Interact with table** on the hotbar. Choose **Lock table / click through** afterward to use Miro underneath again. The hotbar stays clickable.

Move each window by its header and resize from its lower-right corner. The table starts above the hotbar at the lower left of your selected monitor. **Monitor with Miro** places both windows; **Show dice over other apps** shows/hides both. The history setting controls only the table's console log. Reconnect reloads both windows. Closing the controls keeps the app running in the notification area.

| Shortcut | Action |
| --- | --- |
| Ctrl+Shift+D | Show or hide both floating windows |
| Ctrl+Shift+T | Toggle table interaction / click-through |
| Ctrl+Shift+R | Open the full roller |
| Ctrl+Shift+O | Open desktop controls |

The notification-area menu provides the same actions if a shortcut is unavailable. Monitor removal keeps both windows within the remaining monitor's work area.

## Sounds and saved combinations

Use the speaker button to mute or enable sounds. Soft wooden clunks follow physical collisions; a warm two-note chime confirms ordinary rolls and an original synthesized brass fanfare celebrates a kept natural 20. Browser audio starts after your first interaction. The desktop host allows playback automatically and mutes the room window while the table is visible; the hotbar is always muted to avoid duplicate sounds.

Enter a dice expression, type a name in **Save this combination as…**, then select the bookmark button. Click a saved combination to roll it; use its X to remove it. Presets are saved on this device and shared between the desktop app's windows, not across computers. Up to 30 combinations are supported. The console prints player, expression, individual values and a boxed total.

## What to expect

- Requires an internet connection to the existing VincentsVibeRoller service. The desktop app shares the same server-generated results and room history as browsers and phones.
- Roll directly in the floating window, in the room window, or on your phone. New remote rolls do not steal focus.
- The app displays virtual 3D dice; it does not capture physical dice through a camera. Throws use cannon-es rigid-body physics, and their outcomes are recorded by the server. Gentle dragging repositions dice locally. Throw firmly to create a new recorded roll for the party; earlier history remains intact.
- Keep Miro in a normal or borderless window. Exclusive fullscreen applications and Windows secure-desktop prompts may cover overlays.
- Browser player credentials remain in the app's separate Chromium profile. On first use, join with your name and icon; your normal browser's identity is not imported. Room links grant access to the party and are not written to an extra settings file.
- This build is unsigned. Native Windows transparency, dragging, resizing and GPU rendering must be checked on a Windows desktop before treating it as a tested release.

## Development and packaging

Node 24+ and npm:

```sh
cd desktop
npm ci
npm test
npm start
npm run package:portable  # release/VincentsVibeRoller.exe, Windows x64
npm run test:portable     # Windows-only launch test of that actual EXE
```

`package:win` is an alias for the portable build. There is no installer target. Electron Builder bundles the runtime into a single portable EXE, which extracts its runtime to a temporary directory on launch. It creates no Start Menu entries or uninstaller and requires no admin rights. Preferences and player identity remain in the normal per-user app-data folder, surviving replacement of the EXE. It does not provide offline rooms.

Version 0.7.0 uses the same Cloudflare-hosted web app as browser players. Native code handles only the overlay window, tray/monitor controls and notebook folder access. UI layout, themes, physics and room logic are shared. A new web deployment is picked up on reload/reconnect; updates to native host code require downloading the latest EXE.

CI builds and launches the actual portable executable on every PR. After merge, it publishes that verified file and updates Cloudflare. See [delivery setup](../docs/cloudflare-deploy.md). Packaging `ROLLPARTY_SITE_ORIGIN` overrides are baked into the packaged copy without editing source files.

Remote pages use a sandbox with Node integration disabled. Both floating windows receive a restricted resize bridge; only the hotbar can toggle table interaction through a host-owned button. No general Electron API is exposed to the remote page; the room window has no preload bridge. The packaged local control panel receives a narrow, sender-validated controls bridge. Navigation is restricted to the VincentsVibeRoller origin; popups and permission requests are denied. Downloads are limited to generated Markdown roll notebooks. Closing or hiding the controls does not stop shared-room polling.

## Windows acceptance check

Open Miro and a room, roll from a second device, and confirm numbered dice appear without raising the controls. Roll directly in the overlay, drag dice, move the header, resize the corner grip, and verify Interact with table enables mouse input, then Lock table lets clicks reach Miro underneath while the hotbar remains clickable. Check Ctrl+Shift+D, monitor selection, monitor disconnection, reconnect, and Quit. These native checks cannot be proven by a cross-platform package build.

The v0.5 overlay creates dice at twice the physical size, with matching collision shapes. Large combinations expand the tray to keep all dice visible. Pressing Roll immediately shows a rolling indicator while the server calculates the shared result. Each result animates once; queued animations advance when the dice actually finish, not on a wall-clock timer.

## Roll notebook

Open **My roll notes** in the roll console to add a comment to any of your own rolls. The latest 1,000 are saved on this device for the room and player. **Save Markdown** exports the rolls, individual values, totals, timestamps and comments as a `.md` file.

By default the Windows app opens a save dialog for each export. Set a default folder in **Desktop controls → Roll notebook save folder → Choose folder…** to save silently there instead; **Use default** switches back to asking every time. The choice is stored in `settings.json` under the app's user-data folder (`%APPDATA%\VincentsVibeRoller` once packaged) and is independent of any room. Save a file periodically for a lasting session record.
