import { findParsedBind } from './keybindings.parser.js';
export function createEmptyFileModel() {
  return {
    sections: [
      // GLOBAL
      {
        name: null,
        binds: [
          { type: 'bind', command: 'console_prevcommand', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_nextcommand', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_scrollup', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_scrolldown', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_charleft', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_charright', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_home', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_end', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_runcommand', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_runcommand', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_autocomplete', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_clear', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'console_eraselastchar', value: null, negated: false, keys: [''] },
          { type: 'bind_command', command: 'toggle_fps', value: null, negated: false, keys: [''] },
          { type: 'bind_command', command: 'screenshot .jpg', value: null, negated: false, keys: [''] },
          { type: 'bind_command', command: 'screenshot .png', value: null, negated: false, keys: [''] },
        ],
      },

      //  adventure_screen (main)
      {
        name: 'adventure_screen',
        binds: [
          { type: 'bind', command: 'cmd_move', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_attack', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_hold', value: null, negated: false, keys: [''] },

          // slots 1–24
          ...Array.from({ length: 24 }, (_, i) => ({
            type: 'bind',
            command: `cmd_action_bar_slot${i + 1}`,
            value: null,
            negated: false,
            keys: [''],
          })),
          { type: 'bind', command: 'self_cast_on', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'self_cast_off', value: null, negated: true, keys: [''] },

          { type: 'bind', command: 'cmd_portal', value: null, negated: false, keys: [''] },

          { type: 'bind', command: 'cs_toggle_healthbars', value: null, negated: false, keys: [''] },

          { type: 'bind', command: 'exit_game', value: null, negated: false, keys: [''] },

          { type: 'bind', command: 'camera_switch_attach_mode_down', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'camera_switch_attach_mode_up', value: null, negated: true, keys: [''] },

          { type: 'bind', command: 'show_statistics', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'hide_statistics', value: null, negated: true, keys: [''] },

          { type: 'bind', command: 'show_charstat', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'show_inventory', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'show_talents', value: null, negated: false, keys: [''] },

          { type: 'bind', command: 'actionbar_lock_off', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'actionbar_lock_on', value: null, negated: true, keys: [''] },
        ],
      },

      //  GLOBAL
      {
        name: null,
        binds: [
          { type: 'bind', command: 'cmd_cancel', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cs_mouse_wheel_down', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cs_mouse_wheel_up', value: null, negated: true, keys: [''] },
          { type: 'bind', command: 'exit_bind', value: null, negated: false, keys: [''] },
        ],
      },

      //  adventure_screen (camera numeric)
      {
        name: 'adventure_screen',
        binds: [
          { type: 'bind', command: 'camera_zoom', value: '+1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_zoom', value: '-1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_forward', value: '+1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_forward', value: '-1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_strafe', value: '+1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_strafe', value: '-1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_pitch', value: '-1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_pitch', value: '+1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_rotate', value: '+1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_rotate', value: '-1.0', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_zoom_mouse', value: '-0.003', negated: false, keys: [''] },
        ],
      },

      //  GLOBAL (mouse camera)
      {
        name: null,
        binds: [
          { type: 'bind', command: '+camera_roll', value: null, negated: false, keys: [''] },
          { type: 'bind', command: '-camera_roll', value: null, negated: false, keys: [''] },
          { type: 'bind', command: '+camera_upward', value: null, negated: false, keys: [''] },
          { type: 'bind', command: '-camera_upward', value: null, negated: false, keys: [''] },

          { type: 'bind', command: 'camera_rotate_mouse', value: '0.03', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_pitch_mouse', value: '0.03', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_strafe_mouse', value: '-0.03', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_strafe_mouse', value: '0.03', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_forward_mouse', value: '0.03', negated: false, keys: [''] },
          { type: 'bind', command: 'camera_forward_mouse', value: '0.03', negated: false, keys: [''] },
        ],
      },

      //  minigame
      {
        name: 'minigame',
        binds: [
          { type: 'bind', command: 'minigame_escape', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'easel_mg_boost1', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'easel_mg_boost2', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'easel_mg_boost3', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'easel_mg_heroic_boost', value: null, negated: false, keys: [''] },
        ],
      },

      //  GLOBAL (chat & misc)
      {
        name: null,
        binds: [
          { type: 'bind', command: 'cmd_smart_chat', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_cancel', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_1', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_2', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_3', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_4', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_5', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_6', value: null, negated: false, keys: [''] },
          { type: 'bind', command: 'cmd_smart_chat_7', value: null, negated: false, keys: [''] },
        ],
      },
    ]
  };
}

export function createEmptyUiModel() {
  return {
    talents: {
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`cmd_action_bar_slot${i + 1}`, null])),

      self_cast_on: {
        keys: [''],
        self_cast_off: null,
      },

      cmd_portal: null,
      actionbar_lock_off: {
        keys: [''],
        actionbar_lock_on: null,
      },
    },
    additionalTalents: {
      ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`cmd_action_bar_slot${i + 11}`, null])),
    },
    smartChat: {
      cmd_smart_chat: null,
      ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`cmd_smart_chat_${i + 1}`, null])),
    },
    fighting: {
      cmd_move: null,
      cmd_attack: null,
      cmd_hold: null,
      cs_toggle_healthbars: null,
    },
    windowManagement: {
      chat_open_close: null,
      chat_open_global: null,
      chat_open_team: null,
      show_statistics: {
        keys: [''],
        hide_statistics: null,
      },
      show_charstat: null,
      show_inventory: null,
      show_talents: null,
    },
    camera: {
      camera_switch_attach_mode_down: {
        keys: [''],
        camera_switch_attach_mode_up: null,
      },
      camera_forward: {
        '+1.0': null,
        '-1.0': null,
      },
      camera_strafe: {
        '+1.0': null,
        '-1.0': null,
      },
      camera_rotate: {
        '+1.0': null,
        '-1.0': null,
      },
    },
  }
}

export function normalizeFileModel(schemaModel, parsedModel) {
  for (const schemaSection of schemaModel.sections) {
    for (const schemaBind of schemaSection.binds) {

      const match = findParsedBind(
        parsedModel,
        schemaBind.command,
        schemaBind.value,
        schemaBind.negated
      );

      if (match && Array.isArray(match.keys)) {
        schemaBind.keys = [...match.keys];
      } else {
        schemaBind.keys = null;
      }
    }
  }

  return schemaModel;
}