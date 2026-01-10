/**
 * KeybindStore: manages keybindings for the application,
 * observer pattern implementation
 *
 * @typedef {Object} KeybindStore
 * @property {Object} binds - { slot1: '1', slot2: 'Q', ... }
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
  binds: {}, 
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  set(slot, key) {
    this.binds[slot] = key;
    this.notify();
  },

  setAll(newBinds) {
    this.binds = { ...newBinds };
    this.notify();
  },

  notify() {
    this.subscribers.forEach((fn) => fn(this.binds));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
  },
};
