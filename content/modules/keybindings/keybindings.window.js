import { DOM } from '../dom.js';
import { Lang } from '../lang.js';
import { domAudioPresets } from '../domAudioPresets.js';
import { KeybindStore } from './keybindings.store.js';
import { loadKeybinds, saveKeybinds } from './keybindings.io.js';
import { normalizeKey } from './keybindings.input.js';


function formatKeys(keys) {
  return keys && keys.length ? keys.join(' + ') : '';
}

function createKeyInput({ command, value = null }) {
  const input = DOM({
    tag: 'input',
    style: 'castle-keybinding-input',
    readonly: true,
  });

  function refresh() {
    const bind = KeybindStore.getBind(command, value);
    input.value = formatKeys(bind?.keys);
  }

  input.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape' || e.key === 'Enter') {
      input.blur();
      return;
    };

    const keys = normalizeKey(e);
    KeybindStore.setBind(command, keys, value);
  });

  KeybindStore.subscribe(refresh);
  refresh();

  return input;
}

function createRow(label, inputEl) {
  return DOM(
    { style: 'keybinding-row' },
    DOM({}, label),
    inputEl
  );
}

function createGroup(title, rows) {
  return DOM(
    { style: 'keybinding-group' },
    DOM({ tag: 'h3', style: 'keybinding-group-title' }, title),
    DOM({ style: 'keybinding-group-rows' },
      ...rows
    ),
  );
}


function buildTalents(ui) {
  const rows = [];

  for (let i = 1; i <= 10; i++) {
    const cmd = `cmd_action_bar_slot${i}`;
    rows.push(createRow(
      `Slot ${i}`,
      createKeyInput({ command: cmd })
    ));
  }

  rows.push(createRow(
    'Self cast',
    createKeyInput({ command: 'self_cast_on' })
  ));

  rows.push(createRow(
    'Portal',
    createKeyInput({ command: 'cmd_portal' })
  ));

  rows.push(createRow(
    'Action bar lock',
    createKeyInput({ command: 'actionbar_lock_off' })
  ));

  return createGroup('Talents', rows);
}

function buildAdditionalTalents() {
  const rows = [];

  for (let i = 11; i <= 24; i++) {
    const cmd = `cmd_action_bar_slot${i}`;
    rows.push(createRow(
      `Slot ${i}`,
      createKeyInput({ command: cmd })
    ));
  }

  return createGroup('Additional talents', rows);
}

function buildSmartChat() {
  const rows = [];

  rows.push(createRow(
    'Smart chat',
    createKeyInput({ command: 'cmd_smart_chat' })
  ));

  for (let i = 1; i <= 7; i++) {
    const cmd = `cmd_smart_chat_${i}`;
    rows.push(createRow(
      `Smart chat ${i}`,
      createKeyInput({ command: cmd })
    ));
  }

  return createGroup('Smart chat', rows);
}

function buildFighting() {
  const map = [
    ['Move', 'cmd_move'],
    ['Attack', 'cmd_attack'],
    ['Hold', 'cmd_hold'],
    ['Health bars', 'cs_toggle_healthbars'],
  ];

  const rows = map.map(([label, cmd]) =>
    createRow(label, createKeyInput({ command: cmd }))
  );

  return createGroup('Fighting', rows);
}

function buildWindowManagement() {
  const map = [
    ['Show statistics', 'show_statistics'],
    ['Character', 'show_charstat'],
    ['Inventory', 'show_inventory'],
    ['Talents', 'show_talents'],
  ];

  const rows = map.map(([label, cmd]) =>
    createRow(label, createKeyInput({ command: cmd }))
  );

  return createGroup('Window management', rows);
}

function buildCamera() {
  const rows = [];

  rows.push(createRow(
    'Camera mode',
    createKeyInput({ command: 'camera_switch_attach_mode_down' })
  ));

  const numeric = [
    ['Forward +', 'camera_forward', '+1.0'],
    ['Forward -', 'camera_forward', '-1.0'],
    ['Strafe +', 'camera_strafe', '+1.0'],
    ['Strafe -', 'camera_strafe', '-1.0'],
    ['Rotate +', 'camera_rotate', '+1.0'],
    ['Rotate -', 'camera_rotate', '-1.0'],
  ];

  for (const [label, cmd, value] of numeric) {
    rows.push(createRow(
      label,
      createKeyInput({ command: cmd, value })
    ));
  }

  return createGroup('Camera', rows);
}


export async function keybindings() {
  const ok = await loadKeybinds();
  if (!ok) return DOM({}, 'Config not found');

  const content = DOM(
    { style: 'keybindings-wrapper' },

    buildTalents(),
    buildAdditionalTalents(),
    buildSmartChat(),
    buildFighting(),
    buildWindowManagement(),
    buildCamera()
  );

  const saveBtn = DOM({
    domaudio: domAudioPresets.bigButton,
    style: 'castle-menu-item-button',
    event: ['click', async () => {
      await saveKeybinds();
    }]
  }, 'Save');

  const controls = DOM({ style: 'keybindings-controls' }, saveBtn);



  return DOM(
    { id: 'wcastle-keybindings' },
    content,
    controls
  );
}
