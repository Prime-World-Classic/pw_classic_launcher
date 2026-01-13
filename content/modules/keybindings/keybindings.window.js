import { DOM } from '../dom.js';
import { Lang } from '../lang.js';
import { domAudioPresets } from '../domAudioPresets.js';
import { KeybindStore } from './keybindings.store.js';
import { loadKeybinds, saveKeybinds } from './keybindings.io.js';
import { normalizeKey } from './keybindings.input.js';

export async function keybindings() {
  const ok = await loadKeybinds();

  if (!ok) {
    return DOM({}, 'Config not found');
  }

  const defaultKeys = ['1','2','3','4','5','6','7','8','9','0'];

  const rows = [];

  for (let i = 1; i <= 10; i++) {
    const slot = `slot${i}`;
    const current = KeybindStore.keybinds[slot] || defaultKeys[i-1];

    const input = DOM({
      tag: 'input',
      value: current,
      style: 'castle-keybinding-input',
      event: ['keydown', e => {
        e.preventDefault();
        const key = normalizeKey(e);
        input.value = key;
        KeybindStore.set(slot, key);
      }]
    });

    rows.push(
      DOM({ style: 'keybinding-row' },
        DOM({}, `Slot ${i}`),
        input
      )
    );
  }

  const saveBtn = DOM({
    domaudio: domAudioPresets.bigButton,
    style: 'castle-menu-item-button',
    event: ['click', async () => {
      await saveKeybinds();
    }]
  }, 'Save');

  const wrapper = DOM({ style: 'keybindings-wrapper' },
    DOM({ tag: 'h2' }, Lang.keybindings_title),
    ...rows
  );

  return DOM(
    { id: 'wcastle-keybindings' },
    wrapper,
    saveBtn
  );
}
