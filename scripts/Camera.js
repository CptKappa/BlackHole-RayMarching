export class Camera {
	static YAW = 90.0;
	static PITCH = 0.0;
	static SPEED = 2.5;
	static SENSITIVITY = 0.1;
	static ZOOM = 45.0;
	static FOV = 90;
	static UP = vec3.fromValues(0.0, 1.0, 0.0);
	static PZ = vec3.fromValues(0.0, 0.0, 1.0);

	#position;
	#lookat;
	#worldUp;

	#up;
	#forward;
	#right;

	constructor(position, lookat, worldUp=Camera.UP) {
		this.#position = position;
		this.#lookat = lookat;
		this.#worldUp = worldUp;

		this.fov = 90 / 180 * Math.PI;

		this.#forward = vec3.create();
		vec3.sub(this.#forward, lookat, position);
		vec3.normalize(this.#forward, this.#forward);

		this.#right = vec3.create();
		vec3.cross(this.#right, worldUp, this.#forward);
		vec3.normalize(this.#right, this.#right);

		this.#up = vec3.create();
		vec3.cross(this.#up, this.#forward, this.#right);
		vec3.normalize(this.#up, this.#up);
	}

	getPosition() {
		return this.#position;
	}

	getUp() {
		return this.#up;
	}

	getForward() {
		return this.#forward;
	}

	getRight() {
		return this.#right;
	}

	rotateAround(pitch, yaw) {
		const positionOffset = vec3.create();
		vec3.sub(positionOffset, 
			this.#position, 
			this.#lookat
		);

		const pitchQuat = quat.setAxisAngle(quat.create(), this.#right, pitch/180*Math.PI * Camera.SENSITIVITY);
		vec3.transformQuat(this.#up, this.#up, pitchQuat);
		vec3.transformQuat(this.#forward, this.#forward, pitchQuat);
		vec3.transformQuat(this.#right, this.#right, pitchQuat);
		vec3.transformQuat(positionOffset, positionOffset, pitchQuat);

		const yawQuat = quat.setAxisAngle(quat.create(), this.#worldUp, yaw/180*Math.PI * Camera.SENSITIVITY);
		vec3.transformQuat(this.#up, this.#up, yawQuat);
		vec3.transformQuat(this.#forward, this.#forward, yawQuat);
		vec3.transformQuat(this.#right, this.#right, yawQuat);
		vec3.transformQuat(positionOffset, positionOffset, yawQuat);

		vec3.add(this.#position, 
			this.#lookat, 
			positionOffset
		);
	}
}