import { GridRenderingContext, LayerName } from "../types";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererStore {
  mutators = ["register", "unRegister"] as const;
  private renderers: Partial<Record<LayerName, Renderer[]>> = {};

  register(renderer: Renderer) {
    if (!renderer.renderingLayers.length) {
      return;
    }
    for (const layer of renderer.renderingLayers) {
      if (!this.renderers[layer]) {
        this.renderers[layer] = [];
      }
      this.renderers[layer]!.push(renderer);
    }
  }

  unRegister(renderer: Renderer) {
    for (const layer of Object.keys(this.renderers)) {
      this.renderers[layer] = this.renderers[layer].filter((r: Renderer) => r !== renderer);
    }
  }

  drawLayer(context: GridRenderingContext, layer: LayerName) {
    const renderers = this.renderers[layer];
    if (!renderers) {
      return;
    }
    for (const renderer of renderers) {
      context.ctx.save();
      renderer.drawLayer(context, layer);
      context.ctx.restore();
    }
  }
}
