import { Program } from './program';
import { GBuffer } from './gBuffer';
import { Particles } from './particles';
import { Camera } from './camera';
import { Vector3 } from './math/vector3';
import { createShader, setUniformTexture } from './webGlUtils';
import fillViewportVertex from '!!raw-loader!./shaders/fillViewportVertex.glsl';
import renderFragment from '!!raw-loader!./shaders/renderFragment.glsl';
import mixBlurFragment from '!!raw-loader!./shaders/mixBlurFragment.glsl';
import { BlurApplier } from './filters/blurApplier';
import { TextureRenderTarget } from './textureRenderTarget';
import { HdrRenderTarget } from './hdrRenderTarget';

const canvas = document.createElement('canvas');
canvas.width = innerWidth;
canvas.height = innerHeight;
document.body.appendChild(canvas);
const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');
gl.getExtension('EXT_color_buffer_float');
gl.clearColor(0.0, 0.0, 0.0, 1.0);

let gBuffer = new GBuffer(gl, canvas.width, canvas.height);
const near = 0.1;
const far = 200.0;
const cameraPos = new Vector3(50.0, 0.0, 50.0);
const camera = new Camera({
  aspect: canvas.width / canvas.height,
  vfov: 60.0, 
  near: near,
  far: far,
  origin: cameraPos,
  target: new Vector3(0.0, 0.0, 0.0)
});
const particles = new Particles(gl, {
  particleNum: 10000,
  particleSize: 1.0,
  lifeSecs: 5.0,
});

const renderProgram = new Program(gl,
  createShader(gl, fillViewportVertex, gl.VERTEX_SHADER),
  createShader(gl, renderFragment, gl.FRAGMENT_SHADER),
  ['u_depthTexture', 'u_invVpMatrix', 'u_near', 'u_far', 'u_cameraPos']
);

const mixBlurProgram = new Program(gl,
  createShader(gl, fillViewportVertex, gl.VERTEX_SHADER),
  createShader(gl, mixBlurFragment, gl.FRAGMENT_SHADER),
  ['u_depthTexture', 'u_srcTexture', 'u_blurredSrcTexture', 'u_near', 'u_far']
);
const mixBlurTarget = new HdrRenderTarget(gl, canvas.width, canvas.height);

const blurApplier = new BlurApplier(gl, canvas.width, canvas.height);

const startTime = performance.now() * 0.001;
let previousTime = startTime;

let requestId: number | null = null;
const loop = () => {

  const currentTime = performance.now() * 0.001;
  const deltaSecs = Math.min(0.1, currentTime - previousTime);
  const elapsedSecs = startTime - currentTime;

  particles.update(gl, deltaSecs, elapsedSecs);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer.framebuffer);
  gl.viewport(0.0, 0.0, gBuffer.width, gBuffer.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  particles.render(gl, camera);

  gl.disable(gl.DEPTH_TEST);


  const depthTarget = new TextureRenderTarget(gBuffer.depthTexture, gBuffer.width, gBuffer.height);

  const blurredTexture = blurApplier.apply(gl, depthTarget, near, far, {
    gBuffer, camera,
  });

  gl.bindFramebuffer(gl.FRAMEBUFFER, mixBlurTarget.framebuffer);
  gl.viewport(0.0, 0.0, mixBlurTarget.width, mixBlurTarget.height);
  gl.useProgram(mixBlurProgram.program);
  setUniformTexture(gl, 0, gBuffer.depthTexture, mixBlurProgram.getUniform('u_srcTexture'));
  setUniformTexture(gl, 1, blurredTexture, mixBlurProgram.getUniform('u_blurredSrcTexture'));
  gl.uniform1f(mixBlurProgram.getUniform('u_near'), near);
  gl.uniform1f(mixBlurProgram.getUniform('u_far'), far);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0.0, 0.0, canvas.width, canvas.height);

  gl.useProgram(renderProgram.program);
  setUniformTexture(gl, 0, mixBlurTarget.texture, renderProgram.getUniform('u_depthTexture'));
  gl.uniformMatrix4fv(renderProgram.getUniform('u_invVpMatrix'), false, camera.vpMatrix.getInvMatrix().elements)
  gl.uniform1f(renderProgram.getUniform('u_near'), near);
  gl.uniform1f(renderProgram.getUniform('u_far'), far);
  gl.uniform3fv(renderProgram.getUniform('u_cameraPos'), cameraPos.toArray());
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  previousTime = currentTime;
  requestId = requestAnimationFrame(loop); 
};

addEventListener('resize', () => {
  if (requestId !== null) {
    cancelAnimationFrame(requestId);
    requestId = null;
  }
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  requestId = requestAnimationFrame(loop);
});

requestId = requestAnimationFrame(loop);