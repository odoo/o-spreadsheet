import { ModelStore, ReactiveStore } from "../store_engine";
import { GridRenderingContext, LAYERS } from "../types";
import { RendererStore } from "./renderer_store";

export class RenderersManagerStore extends ReactiveStore {
  protected model = this.get(ModelStore);
  private renderers: Partial<Record<LAYERS, RendererStore[]>> = {};

  register(renderer: RendererStore) {
    for (const layer of renderer.layers) {
      if (!this.renderers[layer]) {
        this.renderers[layer] = [];
      }
      this.renderers[layer]!.push(renderer);
    }
  }

  unRegister(renderer: RendererStore) {
    for (const layer of Object.keys(this.renderers)) {
      this.renderers[layer] = this.renderers[layer].filter((r: RendererStore) => r !== renderer);
    }
  }

  drawLayer(ctx: GridRenderingContext, layer: LAYERS) {
    const renderers = this.renderers[layer];
    if (renderers) {
      for (const renderer of renderers) {
        renderer.draw(ctx, layer);
      }
    }
  }
}
