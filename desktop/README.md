# Rollparty Desktop for Windows

Transparent, always-on-top 3D dice in the **lower-left quarter** of the selected monitor's usable area. Mouse input passes through the dice to Miro or any other app. No OBS setup is required.

## Run

1. Extract the entire Windows ZIP into a folder. Keep its files together.
2. Open `Rollparty.exe`.
3. Choose **Create a room / open roller**, or paste your party's Rollparty invite link and choose **Join**.
4. Create or join the room in the roller window. The desktop overlay follows that room automatically.
5. Roll, then return to Miro. New rolls from everyone in the room appear over your desktop.

Use **Monitor with Miro** if you have multiple screens. Only dice are shown by default; enable **Show recent roll results** to include the compact history. The window occupies half the monitor's usable width and height and leaves the taskbar clear. Closing the roller returns you to desktop controls. Closing the controls keeps the app in the Windows notification area; use **Quit** to exit.

Shortcuts (while Rollparty is running):

| Shortcut | Action |
| --- | --- |
| Ctrl+Shift+D | Show or hide the dice |
| Ctrl+Shift+R | Open the roller |
| Ctrl+Shift+O | Open desktop controls |

The notification-area menu provides the same actions if another app has claimed a shortcut. Controls report unavailable shortcuts. Reconnect reloads the overlay after a loading failure. Disconnecting a monitor moves the overlay back to the primary screen.

## What to expect

- Requires an internet connection to the existing Rollparty service. The desktop app shares the same server-generated results and room history as browsers and phones.
- The floating window is a viewer. Roll using the room window or your phone. It does not steal focus when another player rolls.
- The app displays virtual 3D dice; it does not capture physical dice through a camera. Rolls use the existing deterministic animation, not a rigid-body physics engine.
- Keep Miro in a normal or borderless window. Exclusive fullscreen applications and Windows secure-desktop prompts may cover overlays.
- Browser player credentials remain in the app's separate Chromium profile. On first use, join with your name and color; your normal browser's identity is not imported. Room links grant access to the party and are not written to an extra settings file.
- This build is unsigned. Native Windows transparency, input pass-through and GPU rendering must be checked on a Windows desktop before treating it as a tested release.

## Development and packaging

Node 24+ and npm:

```sh
cd desktop
npm ci
npm test
npm start
npm run package:win
```

The desktop package is independent of the web app's pnpm workspace. Packaging creates `release/Rollparty-win32-x64/`; distribute the whole folder as a ZIP. The host loads the existing published site and applies `overlay.css` to its OBS view inside the native quarter-screen window. No web deployment is needed for the desktop host.

Remote pages use a sandbox with Node integration disabled and no preload bridge. Only the packaged local control panel receives the narrow, sender-validated IPC bridge. Navigation is restricted to the Rollparty origin; popups, downloads and permission requests are denied. Closing or hiding the controls does not stop shared-room polling.

## Windows acceptance check

Open Miro and a room, roll from a second device, and confirm numbered dice appear in the lower-left quarter without raising the controls. Drag a Miro object through the dice and verify Miro receives the drag. Check Ctrl+Shift+D, monitor selection, monitor disconnection, reconnect, and Quit. These native checks cannot be proven by a cross-platform package build.
