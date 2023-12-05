import { ReactiveStore } from "../store_engine";
import { GridRenderingContext, LAYERS } from "../types";
import { ModelStore } from "./model_store";

interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LAYERS): void;
  renderingLayers: LAYERS[];
}

export class RendererStore extends ReactiveStore {
  protected model = this.get(ModelStore);
  private renderers: Partial<Record<LAYERS, Renderer[]>> = {};

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

  drawLayer(ctx: GridRenderingContext, layer: LAYERS) {
    const renderers = this.renderers[layer];
    if (!renderers) {
      return;
    }
    for (const renderer of renderers) {
      renderer.drawLayer(ctx, layer);
    }
  }
}
