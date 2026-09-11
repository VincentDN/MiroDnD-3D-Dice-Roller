import { database } from '@/db/raw';
import { AVATARS, DEFAULT_AVATAR_ID, avatarById, isAvatarId } from '@/lib/avatars';
import { evaluatePhysical, evaluateThrow } from '@/lib/dice-physics';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
const token = () =>
  crypto.randomUUID().replaceAll('-', '') +
  crypto.randomUUID().replaceAll('-', '');
async function hash(v: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
function name(v: unknown, fallback: string) {
  if (typeof v !== 'string') return fallback;
  return v.trim().slice(0, 40) || fallback;
}
// The dice color always comes from the chosen avatar, so it can't drift from
// it; an unrecognized/missing avatar falls back to a raw hex color if one was
// sent (older clients), then to the default avatar.
function avatarAndColor(b: { avatar?: unknown; color?: unknown }) {
  if (isAvatarId(b.avatar)) return { avatar: b.avatar, color: avatarById(b.avatar)!.color };
  if (typeof b.color === 'string' && /^#[0-9a-f]{6}$/i.test(b.color))
    return { avatar: null, color: b.color };
  return { avatar: DEFAULT_AVATAR_ID, color: AVATARS[0].color };
}
async function roomFor(req: Request) {
  const key = req.headers.get('x-room-key');
  if (!key || !/^[a-f0-9]{64}$/.test(key))
    throw Error('Open a valid invite link to join a room.');
  const id = await hash(key);
  const room = await database()
    .prepare('SELECT id,name FROM rooms WHERE id=?')
    .bind(id)
    .first();
  if (!room) throw Error('This room could not be found.');
  return room as { id: string; name: string };
}
export async function GET(req: Request) {
  try {
    const room = await roomFor(req),
      db = database();
    const after = Number(new URL(req.url).searchParams.get('after') || 0);
    if (!Number.isSafeInteger(after) || after < 0)
      throw Error('Invalid history cursor.');
    const [p, r] = await Promise.all([
      db
        .prepare(
          'SELECT id,name,color,avatar,seen FROM players WHERE room=? ORDER BY seen DESC LIMIT 50',
        )
        .bind(room.id)
        .all(),
      db
        .prepare(
          'SELECT seq,data,player FROM (SELECT seq,data,player FROM rolls WHERE room=? AND seq>? ORDER BY seq DESC LIMIT 100) ORDER BY seq',
        )
        .bind(room.id, after)
        .all(),
    ]);
    return json({
      room: { name: room.name },
      players: p.results,
      rolls: r.results.map((x: any) => ({ ...JSON.parse(x.data), seq: x.seq, playerId: x.player })),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get('content-length')) > 65536)
      return json({ error: 'Request too large' }, 413);
    const raw = await req.text();
    if (raw.length > 65536) return json({ error: 'Request too large' }, 413);
    const b = JSON.parse(raw),
      db = database(),
      now = Date.now();
    if (b.action === 'create') {
      const key = token(),
        id = await hash(key);
      await db
        .prepare('INSERT INTO rooms(id,name,created) VALUES(?,?,?)')
        .bind(id, name(b.name, 'The Sunday campaign'), now)
        .run();
      return json({ key });
    }
    const room = await roomFor(req);
    if (b.action === 'join') {
      const id = crypto.randomUUID(),
        secret = token();
      const count = await db
        .prepare('SELECT COUNT(*) AS n FROM players WHERE room=?')
        .bind(room.id)
        .first<{ n: number }>();
      if ((count?.n || 0) >= 50)
        throw Error('This room has reached its 50-player limit.');
      const { avatar, color } = avatarAndColor(b);
      await db
        .prepare(
          'INSERT INTO players(id,room,secret,name,color,avatar,seen) VALUES(?,?,?,?,?,?,?)',
        )
        .bind(id, room.id, await hash(secret), name(b.name, 'Adventurer'), color, avatar, now)
        .run();
      return json({ id, secret });
    }
    const secret = req.headers.get('x-player-key') || '';
    const player = await db
      .prepare('SELECT id,name,color FROM players WHERE room=? AND secret=?')
      .bind(room.id, await hash(secret))
      .first<{ id: string; name: string; color: string }>();
    if (!player) return json({ error: 'Join this room before rolling.' }, 401);
    if (b.action === 'profile') {
      const { avatar, color } = avatarAndColor(b);
      await db
        .prepare('UPDATE players SET name=?,color=?,avatar=?,seen=? WHERE id=?')
        .bind(name(b.name, 'Adventurer'), color, avatar, now, player.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'roll' || b.action === 'throw') {
      if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/.test(b.id))
        throw Error('Invalid roll request.');
      // Both checks depend only on the authenticated player; one database round trip.
      const checks = await db.batch([
        db.prepare('SELECT seq,data FROM rolls WHERE id=? AND room=? AND player=?').bind(b.id,room.id,player.id),
        db.prepare('SELECT created FROM rolls WHERE room=? AND player=? ORDER BY seq DESC LIMIT 1').bind(room.id,player.id),
      ]);
      const existing=checks[0].results[0] as {seq:number;data:string} | undefined;
      if(existing) return json({...JSON.parse(existing.data),seq:existing.seq,playerId:player.id});
      const recent=checks[1].results[0] as {created:number} | undefined;
      if (recent && now - recent.created < 500)
        return json(
          { error: 'Give the dice a moment before rolling again.' },
          429,
        );
      let outcome;
      if (b.action === 'throw') {
        if (typeof b.parent !== 'string' || !/^[0-9a-f-]{36}$/.test(b.parent)) throw Error('Choose an existing roll to throw again.');
        const source=await db.prepare('SELECT data FROM rolls WHERE id=? AND room=?').bind(b.parent,room.id).first<{data:string}>();
        if (!source) throw Error('This roll is no longer available.');
        const parent=JSON.parse(source.data);
        outcome={ ...evaluateThrow(parent.expression,b.release,parent.physics?.diceScale ?? 1), parent:b.parent };
      } else outcome=evaluatePhysical(b.expression,b.diceScale === 2 ? 2 : 1);
      const roll = {
        id: b.id,
        playerId: player.id,
        ...outcome,
        name: player.name,
        color: player.color,
        label: name(b.label, ''),
        created: now,
      };
      const result = await db.batch([
        db
          .prepare(
            'INSERT INTO rolls(id,room,player,data,created) VALUES(?,?,?,?,?)',
          )
          .bind(b.id, room.id, player.id, JSON.stringify(roll), now),
        db.prepare('UPDATE players SET seen=? WHERE id=?').bind(now, player.id),
      ]);
      return json({ ...roll, seq: result[0].meta.last_row_id });
    }
    throw Error('Unknown action.');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
