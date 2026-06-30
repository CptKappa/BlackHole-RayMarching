function getVertexShader() {
	return `#version 300 es
		precision highp float;

		in vec2 aVertexPosition;

		void main() {
			gl_Position = vec4(aVertexPosition, 0.0, 1.0);
		}
	`;
}

function getFragmentShader() {
	return `#version 300 es

		precision highp float;

		struct Camera {
			vec3 position;
			vec3 forward;
			vec3 up;
			vec3 right;
			float fov;
		};

		struct Viewport {
			vec3 anchor;
			vec3 up;
			vec3 right;
		};

		struct Ray {
			vec3 origin;
			vec3 direction;
		};

		struct Blackhole {
			vec3 position;
			mat4 rotation;
			float M;
			float a;
		};

		struct Sphere {
			vec3 center;
			float radius;
			vec4 color;
		};

		uniform vec2 resolution;
		uniform Camera camera;
		uniform Viewport viewport;

		uniform Blackhole blackhole;

		uniform samplerCube uSampler;
		
		out vec4 fragColor;

		#define PI 3.1415926538

		float step_size = 0.2;
		float gradient_eps = 0.01;
		int max_steps = 200;
		float G = 1.0;

		mat4 blackhole_a_axis_rotation = mat4(
			1.0, 0.0,  0.0, 0.0, 
			0.0, 0.0, -1.0, 0.0, 
			0.0, 1.0,  0.0, 0.0, 
			0.0, 0.0,  0.0, 1.0
		);

		const Sphere sphereX = Sphere(vec3(3.0, 0.0, 0.0), 0.5, vec4(1.0, 0.0, 0.0, 1.0));
		const Sphere sphereY = Sphere(vec3(0.0, 3.0, 0.0), 0.5, vec4(0.0, 1.0, 0.0, 1.0));
		const Sphere sphereZ = Sphere(vec3(0.0, 0.0, 3.0), 0.5, vec4(0.0, 0.0, 1.0, 1.0));
		Sphere spheres[3] = Sphere[](sphereX, sphereY, sphereZ);
		

		vec3 ray_at(Ray ray, float dist) {
			return ray.origin + dist * ray.direction;
		}

		bool hit_sphere(Sphere sphere, Ray ray) {
			vec3 oc = sphere.center - ray.origin;

			float a = dot(ray.direction, ray.direction);
			float h = -2.0 * dot(ray.direction, oc);
			float c = dot(oc, oc) - sphere.radius * sphere.radius;

			float discriminant = h * h - 4.0 * a * c;

			// 2 solutions (+), 1 solution (0), 0 solution (-)
			return (discriminant >= 0.0);
		}

		float get_r_from_stpos(vec4 st_pos, Blackhole bh) {
			vec3 s_pos = st_pos.yzw;

			float tmp = dot(s_pos, s_pos) - bh.a*bh.a;
			float r2 = 0.5 * (tmp + sqrt(tmp*tmp + 4.0 * bh.a*bh.a * s_pos.z*s_pos.z));
			return sqrt(r2);
		}

		mat4 kerr_metric(vec4 st_pos, Blackhole bh) {
			float r = get_r_from_stpos(st_pos, bh);
			vec3 s_pos = st_pos.yzw;

			float r2 = r*r;
			float a2 = bh.a*bh.a;

			float f = (2.0 * G*bh.M * r) / (r2 + (bh.a*bh.a * s_pos.z*s_pos.z)/(r2));

			vec4 k = vec4(1, 
			              (r*s_pos.x + bh.a*s_pos.y) / (r2 + a2), 
						  (r*s_pos.y - bh.a*s_pos.x) / (r2 + a2), 
						  s_pos.z/r);

			mat4 minkowski_tensor = mat4(-1.0,   0,   0,   0, 
										    0, 1.0,   0,   0, 
										    0,   0, 1.0,   0, 
										    0,   0,   0, 1.0);

			return minkowski_tensor + f * outerProduct(k, k);
		}

		mat4 minkowski_metric(vec4 st_pos) {
			return mat4(
				-1.0,   0,   0,   0, 
				   0, 1.0,   0,   0, 
				   0,   0, 1.0,   0, 
				   0,   0,   0, 1.0
			);
		}

		mat4 metric(vec4 st_pos, Blackhole bh) {
			return kerr_metric(st_pos, bh);
		}

		float hamiltonian(vec4 st_pos, vec4 momentum, Blackhole bh) {
			mat4 inv_g = inverse(metric(st_pos, bh));

			return 0.5 * dot(inv_g*momentum, momentum);
		}

		vec4 hamiltonian_gradient(vec4 st_pos, vec4 momentum, Blackhole bh) {
			// get hamiltonian of current position
			float curr_hamiltonian = hamiltonian(st_pos, momentum, bh);

			// get hamiltonians of position further in t, x, y, z direction by 'gradient_eps'
			vec4 next_hamiltonians = vec4(hamiltonian(st_pos + vec4(gradient_eps, 0, 0, 0), momentum, bh), 
										  hamiltonian(st_pos + vec4(0, gradient_eps, 0, 0), momentum, bh), 
										  hamiltonian(st_pos + vec4(0, 0, gradient_eps, 0), momentum, bh), 
										  hamiltonian(st_pos + vec4(0, 0, 0, gradient_eps), momentum, bh));

			// subtract hamiltonian of current position to get difference
			vec4 diff_hamiltonians = next_hamiltonians - curr_hamiltonian;
			
			// average hamiltonian differences of each direction over 'gradient_eps'
			vec4 avg_gradient = diff_hamiltonians / gradient_eps;

			return avg_gradient;
		}
		
		void integration_step(inout vec4 st_pos, inout vec4 momentum, Blackhole bh) {
			momentum = momentum - step_size * hamiltonian_gradient(st_pos, momentum, bh);
			st_pos = st_pos + step_size * inverse(metric(st_pos, bh)) * momentum;
		}

		vec4 get_null_momentum(vec4 st_pos, vec3 dir, Blackhole bh) {
			return metric(st_pos, bh) * vec4(1.0, normalize(dir));
		}

		vec3 get_direction(vec4 st_pos, vec4 momentum, Blackhole bh) {
			vec4 dxdt = inverse(metric(st_pos, bh)) * momentum;

			return normalize(dxdt.yzw);
		}

		vec3 world_to_bh(vec3 s_pos, Blackhole bh) {
			// inverse rotations and translations, because target of operations are the rays
			return (transpose(bh.rotation) * transpose(blackhole_a_axis_rotation) * vec4(s_pos - bh.position, 1.0)).xyz;
		}

		vec3 bh_to_world(vec3 s_pos, Blackhole bh) {
			return (bh.rotation * blackhole_a_axis_rotation * vec4(s_pos, 1.0)).xyz + bh.position;
		}

		bool trace_geodesic(inout Ray ray, inout float time, Blackhole bh) {
			vec4 st_pos = vec4(time, world_to_bh(ray.origin, bh));
			vec4 momentum = get_null_momentum(st_pos, (transpose(bh.rotation) * transpose(blackhole_a_axis_rotation) * vec4(ray.direction, 1.0)).xyz, bh);

			for (int i = 0; i < max_steps; i++) {
				integration_step(st_pos, momentum, bh);

				float r = get_r_from_stpos(st_pos, bh);
				if (r < 1.0 + sqrt(1.0 - bh.a*bh.a)) {
					return true;
				}
			}

			ray.origin = bh_to_world(st_pos.yzw, bh);
			time = st_pos.x;
			ray.direction = (bh.rotation * blackhole_a_axis_rotation * vec4(get_direction(st_pos, momentum, bh), 1.0)).xyz;


			return false;
		}

		vec4 ray_color(Ray ray) {
			float time = 0.0;

			bool captured = trace_geodesic(ray, time, blackhole);

			if (captured) {
				return vec4(0.0, 0.0, 0.0, 1.0);
				// return vec4(1.0, 1.0, 1.0, 1.0);
			}

			vec4 color = texture(uSampler, ray.direction);

			return color;
		}

		float grid_size = 50.0;

		void main() {
			vec2 uv = gl_FragCoord.xy / resolution; // [0.0, 1.0]
			Ray ray = Ray(camera.position, normalize(viewport.anchor + uv.x * viewport.right + uv.y * viewport.up));

			vec4 color = ray_color(ray);

			vec2 window_size = vec2(100.0);
			vec2 window = gl_FragCoord.xy - (resolution - window_size);

			if (window.x >= 0.0 && window.y >= 0.0) {
				vec2 window_uv = window / window_size;

				Ray ray = Ray(-camera.forward*5.0, normalize(viewport.anchor + window_uv.x * viewport.right + window_uv.y * viewport.up));

				// renders spheres in fixed order, not based on depth
				for (int i = 0; i < spheres.length(); i++) {
					if (hit_sphere(spheres[i], ray)) {
						color = spheres[i].color;
					}
				}
			}

			color = clamp(color*1.5-0.02, 0.0, 1.0);

			fragColor = color;
		}
	`;
}

export { getVertexShader, getFragmentShader };