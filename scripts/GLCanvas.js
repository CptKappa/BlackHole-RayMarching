export class GLCanvas {
	constructor(canvasId, width, height) {
		this.textFields = [];

		/** @type {HTMLCanvasElement} */
		this.canvas = document.querySelector(canvasId);

		this.canvas.width = width;
		this.canvas.height = height;

		// init GL context
		/** @type {WebGL2RenderingContext} */
		this.gl = this.canvas.getContext("webgl2");

		// webgl working?
		if (this.gl === null) {
			alert("Unable to initialize WebGL. ");
			throw "Unable to initialize WebGL. ";
		}
	}

	resize(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;
	}

	addTextField(fieldId) {
		const fieldElem = document.getElementById(fieldId);
		this.textFields[fieldId] = document.createTextNode("");
		fieldElem.appendChild(this.textFields[fieldId]);
	}

	loadShaders(vsSource, fsSource) {
		const vertexShader = this.#loadShader(this.gl.VERTEX_SHADER, vsSource);
		const fragmentShader = this.#loadShader(this.gl.FRAGMENT_SHADER, fsSource);

		this.program = this.gl.createProgram();
		this.gl.attachShader(this.program, vertexShader);
		this.gl.attachShader(this.program, fragmentShader);
		this.gl.linkProgram(this.program);

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			alert("Error occured while linking shaders: " + this.gl.getProgramInfoLog(this.program));
			throw "Error occured while linking shaders: " + this.gl.getProgramInfoLog(this.program);
		}
	}

	#loadShader(type, source) {
		const shader = this.gl.createShader(type);
	
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
	
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			alert("Error occured while compiling shaders: " + this.gl.getShaderInfoLog(shader));
			this.gl.deleteShader(shader);
			return null;
		}
	
		return shader;
	}

	initBuffer(coords) {
		// position buffer
		const buffer = this.gl.createBuffer();
	
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
	
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(coords), this.gl.STATIC_DRAW);

		return buffer;
	}
}