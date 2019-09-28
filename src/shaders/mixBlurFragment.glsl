#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 o_color;

uniform sampler2D u_srcTexture;
uniform sampler2D u_blurredSrcTexture;
uniform float u_near;
uniform float u_far;

float toLinearDepth(float depth, float near, float far) {
    float nz = near * depth;
    return -nz / (far * (depth - 1.0) - nz);
}

float toViewZ(float depth, float near, float far) {
    return near + (far - near) * toLinearDepth(depth, near, far);
}

void main(void) {
  float src = texture(u_srcTexture, v_uv).r;
  float blurredSrc = texture(u_blurredSrcTexture, v_uv).r;
  float t = pow(toLinearDepth(src, u_near, u_far), 0.5);
  o_color = vec4(vec3(mix(src, blurredSrc, t)), 1.0);
}