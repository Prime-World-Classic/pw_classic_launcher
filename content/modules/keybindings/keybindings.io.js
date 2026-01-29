import { DOM } from '../dom.js';
import { KeybindStore } from './keybindings.store.js';
import { serializeCfg, parseKeybindCfg } from './keybindings.parser.js';
import { NativeAPI } from '../nativeApi.js';

export async function findConfigFile() {
  if (NativeAPI?.status) {
    const basePaths = [
      NativeAPI.path.join(
        NativeAPI.os.homedir(),
        'Documents'
      ),
      NativeAPI.path.join(
        NativeAPI.os.homedir(),
        'OneDrive',
        'Documents'
      )
    ];

    const paths = basePaths.map(base =>
      NativeAPI.path.join(
        base,
        'My Games',
        'Prime World Classic',
        'input_new.cfg'
      )
    );

    for (const p of paths) {
      try {
        await NativeAPI.fs.access(p);
        return { type: 'native', path: p };
      } catch {}
    }

    const targetPath = paths[0];
    const targetDir = NativeAPI.path.dirname(targetPath);

    try {
      await NativeAPI.fs.mkdir(targetDir, { recursive: true });

      const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
      if (!r.ok) throw new Error();

      const data = await r.text();

      await NativeAPI.fs.writeFile(targetPath, data, {
        encoding: 'utf8',
        flag: 'wx'
      });

      return { type: 'native', path: targetPath };
    } catch (e) {
      if (e.code === 'EEXIST') {
        return { type: 'native', path: targetPath };
      }
    }
  }

  try {
    const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
    if (r.ok) {
      return { type: 'browser', path: '/content/keybindsFallback.cfg' };
    }
  } catch {}

  return null;
}

export async function loadKeybinds() {
  const cfg = await findConfigFile();
  if (!cfg) return false;

  let data;

  if (cfg.type === 'native') {
    data = await NativeAPI.fs.readFile(cfg.path, 'utf8');
  } else {
    data = await fetch(cfg.path).then(r => r.text());
  }

  const binds = parseKeybindCfg(data);
  
  KeybindStore.fileModel = binds;
  KeybindStore.uiModel = KeybindStore.mapFileToUiModel(binds);

  console.log(KeybindStore.uiModel);


  // KeybindStore.setAll(binds);
  KeybindStore.source = cfg.type;
  KeybindStore.configPath = cfg.path;

  return true;
}

export async function saveKeybinds() {
  const data = serializeCfg(KeybindStore.fileModel);
  console.log('Saving keybinds:', data);

  if (KeybindStore.source === 'native') {
    await NativeAPI.fs.writeFile(KeybindStore.configPath, data);
  } else {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = DOM({tag: 'a', href: url, download: 'input_new.cfg', event: ['click', () => {
      a.remove();
      url.revokeObjectURL(url);
    }]});
    document.body.appendChild(a);
    a.click();
  }
}
