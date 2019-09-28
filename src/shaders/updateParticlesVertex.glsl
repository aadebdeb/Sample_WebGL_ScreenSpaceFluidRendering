#version 300 es

precision highp float;

layout (location = 0) in vec3 i_position;
layout (location = 1) in vec3 i_velocity;
layout (location = 2) in float i_life;

out vec3 o_position;
out vec3 o_velocity;
out float o_life;

uniform float u_deltaSecs;
uniform float u_elapsedSecs;
uniform float u_lifeSecs;

vec3 random3(float x) {
    return fract(sin(x * vec3(12.9898, 51.431, 29.964)) * vec3(43758.5453, 71932.1354, 39215.4221));
}

float random(vec4 x){
    return fract(sin(dot(x,vec4(12.9898, 78.233, 39.425, 27.196))) * 43758.5453);
}

float valuenoise(vec4 x) {
  vec4 i = floor(x);
  vec4 f = fract(x);

  vec4 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(
          mix(random(i + vec4(0.0, 0.0, 0.0, 0.0)), random(i + vec4(1.0, 0.0, 0.0, 0.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 0.0, 0.0)), random(i + vec4(1.0, 1.0, 0.0, 0.0)), u.x),
          u.y
      ),
      mix(
          mix(random(i + vec4(0.0, 0.0, 1.0, 0.0)), random(i + vec4(1.0, 0.0, 1.0, 0.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 1.0, 0.0)), random(i + vec4(1.0, 1.0, 1.0, 0.0)), u.x),
          u.y
      ),
      u.z
    ),
    mix(
      mix(
          mix(random(i + vec4(0.0, 0.0, 0.0, 1.0)), random(i + vec4(1.0, 0.0, 0.0, 1.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 0.0, 1.0)), random(i + vec4(1.0, 1.0, 0.0, 1.0)), u.x),
          u.y
      ),
      mix(
          mix(random(i + vec4(0.0, 0.0, 1.0, 1.0)), random(i + vec4(1.0, 0.0, 1.0, 1.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 1.0, 1.0)), random(i + vec4(1.0, 1.0, 1.0, 1.0)), u.x),
          u.y
      ),
      u.z
    ),
    u.w
  );
}

vec3 valuenoise3(vec4 x) {
  return vec3(
    valuenoise(x),
    valuenoise(x + vec4(123.11, 324.19, 632.32, 124.24)),
    valuenoise(x + vec4(734.63, 239.92, 431.94, 1043.18))
  );
}

#define EPSILON 0.01

#define GRAVITY_FORCE vec3(0.0, -9.8, 0.0)

void main(void) {

  vec3 dx = vec3(EPSILON, 0.0, 0.0);
  vec3 dy = vec3(0.0, EPSILON, 0.0);
  vec3 dz = vec3(0.0, 0.0, EPSILON);

  vec3 p = 0.1 * i_position;
  float t = 0.2 * u_elapsedSecs;

  vec3 dpdx0 = valuenoise3(vec4(p - dx, t));
  vec3 dpdx1 = valuenoise3(vec4(p + dx, t));
  vec3 dpdy0 = valuenoise3(vec4(p - dy, t));
  vec3 dpdy1 = valuenoise3(vec4(p + dy, t));
  vec3 dpdz0 = valuenoise3(vec4(p - dz, t));
  vec3 dpdz1 = valuenoise3(vec4(p + dz, t));

  float x = dpdy1.z - dpdy0.z + dpdz1.y - dpdz0.y;
  float y = dpdz1.x - dpdz0.x + dpdx1.z - dpdx0.z;
  float z = dpdx1.y - dpdx0.y + dpdy1.x - dpdy0.x;

  float life = i_life;
  vec3 position = i_position;
  vec3 velocity = i_velocity;
  if (life > 1.0) {
    life -= 1.0;
    position = 5.0 * (2.0 * random3(float(gl_VertexID)) - 1.0);
    velocity = vec3(0.0);
  }

  vec3 force = vec3(x, y, z) / EPSILON * 2.0;
  velocity += u_deltaSecs * 3.0 * force;

  o_position = position + u_deltaSecs * velocity;
  o_velocity = velocity;
  o_life = life + u_deltaSecs / u_lifeSecs;
}