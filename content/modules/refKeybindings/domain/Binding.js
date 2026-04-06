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

  /**
   * Returns a string representation of the binding.
   * If the binding has multiple actions, it will return an array of strings
   * with each string representing an action and its bound keys.
   * If the binding has only one action, it will return a single string
   * representing the action and its bound keys.
   * @returns {string[]|string} - string representation of the binding.
   */
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