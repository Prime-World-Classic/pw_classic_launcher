import { describe, it, expect } from 'vitest';
import { normalizeFileModel } from '../content/modules/keybindings/keybindings.schema.js';
import { createEmptyFileModel } from '../content/modules/keybindings/keybindings.schema.js';

function parsed(sections) {
  return { sections };
}

describe('normalizeFileModel (last-wins strategy)', () => {
  it('applies keys from parsed to schema (basic case)', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'console_prevcommand',
            value: null,
            negated: false,
            keys: ['UP'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const bind = result.sections[0].binds.find((b) => b.command === 'console_prevcommand');

    expect(bind.keys).toEqual(['UP']);
  });

  it('uses last-wins for duplicate binds in same section', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'console_runcommand',
            value: null,
            negated: false,
            keys: ['ENTER'],
          },
          {
            type: 'bind',
            command: 'console_runcommand',
            value: null,
            negated: false,
            keys: ['NUM_ENTER'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const binds = result.sections[0].binds.filter((b) => b.command === 'console_runcommand');

    expect(binds[0].keys).toEqual(['NUM_ENTER']);
  });

  it('uses last-wins across multiple GLOBAL sections', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'cmd_cancel',
            value: null,
            negated: false,
            keys: ['ESC'],
          },
        ],
      },
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'cmd_cancel',
            value: null,
            negated: false,
            keys: ['Q'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const globalSection = result.sections.find((s) => s.name === null && s.binds.some((b) => b.command === 'cmd_cancel'));

    const bind = globalSection.binds.find((b) => b.command === 'cmd_cancel');

    expect(bind.keys).toEqual(['Q']);
  });

  it('does not mix GLOBAL and named sections', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'cmd_move',
            value: null,
            negated: false,
            keys: ['Q'],
          },
        ],
      },
      {
        name: 'adventure_screen',
        binds: [
          {
            type: 'bind',
            command: 'cmd_move',
            value: null,
            negated: false,
            keys: ['W'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const adventure = result.sections.find((s) => s.name === 'adventure_screen');

    const bind = adventure.binds.find((b) => b.command === 'cmd_move');

    expect(bind.keys).toEqual(['W']);
  });

  it('treats numeric value as part of identity (+1.0 vs -1.0)', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: 'adventure_screen',
        binds: [
          {
            type: 'bind',
            command: 'camera_zoom',
            value: '+1.0',
            negated: false,
            keys: ['PG_DOWN'],
          },
          {
            type: 'bind',
            command: 'camera_zoom',
            value: '-1.0',
            negated: false,
            keys: ['PG_UP'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);
    const adventureSections = result.sections.filter((s) => s.name === 'adventure_screen');

    const plus = adventureSections.flatMap((s) => s.binds).find((b) => b.command === 'camera_zoom' && b.value === '+1.0');

    const minus = adventureSections.flatMap((s) => s.binds).find((b) => b.command === 'camera_zoom' && b.value === '-1.0');

    expect(plus.keys).toEqual(['PG_DOWN']);
    expect(minus.keys).toEqual(['PG_UP']);
  });

  it('ignores unknown binds from parsedModel', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'some_unknown_command',
            value: null,
            negated: false,
            keys: ['X'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const any = result.sections.flatMap((s) => s.binds).some((b) => b.command === 'some_unknown_command');

    expect(any).toBe(false);
  });

  it('sets keys to null when bind is missing in parsedModel', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([]);

    const result = normalizeFileModel(schema, parsedModel);

    const bind = result.sections[0].binds.find((b) => b.command === 'console_prevcommand');

    expect(bind.keys).toBeNull();
  });

  it('supports bind_command with last-wins strategy', () => {
    const schema = createEmptyFileModel();

    const parsedModel = parsed([
      {
        name: null,
        binds: [
          {
            type: 'bind_command',
            command: 'toggle_fps',
            value: null,
            negated: false,
            keys: ['F10'],
          },
          {
            type: 'bind_command',
            command: 'toggle_fps',
            value: null,
            negated: false,
            keys: ['F11'],
          },
        ],
      },
    ]);

    const result = normalizeFileModel(schema, parsedModel);

    const bind = result.sections[0].binds.find((b) => b.type === 'bind_command' && b.command === 'toggle_fps');

    expect(bind.keys).toEqual(['F11']);
  });
});
