export const KeybindStore = {
  binds: {},        // { slot1: '1', slot2: 'Q', ... }
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  set(slot, key) {
    this.binds[slot] = key;
    this.notify();
  },

  notify() {
    this.subscribers.forEach(fn => fn(this.binds));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
  }
};