import { Program } from './program';
import { GBuffer } from './gBuffer';
import { Particles } from './particles';
import { Camera } from './camera';
import { Vector3 } from './math/vector3';
import { createShader, setUniformTexture } from './webGlUtils';
import fillViewportVertex from '!!raw-loader!./shaders/fillViewportVertex.glsl';
import renderFragment from '!!raw-loader!./shaders/renderFragment.glsl';
import { BlurApplier } from './filters/blurApplier';
import { TextureRenderTarget } from './textureRenderTarget';

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
const cameraPos = new Vector3(30.0, 0.0, 50.0);
const camera = new Camera({
  aspect: canvas.width / canvas.height,
  vfov: 60.0, 
  near: near,
  far: far,
  origin: cameraPos,
  target: new Vector3(0.0, 0.0, 0.0)
});

const particleSize = 0.5;
const particles = new Particles(gl, {
  particleNum: 30000,
  particleSize: particleSize,
  lifeSecs: 5.0,
  initialPosRadius: 3.0,
  forceScale: 2.5,
});

enum RenderUniforms {
  DEPTH_TEXTURE = 'u_depthTexture',
  INV_VP_MATRIX = 'u_invVpMatrix',
  NEAR = 'u_near',
  FAR = 'u_far',
  CAMERA_POS = 'u_cameraPos'
}

const renderProgram = new Program(gl,
  createShader(gl, fillViewportVertex, gl.VERTEX_SHADER),
  createShader(gl, renderFragment, gl.FRAGMENT_SHADER),
  Object.values(RenderUniforms)
);

let blurApplier = new BlurApplier(gl, canvas.width, canvas.height);

const startTime = performance.now() * 0.001;
let previousTime = startTime;

let requestId: number | null = null;
const loop = () => {

  const currentTime = performance.now() * 0.001;
  const deltaSecs = Math.min(0.1, currentTime - previousTime);
  const elapsedSecs = currentTime - startTime;

  particles.update(gl, deltaSecs, elapsedSecs);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer.framebuffer);
  gl.viewport(0.0, 0.0, gBuffer.width, gBuffer.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  particles.render(gl, camera);

  gl.disable(gl.DEPTH_TEST);

  const depthTarget = new TextureRenderTarget(gBuffer.depthTexture, gBuffer.width, gBuffer.height);
  const blurredTexture = blurApplier.apply(gl, depthTarget, near, far, particleSize * 5.0, {
    gBuffer, camera,
  });

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0.0, 0.0, canvas.width, canvas.height);

  gl.useProgram(renderProgram.program);
  setUniformTexture(gl, 0, blurredTexture, renderProgram.getUniform(RenderUniforms.DEPTH_TEXTURE));
  gl.uniformMatrix4fv(renderProgram.getUniform(RenderUniforms.INV_VP_MATRIX), false, camera.vpMatrix.getInvMatrix().elements)
  gl.uniform1f(renderProgram.getUniform(RenderUniforms.NEAR), near);
  gl.uniform1f(renderProgram.getUniform(RenderUniforms.FAR), far);
  gl.uniform3fv(renderProgram.getUniform(RenderUniforms.CAMERA_POS), cameraPos.toArray());
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

  camera.aspect = canvas.width / canvas.height;
  gBuffer = new GBuffer(gl, canvas.width, canvas.height);
  blurApplier = new BlurApplier(gl, canvas.width, canvas.height);

  requestId = requestAnimationFrame(loop);
});

requestId = requestAnimationFrame(loop);