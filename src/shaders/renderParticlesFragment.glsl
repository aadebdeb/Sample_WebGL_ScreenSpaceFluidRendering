#version 300 es

precision highp float;

in vec2 v_uv;
in vec3 v_worldPos;

uniform float u_size;
uniform mat4 u_vpMatrix;

void main(void) {
  vec2 st = v_uv * 2.0 - 1.0;
  if (length(st) > 1.0) discard;

  vec3 objPos = u_size * vec3(st.x, st.y, sqrt(max(1.0 - st.x * st.x - st.y * st.y, 0.00001)));
  vec4 clipPos = u_vpMatrix * vec4(v_worldPos + objPos, 1.0);
  gl_FragDepth = clamp(clipPos.z / clipPos.w * 0.5 + 0.5, 0.0, 1.0);
}