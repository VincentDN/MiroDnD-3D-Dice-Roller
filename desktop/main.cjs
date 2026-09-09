const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { SITE_ORIGIN, isRoomSite, roomKey, roomURL, lowerLeftBounds } = require('./config.cjs');

const panelURL = pathToFileURL(path.join(__dirname, 'controls.html')).href;
const overlayCSS = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');
let panel, room, overlay, tray;
let key = '', displayId, visible = true, history = true, quitting = false;
let overlayReady = false, overlayError = '', historyCSS, navigation = 0;
const shortcuts = [];

function state() {
  return {
    hasRoom: Boolean(key), visible, history, displayId, overlayReady, error: overlayError,
    shortcuts,
    displays: screen.getAllDisplays().map((d, i) => ({
      id: d.id, label: `${d.label || `Monitor ${i + 1}`} (${d.bounds.width} × ${d.bounds.height})`,
    })),
  };
}
function broadcast() {
  // The overlay is the audible window while visible; avoid two copies of each cue.
  if(room && !room.isDestroyed())room.webContents.setAudioMuted(Boolean(key && visible && overlayReady));
  if(overlay && !overlay.isDestroyed())overlay.webContents.setAudioMuted(!visible);
  if (panel && !panel.isDestroyed()) panel.webContents.send('desktop:state', state());
  if (tray) tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Roll dice / open room', click: showRoom },
    { label: 'Desktop controls', click: showPanel },
    { label: 'Show dice over Miro', type: 'checkbox', checked: visible, click: (item) => setVisible(item.checked) },
    { type: 'separator' },
    { label: 'Quit VincentsVibeRoller', click: () => app.quit() },
  ]));
}
function showPanel() { panel.show(); panel.focus(); }
function positionOverlay(reset = false) {
  const display = screen.getAllDisplays().find((d) => d.id === displayId) || screen.getPrimaryDisplay();
  displayId = display.id;
  if (overlay && !overlay.isDestroyed()) {
    const b = reset === true ? lowerLeftBounds(display.workArea) : overlay.getBounds();
    const a = display.workArea;
    b.width = Math.min(b.width, a.width); b.height = Math.min(b.height, a.height);
    b.x = Math.min(Math.max(b.x, a.x), a.x+a.width-b.width);
    b.y = Math.min(Math.max(b.y, a.y), a.y+a.height-b.height);
    overlay.setBounds(b);
  }
  broadcast();
}
function setVisible(next) {
  visible = next;
  if (overlay && !overlay.isDestroyed()) {
    if (visible && key && overlayReady) overlay.showInactive();
    else overlay.hide();
  }
  broadcast();
}
function secureRemote(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  for (const name of ['will-navigate', 'will-redirect']) {
    win.webContents.on(name, (event, url) => { if (!isRoomSite(url)) event.preventDefault(); });
  }
  win.webContents.on('will-frame-navigate', (event, details) => {
    const url = typeof details === 'string' ? details : (details?.url || event.url);
    if (!isRoomSite(url)) event.preventDefault();
  });
}
function remotePreferences() {
  return { nodeIntegration: false, contextIsolation: true, sandbox: true,
    webSecurity: true, webviewTag: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required',
    partition: 'persist:rollparty' };
}
async function applyHistory() {
  if (!overlayReady) return;
  const contents = overlay.webContents;
  if (historyCSS) await contents.removeInsertedCSS(historyCSS).catch(() => {});
  historyCSS = undefined;
  if (!history) historyCSS = await contents.insertCSS(
    '.overlay-console:not(:has(.error)) { display: none !important; } .overlay-console:has(.error) .roll-log { display: none !important; }',
  );
}
async function loadOverlay() {
  if (!key) return;
  const attempt = ++navigation;
  overlayReady = false;
  overlayError = '';
  historyCSS = undefined;
  overlay.hide();
  broadcast();
  try {
    await overlay.loadURL(roomURL(key, true));
    if (attempt !== navigation || quitting) return;
    await overlay.webContents.insertCSS(overlayCSS);
    overlayReady = true;
    await applyHistory();
    setVisible(visible);
  } catch {
    if (attempt !== navigation || quitting) return;
    overlayReady = false;
    overlayError = 'Could not load the dice. Check your internet connection, then choose Reconnect.';
    broadcast();
  }
}
function followRoom(url) {
  if (!isRoomSite(url)) return;
  let next = '';
  try { next = roomKey(url); } catch { /* The room window may be on the lobby. */ }
  if (next === key) return;
  key = next;
  if (key) void loadOverlay();
  else {
    ++navigation;
    overlayReady = false;
    overlayError = '';
    overlay.hide();
    // Stop polling the previous room after leaving it.
    void overlay.loadURL('about:blank').catch(() => {});
    broadcast();
  }
}
function createRoom() {
  room = new BrowserWindow({ width: 1160, height: 850, minWidth: 480, minHeight: 500,
    title: 'VincentsVibeRoller - roll dice', backgroundColor: '#10151c', show: false,
    autoHideMenuBar: true, webPreferences: remotePreferences() });
  room.setMenu(null);
  secureRemote(room);
  room.webContents.on('did-navigate-in-page', (_event, url, mainFrame) => { if (mainFrame) followRoom(url); });
  room.webContents.on('did-navigate', (_event, url) => followRoom(url));
  room.on('close', (event) => { if (!quitting) { event.preventDefault(); room.hide(); showPanel(); } });
}
async function navigateRoom(url) {
  try { await room.loadURL(url); }
  catch {
    overlayError = 'Could not open the room. Check your internet connection, then choose Reconnect.';
    broadcast();
    showPanel();
  }
}
function showRoom() {
  room.show(); room.focus();
  if (!isRoomSite(room.webContents.getURL())) void navigateRoom(key ? roomURL(key) : SITE_ORIGIN + '/');
}
function handle(channel, callback) {
  ipcMain.handle(channel, (event, ...args) => {
    if (event.sender !== panel.webContents || event.senderFrame !== panel.webContents.mainFrame || event.senderFrame.url !== panelURL)
      throw new Error('Untrusted control request.');
    return callback(...args);
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (panel) showPanel(); });
  app.whenReady().then(() => {
    app.setAppUserModelId('com.rollparty.desktop');
    displayId = screen.getPrimaryDisplay().id;
    const remoteSession = session.fromPartition('persist:rollparty');
    remoteSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    remoteSession.setPermissionCheckHandler(() => false);
    remoteSession.on('will-download', (event, item, contents) => {
      // Only our generated Markdown notebooks may leave the remote app as files.
      const allowed = contents && isRoomSite(contents.getURL()) &&
        item.getURL().startsWith('blob:' + SITE_ORIGIN + '/') &&
        item.getMimeType() === 'text/markdown' &&
        /^VincentsVibeRoller-rolls-\d{4}-\d{2}-\d{2}\.md$/.test(item.getFilename());
      if (!allowed) event.preventDefault();
      else item.setSaveDialogOptions({title:'Save roll notebook',filters:[{name:'Markdown',extensions:['md']}]});
    });
    panel = new BrowserWindow({ width: 490, height: 650, minWidth: 440, minHeight: 600,
      title: 'VincentsVibeRoller Desktop', backgroundColor: '#10151c', autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true,
        nodeIntegration: false, sandbox: true, webviewTag: false } });
    panel.setMenu(null);
    panel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    panel.webContents.on('will-navigate', (event) => event.preventDefault());
    panel.on('close', (event) => {
      if (!quitting && tray) { event.preventDefault(); panel.hide(); }
      else if (!quitting) app.quit();
    });
    overlay = new BrowserWindow({ ...lowerLeftBounds(screen.getPrimaryDisplay().workArea),
      title: 'VincentsVibeRoller dice overlay', transparent: true, frame: false,
      backgroundColor: '#00000000', alwaysOnTop: true, hasShadow: false,
      focusable: true, skipTaskbar: true, resizable: true, movable: true,
      minWidth: 340, minHeight: 320,
      show: false, webPreferences: { ...remotePreferences(), preload: path.join(__dirname, 'overlay-preload.cjs') } });
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setIgnoreMouseEvents(false);
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    secureRemote(overlay);
    overlay.on('moved', () => { displayId = screen.getDisplayMatching(overlay.getBounds()).id; broadcast(); });
    overlay.webContents.on('render-process-gone', () => {
      overlayReady = false; overlay.hide();
      overlayError = 'The dice window stopped. Choose Reconnect to reopen it.'; broadcast();
    });
    ipcMain.on('overlay:resize', (event, width, height) => {
      if (event.sender !== overlay.webContents || event.senderFrame !== overlay.webContents.mainFrame || !isRoomSite(event.senderFrame.url)) return;
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;
      const area = screen.getDisplayMatching(overlay.getBounds()).workArea;
      const b = overlay.getBounds();
      b.width = Math.min(area.width, Math.max(340, Math.round(width)));
      b.height = Math.min(area.height, Math.max(320, Math.round(height)));
      b.x = Math.min(Math.max(b.x, area.x), area.x+area.width-b.width);
      b.y = Math.min(Math.max(b.y, area.y), area.y+area.height-b.height);
      overlay.setBounds(b);
    });
    createRoom();
    handle('desktop:state', state);
    handle('desktop:open-room', (link) => {
      if (typeof link !== 'string' || link.length > 2048) throw new Error('Paste a valid room link.');
      const next = roomKey(link.trim());
      void navigateRoom(roomURL(next));
      room.show(); room.focus();
    });
    handle('desktop:show-room', showRoom);
    handle('desktop:display', (id) => {
      if (!screen.getAllDisplays().some((d) => d.id === id)) throw new Error('Monitor unavailable.');
      displayId = id; positionOverlay(true);
    });
    handle('desktop:visible', (value) => {
      if (typeof value !== 'boolean') throw new Error('Invalid visibility.');
      setVisible(value);
    });
    handle('desktop:history', async (value) => {
      if (typeof value !== 'boolean') throw new Error('Invalid history setting.');
      history = value; await applyHistory(); broadcast();
    });
    handle('desktop:retry', () => {
      if (key) void loadOverlay();
      else showRoom();
    });
    handle('desktop:quit', () => app.quit());
    for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, positionOverlay);
    for (const [label, accelerator, action] of [
      ['Show / hide dice', 'CommandOrControl+Shift+D', () => setVisible(!visible)],
      ['Open roller', 'CommandOrControl+Shift+R', showRoom],
      ['Desktop controls', 'CommandOrControl+Shift+O', showPanel],
    ]) shortcuts.push({ label, accelerator, available: globalShortcut.register(accelerator, action) });
    try {
      tray = new Tray(path.join(__dirname, 'icon.png'));
      tray.setToolTip('VincentsVibeRoller - dice over Miro');
      tray.on('double-click', showPanel);
    } catch { /* The panel remains accessible if the OS has no notification area. */ }
    broadcast();
    void panel.loadFile(path.join(__dirname, 'controls.html'));
  });
  app.on('activate', () => { if (panel) showPanel(); });
  app.on('before-quit', () => { quitting = true; ++navigation; });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); tray?.destroy(); });
}
