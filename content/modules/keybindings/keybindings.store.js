/**
 * KeybindStore: manages keybindings for the application,
 * observer pattern implementation
 *
 * @typedef {Object} KeybindStore
 * @property {Keybinds} fileModel - { slot1: '1', slot2: 'Q', ... }
 * @property {'native'|'browser'} source - source of keybindings
 * @property {string|null} configPath - path to keybindings config file
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
  keybindsFileModel: {
    sections: [
      // GLOBAL 
      {
        name: null,
        binds: [
          { command: 'console_prevcommand', value: null, negated: false, keys: null },
          { command: 'console_nextcommand', value: null, negated: false, keys: null },
          { command: 'console_scrollup', value: null, negated: false, keys: null },
          { command: 'console_scrolldown', value: null, negated: false, keys: null },
          { command: 'console_charleft', value: null, negated: false, keys: null },
          { command: 'console_charright', value: null, negated: false, keys: null },
          { command: 'console_home', value: null, negated: false, keys: null },
          { command: 'console_end', value: null, negated: false, keys: null },
          { command: 'console_runcommand', value: null, negated: false, keys: null },
          { command: 'console_runcommand', value: null, negated: false, keys: null },
          { command: 'console_autocomplete', value: null, negated: false, keys: null },
          { command: 'console_clear', value: null, negated: false, keys: null },
          { command: 'console_eraselastchar', value: null, negated: false, keys: null },
        ],
      },

      //  adventure_screen (main) 
      {
        name: 'adventure_screen',
        binds: [
          { command: 'cmd_move', value: null, negated: false, keys: null },
          { command: 'cmd_attack', value: null, negated: false, keys: null },
          { command: 'cmd_hold', value: null, negated: false, keys: null },

          // slots 1–24
          ...Array.from({ length: 24 }, (_, i) => ({
            command: `cmd_action_bar_slot${i + 1}`,
            value: null,
            negated: false,
            keys: null,
          })),

          { command: 'self_cast_on', value: null, negated: false, keys: null },
          { command: 'self_cast_off', value: null, negated: true, keys: null },

          { command: 'cmd_portal', value: null, negated: false, keys: null },

          { command: 'cs_toggle_healthbars', value: null, negated: false, keys: null },

          { command: 'exit_game', value: null, negated: false, keys: null },

          { command: 'camera_switch_attach_mode_down', value: null, negated: false, keys: null },
          { command: 'camera_switch_attach_mode_up', value: null, negated: true, keys: null },

          { command: 'show_statistics', value: null, negated: false, keys: null },
          { command: 'hide_statistics', value: null, negated: true, keys: null },

          { command: 'show_charstat', value: null, negated: false, keys: null },
          { command: 'show_inventory', value: null, negated: false, keys: null },
          { command: 'show_talents', value: null, negated: false, keys: null },

          { command: 'actionbar_lock_off', value: null, negated: false, keys: null },
          { command: 'actionbar_lock_on', value: null, negated: true, keys: null },
        ],
      },

      //  GLOBAL 
      {
        name: null,
        binds: [
          { command: 'cmd_cancel', value: null, negated: false, keys: null },
          { command: 'cs_mouse_wheel_down', value: null, negated: false, keys: null },
          { command: 'cs_mouse_wheel_up', value: null, negated: true, keys: null },
          { command: 'exit_bind', value: null, negated: false, keys: null },
        ],
      },

      //  adventure_screen (camera numeric) 
      {
        name: 'adventure_screen',
        binds: [
          { command: 'camera_zoom', value: '+1.0', negated: false, keys: null },
          { command: 'camera_zoom', value: '-1.0', negated: false, keys: null },
          { command: 'camera_forward', value: '+1.0', negated: false, keys: null },
          { command: 'camera_forward', value: '-1.0', negated: false, keys: null },
          { command: 'camera_strafe', value: '+1.0', negated: false, keys: null },
          { command: 'camera_strafe', value: '-1.0', negated: false, keys: null },
          { command: 'camera_pitch', value: '-1.0', negated: false, keys: null },
          { command: 'camera_pitch', value: '+1.0', negated: false, keys: null },
          { command: 'camera_rotate', value: '+1.0', negated: false, keys: null },
          { command: 'camera_rotate', value: '-1.0', negated: false, keys: null },
          { command: 'camera_zoom_mouse', value: '-0.003', negated: false, keys: null },
        ],
      },

      //  GLOBAL (mouse camera) 
      {
        name: null,
        binds: [
          { command: '+camera_roll', value: null, negated: false, keys: null },
          { command: '-camera_roll', value: null, negated: false, keys: null },
          { command: '+camera_upward', value: null, negated: false, keys: null },
          { command: '-camera_upward', value: null, negated: false, keys: null },

          { command: 'camera_rotate_mouse', value: '0.03', negated: false, keys: null },
          { command: 'camera_pitch_mouse', value: '0.03', negated: false, keys: null },
          { command: 'camera_strafe_mouse', value: '-0.03', negated: false, keys: null },
          { command: 'camera_strafe_mouse', value: '0.03', negated: false, keys: null },
          { command: 'camera_forward_mouse', value: '0.03', negated: false, keys: null },
          { command: 'camera_forward_mouse', value: '0.03', negated: false, keys: null },
        ],
      },

      //  minigame 
      {
        name: 'minigame',
        binds: [
          { command: 'minigame_escape', value: null, negated: false, keys: null },
          { command: 'easel_mg_boost1', value: null, negated: false, keys: null },
          { command: 'easel_mg_boost2', value: null, negated: false, keys: null },
          { command: 'easel_mg_boost3', value: null, negated: false, keys: null },
          { command: 'easel_mg_heroic_boost', value: null, negated: false, keys: null },
        ],
      },

      //  GLOBAL (chat & misc) 
      {
        name: null,
        binds: [
          { command: 'cmd_smart_chat', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_cancel', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_1', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_2', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_3', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_4', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_5', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_6', value: null, negated: false, keys: null },
          { command: 'cmd_smart_chat_7', value: null, negated: false, keys: null },
        ],
      },
    ],
  },
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  set(slot, key) {
    this.keybindsFileModel[slot] = key;
    this.notify();
  },

  setAll(newBinds) {
    this.binds = { ...newBinds };
    this.notify();
  },

  notify() {
    this.subscribers.forEach((fn) => fn(this.keybindsFileModel));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
  },
};
