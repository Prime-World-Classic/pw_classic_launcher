import { describe, it, expect, beforeEach } from 'vitest';
import { KeybindStore } from '../content/modules/keybindings/keybindings.store.js';
import { createEmptyFileModel } from '../content/modules/keybindings/keybindings.schema.js';
import { normalizeFileModel } from '../content/modules/keybindings/keybindings.schema.js';

function makeParsed(sections) {
  return { sections };
}

describe('KeybindStore linkedGroups', () => {
  beforeEach(() => {
    const schema = createEmptyFileModel();

    const parsedModel = makeParsed([
      {
        name: 'adventure_screen',
        binds: [
          {
            type: 'bind',
            command: 'show_statistics',
            value: null,
            negated: false,
            keys: ['TAB'],
          },
          {
            type: 'bind',
            command: 'hide_statistics',
            value: null,
            negated: true,
            keys: ['TAB'],
          },
        ],
      },
      {
        name: 'minigame',
        binds: [
          {
            type: 'bind',
            command: 'show_statistics',
            value: null,
            negated: false,
            keys: ['TAB'],
          },
          {
            type: 'bind',
            command: 'hide_statistics',
            value: null,
            negated: true,
            keys: ['TAB'],
          },
        ],
      },
    ]);

    KeybindStore.linkedGroups = {
      statistics: {
        members: [
          { command: 'show_statistics', negated: false },
          { command: 'hide_statistics', negated: true },
        ],
        sections: ['adventure_screen', 'minigame'],
      },
    };

    KeybindStore.init(
      normalizeFileModel(schema, parsedModel),
    );
  });

  it('updates all linked binds across sections', () => {
    KeybindStore.setBind('show_statistics', ['F1']);

    const advShow = KeybindStore.getBind('show_statistics');
    const advHide = KeybindStore.getBind('hide_statistics');

    expect(advShow.keys).toEqual(['F1']);
    expect(advHide.keys).toEqual(['F1']);

    const minigameSection = KeybindStore.fileModel.sections.find((s) => s.name === 'minigame');

    const miniShow = minigameSection.binds.find((b) => b.command === 'show_statistics');
    const miniHide = minigameSection.binds.find((b) => b.command === 'hide_statistics');

    expect(miniShow.keys).toEqual(['F1']);
    expect(miniHide.keys).toEqual(['F1']);
  });

  it('does not affect unrelated binds', () => {
    const before = KeybindStore.getBind('show_inventory');

    KeybindStore.setBind('show_statistics', ['F2']);

    const after = KeybindStore.getBind('show_inventory');

    expect(after).toBe(before);
  });

  it('keeps keys in sync when changing negated command', () => {
    KeybindStore.setBind('hide_statistics', ['ESC']);

    const show = KeybindStore.getBind('show_statistics');
    const hide = KeybindStore.getBind('hide_statistics');

    expect(show.keys).toEqual(['ESC']);
    expect(hide.keys).toEqual(['ESC']);
  });
});
