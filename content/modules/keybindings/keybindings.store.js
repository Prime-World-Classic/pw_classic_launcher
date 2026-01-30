import { createUiSchema, createFileSchema } from './keybindings.schema.js';
/**
 * KeybindStore: manages keybindings for the application,
 * observer pattern implementation
 *
 * @typedef {Object} KeybindStore
 * @property {Keybinds} fileModel - { slot1: '1', slot2: 'Q', ... }
 * @property {'native'|'browser'} source - source of keybindings
 * @property {string|null} configPath - path to keybindings config this.keybindsFileModel
 * @property {function[]} subscribers - list of subscribers to notify when keybindings change
 *
 * @method set - sets keybinding for a slot
 * @param {string} slot - slot to set keybinding for
 * @param {string} key - key to set for a slot
 *
 * @method setAll - sets keybindings for all slots
 * @param {Object} newBinds - object with keybindings to set
 *
 * @method notify - notifies subscribers about keybindings change
 *
 * @method subscribe - subscribes to keybindings change notification
 * @param {function} fn - callback function to call when keybindings change
 */

export const KeybindStore = {
  fileModel: {},
  uiModel: {},
  linkedCommands: {
    actionbar_lock_off: 'actionbar_lock_on',
    camera_switch_attach_mode_down: 'camera_switch_attach_mode_up',
    self_cast_on: 'self_cast_off',
    show_statistics: 'hide_statistics',
    cs_mouse_wheel_down: 'cs_mouse_wheel_up',
    minimap_signal_key_down: 'minimap_signal_key_up',
  },
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  init(fileModel) {
    this.fileModel = fileModel;
    this.uiModel = this.mapFileToUiModel();
    this.notify();
  },

  getBind(command, value = null) {
    for (const section of this.fileModel.sections) {
      for (const bind of section.binds) {
        if (bind.command === command && bind.value === value) {
          return bind;
        }
      }
    }
    return null;
  },
  setBind(command, keys, value = null) {
    const bind = this.getBind(command, value);
    if (!bind) return false;

    bind.keys = [...keys];

    const linked = this.linkedCommands[command];
    if (linked) {
      const linkedBind = this.getBind(linked, value);
      if (linkedBind) {
        linkedBind.keys = [...keys];
      }
    }

    this.uiModel = this.mapFileToUiModel(this.fileModel);
    this.notify();
    return true;
  },

  notify() {
    this.subscribers.forEach((fn) => fn(this.fileModel));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
    const unsubscribeFunc = () => {
      this.subscribers = this.subscribers.filter((f) => f !== fn);
    };
    return unsubscribeFunc;
  },

  mapFileToUiModel(fileModel = this.fileModel) {
    const ui = createUiSchema();

    for (const section of fileModel.sections) {
      for (const bind of section.binds) {
        // talents
        if (bind.command.startsWith('cmd_action_bar_slot')) {
          const n = Number(bind.command.replace('cmd_action_bar_slot', ''));
          if (n <= 10) ui.talents[bind.command] = bind.keys;
          else ui.additionalTalents[bind.command] = bind.keys;
          continue;
        }

        // paired buttons
        if (ui.talents[bind.command]?.keys !== undefined) {
          ui.talents[bind.command].keys = bind.keys;
          continue;
        }

        // camera numeric
        if (ui.camera[bind.command]?.[bind.value] !== undefined) {
          ui.camera[bind.command][bind.value] = bind.keys;
          continue;
        }

        // fighting
        if (bind.command in ui.fighting) {
          ui.fighting[bind.command] = bind.keys;
          continue;
        }

        // smart chat
        if (bind.command in ui.smartChat) {
          ui.smartChat[bind.command] = bind.keys;
          continue;
        }

        // window management
        if (bind.command in ui.windowManagement) {
          ui.windowManagement[bind.command] = bind.keys;
        }
      }
    }

    return ui;
  },
};
