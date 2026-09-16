# BlackHole-RayMarching
A ray marching implementation of a rotating black hole as a WebGL shader. 

The shader implements a ray marching algorithm, using the [Kerr metric](https://en.wikipedia.org/wiki/Kerr_metric) to determine the path that light takes around the black hole. 
If some light ray is captured by the black hole, the corresponding pixel is displayed as black, otherwise, the pixel color is determined by the ray direction and taken from the background texture. 

This project was highly inspired by the following resources:
- <https://michaelmoroz.github.io/TracingGeodesics/>
- <https://www.shadertoy.com/view/MctGWj>

### Controls
**Left click + drag** - move around black hole at fixed distance
