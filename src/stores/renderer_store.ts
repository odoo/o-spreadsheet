import { Model } from "../model";
import { DisposableStore } from "../store_engine";
import { GridRenderingContext, LayerName, OrderedLayers } from "../types";
import { ModelStore } from "./model_store";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererStore extends DisposableStore {
  mutators = ["register", "unRegister", "draw", "startAnimation"] as const;
  private renderers: Partial<Record<LayerName, Renderer[]>> = {};

  private model = this.get(ModelStore) as Model;

  private context: GridRenderingContext | undefined = undefined;
  private animationFrameId: number | null = null;

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

  private drawLayer(context: GridRenderingContext, layer: LayerName) {
    const renderers = this.renderers[layer];
    if (renderers) {
      for (const renderer of renderers) {
        context.ctx.save();
        renderer.drawLayer(context, layer);
        context.ctx.restore();
      }
    }
    return "noStateChange";
  }

  draw(context?: GridRenderingContext) {
    context = context || this.context;
    if (!context) {
      throw new Error("Context is not defined");
    }
    this.context = context;
    for (const layer of OrderedLayers()) {
      this.model.drawLayer(context, layer);
      this.drawLayer(context, layer);
    }

    return "noStateChange";
  }

  startAnimation(duration: number) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const startTime = performance.now();

    const animationCallback = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.draw();
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animationCallback);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animationCallback);
  }

  get isAnimating() {
    return this.animationFrameId !== null;
  }
}

export function interpolateLinear(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
