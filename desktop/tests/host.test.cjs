const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const os = require('node:os');
const config = require('../config.cjs');

// Exercise host orchestration without pretending this verifies the Windows compositor.
test('room changes, interactive window, IPC isolation, monitor fallback and visibility', async () => {
  const windows = [], handlers = new Map();
  let displays = [
    { id: 1, label: 'Main', bounds: { width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
    { id: 2, label: 'Left', bounds: { width: 1920, height: 1080 }, workArea: { x: -1920, y: 0, width: 1920, height: 1080 } },
  ];
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.visible = false; this.url = '';
      this.webContents = new EventEmitter();
      this.webContents.mainFrame = { url: '' };
      Object.assign(this.webContents, {
        send() {}, setAudioMuted(value) { this.muted=value; }, setWindowOpenHandler(fn) { this.popups = fn; },
        getURL: () => this.url,
        insertCSS: async (css) => { this.webContents.lastCSS = css; return 'css'; }, removeInsertedCSS: async () => {},
      });
      windows.push(this);
    }
    setMenu() {} setAlwaysOnTop(value) { this.top = value; }
    setIgnoreMouseEvents(value) { this.passthrough = value; }
    setVisibleOnAllWorkspaces() {} setBounds(bounds) { this.bounds = bounds; }
    getBounds() { return this.bounds || {x:this.options.x, y:this.options.y,width:this.options.width,height:this.options.height}; }
    hide() { this.visible = false; } show() { this.visible = true; }
    showInactive() { this.visible = true; this.inactive = true; }
    focus() { this.focused = true; } isDestroyed() { return false; }
    async loadURL(url) {
      this.url = url;
      this.webContents.mainFrame.url = url;
      this.webContents.emit('did-navigate', {}, url);
    }
    async loadFile(file) { this.webContents.mainFrame.url = require('node:url').pathToFileURL(file).href; }
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollparty-test-'));
  const app = Object.assign(new EventEmitter(), {
    requestSingleInstanceLock: () => true, whenReady: async () => {},
    setAppUserModelId() {}, quit() {}, getPath: (name) => name === 'userData' ? userDataDir : os.tmpdir(),
  });
  let dialogResult = { canceled: true, filePaths: [] };
  const dialog = { showOpenDialog: async () => dialogResult };
  const screen = Object.assign(new EventEmitter(), {
    getAllDisplays: () => displays, getPrimaryDisplay: () => displays[0], getDisplayMatching: () => displays[0],
  });
  class Tray extends EventEmitter { setToolTip() {} setContextMenu() {} destroy() {} }
  const remoteSession = Object.assign(new EventEmitter(), {
    setPermissionRequestHandler() {}, setPermissionCheckHandler() {},
  });
  const electron = { app, screen, BrowserWindow: Window, Tray, dialog,
    Menu: { buildFromTemplate: (x) => x },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) },
    globalShortcut: { register: () => true, unregisterAll() {} },
    session: { fromPartition: () => remoteSession },
  };
  const directory = path.resolve(__dirname, '..');
  vm.runInNewContext(fs.readFileSync(path.join(directory, 'main.cjs'), 'utf8'), {
    require: (id) => id === 'electron' ? electron : id === './config.cjs' ? config : require(id),
    __dirname: directory, process: { env: {}, argv: [] },
  });
  await new Promise(setImmediate);
  const [panel, overlay, room] = windows;
  const call = (name, ...args) => handlers.get(`desktop:${name}`)({
    sender: panel.webContents, senderFrame: panel.webContents.mainFrame,
  }, ...args);
  assert.equal(overlay.options.transparent, true);
  assert.equal(overlay.options.focusable, true);
  assert.equal(overlay.options.resizable, true);
  assert.equal(overlay.options.movable, true);
  assert.equal(overlay.passthrough, false);
  assert.equal(overlay.top, true);
  assert(overlay.options.webPreferences.preload.endsWith('overlay-preload.cjs'));
  assert.equal(room.options.webPreferences.preload, undefined);
  assert.equal(room.options.webPreferences.sandbox, true);
  assert.throws(() => handlers.get('desktop:quit')({ sender: room.webContents, senderFrame: room.webContents.mainFrame }), /Untrusted/);
  const key = 'b'.repeat(64);
  call('open-room', config.roomURL(key));
  await new Promise(setImmediate);
  assert.equal(overlay.url, config.roomURL(key, true));
  assert.equal(overlay.visible, true);
  assert.equal(room.webContents.muted,true);
  assert.equal(overlay.webContents.muted,false);
  assert.equal(overlay.inactive, true);
  assert.equal(overlay.focused, undefined);
  const checkDownload = (url, mime, filename, sender = room.webContents) => {
    let prevented = false, dialog;
    remoteSession.emit('will-download', { preventDefault() { prevented = true; } }, {
      getURL: () => url, getMimeType: () => mime, getFilename: () => filename,
      setSaveDialogOptions(options) { dialog = options; },
    }, sender);
    return { prevented, dialog };
  };
  const notebookURL = 'blob:' + config.SITE_ORIGIN + '/notebook';
  const notebookName = 'VincentsVibeRoller-rolls-2026-09-11.md';
  const download = checkDownload(notebookURL, 'text/markdown', notebookName);
  assert.equal(download.prevented, false);
  assert.deepEqual(Array.from(download.dialog.filters[0].extensions), ['md']);
  assert.equal(checkDownload(notebookURL, 'application/octet-stream', notebookName).prevented, true);
  assert.equal(checkDownload('https://evil.test/file', 'text/markdown', notebookName).prevented, true);
  assert.equal(checkDownload(notebookURL, 'text/markdown', 'program.exe').prevented, true);
  assert.equal(checkDownload(notebookURL, 'text/markdown', notebookName, {getURL: () => 'https://evil.test/'}).prevented, true);
  // A configured roll-notebook save folder persists to disk and saves silently, no dialog.
  assert.equal(call('state').savePath, '');
  const chosenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollparty-notebooks-'));
  dialogResult = { canceled: false, filePaths: [chosenDir] };
  assert.equal(await call('choose-save-path'), chosenDir);
  assert.equal(call('state').savePath, chosenDir);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(userDataDir, 'settings.json'), 'utf8')), { savePath: chosenDir });
  let savedTo, promptedDialog = false;
  remoteSession.emit('will-download', { preventDefault() {} }, {
    getURL: () => notebookURL, getMimeType: () => 'text/markdown', getFilename: () => notebookName,
    setSavePath: (p) => { savedTo = p; }, setSaveDialogOptions: () => { promptedDialog = true; },
  }, room.webContents);
  assert.equal(savedTo, path.join(chosenDir, notebookName));
  assert.equal(promptedDialog, false);
  // Canceling the folder picker leaves the existing choice untouched.
  dialogResult = { canceled: true, filePaths: [] };
  assert.equal(await call('choose-save-path'), chosenDir);
  assert.equal(await call('clear-save-path'), '');
  assert.equal(call('state').savePath, '');
  assert.equal(checkDownload(notebookURL, 'text/markdown', notebookName).dialog?.filters[0].extensions[0], 'md');
  handlers.get('overlay:resize')({ sender:overlay.webContents, senderFrame:overlay.webContents.mainFrame }, 600, 500);
  assert.equal(overlay.bounds.width, 600);
  assert.equal(overlay.bounds.height, 500);
  assert(overlay.bounds.y + overlay.bounds.height <= 1040);
  await call('history', false);
  assert.match(overlay.webContents.lastCSS, /overlay-taskbar/);
  await call('history', true);
  call('visible', false);
  assert.equal(overlay.visible, false);
  call('visible', true);
  assert.equal(overlay.visible, true);
  call('display', 2);
  assert.equal(overlay.bounds.x, -1920);
  displays = displays.slice(0, 1);
  screen.emit('display-removed');
  assert.equal(overlay.bounds.x, 0);
  assert.throws(() => call('display', 999), /unavailable/);
  let blocked = false;
  room.webContents.emit('will-navigate', { preventDefault() { blocked = true; } }, 'https://evil.test/');
  assert.equal(blocked, true);
  room.webContents.emit('did-navigate-in-page', {}, config.SITE_ORIGIN + '/', true);
  assert.equal(overlay.visible, false);
  assert.equal(call('state').hasRoom, false);
  assert.equal(overlay.url, 'about:blank');
});
