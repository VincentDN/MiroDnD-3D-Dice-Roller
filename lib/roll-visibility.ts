// A hidden ("DM only") roll is visible to everyone except: it's server-side
// filtered out of the shared history for anyone but the DM and the roll's
// own owner. An unresolved viewer (no valid player credential - an
// unauthenticated OBS/overlay spectator link) never sees one either.
export type Viewer = { id: string; role: string | null } | null;
export function visibleTo(roll: { visibility?: string; playerId?: string }, viewer: Viewer): boolean {
  return roll.visibility !== 'dm' || (!!viewer && (viewer.role === 'dm' || viewer.id === roll.playerId));
}
