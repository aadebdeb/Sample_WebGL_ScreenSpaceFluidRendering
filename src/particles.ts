import { createVbo, createShader } from './webGlUtils';
import { Program } from './program';
import { Camera } from './camera';
import { Vector3 } from './math/vector3';
import renderParticlesVertex from '!!raw-loader!./shaders/renderParticlesVertex.glsl';
import renderParticlesFragment from '!!raw-loader!./shaders/renderParticlesFragment.glsl';
import updateParticlesVertex from '!!raw-loader!./shaders/updateParticlesVertex.glsl';
import updateParticlesFragment from '!!raw-loader!./shaders/updateParticlesFragment.glsl';

function createInitialPositions(length: number, radius: number): Float32Array {
  const array = new Float32Array(3 * length);
  for (let i = 0; i < length; i += 3) {
    const z = Math.random() * 2.0 - 1.0;
    const phi = Math.random() * Math.PI * 2.0;
    const r = Math.pow(Math.random(), 0.333);
    array[i] = radius * r * Math.sqrt(1.0 - z * z) * Math.cos(phi);
    array[i + 1] = radius * r * Math.sqrt(1.0 - z * z) * Math.sin(phi);
    array[i + 2] = radius * r * z;
  }
  return array;
}

function createInitialLife(length: number): Float32Array {
  const array = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    array[i] = Math.random();
  }
  return array;
}

enum UpdateUniforms {
  DELTA_SECS = 'u_deltaSecs',
  EPALSED_SECS = 'u_elapsedSecs',
  LIFE_SECS = 'u_lifeSecs',
  INITIAL_POS_RADIUS = 'u_initialPosRadius',
  FORCE_SCALE = 'u_forceScale',
}

enum RenderUniforms {
  SIZE = 'u_size',
  CAMERA_POS = 'u_cameraPos',
  CAMERA_UP = 'u_cameraUp',
  VP_MATRIX = 'u_vpMatrix'
}

type ConstructorOptions = {
  particleNum?: number,
  particleSize?: number,
  lifeSecs?: number,
  initialPosRadius?: number,
  forceScale?: number,
}

export class Particles {
  private particleNum: number;
  private particleSize: number;
  private lifeSecs: number;
  private initialPosRadius: number;
  private forceScale: number;
  private posVbo: WebGLBuffer;
  private posVboW: WebGLBuffer;
  private velVbo: WebGLBuffer;
  private velVboW: WebGLBuffer;
  private lifeVbo: WebGLBuffer;
  private lifeVboW: WebGLBuffer;
  private transformFeedback: WebGLTransformFeedback;
  private updateProgram: Program;
  private renderProgram: Program;

  constructor(gl: WebGL2RenderingContext, {
    particleNum = 10000,
    particleSize = 1.0,
    lifeSecs = 30.0,
    initialPosRadius = 1.0,
    forceScale = 1.0,
  }: ConstructorOptions = {}) {
    this.particleNum = particleNum;
    this.particleSize = particleSize;
    this.lifeSecs = lifeSecs;
    this.initialPosRadius = initialPosRadius;
    this.forceScale = forceScale;
    this.posVbo = createVbo(gl, createInitialPositions(particleNum, initialPosRadius), gl.DYNAMIC_COPY);
    this.posVboW = createVbo(gl, new Float32Array(3 * particleNum), gl.DYNAMIC_COPY);
    this.velVbo = createVbo(gl, new Float32Array(3 * particleNum), gl.DYNAMIC_COPY);
    this.velVboW = createVbo(gl, new Float32Array(3 * particleNum), gl.DYNAMIC_COPY);
    this.lifeVbo = createVbo(gl, createInitialLife(particleNum), gl.DYNAMIC_COPY);
    this.lifeVboW = createVbo(gl, new Float32Array(particleNum), gl.DYNAMIC_COPY);
    this.transformFeedback = <WebGLTransformFeedback>gl.createTransformFeedback();
    this.updateProgram = new Program(gl,
      createShader(gl, updateParticlesVertex, gl.VERTEX_SHADER),
      createShader(gl, updateParticlesFragment, gl.FRAGMENT_SHADER),
      Object.values(UpdateUniforms),
      ['o_position', 'o_velocity', 'o_life']
    );
    this.renderProgram = new Program(gl,
      createShader(gl, renderParticlesVertex, gl.VERTEX_SHADER),
      createShader(gl, renderParticlesFragment, gl.FRAGMENT_SHADER), Object.values(RenderUniforms));
  }

  update(gl: WebGL2RenderingContext, deltaSecs: number, elapsedSecs: number): void {
    gl.useProgram(this.updateProgram.program);
    gl.uniform1f(this.updateProgram.getUniform(UpdateUniforms.DELTA_SECS), deltaSecs);
    gl.uniform1f(this.updateProgram.getUniform(UpdateUniforms.EPALSED_SECS), elapsedSecs);
    gl.uniform1f(this.updateProgram.getUniform(UpdateUniforms.LIFE_SECS), this.lifeSecs);
    gl.uniform1f(this.updateProgram.getUniform(UpdateUniforms.INITIAL_POS_RADIUS), this.initialPosRadius);
    gl.uniform1f(this.updateProgram.getUniform(UpdateUniforms.FORCE_SCALE), this.forceScale);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.velVbo);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lifeVbo);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.posVboW);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velVboW);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, this.lifeVboW);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.particleNum);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);
    [this.posVbo, this.posVboW] = [this.posVboW, this.posVbo];
    [this.velVbo, this.velVboW] = [this.velVboW, this.velVbo];
    [this.lifeVbo, this.lifeVboW] = [this.lifeVboW, this.lifeVbo];
  }

  render(gl: WebGL2RenderingContext, camera: Camera): void {
    gl.useProgram(this.renderProgram.program);
    gl.uniform1f(this.renderProgram.getUniform(RenderUniforms.SIZE), this.particleSize);
    gl.uniform3fv(this.renderProgram.getUniform(RenderUniforms.CAMERA_POS), camera.position.toArray());
    gl.uniform3fv(this.renderProgram.getUniform(RenderUniforms.CAMERA_UP), new Vector3(0.0, 1.0, 0.0).toArray());
    gl.uniformMatrix4fv(this.renderProgram.getUniform(RenderUniforms.VP_MATRIX), false, camera.vpMatrix.elements);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lifeVbo);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.particleNum);
    gl.vertexAttribDivisor(0, 0);
    gl.vertexAttribDivisor(1, 0);
  }
}