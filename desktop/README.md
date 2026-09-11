# VincentsVibeRoller Desktop for Windows

Transparent, always-on-top physics dice in a compact, interactive window starting at the lower left. Drag its header to move it and the lower-right grip to resize it. The window receives mouse input; click outside it to use Miro. No OBS setup is required.

## Run

1. Extract the entire Windows ZIP into a folder. Keep its files together.
2. Open `VincentsVibeRoller.exe`.
3. Choose **Create a room / open roller**, or paste your party's VincentsVibeRoller invite link and choose **Join**.
4. Create or join the room in the roller window. The desktop overlay follows that room automatically.
5. Roll directly using the floating window’s dice buttons and notation box. Drag settled dice with your mouse. New rolls from everyone in the room appear in the same window.

Use **Monitor with Miro** if you have multiple screens. Recent roll results are shown by default; disable **Show recent roll results** to hide the compact history. The window starts at up to 680 × 760 logical pixels and can be moved and resized. The dice tray has a purple backdrop and fixed camera framing: dragging no longer changes apparent scale. Closing the roller returns you to desktop controls. Closing the controls keeps the app in the Windows notification area; use **Quit** to exit.

Shortcuts (while VincentsVibeRoller is running):

| Shortcut | Action |
| --- | --- |
| Ctrl+Shift+D | Show or hide the dice |
| Ctrl+Shift+R | Open the roller |
| Ctrl+Shift+O | Open desktop controls |

The notification-area menu provides the same actions if another app has claimed a shortcut. Controls report unavailable shortcuts. Reconnect reloads the overlay after a loading failure. Disconnecting a monitor moves the overlay back to the primary screen.

## Sounds and saved combinations

Use the speaker button to mute or enable sounds. Soft wooden clunks follow physical collisions; a warm two-note chime confirms ordinary rolls and an original synthesized brass fanfare celebrates a kept natural 20. Browser audio starts after your first interaction. The desktop host allows playback automatically and mutes the separate room window while the overlay is visible to avoid duplicate sounds.

Enter a dice expression, type a name in **Save this combination as…**, then select the bookmark button. Click a saved combination to roll it; use its X to remove it. Presets are saved on this device and shared between the desktop app's windows, not across computers. Up to 30 combinations are supported. The console prints player, expression, individual values and a boxed total.

## What to expect

- Requires an internet connection to the existing VincentsVibeRoller service. The desktop app shares the same server-generated results and room history as browsers and phones.
- Roll directly in the floating window, in the room window, or on your phone. New remote rolls do not steal focus.
- The app displays virtual 3D dice; it does not capture physical dice through a camera. Throws use cannon-es rigid-body physics, and their outcomes are recorded by the server. Gentle dragging repositions dice locally. Throw firmly to create a new recorded roll for the party; earlier history remains intact.
- Keep Miro in a normal or borderless window. Exclusive fullscreen applications and Windows secure-desktop prompts may cover overlays.
- Browser player credentials remain in the app's separate Chromium profile. On first use, join with your name and color; your normal browser's identity is not imported. Room links grant access to the party and are not written to an extra settings file.
- This build is unsigned. Native Windows transparency, dragging, resizing and GPU rendering must be checked on a Windows desktop before treating it as a tested release.

## Development and packaging

Node 24+ and npm:

```sh
cd desktop
npm ci
npm test
npm start
npm run package:win        # portable folder/ZIP (electron-packager)
npm run package:installer  # real Windows installer (electron-builder + NSIS)
```

The desktop package is independent of the web app's pnpm workspace. `package:win` creates `release/VincentsVibeRoller-win32-x64/`; distribute the whole folder as a ZIP - no Start Menu entry or uninstaller. `package:installer` creates `release/VincentsVibeRoller Setup <version>.exe`, an NSIS installer with a Start Menu entry, optional desktop shortcut and an uninstaller registered in Windows' "Add or remove programs"; it lets the user pick the install folder (assisted install, not one-click) and does not require admin rights (`perMachine: false`, per-user install). The host loads whatever site `config.cjs`'s `SITE_ORIGIN` points at (the live Cloudflare Worker deployment by default - see `../docs/cloudflare-deploy.md`, **not** an OpenAI Sites publish) and applies `overlay.css` to its OBS view inside the native interactive window. Version 0.5.1 requires the matching web deploy for softer audio, larger dice, single-pass roll animations and Markdown notes. Version 0.6.0 adds the Settings panel (volume, theme, roll-notebook save folder), icon-based dice color, the resizable three-panel overlay layout, and the physics/latency fixes - all require the matching web deploy, i.e. someone has actually run `pnpm run deploy` from the repo root against the live worker; merging to `main` alone does not update it.

Remote pages use a sandbox with Node integration disabled. The overlay receives a restricted resize bridge; the room window has no preload bridge. The packaged local control panel receives a narrow, sender-validated controls bridge. Navigation is restricted to the VincentsVibeRoller origin; popups and permission requests are denied. Downloads are limited to generated Markdown roll notebooks. Closing or hiding the controls does not stop shared-room polling.

## Windows acceptance check

Open Miro and a room, roll from a second device, and confirm numbered dice appear without raising the controls. Roll directly in the overlay, drag dice, move the header, resize the corner grip, and verify mouse input stays in the overlay when the pointer is inside it. Check Ctrl+Shift+D, monitor selection, monitor disconnection, reconnect, and Quit. These native checks cannot be proven by a cross-platform package build.

The v0.5 overlay creates dice at twice the physical size, with matching collision shapes. Large combinations expand the tray to keep all dice visible. Pressing Roll immediately shows a rolling indicator while the server calculates the shared result. Each result animates once; queued animations advance when the dice actually finish, not on a wall-clock timer.

## Roll notebook

Open **My roll notes** in the roll console to add a comment to any of your own rolls. The latest 1,000 are saved on this device for the room and player. **Save Markdown** exports the rolls, individual values, totals, timestamps and comments as a `.md` file.

By default the Windows app opens a save dialog for each export. Set a default folder in **Desktop controls → Roll notebook save folder → Choose folder…** to save silently there instead; **Use default** switches back to asking every time. The choice is stored in `settings.json` under the app's user-data folder (`%APPDATA%\VincentsVibeRoller` once packaged) and is independent of any room. Save a file periodically for a lasting session record.
