# Party roles, class hotbars, DM tools and roll audio (2026-09-17)

User request, verbatim intent:

1. Remove the player tokens and "Dungeons of Drakkenheim" identifiers from the
   code. Replace the icon/portrait picker with generic party roles: **DM**,
   **Barbarian**, **Wizard**, **Cleric**, **Monk**, and **Create Player**
   (choose your own dice color instead of a class).
2. Give every class persona a set of appropriate pre-saved actions in the
   hotbar on first pick, each with distinct colors/gradients mapped per class.
   Add an edit affordance to each saved hotbar button so players can swap
   them quickly, plus drag-to-reorder in the action list.
3. The DM gets a simple `d20 +1..+5` / `d20 -1..-5` modifier row, and a
   soundboard of fun sound effects to play at the table.
4. Quickroll gets its own distinct "rolling dice" sound effect, played right
   before the existing result ping/fanfare.

## Phase 1 - Generic party roles (replaces avatars/portraits)

- New `lib/roles.ts` replaces `lib/avatars.ts`: `RoleId` = `dm | barbarian |
  wizard | cleric | monk | custom`. The five class roles carry a fixed name/
  color/description; `custom` ("Create Player") lets the user pick any hex
  color directly - no portrait art, no per-person identity data.
- `components/role-picker.tsx` replaces `components/avatar.tsx`: icon badges
  (lucide glyphs, no image files) for the five roles, plus a native color
  input revealed only for "Create Player".
- Server (`app/api/session/route.ts`) derives the dice color from the chosen
  role the same way it derived it from avatars before; `custom` validates a
  real `#rrggbb` the client sent. `db/schema.ts`'s `players.avatar` column
  is renamed to `players.role` via a new Drizzle migration
  (`ALTER TABLE players RENAME COLUMN avatar TO role`) - existing rows keep
  their data (old avatar ids just won't match a role and fall back to the
  existing letter-badge display, exactly like an unrecognized avatar did).
- Delete `public/avatars/*.png` (the actual player portraits) and the old
  `lib/avatars.ts` / `components/avatar.tsx`.
- Remove the "DnD Sundays 2026: Dungeons of Drakkenheim" lobby heading and
  the "STAR GODS HUNGER" dice-strip flavor line; replace with generic copy.
  Rename the `drakkenheim` theme id to `toxic` (the acid-green palette itself
  is kept - it's just a color mood, not campaign branding - only the
  identifier changes) in `lib/settings.ts`, `app/globals.css`,
  `app/layout.tsx`'s flash-prevention script, and tests.

## Phase 2 - Class hotbars

- New `lib/role-presets.ts`: `ROLE_ACTIONS` maps each class role to a small
  set of sensible level-appropriate actions (attack + linked damage, saves,
  a skill check), each with a `colorMode: 'gradient'` and a class-appropriate
  two-color gradient. `ROLE_APPEARANCE` gives each class a matching dice
  appearance. The DM's set is the requested simple modifier row: ten actions
  `d20+1`..`d20+5` / `d20-1`..`d20-5`, colored on a green→red gradient scale.
- `lib/action-profiles.ts`: `ActionProfile` gains an optional `roleId` tag
  (separate from the user-editable display name) plus `ensureRoleProfile()`,
  a pure function that seeds a role's profile into a collection exactly once
  and marks it active - re-picking the same role never re-seeds or clobbers
  edits, since it only acts when no profile carries that `roleId` yet.
- `components/action-bar.tsx` calls `ensureRoleProfile` whenever the `role`
  prop changes (on join, or on a later role change), and gets a lightweight
  inline "Edit" pencil on every hotbar button (not just inside "Manage
  actions") that jumps straight to that action's editor. The manage-actions
  list gets native HTML5 drag-and-drop reordering (grip handle) alongside
  the existing up/down buttons.

## Phase 3 - DM soundboard

- `lib/dice-audio.ts` gains a handful of new synthesized (no external audio
  files, matching this file's existing approach) sound effects - drumroll,
  dramatic sting, applause, sad trombone, rimshot - exposed as
  `SOUND_EFFECTS` + `playSoundEffect(id)`.
- New `components/soundboard.tsx` renders one button per effect; shown only
  for the DM role, in both the browser room and the desktop hotbar surface.

## Phase 4 - Quickroll audio

- `lib/dice-audio.ts`'s `confirmedSound()` checks `roll.quick`: when true, it
  plays a new short synthesized "rolling dice" rattle first, then the
  existing ping/fanfare result cue after it finishes. Physical (animated)
  rolls are unchanged - the physics impact sounds already play during the
  roll itself.

## Validation

- `pnpm test` (unit), `pnpm exec tsc --noEmit`, `pnpm run build`,
  `pnpm exec playwright test` (updated specs for the new role picker/copy
  and the renamed theme).
