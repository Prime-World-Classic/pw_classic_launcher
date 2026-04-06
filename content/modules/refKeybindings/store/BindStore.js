/**
 * Class representing a store for keybindings. 
 */
export default class BindStore {
  /**
   * Singleton instance of BindStore.
   * @type {BindStore}
   * @static
   * @readonly
   */
  static #instance = null;

  /**
   * Creates a new instance of BindStore.
   * If an instance already exists, it will return the existing instance.
   * This is a singleton class, meaning only one instance can exist at any given time.
   * The instance will store all bindings and notify all listeners when the state of the store changes.
   */
  constructor() {
    if (BindStore.#instance) return BindStore.#instance;
    BindStore.#instance = this;

    this.binds = {};
    this.listeners = new Set();
  }

  /**
   * Updates the state of the store with new bindings.
   *
   * @param {Object} partialBinds - new bindings to add to the store.
   *
   * If the state of the store changes, all listeners will be notified.
   */
  setState(partialBinds) {
    const prevBinds = this.binds;
    this.binds = { ...this.binds, ...partialBinds };

    if (JSON.stringify(prevBinds) !== JSON.stringify(this.binds)) {
      this.notify();
    }
  }

  /**
   * Adds a listener to the list of listeners. Listeners are notified when the state of the store changes.
   *
   * @param {function} listener - listener to add.
   *
   * @returns {function} - a function to remove the listener.
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.add(listener);

    return () => this.removeListener(listener);
  }

  /**
   * Remove a listener from the list of listeners.
   *
   * @param {function} listener - listener to remove.
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of the state change.
   */
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
