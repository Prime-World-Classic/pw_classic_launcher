import Binding from '../domain/Binding';
import Action from '../domain/Action';
import KeyCombo from '../domain/KeyCombo';

export function createEmptySchema() {
  return {
    // GLOBAL
    console_prevcommand: new Binding('console_prevcommand', 'bind', [new Action('console_prevcommand')], null),
    console_nextcommand: new Binding('console_nextcommand', 'bind', [new Action('console_nextcommand')], null),
    console_scrollup: new Binding('console_scrollup', 'bind', [new Action('console_scrollup')], null),
    console_scrolldown: new Binding('console_scrolldown', 'bind', [new Action('console_scrolldown')], null),
    console_charleft: new Binding('console_charleft', 'bind', [new Action('console_charleft')], null),
    console_charright: new Binding('console_charright', 'bind', [new Action('console_charright')], null),
    console_home: new Binding('console_home', 'bind', [new Action('console_home')], null),
    console_end: new Binding('console_end', 'bind', [new Action('console_end')], null),
    console_runcommand: new Binding('console_runcommand', 'bind', [new Action('console_runcommand')], null),
    console_autocomplete: new Binding('console_autocomplete', 'bind', [new Action('console_autocomplete')], null),
    console_clear: new Binding('console_clear', 'bind', [new Action('console_clear')], null),
    console_eraselastchar: new Binding('console_eraselastchar', 'bind', [new Action('console_eraselastchar', null)], null),
    toggle_fps: new Binding('toggle_fps', 'bind_command', [new Action('toggle_fps')], null),
    screenshot_jpg: new Binding('screenshot', 'bind_command', [new Action('screenshot .jpg')], null),

    // ADVENTURE SCREEN
    adventure_screen: {
      cmd_move: new Binding('cmd_move', 'bind', [new Action('cmd_move')], null),
      cmd_attack: new Binding('cmd_attack', 'bind', [new Action('cmd_attack')], null),
      cmd_hold: new Binding('cmd_hold', 'bind', [new Action('cmd_hold')], null),

      // slots 1–24 (сгенерировано)
      ...Object.fromEntries(
        Array.from({ length: 24 }, (_, i) => {
          const key = `cmd_action_bar_slot${i + 1}`;
          return [key, new Binding(key, 'bind', [new Action(key)], null)];
        })
      ),

      self_cast_on: new Binding('self_cast_on', 'bind', [new Action('self_cast_on')], null),
      self_cast_off: new Binding('self_cast_off', 'bind', [new Action('self_cast_off')], null),

      cmd_portal: new Binding('cmd_portal', 'bind', [new Action('cmd_portal')], null),

      cs_toggle_healthbars: new Binding('cs_toggle_healthbars', 'bind', [new Action('cs_toggle_healthbars')], null),

      exit_game: new Binding('exit_game', 'bind', [new Action('exit_game')], null),

      camera_switch_attach_mode_down: new Binding(
        'camera_switch_attach_mode_down',
        'bind',
        [new Action('camera_switch_attach_mode_down')],
        null
      ),

      camera_switch_attach_mode_up: new Binding(
        'camera_switch_attach_mode_up',
        'bind',
        [new Action('camera_switch_attach_mode_up')],
        null
      ),

      show_statistics: new Binding('show_statistics', 'bind', [new Action('show_statistics')], null),
      hide_statistics: new Binding('hide_statistics', 'bind', [new Action('hide_statistics')], null),

      show_charstat: new Binding('show_charstat', 'bind', [new Action('show_charstat')], null),
      show_inventory: new Binding('show_inventory', 'bind', [new Action('show_inventory')], null),
      show_talents: new Binding('show_talents', 'bind', [new Action('show_talents')], null),

      actionbar_lock_off: new Binding('actionbar_lock_off', 'bind', [new Action('actionbar_lock_off')], null),
      actionbar_lock_on: new Binding('actionbar_lock_on', 'bind', [new Action('actionbar_lock_on')], null),
    }
  };
}
