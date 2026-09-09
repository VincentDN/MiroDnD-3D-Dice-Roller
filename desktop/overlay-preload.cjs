const { ipcRenderer } = require('electron');
// No API is exposed to remote page scripts. A host-owned resize grip sends only sizes.
window.addEventListener('DOMContentLoaded', () => {
  const grip = document.createElement('div');
  grip.setAttribute('aria-label', 'Resize dice window');
  grip.title = 'Drag to resize';
  Object.assign(grip.style, { position:'fixed', right:'0', bottom:'0', width:'22px', height:'22px',
    zIndex:'2147483647', cursor:'nwse-resize', background:'linear-gradient(135deg, transparent 45%, #b8f279 46%, #b8f279 53%, transparent 54%, transparent 65%, #b8f279 66%, #b8f279 73%, transparent 74%)',
    touchAction:'none' });
  let drag = null;
  grip.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { x:e.screenX, y:e.screenY, width:window.outerWidth, height:window.outerHeight };
    grip.setPointerCapture(e.pointerId); e.preventDefault();
  });
  grip.addEventListener('pointermove', e => {
    if (drag) ipcRenderer.send('overlay:resize', drag.width+e.screenX-drag.x, drag.height+e.screenY-drag.y);
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) grip.addEventListener(name, () => { drag=null; });
  window.addEventListener('blur', () => { drag=null; });
  document.body.appendChild(grip);
});
