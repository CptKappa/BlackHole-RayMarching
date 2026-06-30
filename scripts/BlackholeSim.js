import { GLCanvas } from './GLCanvas.js';
import * as shaders from './shaders.js';
import { Camera } from './Camera.js';
import { Viewport } from './Viewport.js';
import { Blackhole } from './Blackhole.js';

export class BlackholeSim extends GLCanvas {
	#positionBuffer;
	#skybox;

	#attribLocations;
	#uniformLocations;

	#camera;
	#viewport;

	#blackhole;

	constructor(canvasId, width, height) {
		super(canvasId, width, height);

		// setting initial values
		this.center = [-0.5, 0];

		this.#camera = new Camera(vec3.fromValues(-40.0, 0.0, 0.0), vec3.fromValues(0.0, 0.0, 0.0))

		super.loadShaders(shaders.getVertexShader(), shaders.getFragmentShader());

		this.addTextField('frametime');
		this.addTextField('buildtime');

		this.#loadLocations();
		this.#initBuffers();
		console.log("Camera: ", this.#camera);

		this.#blackhole = new Blackhole(Blackhole.CENTER, Blackhole.ID, 1.0, 0.8);
	}

	async init() {
		this.#skybox = await this.#loadSkybox();
	}

	async render() {
		const startTime = Date.now();

		this.#setupViewport();
		await this.#drawScene();
		
		const lastFrameTime = Date.now() - startTime;
		this.textFields['buildtime'].nodeValue = lastFrameTime;
	}

	resize(width, height) {
		console.log("[Resize-Event] (" + this.canvas.clientWidth + "," + this.canvas.clientHeight + ") Aspect: " + this.canvas.clientWidth / this.canvas.clientHeight + " -> (" + width + "," + height + ") Aspect: " + width / height);

		super.resize(width, height);

		// redraw
		this.render();
	}

	translate(originX, originY, destinationX, destinationY) {
		console.log("[Translate-Event]");

		const dx = destinationX - originX;
		const dy = destinationY - originY;

		this.#camera.rotateAround(-dy, -dx);


		// redraw
		this.render();
	}

	#setupViewport() {
		// https://en.wikipedia.org/wiki/Ray_tracing_(graphics)#Calculate_rays_for_rectangular_viewport
		const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
		const focalLength = 1.0; // distance between camera and viewport
			
		const h = Math.tan(this.#camera.fov / 2.0);
		const viewportDim = vec2.fromValues(2.0 * h * focalLength * aspect, 2.0 * h * focalLength);

		const viewportRight = vec3.create();
		vec3.scale(
			viewportRight, 
			this.#camera.getRight(), 
			viewportDim[0]
		);
		
		const viewportUp = vec3.create();
		vec3.scale(
			viewportUp, 
			this.#camera.getUp(), 
			viewportDim[1]
		);

		// ray to center of bottom left pixel
		const viewportAnchor = vec3.create();
		vec3.sub(viewportAnchor, 
			vec3.scale(vec3.create(), this.#camera.getForward(), focalLength), 
			vec3.scale(vec3.create(), viewportUp, 0.5)
		);
		vec3.sub(viewportAnchor, 
			viewportAnchor, 
			vec3.scale(vec3.create(), viewportRight, 0.5)
		);
		vec3.add(viewportAnchor, 
			viewportAnchor, 
			vec3.scale(vec3.create(), viewportRight, 0.5 / this.canvas.clientWidth)
		);
		vec3.add(viewportAnchor, 
			viewportAnchor, 
			vec3.scale(vec3.create(), viewportUp, 0.5 / this.canvas.clientHeight)
		);


		this.#viewport = new Viewport(viewportAnchor, viewportUp, viewportRight);

		console.log("Viewport: ", this.#viewport)
	}
	
	async #drawScene() {
		console.log("[Draw Scene]");

		this.gl.viewport(0, 0, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
	
		// set clear color to black, fully opaque
		this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
	
		// clear buffer
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		

	
		// set vertex data
		{
			const numComponents = 2;
			const type = this.gl.FLOAT;
			const normalize = false;
			const stride = 0;
			const offset = 0;
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#positionBuffer);
			this.gl.vertexAttribPointer(
				this.#attribLocations.vertexPosition, 
				numComponents, 
				type, 
				normalize, 
				stride, 
				offset
			);
			this.gl.enableVertexAttribArray(this.#attribLocations.vertexPosition);
		}
	
		this.gl.useProgram(this.program);
		
		// set uniforms
		this.gl.uniform2f(this.#uniformLocations.resolution, this.canvas.clientWidth, this.canvas.clientHeight);
		// https://www.reddit.com/r/opengl/comments/ax4z6n/passing_data_from_the_program_to_a_struct_uniform/
		this.gl.uniform3fv(this.#uniformLocations.camera.position, this.#camera.getPosition());
		this.gl.uniform3fv(this.#uniformLocations.camera.forward, this.#camera.getForward());
		this.gl.uniform3fv(this.#uniformLocations.camera.up, this.#camera.getUp());
		this.gl.uniform3fv(this.#uniformLocations.camera.right, this.#camera.getRight());
		this.gl.uniform1f(this.#uniformLocations.camera.fov, this.#camera.fov);
		
		this.gl.uniform3fv(this.#uniformLocations.viewport.anchor, this.#viewport.getAnchor());
		this.gl.uniform3fv(this.#uniformLocations.viewport.up, this.#viewport.getUp());
		this.gl.uniform3fv(this.#uniformLocations.viewport.right, this.#viewport.getRight());

		this.gl.uniform3fv(this.#uniformLocations.blackhole.position, this.#blackhole.getPosition());
		this.gl.uniformMatrix4fv(this.#uniformLocations.blackhole.rotation, false, this.#blackhole.getRotation());
		this.gl.uniform1f(this.#uniformLocations.blackhole.M, this.#blackhole.getM());
		this.gl.uniform1f(this.#uniformLocations.blackhole.a, this.#blackhole.getA());
		
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.#skybox);
		this.gl.uniform1i(this.#uniformLocations.uSampler, 0);

		{
			const offset = 0;
			const vertexCount = 4;
			this.gl.drawArrays(this.gl.TRIANGLE_STRIP, offset, vertexCount);
		}

		const max_timeout = this.gl.getParameter(this.gl.MAX_CLIENT_WAIT_TIMEOUT_WEBGL);

		const sync = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

		while (this.gl.getSyncParameter(sync, this.gl.SYNC_STATUS) === this.gl.UNSIGNALED) {
			await new Promise(r => setTimeout(r, 100));
		}

		const syncStatus = this.gl.getSyncParameter(sync, this.gl.SYNC_STATUS);

		if (syncStatus !== this.gl.SIGNALED) {
			console.error("Failed waiting for GPU, error code: ", syncStatus);
		}

		this.gl.deleteSync(sync);
	}

	async #loadSkybox() {
		const skybox = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, skybox);

		const level = 0;
		const internalFormat = this.gl.RGBA;
		const srcFormat = this.gl.RGBA;
		const srcType = this.gl.UNSIGNED_BYTE;
				
		this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);

		// load images
		const images = [
			new Image(), 
			new Image(), 
			new Image(), 
			new Image(), 
			new Image(), 
			new Image()
		]
		
		const proms = images.map(img => new Promise(res => {
			img.onload = () => res(img);
		}));

		images[0].src = "../textures/nightsky/px.png";
		images[1].src = "../textures/nightsky/nx.png";
		images[2].src = "../textures/nightsky/py.png";
		images[3].src = "../textures/nightsky/ny.png";
		images[4].src = "../textures/nightsky/pz.png";
		images[5].src = "../textures/nightsky/nz.png";

		await Promise.all(proms);
		
		console.log("loaded images");
			
		for (let i = 0; i<6; i++) {
			this.gl.texImage2D(
				this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 
				level, 
				internalFormat, 
				srcFormat, 
				srcType, 
				images[i]
			);
		};

		console.log(images);

		return skybox;
	}

	printPos(posX, posY) {
		console.log({
			screen: [posX, posY]
		});
	}

	#loadLocations() {
		this.#attribLocations = {
			vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'), 
		};

		this.#uniformLocations = {
			resolution: this.gl.getUniformLocation(this.program, "resolution"), 
			camera: {
				position: this.gl.getUniformLocation(this.program, "camera.position"), 
				forward: this.gl.getUniformLocation(this.program, "camera.forward"), 
				up: this.gl.getUniformLocation(this.program, "camera.up"), 
				right: this.gl.getUniformLocation(this.program, "camera.right"), 
				fov: this.gl.getUniformLocation(this.program, "camera.fov"), 
			}, 
			viewport: {
				anchor: this.gl.getUniformLocation(this.program, "viewport.anchor"), 
				up: this.gl.getUniformLocation(this.program, "viewport.up"), 
				right: this.gl.getUniformLocation(this.program, "viewport.right"), 
			}, 
			blackhole: {
				position: this.gl.getUniformLocation(this.program, "blackhole.position"), 
				rotation: this.gl.getUniformLocation(this.program, "blackhole.rotation"), 
				M: this.gl.getUniformLocation(this.program, "blackhole.M"), 
				a: this.gl.getUniformLocation(this.program, "blackhole.a"), 
			}
		};
	}

	#initBuffers() {
		// position buffer
		const positions = [
			1.0, 1.0, 
			-1.0, 1.0, 
			1.0, -1.0, 
			-1.0, -1.0
		];

		this.#positionBuffer = this.initBuffer(positions);
	}
}