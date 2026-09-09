import { database } from '@/db/raw';
import { evaluatePhysical } from '@/lib/dice-physics';
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
          'SELECT id,name,color,seen FROM players WHERE room=? ORDER BY seen DESC LIMIT 50',
        )
        .bind(room.id)
        .all(),
      db
        .prepare(
          'SELECT seq,data FROM (SELECT seq,data FROM rolls WHERE room=? AND seq>? ORDER BY seq DESC LIMIT 100) ORDER BY seq',
        )
        .bind(room.id, after)
        .all(),
    ]);
    return json({
      room: { name: room.name },
      players: p.results,
      rolls: r.results.map((x: any) => ({ ...JSON.parse(x.data), seq: x.seq })),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get('content-length')) > 4096)
      return json({ error: 'Request too large' }, 413);
    const raw = await req.text();
    if (raw.length > 4096) return json({ error: 'Request too large' }, 413);
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
      await db
        .prepare(
          'INSERT INTO players(id,room,secret,name,color,seen) VALUES(?,?,?,?,?,?)',
        )
        .bind(
          id,
          room.id,
          await hash(secret),
          name(b.name, 'Adventurer'),
          /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#32a6c8',
          now,
        )
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
      if (!/^#[0-9a-f]{6}$/i.test(b.color))
        throw Error('Choose a valid dice color.');
      await db
        .prepare('UPDATE players SET name=?,color=?,seen=? WHERE id=?')
        .bind(name(b.name, 'Adventurer'), b.color, now, player.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'roll') {
      if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/.test(b.id))
        throw Error('Invalid roll request.');
      const existing = await db
        .prepare(
          'SELECT seq,data FROM rolls WHERE id=? AND room=? AND player=?',
        )
        .bind(b.id, room.id, player.id)
        .first<{ seq: number; data: string }>();
      if (existing)
        return json({ ...JSON.parse(existing.data), seq: existing.seq });
      const recent = await db
        .prepare(
          'SELECT created FROM rolls WHERE room=? AND player=? ORDER BY seq DESC LIMIT 1',
        )
        .bind(room.id, player.id)
        .first<{ created: number }>();
      if (recent && now - recent.created < 500)
        return json(
          { error: 'Give the dice a moment before rolling again.' },
          429,
        );
      const roll = {
        id: b.id,
        ...evaluatePhysical(b.expression),
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
