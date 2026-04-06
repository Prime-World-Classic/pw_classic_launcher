import Action from "./Action";
import KeyCombo from "./KeyCombo";

/** 
 * Class representing a binding.
*/
export default class Binding {
  /**
   * Constructor for Binding class.
   * @param {string} id - id of the binding.
   * @param {'bind' | 'bind_command'} type - type of the binding.
   * @param {Action[]} actions - list of actions this binding is bound to.
   * @param {KeyCombo[]} keys - list of keys this binding is bound to.
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
          `${this.type} ${action.toString()} ${this.keys.toString()}`
        );
      });
    } else {
      return `${this.type} ${this.actions[0].toString()} ${this.keys.toString()}`
    }
  }
}