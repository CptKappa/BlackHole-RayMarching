export class Viewport {
	#anchor;
	#up;
	#right;

	constructor(anchor, up, right) {
		this.#anchor = anchor;
		this.#up = up;
		this.#right = right;
	}

	getAnchor() {
		return this.#anchor;
	}

	getUp() {
		return this.#up;
	}

	getRight() {
		return this.#right;
	}
}