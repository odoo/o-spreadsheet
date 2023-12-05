import { Get, SpreadsheetStore } from "../store_engine";
import { GridRenderingContext, LAYERS } from "../types";
import { RenderersManagerStore } from "./renderer_manager_store";

export abstract class RendererStore extends SpreadsheetStore {
  protected rendererManager = this.get(RenderersManagerStore);

  constructor(get: Get) {
    super(get);
    this.rendererManager.register(this);
  }

  dispose() {
    super.dispose();
    this.rendererManager.unRegister(this);
  }

  triggerRender() {
    this.rendererManager.triggerRender();
  }

  abstract get layers(): LAYERS[];
  abstract draw(ctx: GridRenderingContext, layer: LAYERS): void;
}
