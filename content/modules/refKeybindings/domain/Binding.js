class Binding {
  /**
   * Constructor for Binding class.
   * @param {string} id - id of the binding.
   * @param {string[]} actions - list of actions this binding is bound to.
   * @param {string[]} keys - list of keys this binding is bound to.
   * @param {'bind' | 'bind_command'} type - type of the binding.
   */
  constructor (id, type, actions, keys) {
    this.id = id;
    this.type = type;
    this.actions = actions;
    this.keys = keys;
  }

  toString() {
    if (this.actions.length > 1) {
      result = [];
      this.actions.forEach(action => {
        result.push(
          `${this.type} ${action.toString()} ${
            this.keys && this.keys.length ? bind.keys.map((k) => `'${k}'`).join(' + ') : "''"
          }`
        );
      });
    }
    
  }
}