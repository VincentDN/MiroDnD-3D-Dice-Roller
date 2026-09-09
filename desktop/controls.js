const $ = (id) => document.getElementById(id);
let current;
function render(state) {
  current = state;
  $('display').replaceChildren(...state.displays.map((display) => {
    const option = document.createElement('option');
    option.value = String(display.id);
    option.textContent = display.label;
    return option;
  }));
  $('display').value = String(state.displayId);
  $('visible').checked = state.visible;
  $('history').checked = state.history;
  $('roller').textContent = state.hasRoom ? 'Open roller' : 'Create a room / open roller';
  $('status').textContent = !state.hasRoom ? 'Create or join a room to start.'
    : !state.visible ? 'Dice hidden. Your room stays connected.'
    : state.overlayReady ? 'Overlay open. New rolls will appear over Miro.' : 'Opening the dice overlay…';
  $('error').hidden = !state.error;
  $('error').textContent = state.error;
  $('shortcuts').replaceChildren(...state.shortcuts.map((shortcut) => {
    const li = document.createElement('li');
    li.textContent = `${shortcut.accelerator.replace('CommandOrControl', 'Ctrl')} - ${shortcut.label}${shortcut.available ? '' : ' (unavailable; use the tray menu)'} `;
    return li;
  }));
}
async function act(callback) {
  try { await callback(); }
  catch (error) {
    $('error').textContent = error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    $('error').hidden = false;
  }
}
$('join').addEventListener('submit', (event) => {
  event.preventDefault();
  void act(async () => { await window.rollparty.openRoom($('link').value); $('link').value = ''; });
});
$('roller').addEventListener('click', () => act(() => window.rollparty.showRoom()));
$('display').addEventListener('change', () => act(() => window.rollparty.setDisplay(Number($('display').value))));
$('visible').addEventListener('change', () => act(() => window.rollparty.setVisible($('visible').checked)));
$('history').addEventListener('change', () => act(() => window.rollparty.setHistory($('history').checked)));
$('retry').addEventListener('click', () => act(() => window.rollparty.retry()));
$('quit').addEventListener('click', () => act(() => window.rollparty.quit()));
window.rollparty.onState(render);
void act(async () => render(await window.rollparty.state()));
