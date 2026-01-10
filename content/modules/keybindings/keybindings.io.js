import { KeybindStore } from './keybindings.store.js';
import { parseBinds, serializeBinds } from './keybindings.parser.js';
import { NativeAPI } from '../nativeApi.js';

export async function findConfigFile() {
  if (NativeAPI?.status) {
    const paths = [
      `${NativeAPI.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
      `${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
      `${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`,
    ];

    for (const p of paths) {
      try {
        await NativeAPI.fs.access(p);
        return { type: 'native', path: p };
      } catch {}
    }
  }

  try {
    const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
    if (r.ok) return { type: 'browser', path: '/content/keybindsFallback.cfg' };
  } catch {}

  return null;
}

export async function loadKeybinds() {
  const cfg = await findConfigFile();
  if (!cfg) return false;

  let text;

  if (cfg.type === 'native') {
    text = await NativeAPI.fs.readFile(cfg.path, 'utf8');
  } else {
    text = await fetch(cfg.path).then(r => r.text());
  }

  const binds = parseBinds(text);

  KeybindStore.setAll(binds);
  KeybindStore.source = cfg.type;
  KeybindStore.configPath = cfg.path;

  return true;
}

export async function saveKeybinds() {
  const text = serializeBinds(KeybindStore.binds);

  if (KeybindStore.source === 'native') {
    await NativeAPI.fs.writeFile(KeybindStore.configPath, text);
  } else {
    localStorage.setItem('keybinds', JSON.stringify(KeybindStore.binds));
  }
}
