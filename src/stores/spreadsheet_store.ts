import { Model } from "../model";
import { DisposableStore } from "../store_engine/store";
import { Command } from "../types/commands";
import { GridRenderingContext, LayerName } from "../types/rendering";
import { Get } from "../types/store_engine";
import { ModelStore } from "./model_store";
import { RendererStore } from "./renderer_store";

export class SpreadsheetStore extends DisposableStore {
  // cast the model store as Model to allow model.dispatch to return the DispatchResult
  protected model = this.get(ModelStore) as Model;
  protected getters = this.model.getters;
  protected renderer = this.get(RendererStore);

  constructor(get: Get) {
    super(get);
    // FIXME: registering the event handlers here is sketchy vis-à-vis the store dependencies
    // If a store A depends on a store B via a `this.get(B)` in the constructor, A will be after B in the dependency container.
    // But A will register before B in the model bus since it's registered in `A.super()`, before `B.constructor()` is called
    // This is not an issue in practice at the moment, but may be in the future
    this.model.on("command-dispatched", this, this.handle);
    this.model.on("command-finalized", this, this.finalize);
    this.renderer.register(this);

    this.onDispose(() => {
      this.model.off("command-dispatched", this);
      this.model.off("command-finalized", this);
      this.renderer.unRegister(this);
    });
  }

  get renderingLayers(): Readonly<LayerName[]> {
    return [];
  }

  protected handle(cmd: Command) {}
  protected finalize() {}

  drawLayer(ctx: GridRenderingContext, layer: LayerName, timestamp: number | undefined) {}
}
