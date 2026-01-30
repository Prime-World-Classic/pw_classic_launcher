import { DOM } from '../dom.js';
import { KeybindStore } from './keybindings.store.js';
import { serializeCfg, parseKeybindCfg } from './keybindings.parser.js';
import { NativeAPI } from '../nativeApi.js';

async function createDefaultConfigFile(targetPath) {
  if (!NativeAPI.status) return false;

  const targetDir = NativeAPI.path.dirname(targetPath);

  try {
    console.log('Creating default config file at', targetPath);

    await NativeAPI.fileSystem.promises.mkdir(targetDir, {
      recursive: true,
    });

    const r = await fetch('/content/keybindsFallback.cfg', {
      cache: 'no-store',
    });

    if (!r.ok) {
      console.error('Failed to fetch fallback config');
      return false;
    }

    const data = await r.text();

    await NativeAPI.fileSystem.promises.writeFile(targetPath, data, {
      encoding: 'utf8',
      flag: 'wx',
    });

    console.log('Default config file created at', targetPath);
    return true;

  } catch (e) {
    if (e.code === 'EEXIST') {
      return true;
    }

    console.error('Failed to create default config file:', e);
    return false;
  }
}

export async function findConfigFile() {
  if (NativeAPI.status) {
    console.log('Searching for native config file...');
    const documentsPath = NativeAPI.getDocumentsDir();
    const configPath = NativeAPI.path.join(documentsPath, 'My Games', 'Prime World Classic', 'input_new.cfg');

    try {
      await NativeAPI.fileSystem.promises.access(configPath);
      console.log('Found native config file at', configPath);
      return { type: 'native', path: configPath };
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('Native config file not found at', configPath);
        const created = await createDefaultConfigFile(configPath);
        if (created) {
          return { type: 'native', path: configPath };
        }
      }
      console.error('Failed to access native config file:', e);
    }
  }
  console.log('Searching for browser config file...');
  try {
    const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
    if (r.ok) {
      return { type: 'browser', path: '/content/keybindsFallback.cfg' };
    }
  } catch (e) {
    console.error('Failed to fetch browser config file:', e);
  }

  return null;
}

export async function loadKeybinds() {
  const cfg = await findConfigFile();
  if (!cfg) return false;

  let data;

  if (cfg.type === 'native') {
    data = await NativeAPI.fileSystem.promises.readFile(cfg.path, 'utf8');
  } else {
    data = await fetch(cfg.path).then((r) => r.text());
  }

  const binds = parseKeybindCfg(data);

  KeybindStore.fileModel = binds;
  KeybindStore.uiModel = KeybindStore.mapFileToUiModel(binds);

  console.log(KeybindStore.uiModel);

  // KeybindStore.setAll(binds);
  KeybindStore.source = cfg.type;
  console.log('Keybinds loaded from', cfg.type, cfg.path);
  KeybindStore.configPath = cfg.path;

  return true;
}

export async function saveKeybinds() {
  const data = serializeCfg(KeybindStore.fileModel);
  console.log('Saving keybinds:', data);

  if (KeybindStore.source === 'native') {
    await NativeAPI.fileSystem.promises.writeFile(KeybindStore.configPath, data);
  } else {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'input_new.cfg',
      types: [{ description: 'Config', accept: { 'text/plain': ['.cfg'] } }],
    });

    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
}
