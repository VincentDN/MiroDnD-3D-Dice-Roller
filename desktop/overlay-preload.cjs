const { ipcRenderer } = require('electron');
// No API is exposed to remote page scripts. A host-owned resize grip sends only sizes.
window.addEventListener('DOMContentLoaded', () => {
  const grip = document.createElement('div');
  grip.setAttribute('aria-label', 'Resize floating window');
  grip.title = 'Drag to resize';
  Object.assign(grip.style, { position:'fixed', right:'0', bottom:'0', width:'22px', height:'22px',
    zIndex:'2147483647', cursor:'nwse-resize', background:'linear-gradient(135deg, transparent 45%, #c44dff 46%, #c44dff 53%, transparent 54%, transparent 65%, #c44dff 66%, #c44dff 73%, transparent 74%)',
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
  if(new URLSearchParams(location.hash.slice(1)).get('surface') === 'hotbar') {
    let interactive=false;
    const button=document.createElement('button');
    button.type='button';
    Object.assign(button.style,{position:'fixed',right:'42px',top:'4px',zIndex:'2147483647',height:'30px',padding:'0 10px',border:'1px solid #ae76d6',borderRadius:'6px',background:'#202f3b',color:'#ffffff',cursor:'pointer',webkitAppRegion:'no-drag'});
    const render=()=> {button.textContent=interactive?'Lock table / click through':'Interact with table';button.setAttribute('aria-pressed',String(interactive));};
    button.title='Toggle table mouse interaction (Ctrl+Shift+T). The hotbar always remains clickable.';
    button.addEventListener('click',()=>ipcRenderer.send('overlay:interaction',!interactive));
    ipcRenderer.on('overlay:interaction-state',(_event,value)=>{interactive=value===true;render();});
    render();document.body.appendChild(button);ipcRenderer.send('overlay:state');
  }
});
