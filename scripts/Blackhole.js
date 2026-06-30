export class Blackhole {
	static ID = mat4.identity(mat4.create());
	static CENTER = vec3.fromValues(0.0, 0.0, 0.0);

	#position;
	#rotation;
	#M;
	#a;

	constructor(position = CENTER, rotation = ID, M = 1.0, a = 0.8) {
		this.#position = position;
		this.#rotation = rotation;
		this.#M = M;
		this.#a = a;
	}

	getPosition() {
		return this.#position;
	}

	getRotation() {
		return this.#rotation;
	}

	getM() {
		return this.#M;
	}

	getA() {
		return this.#a;
	}
}