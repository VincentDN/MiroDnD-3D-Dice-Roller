const SITE_ORIGIN = 'https://rollparty-dnd.vdn1561.chatgpt.site';

function isRoomSite(raw) {
  try {
    const url = new URL(raw);
    return url.origin === SITE_ORIGIN && url.pathname === '/' && !url.username && !url.password;
  } catch { return false; }
}

function roomKey(raw) {
  if (!isRoomSite(raw)) throw new Error('Paste an invite or overlay link from Rollparty.');
  const key = new URLSearchParams(new URL(raw).hash.slice(1)).get('room');
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new Error('This link does not contain a valid room.');
  return key;
}

function roomURL(key, overlay = false) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid room key.');
  return `${SITE_ORIGIN}/#${new URLSearchParams({ room: key, ...(overlay ? { overlay: '1' } : {}) })}`;
}

// Electron screen coordinates are device-independent pixels, including on mixed-DPI monitors.
function lowerLeftBounds(workArea) {
  const width = Math.floor(workArea.width / 2);
  const height = Math.floor(workArea.height / 2);
  return { x: workArea.x, y: workArea.y + workArea.height - height, width, height };
}

module.exports = { SITE_ORIGIN, isRoomSite, roomKey, roomURL, lowerLeftBounds };
