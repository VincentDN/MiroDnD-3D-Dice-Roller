const { contextBridge, ipcRenderer } = require('electron');

// This preload is attached ONLY to the packaged local control panel.
contextBridge.exposeInMainWorld('rollparty', {
  state: () => ipcRenderer.invoke('desktop:state'),
  openRoom: (link) => ipcRenderer.invoke('desktop:open-room', link),
  showRoom: () => ipcRenderer.invoke('desktop:show-room'),
  setDisplay: (id) => ipcRenderer.invoke('desktop:display', id),
  setVisible: (visible) => ipcRenderer.invoke('desktop:visible', visible),
  setHistory: (visible) => ipcRenderer.invoke('desktop:history', visible),
  chooseSavePath: () => ipcRenderer.invoke('desktop:choose-save-path'),
  clearSavePath: () => ipcRenderer.invoke('desktop:clear-save-path'),
  retry: () => ipcRenderer.invoke('desktop:retry'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('desktop:state', listener);
    return () => ipcRenderer.removeListener('desktop:state', listener);
  },
});
