# The grand roadmap: becoming the most feature-rich, most user-friendly dice roller ever made

Requested by Vincent on 2026-09-17: stop scoping this as "a lightweight
companion to Miro" (the boundary `PLAY-ROADMAP.md` drew) and instead chart
the full ambition - every feature a table could want, presented so simply
that nobody needs a manual to use it. This document supersedes that
boundary. It does not replace `PLAY-ROADMAP.md`'s still-open phases
(temporary bonuses, connection resilience, DM-only rolls, quick controls,
session history) - those are folded in below as Horizon 1, because they're
prerequisites for almost everything that follows.

This is a planning document, not a sprint. Nothing here is committed to a
branch. Read the whole thing before starting any phase - later horizons
assume earlier ones exist, and the guardrails at the bottom exist because
"most feature-rich" is a trap that kills user-friendliness if taken
literally. Pick *one* phase, ship it well-tested, then re-read the vision
before picking the next one.

## Vision

**A table should be able to open one link and never think about the tool
again.** Every feature below is in service of that: the complexity lives in
what the app can *do*, never in what a player has to *learn* before they can
roll a d20. Power users (the DM, the rules-lawyer) get depth on demand;
everyone else gets a d20 and a button.

Five principles carry through every horizon:

1. **Zero-friction golden path.** A brand-new player should be rolling
   inside 15 seconds of opening the link - name, role, roll. Every feature
   added below must not add a step to that path. New capability is opt-in
   and discoverable, never mandatory before the first roll.
2. **Server-authoritative, client-delightful.** The physics/rules server
   already never trusts the client (see `app/api/session/route.ts`) - keep
   that as every new subsystem (initiative, character sheets, hidden rolls)
   is added. The client's job is to make the authoritative result feel
   alive: physics, sound, reveal animation, haptics.
