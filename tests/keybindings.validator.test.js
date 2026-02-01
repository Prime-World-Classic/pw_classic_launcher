import { describe, it, expect } from 'vitest';
import { validate } from '../content/modules/keybindings/keybindings.validator';

describe('validateBind – bind (valid)', () => {
  it('simple bind with single key', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'cmd_move',
        value: null,
        negated: false,
        keys: ['Q'],
      })
    ).not.toThrow();
  });

  it('bind with multiple keys', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'exit_game',
        value: null,
        negated: false,
        keys: ['ALT', 'X'],
      })
    ).not.toThrow();
  });

  it('bind with numeric value + key', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'camera_zoom',
        value: '+1.0',
        negated: false,
        keys: ['PG_DOWN'],
      })
    ).not.toThrow();
  });

  it('bind with negative numeric value', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'camera_zoom',
        value: '-0.03',
        negated: false,
        keys: ['MOUSE_AXIS_Z'],
      })
    ).not.toThrow();
  });

  it('bind with negated command', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'hide_statistics',
        value: null,
        negated: true,
        keys: ['TAB'],
      })
    ).not.toThrow();
  });

  it('bind with empty key list (allowed)', () => {
    expect(() =>
      validate({
        type: 'bind',
        command: 'cmd_action_bar_slot21',
        value: null,
        negated: false,
        keys: [],
      })
    ).not.toThrow();
  });
});
