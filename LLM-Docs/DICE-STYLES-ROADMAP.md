# Dice styles, result reveal and throw continuity

Approved 2026-09-13 in desktop task. Feature branch: `feature/dice-styles-and-throw-continuity`. Integrated Claudeâ€™s main update `25a0c0b` in branch merge `677f683`; that branch checkpoint left main unchanged; the 2026-09-14 follow-up below is now merged to main. User then prioritized analysing the OBS recording `2026-09-13 14-54-37.mp4` and fixing the persistent apparent throw reset before resuming features. Keep this file current for Claude handoff. The earlier PLAY-ROADMAP is separate; its unfinished phases are not automatically complete.

## Ordered work

- [x] ~~Inspect recording, reproduce the reset, fix local/server throw continuity, add delayed-response regression.~~
- [x] ~~Per-action body and number colors; character-default inheritance, reset, live preview/test roll.~~
- [x] ~~Classic, dark, sparkly, gradient and metallic materials, sparkle color/intensity and second gradient color.~~
- [x] ~~Character defaults and named reusable styles; copy action appearance, import/export and old-data migration.~~
- [x] ~~Validate and snapshot appearance on server rolls, preserve history/rethrows and identity colors.~~ API integration and browser/desktop viewer parity pass.
- [x] ~~Optional attack and separately named damage groups with their own appearance; critical damage doubles dice only; linked records validated by server.~~
- [x] ~~Readable number suggestions, all seven die previews, reduced decorative effects, reduced motion and large-pool checks; unchanged physics.~~
- [x] ~~Settled-roll table pulse in player color, player/action label, math with discarded dice and large total; ordered fresh-roll reveals only, nonblocking two-second display, Full/Subtle/Off preferences.~~
- [x] ~~Browser/desktop/mobile verification, tests/typecheck/build and updated handoff.~~

## Status

The recording was inspected at 2 fps, then 10 fps around 16 seconds. At 16.0â€“16.1 seconds the die jumps as the new rolling display appears. The server acknowledgement replaced the local live throw with a replay from release. The fix retains the live world and elapsed steps for matching releases and same-ID refreshes; settled notification follows final correction.

Regression control: temporarily disabling continuation produced a 55.7-pixel frame jump and failed the delayed-response browser test. The restored fix passes the same regression. Input spans rendered frames, and poll responses are held back so they cannot mask the delayed acknowledgement. This checks 24 displayed frames after the delayed response, rather than only checking the final total.

Implemented features retain Claudeâ€™s RPG HUD and independent button colors. TypeScript, 32 web unit tests, 7 desktop unit tests, production build and local D1/API checks pass. All nine browser tests pass across the full eight-test run and supplemental queue/maximum-pool test. Coverage includes Claudeâ€™s button-color import/export and HUD layout; style/linked-damage viewer parity; all seven previews and five materials; inheritance/reset/reusable styles; full/subtle/off reveal, discarded dice, reduced motion, history reload and queue order; mobile width; and eighty physical dice. Enlarged preview was rebuilt, retested and visually inspected. Desktop checks cover the overlay in Chromium and seven Electron unit tests; a fresh portable EXE was not built in this branch. This was the pre-merge validation checkpoint; all changes were merged and pushed to main on 2026-09-14. Keep the unrelated Word lock-file deletion unstaged.

## Desktop follow-up â€” completed 2026-09-14, v0.7.2

User authorized merging with Claudeâ€™s redesign and delivering to main, superseding the branch-only restriction above.

- [x] ~~Separate synced hotbar and table/console windows, preserving saved actions, dice styles and reveals.~~
- [x] ~~Restore native table click-through by default; add hotbar, controls, tray and keyboard toggles for table interaction.~~
- [x] ~~Handle paired visibility/reconnect, monitor bounds, renderer failure and single-window sound.~~
- [x] ~~Verify browser synchronization, native Windows click-through/focus and portable EXE launch; update usage instructions.~~

Verified locally: 32 web unit tests, 8 desktop tests, 10 browser tests, typecheck/build, real Electron native flag/toggle/roll checks, Windows portable packaging and EXE smoke test. Mainâ€™s release/deployment pipeline still needs its post-push result checked.

- [x] ~~Add small QR below Roll in browser and desktop; evaluate directly and publish shared results without animation/reveal delay.~~