3. **No external assets, no third-party accounts required to play.** The
   existing dice/audio system is 100% procedural (`lib/dice-material.ts`,
   `lib/dice-audio.ts` - see the "no external recordings or network
   requests" convention already established). Keep that discipline for new
   sound/visual work; anything that *needs* an account (Discord, a VTT) must
   be a strictly optional bridge, never a requirement to play.
4. **Small trusted tables, not a public platform.** The room model (a
   256-bit capability link, a 50-player cap, no public directory - see
   `README.md`'s "Room access and data" section) stays. Features that imply
   a public platform (leaderboards across strangers, a marketplace with
   payment processing) are explicitly out of scope; anything "social" here
   means *within your own table or your own friend group's rooms*.
5. **Generic, system-agnostic core.** The party-roles work
   (`lib/roles.ts`, `lib/role-presets.ts`) just made the app generic instead
   of campaign-specific. Every horizon below keeps building a toolkit games
   can be configured into, not a D&D 5e app with other systems bolted on.

## Where the project already stands

Worth stating plainly, because good roadmaps build on strength instead of
re-deriving it: real physics (cannon-es rigid bodies, not RNG-then-animate),
a genuinely shared multiplayer table (D1-backed, poll-synced, replayable),
saved character actions with linked damage and per-action styling, an
overlay/OBS story and a native transparent desktop host, three
themeable looks, a roll notebook, and - as of today - generic party roles
with class-seeded hotbars and a DM soundboard. That is already more
"real dice roller" than almost anything else in this space, which tends to
be either a flat RNG button or a heavyweight full VTT. The gap to close is
breadth (rules systems, character depth, DM tooling) and reach (platforms,
integrations, accessibility) without losing the thing that makes it good:
it feels like real dice, and it stays out of your way.

---

## Horizon 1 - Finish the foundation (near-term)

Everything here either closes a `PLAY-ROADMAP.md` phase already scoped, or
is small enough to ship in the same spirit. Do this horizon first - later
horizons (especially 3 and 4) lean on the permission model and connection
resilience this establishes.

### 1.1 Temporary bonuses and roll modifiers *(`PLAY-ROADMAP.md` #3)*
- Advantage/disadvantage/normal as a persistent per-roll-type toggle, not
  just the existing one-off `2d20kh1` button.
- Named stackable effects (Bless `+1d4`, Guidance `+1d4`, configurable
  Bardic Inspiration die) that show a live preview of the exact resulting
  expression before you commit to the roll.
- One-use effects consume only on a *confirmed* roll; a failed/retried
  request never doubles or silently drops one.

### 1.2 Connection resilience *(`PLAY-ROADMAP.md` #4)*
- Visible connected/reconnecting/offline state (already partially present
  via the `connected`/`error` state in `app/page.tsx` - make it a first-class
  status component, not a caught error string).
- A local practice-only fallback roller for the EXE/browser on first launch
  or mid-disconnect, clearly labeled as unshared/unverified - never
  presented as a room-confirmed roll.
- Retry-safe request IDs already exist for normal rolls (`retry.current` in
  `app/page.tsx`); extend the same guarantee to every new mutating action
  added in later horizons (initiative changes, character-sheet edits).

### 1.3 DM-only / hidden rolls *(`PLAY-ROADMAP.md` #5)*
- The single most-requested feature this app is missing: a secret
  Perception check the DM can see and the party can't.
- An authenticated **room-owner** concept (the first player who creates the
  room, or an explicit "make DM" hand-off) is the actual prerequisite for
  half of Horizon 3 (initiative control, monster HP, hidden loot) - build it
  once, generally, here.
- Visibility is `everyone | dm-only`, enforced server-side on every read
  path (GET history, poll, overlay, Markdown export) - not just hidden in
  the UI. An explicit "Reveal" action turns a hidden roll into a public
  event; it is never inferred.

### 1.4 Quick controls and presentation preference *(`PLAY-ROADMAP.md` #6)*
- Discoverable keyboard shortcuts scoped to the active surface (never fire
  inside a text input, dialog, or while disconnected/busy).
- A per-viewer "how much spectacle do you want" dial: full physics + reveal,
  fast/skip-animation, or reduced-motion - already partly modeled by
  `settings.reveal`/`reducedEffects` in `lib/settings.ts`; finish exposing it
  everywhere a roll can render (overlay, hotbar, mobile).

### 1.5 Session history and journaling *(`PLAY-ROADMAP.md` #7)*
- Named session boundaries ("Session 12 - The Sunken Vault") so history
  isn't one undifferentiated 100-roll window.
- Per-session, per-player Markdown export of public rolls plus roll-notebook
  comments (the notebook already exists per `components/roll-notebook.tsx` -
  this connects it to a session, not just a rolling 1,000-entry buffer).
- Pagination past the current hard 100-roll history cap.

**Acceptance for Horizon 1 as a whole:** a DM can run a real session hiding
rolls from players, stacking a Bless on a save, surviving a phone losing
wifi mid-roll, and exporting a clean session recap afterward - all without
reading documentation first.

---

## Horizon 2 - A universal rules engine

The app is D&D-shaped today (`lib/dice.ts`'s `kh`/`kl` syntax, the class
hotbar presets). This horizon makes the *dice engine* system-agnostic while
keeping D&D 5e as the default, best-supported preset - so a Call of
Cthulhu, FATE, or Blades in the Dark table gets a first-class experience,
not a workaround.

- **Exploding/compounding dice** (`!` on a die: reroll and add on max face,
  optionally chaining) - Savage Worlds, Shadowrun-adjacent systems.
- **Reroll rules** (`r1` = reroll 1s once, `ro1` = reroll and keep) as a
  first-class expression modifier alongside the existing `kh`/`kl`.
- **Dice pools with a target number**: roll N dice, count successes at or
  above a threshold (World of Darkness, Shadowrun, Genesys-adjacent) -
  the result becomes "3 successes", not a summed total, so the reveal UI
  needs a pool-aware display mode.
- **FATE/Fudge dice** (`4dF`: each die is -1/0/+1) with the classic FATE
  ladder result labels (Great, Good, Fair, Mediocre...).
- **Narrative dice systems** (Genesys/Star Wars-style dice with symbols
  instead of numbers - success/advantage/triumph/despair) as an optional,
  clearly-labeled preset; this is the most implementation-heavy item in the
  horizon and should be scoped as its own sub-project with its own physical
  die faces (`lib/dice-geometry.ts` already generates numbered faces
  procedurally - symbol faces are a natural, if nontrivial, extension).
- **A "system" selector at room-creation time** (5e is the default) that
  swaps: the modifier-shortcut vocabulary, the class hotbar presets
  (Horizon 1's DM/Barbarian/etc. become one of several system preset packs),
  and the result-reveal format (total vs. successes vs. FATE ladder).
- **A safe, sandboxed macro/expression layer** for homebrew rules the built-in
  syntax doesn't cover (e.g. "roll 2d6, on a 6+ take the higher, on 2-3 the
  GM makes a hard move" - Powered by the Apocalypse's core loop). This is
  the single riskiest item here from a security and complexity standpoint:
  it must run server-side in the same sandboxed evaluator style as
  `lib/dice.ts`'s existing `parseExpression`/`evaluate`, with a hard
  instruction/complexity budget - never arbitrary user code execution.

**Acceptance:** a Blades in the Dark table can roll a dice pool and read
"2 successes, partial", a FATE table sees "+2, Great", and a homebrew PbtA
hack's "roll+STAT" move resolves correctly - all from the same room UI a 5e
table already knows, with 5e remaining the zero-config default.

---

## Horizon 3 - Living character sheets and DM tooling

Explicitly the thing `PLAY-ROADMAP.md` deferred ("full character sheets,
encounter management... are deferred"). This is where the app stops being
"a dice roller with saved buttons" and becomes "the tool a table actually
runs a session through" - the single biggest jump in both feature depth and
implementation weight in this whole roadmap.

### 3.1 Character sheets, not just action bars
- A real per-character sheet: ability scores, proficiencies, HP/max HP,
  AC, conditions, inventory, known spells/spell slots - built *on top of*
  the existing `ActionProfile` (a sheet is a profile with structured stats
  behind it, so every hotbar/color/appearance feature already built keeps
  working unchanged).
- **Derived hotbar actions**: instead of (or alongside) manually saving
  "Athletics Check: 1d20+7", the sheet computes the modifier from Strength +
  proficiency automatically, and stays correct when the character levels up.
- **Conditions that modify rolls automatically**: mark a character
  "Poisoned" and their attack rolls silently apply disadvantage until
  cleared - visible in the roll's recorded breakdown, never a silent number
  change the player can't see.
- **Import** from common formats (D&D Beyond JSON export, a Pathfinder 2e
  Foundry export) to remove the single biggest adoption barrier: nobody
  wants to hand-enter a level-12 character. Export stays fully local/JSON as
  it is today for the action-profile system.

### 3.2 Initiative and combat tracking
- A shared initiative tracker: roll or enter initiative, see turn order,
  advance turns, track round number - visible to everyone, editable by the
  DM (built on Horizon 1.3's room-owner concept).
- HP bars per combatant, damage/healing applied directly from a linked
  damage roll (the linked-damage system already computes the number -
  this just gives it somewhere authoritative to land).
- Concentration-save prompts auto-suggested on damage taken while
  concentrating (5e-specific, but modeled as a system-preset behavior per
  Horizon 2, not hardcoded).

### 3.3 The DM screen
- **Quick NPC/encounter generator**: procedural names, quick stat blocks
  for common monster templates, all generated client- or server-side with
  no external content database dependency (keep the "no external assets"
  principle - ship a compact built-in table, don't scrape SRD content into
  the repo without checking its license).
- **Random tables**: loot, rumors, weather, encounters - DM-editable,
  shareable between rooms via the same JSON-export mechanism actions
  already use.
- **Private DM notes** per room/session, separate from the public roll
  notebook, never sent to non-DM clients.
- The soundboard shipped today (Horizon 0, already live) grows here: a
  DM-uploadable custom sound bank *for their own room only*, stored the same
  local-device way saved actions are - still no server-side asset hosting
  required, keeping the "no external assets" principle intact for the
  built-in set while letting a DM add their own.

**Acceptance:** a DM runs an entire combat encounter - initiative, damage,
conditions, a secret trap perception check, a quick NPC name - without
leaving the room, and every number a player sees traces back to a real,
inspectable roll.

---

## Horizon 4 - Social, spectacle and table culture

The fun, low-risk-per-feature horizon: things that make sessions memorable
without touching game rules at all. Every item here is genuinely optional
and additive - a table that ignores this horizon entirely loses nothing.

- **Roll reactions**: quick emoji reactions on a roll in the shared history
  (🔥 on a crit, 💀 on a fumble) - ephemeral, room-local, no accounts needed
  beyond the existing player identity.
- **A campaign stats dashboard**: crit rate, average roll by player, luckiest
  and unluckiest die, "most dramatic moment" (biggest swing between expected
  and actual on a high-stakes roll) - computed from history already stored,
  genuinely fun end-of-campaign material, exportable alongside the session
  recap from Horizon 1.5.
- **A crit/fumble hall of fame** per room: the natural 20s and natural 1s
  that mattered, with the roll's label and timestamp - a lightweight,
  room-scoped version of "let's remember that time...".
- **Achievements**, entirely room-local and cosmetic (no cross-room
  leaderboard, per the "not a public platform" guardrail): "rolled three
  natural 20s in one session," "survived a critical fumble on a death save."
- **Dice skin variety**: the appearance system (`lib/dice-appearance.ts`)
  already supports style/color/sparkle - grow the style list (more
  materials, more sparkle patterns) and let a player save/name/share their
  own skins as JSON, the same portable way actions already export. No
  marketplace, no payments - just more expressive procedural dice.
- **Session music**: an optional, muted-by-default ambient loop player,
  procedurally generated or user-supplied via local file (never a licensed
  streaming integration bundled into the app) - consistent with "no
  external assets required to play."
- **Deeper OBS/stream polish**: crit alerts as a distinct overlay animation,
  stream-safe "no player names" privacy mode, chat-triggered rolls for
  streamers who want viewer participation (opt-in, rate-limited, DM-toggleable).

**Acceptance:** a table that never touches this horizon has an unchanged
experience; a table that does gets a session that feels celebrated, not
just logged.

---

## Horizon 5 - Reach: platforms, integrations, accessibility

Depth doesn't matter if the people you play with can't reach it. This
horizon is about removing "I can't use this" as a reason not to play.

### 5.1 True native reach
- **Native iOS/Android** (not just a responsive web page - a real app shell,
  likely a thin wrapper in the same spirit as the existing Electron
  desktop host: remote-load the same Cloudflare-hosted app, add native-only
  capability like haptics and push notifications for "it's your turn").
- **macOS and Linux desktop builds**, closing the current Windows-only gap
  in `desktop/` - same remote-load architecture, different packaging target.
- **Offline-capable practice mode with sync**: roll solo with no
  connection, queue results, reconcile when back online - built on Horizon
  1.2's connection-resilience work.

### 5.2 Integrations (strictly optional bridges)
- **A Discord bot** that mirrors room rolls into a channel and lets
  `/roll` post back into the room - a bridge, never a requirement; the room
  works identically with zero Discord involvement.
- **VTT bridges** (Roll20/Foundry) for tables that run maps elsewhere but
  want this app's physical dice feel for the actual rolling - likely a
  webhook/API-key pairing, opt-in per room.
- **Calendar-based session scheduling** with a simple "next session" banner
  in the room, no external calendar account required to see it.

### 5.3 Accessibility as a first-class requirement, not an audit checkbox
- Full keyboard navigation and a real screen-reader pass across every
  surface this roadmap adds (not just the lobby, which is the only part
  that's been accessibility-reviewed so far).
- Colorblind-safe palette variants alongside the existing three visual
  themes.
- Voice-triggered rolling ("roll a d20 plus five") as an opt-in Web Speech
  feature, client-side only, no audio sent to a third-party service.
- Full internationalization: every string in `app/page.tsx` and friends
  extracted to a translation layer, starting with the languages the actual
  playtesting group needs.
- A first-run interactive tutorial (skip-anytime, never blocking) covering
  the golden path in under 30 seconds - the flip side of principle #1: power
  features need *some* discovery path that isn't "read the README."

**Acceptance:** a friend who doesn't speak English, is on an Android phone
with no desktop, and uses a screen reader can join a room and roll,
unassisted.

---

## Horizon 6 - The intelligence layer (exploratory)

Flagged explicitly as *exploratory and optional* - this is the horizon most
likely to conflict with the "no external network requests," "no account
required," and "small trusted table" principles if implemented carelessly,
so scope it last and smallest.

- **Rules lookup assistant**: "what does grappled do?" answered from a
  built-in, licensed-and-checked rules reference - not a live LLM call
  during play unless the table explicitly opts in and supplies their own
  API access; never a hidden cost or a hard dependency to roll dice.
- **Flavor-text generation** for crits/fumbles/loot descriptions - same
  opt-in, bring-your-own-access framing.
- **An AI DM co-pilot** for solo/small-group play (NPC dialogue, pacing
  suggestions) - the most ambitious and most optional item in the entire
  roadmap; treat it as a separate product experiment, not a feature to slot
  into the core room experience.

**Guardrail specific to this horizon:** nothing here may become required
for the core rolling experience to work, and nothing here silently sends
room/roll data to a third-party API without an explicit, per-room, visibly
labeled opt-in.

---

## Cross-cutting architecture work

Some of the above needs foundation-laying that isn't a "feature" on its
own but blocks several horizons at once. Call these out early so they're
budgeted, not discovered mid-implementation:

- **Real-time transport.** The app polls every ~1.2s today
  (`app/page.tsx`'s poll loop). Initiative tracking, live HP bars and roll
  reactions all want sub-second updates. Move to WebSockets/Durable Objects
  for room state once Horizon 3 makes latency actually matter - not before,
  since polling has been simple and reliable so far and this is a real
  infrastructure jump on Cloudflare Workers.
- **A room-owner/permission model.** Horizon 1.3 introduces this for hidden
  rolls; Horizon 3's DM screen and Horizon 3.2's initiative control both
  need the same concept. Build it once, generally, as "capabilities a room
  member can hold" (owner, can-hide-rolls, can-edit-initiative) rather than
  a hardcoded `isDM` boolean.
- **A structured character-data schema.** Horizon 3.1 needs stats/HP/
  conditions to live somewhere queryable and validated server-side, the same
  way `db/schema.ts` + `lib/action-profiles.ts` validate actions today - this
  is a genuinely new data model, not an extension of the existing one.
- **A system-preset abstraction.** Horizon 2's "pick your rules system" and
  Horizon 3's "5e-specific concentration prompts" both want the same thing:
  a pluggable ruleset descriptor (expression grammar extensions, hotbar
  presets, reveal-format) that 5e becomes the default instance of.

## Guardrails and explicit non-goals

Keep "most feature-rich" from becoming "least usable." These are things to
actively *not* build, or to build very differently than the obvious version:

- **No feature-flag sprawl.** Every horizon above should ship as something
  that's either invisible until used (an empty initiative tracker just
  isn't opened) or genuinely zero-config (5e stays the default system). Do
  not accumulate a settings screen nobody can navigate.
- **No public cross-room social features.** Achievements, stats, hall of
  fame - all room-scoped. No public profile, no cross-server leaderboard, no
  stranger matchmaking. This app is for tables who already know each other.
- **No mandatory third-party account.** Discord/VTT/AI integrations are
  bridges a room can ignore entirely.
- **No paid marketplace.** Dice skins, sound packs, character sheets are
  shared as portable JSON/local files between people who already trust each
  other, the same way character actions export today - not a storefront.
- **Never trust the client for anything that matters.** Every new mutating
  feature (initiative, HP, hidden rolls, character sheets) validates and
  authorizes server-side, exactly like `app/api/session/route.ts` does
  today. A client-only "DM mode" toggle that isn't enforced by the server is
  not DM-only rolls - it's a UI suggestion.
- **Ship vertically, not horizontally.** One full horizon-1-style phase,
  tested end-to-end and used at a real table, beats five half-built
  horizons. If a phase can't be described in one sentence a new player would
  understand, it's not ready to build yet.

## Suggested sequencing

1. Horizon 1 in full (it unblocks nearly everything downstream and closes
   an already-open roadmap).
2. Horizon 3.1-3.2 (character sheets + initiative) *before* Horizon 2's
   full multi-system engine - the single highest-value jump for the actual
   D&D table this app was built for, and it validates the room-owner/
   permission model Horizon 2's system-preset abstraction will also lean on.
3. Horizon 4 opportunistically, in parallel with anything else - it's low-
   risk and high-delight, good filler between larger phases.
4. Horizon 2 (multi-system engine) once a second real-world system's table
   actually wants it - don't speculatively build Genesys narrative dice
   support for a hypothetical user.
5. Horizon 5 once the core experience is deep enough that reach is the
   actual bottleneck to more people playing.
6. Horizon 6 only as an explicit, separately-scoped experiment - never
   folded silently into a "just add AI" pass on an unrelated phase.

Revisit this document after each shipped phase. A roadmap that never gets
edited in response to what a real table actually asked for next is just a
wish list.
