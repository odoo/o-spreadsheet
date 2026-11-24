import { onWillDestroy, Plugin, untrack, usePlugin } from "@odoo/owl";
import { Command } from "../types/commands";
import { GridRenderingContext, LayerName } from "../types/rendering";
import { ModelPlugin } from "./model_owl_plugin";
import { RendererPlugin } from "./renderer_plugin";

export abstract class OwlPluginWithModel extends Plugin {
  modelPlugin = usePlugin(ModelPlugin);
  protected renderer = usePlugin(RendererPlugin);

  setup() {
    this.model().on("command-dispatched", this, (cmd: Command) => untrack(() => this.handle(cmd)));
    this.model().on("command-finalized", this, () => untrack(() => this.finalize()));
    this.renderer.register(this);

    onWillDestroy(() => {
      this.model().off("command-dispatched", this);
      this.model().off("command-finalized", this);
      this.renderer.unRegister(this);
    });
  }

  protected handle(cmd: Command) {}
  protected finalize() {}

  get model() {
    return this.modelPlugin.model;
  }

  get renderingLayers(): Readonly<LayerName[]> {
    return [];
  }

  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number | undefined) {}
}
