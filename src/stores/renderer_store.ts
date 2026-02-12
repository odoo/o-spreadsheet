import { Model } from "@odoo/o-spreadsheet-engine/model";
import {
  GridRenderingContext,
  LayerName,
  OrderedLayers,
} from "@odoo/o-spreadsheet-engine/types/rendering";
import { Get } from "../store_engine";
import { ModelStore } from "./model_store";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number | undefined): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererStore {
  mutators = ["register", "unRegister", "draw", "startAnimation", "stopAnimation"] as const;
  private renderers: Partial<Record<LayerName, Renderer[]>> = {};

  private model: Model;
  private context: GridRenderingContext | undefined = undefined;

  private animationFrameId: number | null = null;
  private registeredAnimations: Set<String> = new Set();

  constructor(get: Get, private layers = OrderedLayers()) {
    this.model = get(ModelStore) as Model;
  }

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

  private drawLayer(context: GridRenderingContext, layer: LayerName, timeStamp?: number) {
    const renderers = this.renderers[layer];
    if (renderers) {
      for (const renderer of renderers) {
        context.ctx.save();
        renderer.drawLayer(context, layer, timeStamp);
        context.ctx.restore();
      }
    }
    return "noStateChange";
  }

  draw(context?: GridRenderingContext, timestamp?: number) {
    context = context || this.context;
    if (!context) {
      throw new Error("Rendering context is not defined");
    }
    this.context = context;
    for (const layer of this.layers) {
      this.model.drawLayer(context, layer);
      this.drawLayer(context, layer, timestamp);
    }

    return "noStateChange";
  }

  startAnimation(animationId: string) {
    this.registeredAnimations.add(animationId);
    if (!this.animationFrameId) {
      const animationCallback = (timestamp: number) => {
        this.animationFrameId = requestAnimationFrame(animationCallback);
        this.draw(undefined, timestamp);
      };

      this.animationFrameId = requestAnimationFrame(animationCallback);
    }
    return "noStateChange";
  }

  stopAnimation(animationId: string) {
    this.registeredAnimations.delete(animationId);
    if (this.registeredAnimations.size === 0 && this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return "noStateChange";
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
