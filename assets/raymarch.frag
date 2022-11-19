#version 410

out vec4 fragColor;

#define PI 3.1415925359

#define MAX_DIST 1000.0
#define MAX_STEP 100
#define SURFACE_DIST 0.05

uniform vec2 u_resolution;
uniform vec3 camera_position;
uniform mat4 camera_rotation_matrix;

float opUnion( float d1, float d2 ) { return min(d1,d2); }
float opSubtraction( float d1, float d2 ) { return max(-d1,d2); }
float opIntersection( float d1, float d2 ) { return max(d1,d2); }

float sdSphere(vec3 p, float s)
{
    return length(p)-s;
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdBoxFrame( vec3 p, vec3 b, float e )
{
       p = abs(p  )-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

float Map( vec3 p )
{
    const vec3 CSize = vec3(1., 1., 1.3);

	p = p.xzy;
	float scale = 1.;
	for( int i=0; i < 12; ++i )
	{
		p = 2.0*clamp(p, -CSize, CSize) - p;
		float r2 = dot(p,p);
        //float r2 = dot(p,p+sin(p.z*.3)); //Alternate fractal
		float k = max((2.)/(r2), .027);
		p     *= k;
		scale *= k;
	}
	float l = length(p.xy);
	float rxy = l - 4.0;
	float n = l * p.z;
	rxy = max(rxy, -(n) / 4.);
	return (rxy) / abs(scale);
}

float getDist(vec3 p)
{
    // float dSphere = sdSphere(p - vec3(0.0, 3.0, 10.0), 1.0);
    // float dTorus = sdTorus(p - vec3(0.0, 0.0, 10.0), vec2(1.0, 0.2));
    // float planeDist = p.y;
    vec3 c = camera_position;
    c.xy += 25.0;

    float dSphere = sdSphere(p - c, 25.0);
    float fractal = Map(p);

    return
        opSubtraction(dSphere, fractal);

    // return min(fractal, planeDist);

    // return
    //     opUnion(
    //         opUnion(dSphere, dTorus),
    //             planeDist
    //     );
}

vec3 GetNormal(vec3 p)
{
    float d = getDist(p); // Distance
    vec2 e = vec2(.01, 0); // Epsilon
    vec3 n = d - vec3(
        getDist(p-e.xyy),
        getDist(p-e.yxy),
        getDist(p-e.yyx));

    return normalize(n);
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection)
{
    float d0 = 0.0;

    for (int i = 0; i < MAX_STEP; ++i) {
        vec3 p = rayOrigin + rayDirection * d0;
        float ds = getDist(p);
        d0 += ds;

        if (d0 > MAX_DIST || ds < SURFACE_DIST) {
            break;
        }
    }
    return d0;
}

float GetLight(vec3 p)
{
    // Directional light
    vec3 l = normalize(vec3(0.5, 1.0, -0.3)); // Light Vector
    vec3 n = GetNormal(p); // Normal Vector

    float dif = dot(n,l); // Diffuse light
    dif = clamp(dif,0.,1.); // Clamp so it doesnt go below 0

    // Shadows
    // float d = rayMarch(p+n*SURFACE_DIST*2., l);
    // if (d < MAX_DIST) dif *= .1;

    return dif;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution.xy) / u_resolution.y;
    // vec3 rayOrigin = vec3(0.0, 3.0, 0.0); // RayOrigin/Camera
    vec3 rayOrigin = vec3(20.0, 30.0, 0.0) + camera_position; // RayOrigin/Camera

    vec3 rayDirection = normalize((inverse(camera_rotation_matrix) * vec4(uv.x, uv.y, 1.0, 1.0)).xyz);
    // vec3 rayDirection = normalize(vec3(uv.x, uv.y, 1.0));

    float d = rayMarch(rayOrigin, rayDirection);

    vec3 p = rayOrigin + rayDirection * d;
    float dif = GetLight(p); // Diffuse lighting
    vec3 color = vec3(dif);
    // vec3 n = GetNormal(p); // Normal Vector
    // vec3 color = vec3(n);


    const vec3 FOG_COLOUR = vec3(.15, 0.15, 0.17);
    color += FOG_COLOUR * (exp(d / 150.0));

    fragColor = vec4(color, 1.0);
}