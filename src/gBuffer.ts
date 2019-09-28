import { createTexture } from './webGlUtils';

function createDepthTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  return createTexture(gl, width, height, {
    internalFormat: gl.DEPTH_COMPONENT32F,
    format: gl.DEPTH_COMPONENT,
    type: gl.FLOAT,
    parameteri: [
      [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
      [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]
    ]
  });
}

function createFramebuffer(gl: WebGL2RenderingContext, depthTexture: WebGLTexture): WebGLFramebuffer {
  const framebuffer = <WebGLFramebuffer>gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
  gl.drawBuffers([gl.NONE]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return framebuffer;
}

export class GBuffer {

  readonly depthTexture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext, readonly width: number, readonly height: number) {
    this.depthTexture = createDepthTexture(gl, this.width, this.height);
    this.framebuffer = createFramebuffer(gl, this.depthTexture);
  }
}