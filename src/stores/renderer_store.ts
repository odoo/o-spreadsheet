import { Model } from "../model";
import { DisposableStore } from "../store_engine";
import { GridRenderingContext, LayerName, OrderedLayers } from "../types";
import { ModelStore } from "./model_store";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererStore extends DisposableStore {
  mutators = ["register", "unRegister", "draw", "startAnimation", "stopAnimation"] as const;
  private renderers: Partial<Record<LayerName, Renderer[]>> = {};

  private model = this.get(ModelStore) as Model;

  private context: GridRenderingContext | undefined = undefined;

  private animationFrameId: number | null = null;
  private registeredAnimations: Set<String> = new Set();
  private timeStamp: number | null = null;

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
      const timeStamp = this.timeStamp || Number(document.timeline.currentTime);
      for (const renderer of renderers) {
        context.ctx.save();
        renderer.drawLayer(context, layer, timeStamp);
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

  startAnimation(animationId: string) {
    this.registeredAnimations.add(animationId);
    if (!this.animationFrameId) {
      const animationCallback = (timestamp: number) => {
        this.timeStamp = timestamp;
        this.animationFrameId = requestAnimationFrame(animationCallback);
        this.draw();
      };

      this.animationFrameId = requestAnimationFrame(animationCallback);
    }
    return "noStateChange";
  }

  stopAnimation(animationId: string) {
    this.registeredAnimations.delete(animationId);
    if (this.registeredAnimations.size === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return "noStateChange";
  }

  get isAnimating() {
    return this.animationFrameId !== null;
  }
}
