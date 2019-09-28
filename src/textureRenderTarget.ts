import { RenderTarget } from './renderTarget';

export class TextureRenderTarget implements RenderTarget {
  constructor(readonly texture: WebGLTexture, readonly width: number, readonly height: number) {}

  get framebuffer() {
    return null;
  }

  resize(_: WebGL2RenderingContext, __: number, ___: number): void {}

}