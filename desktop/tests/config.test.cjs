const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SITE_ORIGIN, isRoomSite, roomKey, roomURL, lowerLeftBounds, overlayBounds } = require('../config.cjs');

test('normal and OBS invites open the same room without carrying extra URL parameters', () => {
  const key = 'a1'.repeat(32);
  for (const suffix of ['', '&overlay=1', '&untrusted=value']) {
    assert.equal(roomKey(`${SITE_ORIGIN}/#room=${key}${suffix}`), key);
  }
  assert.equal(roomURL(key, true), `${SITE_ORIGIN}/#room=${key}&overlay=1&desktop=1`);
});
test('rejects credentials, untrusted hosts, protocols, paths and malformed capabilities', () => {
  const key = 'a'.repeat(64);
  const host = new URL(SITE_ORIGIN).host;
  for (const url of [
    `http://${host}/#room=${key}`,
    `${SITE_ORIGIN}.evil.test/#room=${key}`,
    `https://user:pass@${host}/#room=${key}`,
    `${SITE_ORIGIN}/elsewhere#room=${key}`, 'file:///tmp/test', 'javascript:alert(1)',
    `${SITE_ORIGIN}/#room=bad`, `${SITE_ORIGIN}/#room=${'a'.repeat(63)}`,
  ]) assert.throws(() => roomKey(url));
  assert.equal(isRoomSite(`${SITE_ORIGIN}/`), true);
  assert.throws(() => roomURL('bad'));
});
test('compact lower-left window respects taskbars, negative monitor coordinates and odd sizes', () => {
  assert.deepEqual(lowerLeftBounds({ x: 0, y: 0, width: 1920, height: 1040 }),
    { x: 0, y: 280, width: 680, height: 760 });
  assert.deepEqual(lowerLeftBounds({ x: -1920, y: -200, width: 1920, height: 1080 }),
    { x: -1920, y: 120, width: 680, height: 760 });
  assert.deepEqual(lowerLeftBounds({ x: 48, y: 24, width: 1365, height: 743 }),
    { x: 48, y: 24, width: 680, height: 743 });
});

test('split surfaces share room keys and compact bounds stay within each monitor',()=>{
 const key='c'.repeat(64);
 for(const area of [{x:-1920,y:-200,width:1920,height:1080},{x:0,y:0,width:800,height:600}]) {
  const table=overlayBounds(area,'table'),bar=overlayBounds(area,'hotbar');
  assert(table.y+table.height<=bar.y);
  for(const b of [table,bar]) {assert(b.x>=area.x);assert(b.x+b.width<=area.x+area.width);assert(b.y>=area.y);assert(b.y+b.height<=area.y+area.height);}
 }
 for(const surface of ['table','hotbar']) {assert.equal(roomKey(roomURL(key,true,surface)),key);assert(roomURL(key,true,surface).endsWith('surface='+surface));}
});
