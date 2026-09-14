const SITE_ORIGIN = 'https://mirodnd-3d-dice-roller.vincent-de-nil.workers.dev';

function isRoomSite(raw) {
  try {
    const url = new URL(raw);
    return url.origin === SITE_ORIGIN && url.pathname === '/' && !url.username && !url.password;
  } catch { return false; }
}

function roomKey(raw) {
  if (!isRoomSite(raw)) throw new Error('Paste an invite or overlay link from VincentsVibeRoller.');
  const key = new URLSearchParams(new URL(raw).hash.slice(1)).get('room');
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new Error('This link does not contain a valid room.');
  return key;
}

function roomURL(key, overlay = false, surface = '') {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid room key.');
  return `${SITE_ORIGIN}/#${new URLSearchParams({ room: key, ...(overlay ? { overlay: '1', desktop: '1', ...(['table','hotbar'].includes(surface) ? {surface} : {}) } : {}) })}`;
}

// Electron screen coordinates are device-independent pixels, including on mixed-DPI monitors.
function lowerLeftBounds(workArea) {
  const width = Math.min(680, workArea.width);
  const height = Math.min(760, workArea.height);
  return { x: workArea.x, y: workArea.y + workArea.height - height, width, height };
}

function overlayBounds(area, surface) {
  const hotbarHeight = Math.min(280, Math.round(area.height * .35));
  const width = Math.min(surface === 'hotbar' ? 1000 : 420, area.width);
  const height = surface === 'hotbar' ? hotbarHeight : Math.min(640, area.height - hotbarHeight);
  return {x:area.x, y:area.y + area.height - height - (surface === 'table' ? hotbarHeight : 0), width, height};
}

module.exports = { SITE_ORIGIN, isRoomSite, roomKey, roomURL, lowerLeftBounds, overlayBounds };
