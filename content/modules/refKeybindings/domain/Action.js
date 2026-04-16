/**  
 * Class representing an action.
*/
export default class Action {
  /**
   * Constructor for Action class.
   * @param {string} name - name of the action.
   * @param {string|null} bindsection - name of the bindsection this action belongs to,
   *  or null if it belongs to global section.
   * @param {string|null} value - value of the action.
   */
  constructor(name, bindsection, value = null) {
    this.name = name;
    this.bindsection = bindsection;
    this.value = value;
  }

  toString() {
    return `${this.name} ${this.value}`
  }
}