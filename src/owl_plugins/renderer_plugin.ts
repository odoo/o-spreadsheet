import { onWillDestroy, signal, useConfig } from "@odoo/owl";
import { GridRenderingContext, LayerName, OrderedLayers } from "../types/rendering";
import { OwlPluginWithModel } from "./owl_plugin_with_model";

export interface Renderer {
  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number | undefined): void;
  renderingLayers: Readonly<LayerName[]>;
}

export class RendererPlugin extends OwlPluginWithModel {
  layers: LayerName[] = useConfig("layers") || OrderedLayers();
  renderers = signal.Object<Partial<Record<LayerName, Renderer[]>>>({});

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
      this.model().drawLayer(context, layer);
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

/**
 * Renderer of a nested canvas (dashboard, standalone viewport, print page...).
 * It has its own id so it never shadows the root RendererPlugin: the stores that
 * must draw on the main grid always get the root one with `usePlugin(RendererPlugin)`.
 * The components drawing on the nested canvas must receive this renderer explicitly.
 *
 * Should disappear with the HighlightStore convertion (and more generally with the stores)
 */
export class LocalRendererPlugin extends RendererPlugin {
  static id = "LocalRendererPlugin";
}
