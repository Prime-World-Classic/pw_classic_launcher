import { describe, it, expect, beforeEach } from 'vitest';
import { KeybindStore } from '../content/modules/keybindings/keybindings.store.js';

function createMockModel() {
  return {
    sections: [
      {
        name: null,
        binds: [
          {
            type: 'bind',
            command: 'actionbar_lock_off',
            value: null,
            negated: false,
            keys: null,
          },
          {
            type: 'bind',
            command: 'actionbar_lock_on',
            value: null,
            negated: true,
            keys: null,
          },
        ],
      },
    ],
  };
}

describe('KeybindStore paired binds', () => {
  beforeEach(() => {
    const model = createMockModel();

    KeybindStore.fileModel = model;
    KeybindStore.mapFileToUiModel();
    KeybindStore.subscribers = [];
  });

  it('should set same keys for paired binds (actionbar_lock_off + actionbar_lock_on)', () => {
    const keys = ['TAB'];

    const result = KeybindStore.setBind('actionbar_lock_off', keys);
    
    console.log('Set result:', KeybindStore.getBind('actionbar_lock_off'), KeybindStore.getBind('actionbar_lock_on'));

    expect(result).toBe(true);

    const down = KeybindStore.getBind('actionbar_lock_off');
    const up = KeybindStore.getBind('actionbar_lock_on');

    expect(down).not.toBeNull();
    expect(up).not.toBeNull();

    expect(down.keys).toEqual(['TAB']);
    expect(up.keys).toEqual(['TAB']);
  });

});
