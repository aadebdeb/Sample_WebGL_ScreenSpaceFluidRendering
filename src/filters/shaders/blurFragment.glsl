#version 300 es

precision highp float;

out vec4 o_color;

uniform sampler2D u_srcTexture;
uniform bool u_horizontal;
uniform float u_near;
uniform float u_far;
uniform float u_blurDepthRange;

const float[5] weights = float[](0.2270270, 0.1945945, 0.1216216, 0.0540540, 0.0162162);

float toLinearDepth(float depth, float near, float far) {
    float nz = near * depth;
    return -nz / (far * (depth - 1.0) - nz);
}

float toViewZ(float depth, float near, float far) {
    return near + (far - near) * toLinearDepth(depth, near, far);
}

ivec2 clampCoord(ivec2 coord, ivec2 texSize) {
    return max(min(coord, texSize - 1), 0);
}

void main(void) {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 texSize = textureSize(u_srcTexture, 0);

    vec3 centerD = texelFetch(u_srcTexture, coord, 0).rgb;
    float centerZ = toViewZ(centerD.r, u_near, u_far);
    vec3 sum = weights[0] * centerD;
    for (int i = 1; i < 5; i++) {
        ivec2 offset = u_horizontal ? ivec2(i, 0) : ivec2(0, i);
        {
            vec3 d = texelFetch(u_srcTexture, clampCoord(coord + offset, texSize), 0).rgb;
            float z = toViewZ(d.r, u_near, u_far);
            sum += weights[i] * mix(d, centerD, smoothstep(0.0, u_blurDepthRange, abs(centerZ - z)));
        }
        {
            vec3 d = texelFetch(u_srcTexture, clampCoord(coord - offset, texSize), 0).rgb;
            float z = toViewZ(d.r, u_near, u_far);
            sum += weights[i] * mix(d, centerD, smoothstep(0.0, u_blurDepthRange, abs(centerZ - z)));
        }
    }
    o_color = vec4(sum, 1.0);
}