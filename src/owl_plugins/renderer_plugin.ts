import { onWillDestroy, Plugin, signal, useConfig, usePlugin } from "@odoo/owl";
import { GridRenderingContext, LayerName, OrderedLayers } from "../types/rendering";
import { ModelPlugin } from "./model_owl_plugin";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number | undefined): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererPlugin extends Plugin {
  layers: LayerName[] = useConfig("layers") || OrderedLayers();
  renderers = signal.Object<Partial<Record<LayerName, Renderer[]>>>({});
  modelPlugin = usePlugin(ModelPlugin);

  private context: GridRenderingContext | undefined = undefined;

  private animationFrameId: number | null = null;
  private registeredAnimations: Set<string> = new Set();

  setup() {
    super.setup();
    onWillDestroy(() => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    });
  }

  register(renderer: Renderer) {
    if (!renderer.renderingLayers.length) {
      return;
    }
    for (const layer of renderer.renderingLayers) {
      if (!this.renderers()[layer]) {
        this.renderers()[layer] = [];
      }
      this.renderers()[layer]!.push(renderer);
    }
  }

  unRegister(renderer: Renderer) {
    for (const layer of Object.keys(this.renderers())) {
      this.renderers()[layer] = this.renderers()[layer].filter((r: Renderer) => r !== renderer);
    }
  }

  private drawLayer(context: GridRenderingContext, layer: LayerName, timeStamp?: number) {
    const renderers = this.renderers()[layer];
    if (renderers) {
      for (const renderer of renderers) {
        context.ctx.save();
        renderer.drawLayer(context, layer, timeStamp);
        context.ctx.restore();
      }
    }
  }

  draw(context?: GridRenderingContext, timestamp?: number) {
    context = context || this.context;
    if (!context) {
      throw new Error("Rendering context is not defined");
    }
    this.context = context;
    for (const layer of this.layers) {
      this.modelPlugin.model().drawLayer(context, layer);
      this.drawLayer(context, layer, timestamp);
    }
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
  }

  stopAnimation(animationId: string) {
    this.registeredAnimations.delete(animationId);
    if (this.registeredAnimations.size === 0 && this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
