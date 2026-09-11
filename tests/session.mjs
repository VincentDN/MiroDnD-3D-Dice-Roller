import assert from 'node:assert/strict';
const base = process.env.TEST_ORIGIN || 'http://localhost:3000';
async function call(body, key = '', secret = '') {
  const res = await fetch(base + '/api/session', {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'x-room-key': key,
      'x-player-key': secret,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}
const room = await call({ action: 'create', name: 'Integration test room' });
assert.equal(room.status, 200, JSON.stringify(room));
const key = room.data.key;
const a = (
  await call({ action: 'join', name: 'Test ranger', color: '#32a6c8' }, key)
).data;
const b = (
  await call({ action: 'join', name: 'Test wizard', color: '#ab79ef' }, key)
).data;
const id = crypto.randomUUID();
const roll = await call(
  { action: 'roll', id, expression: '2d20kh1+5', label: 'Initiative' },
  key,
  a.secret,
);
assert.equal(roll.status, 200, JSON.stringify(roll));
const read = await call(null, key, b.secret);
assert.equal(read.data.players.length, 2);
assert.equal(read.data.rolls[0].id, id);
assert.equal(read.data.rolls[0].total, roll.data.total);
assert.equal(roll.data.playerId, a.id);
assert.equal(read.data.rolls[0].playerId, a.id);
const duplicate = await call(
  { action: 'roll', id, expression: '2d20kh1+5' },
  key,
  a.secret,
);
assert.equal(duplicate.data.total, roll.data.total);
assert.equal(duplicate.data.playerId, a.id);
assert.equal((await call(null, key)).data.rolls.length, 1);
assert.equal(
  (
    await call(
      { action: 'roll', id: crypto.randomUUID(), expression: '1d6' },
      key,
      'invalid',
    )
  ).status,
  401,
);
assert.equal((await call(null, 'a'.repeat(64))).status, 400);
assert.equal(
  (
    await call(
      { action: 'profile', name: 'Blue wizard', color: '#2244aa' },
      key,
      b.secret,
    )
  ).status,
  200,
);
const updated = await call(null, key);
assert.equal(updated.data.players.find((p) => p.id === b.id).color, '#2244aa');
// A chosen avatar (lib/avatars.ts) always wins over any raw color sent alongside it.
const c = (
  await call(
    { action: 'join', name: 'Test warlord', avatar: 'warborn', color: '#ffffff' },
    key,
  )
).data;
const afterJoin = await call(null, key);
const warlord = afterJoin.data.players.find((p) => p.id === c.id);
assert.equal(warlord.avatar, 'warborn');
assert.equal(warlord.color, '#e8ac3a');
assert.equal(
  (
    await call(
      { action: 'profile', name: 'Test warlord', avatar: 'ringmaster' },
      key,
      c.secret,
    )
  ).status,
  200,
);
const afterProfile = await call(null, key);
assert.equal(afterProfile.data.players.find((p) => p.id === c.id).avatar, 'ringmaster');
console.log(
  'PASS: room creation, two-player shared results, duplicate protection, access isolation, profile persistence, avatar-derived color',
);
