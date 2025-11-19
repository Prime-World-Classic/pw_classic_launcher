import { Window } from './window.js';

/**
 * @class CastleBuildingsEvents
 * @description Events for castle buildings.
 */
export class CastleBuildingsEvents {
	/**
	 * Opens the inventory window.
	 */
	static library() {
		Window.show('main', 'inventory');
	}
	/**
	 * Opens the farm window.
	 */
	static talent_farm() {
		Window.show('main', 'farm');
	}
}