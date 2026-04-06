/**  
 * Class representing an action.
*/
export default class Action {
  /**
   * Constructor for Action class.
   * @param {string} name - name of the action.
   * @param {string|null} bindsection - name of the bindsection this action belongs to,
   *  or null if it belongs to global section.
   * @param {string|null} modifier - name of the modifier this action belongs to,
   *  or null if it doesn't belong to any modifier.
   */
  constructor(name, bindsection, modifier = null) {
    this.name = name;
    this.bindsection = bindsection;
    this.modifier = modifier;
  }

  toString() {
    return `${this.name} ${this.modifier}`
  }
}