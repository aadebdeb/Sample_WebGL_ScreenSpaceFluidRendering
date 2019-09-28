#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 o_color;

uniform sampler2D u_depthTexture;
uniform mat4 u_invVpMatrix;
uniform float u_near;
uniform float u_far;
uniform vec3 u_cameraPos;

vec3 lightDir = normalize(vec3(1.0));

float toLinearDepth(float depth, float near, float far) {
    float nz = near * depth;
    return -nz / (far * (depth - 1.0) - nz);
}

float toViewZ(float depth, float near, float far) {
    return near + (far - near) * toLinearDepth(depth, near, far);
}

vec3 uvToWorldPos(ivec2 coord) {
  ivec2 texSize = textureSize(u_depthTexture, 0);
  float depth = clamp(texelFetch(u_depthTexture, coord, 0).r, 0.0, 1.0);
  vec3 clipPos = vec3(vec2(coord) / vec2(texSize), depth) * 2.0 - 1.0;
  return (u_invVpMatrix * vec4(clipPos, 1.0)).xyz;
}

vec3 schlickFresnel(vec3 f90, float cosine) {
  return f90 + (1.0 - f90) * pow(1.0 - cosine, 5.0);
}

void main(void) {
  float depth = texture(u_depthTexture, v_uv).r;

  float linearDepth = toLinearDepth(depth, u_near, u_far);

  if (linearDepth > 0.99) {
    o_color = vec4(1.0, 0.5, 0.1, 1.0);
    return;
  }

  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec3 worldPos = uvToWorldPos(coord);
  vec3 right = uvToWorldPos(coord + ivec2(1, 0));
  vec3 left = uvToWorldPos(coord + ivec2(-1, 0));
  vec3 up = uvToWorldPos(coord + ivec2(0, 1));
  vec3 down = uvToWorldPos(coord + ivec2(0, -1));

  vec3 ddx = right - left;
  vec3 ddy = up - down;

  vec3 worldNormal = normalize(cross(ddx, ddy));

  vec3 refDir = reflect(-normalize(u_cameraPos - worldPos), worldNormal);

  vec3 fresnel = schlickFresnel(vec3(0.5), clamp(dot(u_cameraPos, worldNormal), 0.0, 1.0));

  // o_color = vec4(vec3(depth - 0.99) * 100.0, 1.0);
  vec3 diffuse = vec3(0.2, 0.5, 0.8) * clamp(dot(lightDir, worldNormal) * 0.5 + 0.5, 0.0, 1.0);
  vec3 spec = vec3(1.0) * pow(clamp(dot(lightDir, refDir), 0.0, 1.0), 16.0);
  //vec3 spec = vec3(0.5) * fresnel;
  o_color = vec4(diffuse + spec, 1.0);
}