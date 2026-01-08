import { NativeAPI } from '../nativeApi.js';
import { DOM } from '../dom.js';
import { Lang } from '../lang.js';
import { domAudioPresets } from '../domAudioPresets.js';
export async function keybindings() {
  async function findConfigFile() {
    if (NativeAPI.status) {
      const possiblePaths = [
        `${NativeAPI.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
        `${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
        `${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`,
      ];

      for (const path of possiblePaths) {
        try {
          await NativeAPI.fs.access(path);
          return path;
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  const configPath = await findConfigFile();

  if (!configPath) {
    console.error('Не удалось найти файл конфигурации ни по одному из путей');
    return DOM(
      { id: 'wcastle-keybindings' },
      DOM({ style: 'castle-menu-error' }, Lang.text('keybindings_error', 'Не удалось найти файл конфигурации клавиш')),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          class: 'castle-menu-item-button',
          event: ['click', () => Window.show('settings', 'menu')],
        },
        Lang.text('back', 'Назад'),
      ),
    );
  }

  const defaultKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  let currentBinds = {};
  let configReadError = false;

  try {
    const configContent = await NativeAPI.fs.readFile(configPath, 'utf-8');
    const bindRegex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
    let match;

    while ((match = bindRegex.exec(configContent)) !== null) {
      currentBinds[`slot${match[1]}`] = match[2];
    }
  } catch (e) {
    console.error('Ошибка чтения конфига:', e);
    configReadError = true;
  }

  return DOM(
    { id: 'wcastle-keybindings' },
    DOM({ style: 'castle-menu-title' }, Lang.text('keybindings_title', 'Настройка клавиш')),

    configReadError
      ? DOM(
          { style: 'castle-menu-error' },
          Lang.text('keybindings_error', 'Не удалось прочитать файл конфигурации клавиш. Проверьте путь:') + ' ' + configPath,
        )
      : DOM(
          {},
          ...Array.from({ length: 10 }, (_, i) => {
            const slotNum = i + 1;
            const slotKey = `slot${slotNum}`;
            const currentKey = currentBinds[slotKey] || defaultKeys[i];

            return DOM(
              { style: 'castle-menu-label keybinding-row' },
              DOM({ style: 'keybinding-label' }, Lang.text(`talent_slot_${slotNum}`, `Талант ${slotNum}`)),
              DOM({
                tag: 'input',
                domaudio: domAudioPresets.defaultInput,
                type: 'text',
                value: currentKey,
                class: 'castle-keybinding-input',
                maxLength: 1,
                event: [
                  'keydown',
                  (e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.target.value = '';
                      currentBinds[slotKey] = '';
                      return;
                    }

                    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
                      return;
                    }

                    e.preventDefault();
                    const key = e.key.toUpperCase();

                    if (/^[0-9A-Z]$/.test(key)) {
                      e.target.value = key;
                      currentBinds[slotKey] = key;
                      e.target.classList.add('input-success');
                      setTimeout(() => e.target.classList.remove('input-success'), 200);
                    } else {
                      e.target.classList.add('input-error');
                      setTimeout(() => e.target.classList.remove('input-error'), 200);
                    }
                  },
                ],
              }),
            );
          }),

          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              class: 'castle-menu-item-button reset-btn',
              event: [
                'click',
                () => {
                  document.querySelectorAll('.castle-keybinding-input').forEach((input, i) => {
                    input.value = defaultKeys[i];
                    currentBinds[`slot${i + 1}`] = defaultKeys[i];
                  });

                  const btn = document.querySelector('.reset-btn');
                  btn.classList.add('action-success');
                  btn.textContent = Lang.text('reset_complete', 'Сброшено!');
                  setTimeout(() => {
                    btn.classList.remove('action-success');
                    btn.textContent = Lang.text('reset_defaults', 'Сбросить на 1-0');
                  }, 1000);
                },
              ],
            },
            Lang.text('reset_defaults', 'Сбросить на 1-0'),
          ),

          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              class: 'castle-menu-item-button save-btn',
              event: [
                'click',
                async () => {
                  try {
                    let newConfig = '';
                    for (let i = 1; i <= 10; i++) {
                      const key = currentBinds[`slot${i}`] || defaultKeys[i - 1];
                      newConfig += `bind cmd_action_bar_slot${i} '${key}'\n`;
                    }

                    await NativeAPI.fs.writeFile(configPath, newConfig);

                    const btn = document.querySelector('.save-btn');
                    btn.classList.add('action-success');
                    btn.textContent = Lang.text('saved', 'Сохранено!');
                    setTimeout(() => {
                      btn.classList.remove('action-success');
                      btn.textContent = Lang.text('save', 'Сохранить');
                    }, 1000);
                  } catch (e) {
                    console.error('Ошибка сохранения:', e);
                    const btn = document.querySelector('.save-btn');
                    btn.classList.add('action-error');
                    btn.textContent = Lang.text('save_error', 'Ошибка!');
                    setTimeout(() => {
                      btn.classList.remove('action-error');
                      btn.textContent = Lang.text('save', 'Сохранить');
                    }, 1000);
                  }
                },
              ],
            },
            Lang.text('save', 'Сохранить'),
          ),
        ),

    DOM(
      {
        domaudio: domAudioPresets.bigButton,
        class: 'castle-menu-item-button',
        event: ['click', () => Window.show('settings', 'menu')],
      },
      Lang.text('back', 'Назад'),
    ),
  );
}
