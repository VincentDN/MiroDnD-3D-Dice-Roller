import assert from 'node:assert/strict';
import { evaluateThrow } from '../lib/dice-physics.ts';
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
const quickId = crypto.randomUUID();
const quickKey = (await call({action:'create', name:'Quickroll tests'})).data.key;
const quickPlayer = (await call({action:'join', name:'Quick wizard'}, quickKey)).data;
const quickBody = { action: 'roll', id: quickId, expression: '2d20kh1+5', quick: true };
const quickRoll = await call(quickBody, quickKey, quickPlayer.secret);
assert.equal(quickRoll.status, 200);
assert.equal(quickRoll.data.quick, true);
assert.equal(quickRoll.data.physics, undefined);
assert.equal(quickRoll.data.dice.filter(d => d.kept).length, 1);
assert.equal(quickRoll.data.total, Math.max(...quickRoll.data.dice.map(d => d.value)) + 5);
const quickRetry = await call(quickBody, quickKey, quickPlayer.secret);
assert.equal(quickRetry.data.id, quickRoll.data.id);
assert.equal(quickRetry.data.total, quickRoll.data.total);
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
    { action: 'join', name: 'Test warlord', avatar: 'tom-varn', color: '#ffffff' },
    key,
  )
).data;
const afterJoin = await call(null, key);
const warlord = afterJoin.data.players.find((p) => p.id === c.id);
assert.equal(warlord.avatar, 'tom-varn');
assert.equal(warlord.color, '#3fae5c');
assert.equal(
  (
    await call(
      { action: 'profile', name: 'Test warlord', avatar: 'teddy' },
      key,
      c.secret,
    )
  ).status,
  200,
);
const afterProfile = await call(null, key);
assert.equal(afterProfile.data.players.find((p) => p.id === c.id).avatar, 'teddy');
// A starting die has no historical parent but must use its actual release motion.
const release = [{ p: [-1, 3, 0], q: [0, 0, 0, 1], v: [4, 3, 2], w: [12, 8, 4] }];
const bounds = { width: 24, depth: 12 };
const firstThrowRequest = { action: 'throw', id: crypto.randomUUID(), parent: null,
  release, bounds, diceScale: 1.5, expression: '9d6+100', label: 'Mouse throw' };
const firstThrow = await call(firstThrowRequest, key, c.secret);
assert.equal(firstThrow.status, 200, JSON.stringify(firstThrow));
const expected = evaluateThrow('1d20', release, 1.5, bounds);
assert.equal(firstThrow.data.expression, '1d20');
assert.equal(firstThrow.data.total, expected.total);
assert.deepEqual(firstThrow.data.physics, expected.physics);
assert.equal(firstThrow.data.playerId, c.id);
assert.equal(firstThrow.data.parent, undefined);
const firstThrowDuplicate = await call(firstThrowRequest, key, c.secret);
assert.equal(firstThrowDuplicate.data.id, firstThrow.data.id);
assert.equal((await call(null, key, b.secret)).data.rolls.filter(r => r.id === firstThrow.data.id).length, 1);
await new Promise(resolve => setTimeout(resolve, 550));
const again = await call({ ...firstThrowRequest, id: crypto.randomUUID(), parent: firstThrow.data.id }, key, c.secret);
assert.equal(again.status, 200, JSON.stringify(again));
assert.equal(again.data.parent, firstThrow.data.id);
assert.equal(again.data.total, expected.total);
await new Promise(resolve => setTimeout(resolve, 550));
for (const invalid of [
  { release: [] },
  { release: [{ ...release[0], p: [999, 3, 0] }] },
  { diceScale: 99 },
  { parent: undefined },
  { parent: crypto.randomUUID() },
]) {
  const rejected = await call({ ...firstThrowRequest, id: crypto.randomUUID(), ...invalid }, key, c.secret);
  assert.equal(rejected.status, 400, JSON.stringify(rejected));
}
console.log(
  'PASS: shared results, duplicate protection, access isolation, profiles, starting d20 throws, rethrows and invalid release rejection',
);
await new Promise(r=>setTimeout(r,550));
const appearance={style:'gradient',body:'#ff4400',numbers:'#ffffff',secondary:'#5500ff',sparkle:'#ffffff',intensity:.4};
const styled=await call({action:'roll',id:crypto.randomUUID(),expression:'1d20+4',appearance,damage:[{name:'Fire',expression:'2d6+3'}]},key,c.secret);
assert.equal(styled.status,200,JSON.stringify(styled));assert.deepEqual(styled.data.appearance,appearance);
const other=await call({action:'roll',id:crypto.randomUUID(),linkedTo:styled.data.id,damageIndex:0,critical:true},key,b.secret);
assert.equal(other.status,400,'Another player cannot roll linked damage for this attack');
await new Promise(r=>setTimeout(r,550));
const critical=await call({action:'roll',id:crypto.randomUUID(),linkedTo:styled.data.id,damageIndex:0,critical:true,expression:'40d20',appearance:{...appearance,body:'#000000'}},key,c.secret);
assert.equal(critical.status,200,JSON.stringify(critical));assert.equal(critical.data.expression,'4d6+3');assert.deepEqual(critical.data.appearance,appearance);assert.equal(critical.data.linkedTo,styled.data.id);
await new Promise(r=>setTimeout(r,550));
const badStyle=await call({action:'roll',id:crypto.randomUUID(),expression:'1d20',appearance:{...appearance,body:'red;script'}},key,c.secret);assert.equal(badStyle.status,400);
console.log('PASS: appearance snapshots, validated linked damage, critical math and cross-player isolation');
