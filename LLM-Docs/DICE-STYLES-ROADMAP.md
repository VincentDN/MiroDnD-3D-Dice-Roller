# Dice styles, result reveal and throw continuity

Approved 2026-09-13 in desktop task. Base main: 3fd7640. User then prioritized analysing the OBS recording `2026-09-13 14-54-37.mp4` and fixing the persistent apparent throw reset before resuming features. Keep this file current for Claude handoff. The earlier PLAY-ROADMAP is separate; its unfinished phases are not automatically complete.

## Ordered work

- [ ] Inspect recording, reproduce the reset, fix local/server throw continuity, add delayed-response regression.
- [ ] Per-action body and number colors; character-default inheritance, reset, live preview/test roll.
- [ ] Classic, dark, sparkly, gradient and metallic materials, sparkle color/intensity and second gradient color.
- [ ] Character defaults and named reusable styles; copy action appearance, import/export and old-data migration.
- [x] ~~Validate and snapshot appearance on server rolls, preserve history/rethrows and identity colors.~~ API integration passes; visual viewer parity is covered by the remaining browser acceptance.
- [ ] Optional attack and separately named damage groups with their own appearance; critical damage doubles dice only; linked records validated by server.
- [ ] Readable number suggestions, all seven die previews, reduced decorative effects, reduced motion and large-pool checks; unchanged physics.
- [ ] Settled-roll table pulse in player color, player/action label, math with discarded dice and large total; ordered fresh-roll reveals only, nonblocking two-second display, Full/Subtle/Off preferences.
- [ ] Browser/desktop/mobile verification, tests/typecheck/build and updated handoff.

## Status

Recording inspected at 2 fps, then 10 fps around 16 seconds. At 16.0–16.1 seconds the die jumps as the new rolling display appears. Code confirms local motion is discarded when the server acknowledges a new roll ID. The implementation now preserves that live Cannon world and elapsed steps for the matching release, and delays settled notification until final correction is visible. Delayed-response browser regression is pending.

All planned style/editor/reveal features and linked damage are implemented locally. Validation so far: 30 unit tests, 7 desktop tests, TypeScript and production build pass; local D1/API integration including appearance, critical math and cross-player isolation passes. Seven browser tests are running. Preview rendering now mounts only when opened; same-ID appearance refreshes retain the physics world. These last changes require a fresh final build. Nothing from this increment is pushed yet. Existing user deletion of the Word lock file must remain unstaged.

