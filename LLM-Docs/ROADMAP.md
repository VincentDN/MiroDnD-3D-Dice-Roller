# Dice Roller briefing — implementation and handoff

Source: `DiceRoller-FeatureRoadMap-AgentBriefing.docx`, including all four embedded images (the EMF mockup was rendered for inspection). Base: main at `82c19f5`, verified against origin on 2026-09-12.

## Plan

1. Align camera, canvas and physical walls with the full visible tray. Store custom table bounds with each roll for deterministic server/client replay; validate incoming dimensions and preserve old history. Resize interaction walls without restarting an active roll.
2. Enlarge the intro d20 and add a small local log of actual settled physics results, with a roll button and drag/throw support.
3. Apply the exact campaign title, subtitle and accent line from the briefing.
4. Reduce shared dice to the mockup proportions; replace the tray label with `Last Roll: [PlayerName]` in the player's accent color.
5. Verify physics/replay, responsive browser UI, types, build and desktop tests. Push the completed roadmap and implementation to GitHub with completed items struck through.

## Tasks

- [ ] Full-container intro and main-table physics.
- [ ] Larger intro die and local roll console.
- [ ] Title: DnD Sundays 2026: Dungeons of Drakkenheim
- [ ] Subtitle: It’s just another day, just another job... in the DUNGEONS OF DRAKKENHEIM!
- [ ] Accent: SIX – SIX – SIX – THE STAR GODS HUNGER – SIX – SIX -SIX
- [ ] Smaller shared-table dice matching the reference.
- [ ] Last Roll label with player accent color.
- [ ] Validation and GitHub delivery.

## Status

Plan recorded before implementation. Original Word briefing is preserved. User's existing deletion of the Word lock file is unrelated and must not be included in commits. Hosting remains Cloudflare only.
