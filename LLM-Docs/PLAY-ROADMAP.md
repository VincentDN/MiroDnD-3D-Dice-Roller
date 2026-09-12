# Faster play roadmap

Approved direction: Vincent requested a task roadmap and implementation on 2026-09-12 after reviewing the feature recommendations. Base: main at `24dd5c4`. The earlier visual briefing in ROADMAP.md remains complete.

## Delivery sequence

Deliver one coherent, tested increment per PR. Keep browser and portable desktop behavior aligned. Preserve existing room history and local data. Cloudflare remains the only production host; PR builds validate candidate code, and main delivery publishes the EXE and web app. A successful build does not by itself prove production deployment.

### 1. Character action bars - implemented in PR #6

- [x] Introduce versioned character profiles containing ordered, named dice actions and optional reminders.
- [x] Migrate existing device presets into a default profile without deleting their original storage.
- [x] Use the same action bar in the browser room and interactive desktop overlay; viewer-only overlays remain viewers.
- [x] Create, rename and delete profiles; add, edit, reorder and remove actions. Confirm destructive profile deletion and offer action undo.
- [x] Import/export a portable JSON collection without room keys, credentials or history. Validate the entire file before appending; never replace existing actions silently.
- [x] Synchronize same-origin windows and make device-local storage limitations clear.
- [x] Verify migration, invalid imports, ordering, browser/desktop parity, mobile width and successful labelled rolls.

Acceptance: an existing user retains every valid preset, creates two character profiles, edits/reorders an action, exports/imports on another device and rolls the intended expression and label from either UI. Invalid imports do not change stored data. Profile selection does not impersonate another room player.

Validation: implementation `8d4df01` passed GitHub run [34717031318](https://github.com/VincentDN/MiroDnD-3D-Dice-Roller/actions/runs/34717031318): 27 web unit tests, 7 desktop tests, TypeScript, production build, local D1 API integration, all 3 browser tests, Windows portable build and actual EXE launch. Desktop/mobile screenshots inspected. The first increment is available in [PR #6](https://github.com/VincentDN/MiroDnD-3D-Dice-Roller/pull/6); it has not been merged or deployed. Later phases remain planned.

### 2. Linked attack and damage rolls

- [ ] Extend actions with optional attack expression and separately named damage groups/types.
- [ ] Group attack, damage and critical-damage records with explicit server-validated relationship IDs.
- [ ] Offer Damage / Critical damage after an attack; do not infer hits without target AC.
- [ ] Define standard critical behavior (double damage dice, not flat modifiers), including optional damage groups; show the full resulting expression.
- [ ] Preserve older presets, history and Markdown exports through schema migration.
- [ ] Test a normal hit, natural 20, advantage-discarded 20 and mixed damage types.

Acceptance: one saved weapon action produces a labelled attack followed by clearly linked damage; no automatic damage on a miss and no doubled flat bonus.

### 3. Temporary bonuses

- [ ] Add normal/advantage/disadvantage controls that preserve attack modifiers and work on saved d20 actions in both UIs.
- [ ] Add named Bless, Guidance and configurable Bardic Inspiration dice.
- [ ] Distinguish persistent effects and one-use effects; show a preview of the exact roll.
- [ ] Consume one-use bonuses only after a confirmed roll; preserve them after a failed request.
- [ ] Test effects against attacks, checks, saves, damage and unsupported dice pools; avoid silently applying a d20 rule to damage.

Acceptance: the displayed effect breakdown matches the recorded roll, and retrying a failed roll neither duplicates nor loses a bonus.

### 4. Connection resilience

- [ ] Surface connected/reconnecting/offline status, retry action and deployed build version.
- [ ] Design a locally bundled/cached roller for the EXE and browser, including first-launch limitations.
- [ ] Keep offline rolls explicitly local; define opt-in sharing as labelled offline records without claiming server verification.
- [ ] Test disconnect during a request, reconnect, duplicate prevention and stale assets.

Acceptance: a connection failure gives a useful recovery path and preserves actions. Offline practice never masquerades as a server-confirmed room roll.

### 5. DM-only rolls

- [ ] Introduce an authenticated room-owner/DM role with an explicit migration policy for existing rooms.
- [ ] Add Everyone / DM only visibility and optional explicit reveal.
- [ ] Enforce filtering on all API, polling, replay and export paths, not just the UI.
- [ ] Test another player's credentials and unauthenticated overlay access for hidden-roll leakage.

Acceptance: a non-DM cannot retrieve hidden values, expressions or physics payloads; revealing creates a deliberate public event.

### 6. Quick controls and animation preference

- [ ] Add scoped number shortcuts for actions and repeat-last, with discoverable hints.
- [ ] Ignore shortcuts in inputs, editors and dialogs, on key repeat, and while disconnected/busy.
- [ ] Offer full/fast/reduced-motion presentation while preserving authoritative dice results and replay ordering.
- [ ] Test simultaneous party rolls, keyboard focus and both display modes.

### 7. Session history

- [ ] Add named session boundaries and player/action filters without destroying earlier history.
- [ ] Export public party rolls and comments by session to Markdown.
- [ ] Specify comment ownership, persistence and DM-only exclusion.
- [ ] Test old rooms, pagination beyond the latest 100 rolls, reconnect and exports.

## Scope boundary

Keep this a lightweight companion to Miro. Full character sheets, encounter management and further cosmetic systems are deferred. Choose the next phase based on play feedback; prioritize a reproducible reliability issue ahead of feature work.
