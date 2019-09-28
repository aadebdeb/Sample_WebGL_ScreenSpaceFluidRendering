#version 300 es

precision highp float;

layout (location = 0) in vec3 i_position;
layout (location = 1) in float i_life;

out vec2 v_uv;
out vec3 v_worldPos;

uniform float u_size;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraUp;
uniform mat4 u_vpMatrix;

const vec3[4] POSITIONS = vec3[](
  vec3(-1.0, -1.0, 0.0),
  vec3(1.0, -1.0, 0.0),
  vec3(-1.0, 1.0, 0.0),
  vec3(1.0, 1.0, 0.0)
);

const vec2[4] UVS = vec2[](
  vec2(0.0, 0.0),
  vec2(1.0, 0.0),
  vec2(0.0, 1.0),
  vec2(1.0, 1.0)
);

const int[6] INDICES = int[](
  0, 1, 2,
  3, 2, 1
);

mat3 lookTo(vec3 front, vec3 up) {
  vec3 z = -normalize(front);
  vec3 x = cross(up, z);
  vec3 y = cross(z, x);

  return mat3(
    x.x, x.y, x.z,
    y.x, y.y, y.z,
    z.x, z.y, z.z
  );
}

void main(void) {
  int index = INDICES[gl_VertexID];
  float size = u_size * smoothstep(0.0, 0.2, (0.5 - abs(i_life - 0.5)) * 2.0);
  vec3 worldPos = lookTo(i_position - u_cameraPos, u_cameraUp) * size * POSITIONS[index] + i_position;
  gl_Position = u_vpMatrix * vec4(worldPos, 1.0);
  v_uv = UVS[index];
  v_worldPos = i_position;
}