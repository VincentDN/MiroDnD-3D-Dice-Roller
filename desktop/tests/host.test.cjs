const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
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
        send() {}, setWindowOpenHandler(fn) { this.popups = fn; },
        getURL: () => this.url,
        insertCSS: async () => 'css', removeInsertedCSS: async () => {},
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
  const app = Object.assign(new EventEmitter(), {
    requestSingleInstanceLock: () => true, whenReady: async () => {},
    setAppUserModelId() {}, quit() {},
  });
  const screen = Object.assign(new EventEmitter(), {
    getAllDisplays: () => displays, getPrimaryDisplay: () => displays[0], getDisplayMatching: () => displays[0],
  });
  class Tray extends EventEmitter { setToolTip() {} setContextMenu() {} destroy() {} }
  const electron = { app, screen, BrowserWindow: Window, Tray,
    Menu: { buildFromTemplate: (x) => x },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) },
    globalShortcut: { register: () => true, unregisterAll() {} },
    session: { fromPartition: () => Object.assign(new EventEmitter(), {
      setPermissionRequestHandler() {}, setPermissionCheckHandler() {},
    }) },
  };
  const directory = path.resolve(__dirname, '..');
  vm.runInNewContext(fs.readFileSync(path.join(directory, 'main.cjs'), 'utf8'), {
    require: (id) => id === 'electron' ? electron : id === './config.cjs' ? config : require(id),
    __dirname: directory,
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
  assert.equal(overlay.inactive, true);
  assert.equal(overlay.focused, undefined);
  handlers.get('overlay:resize')({ sender:overlay.webContents, senderFrame:overlay.webContents.mainFrame }, 600, 500);
  assert.equal(overlay.bounds.width, 600);
  assert.equal(overlay.bounds.height, 500);
  assert(overlay.bounds.y + overlay.bounds.height <= 1040);
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
