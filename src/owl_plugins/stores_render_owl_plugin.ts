import { onWillDestroy, onWillStart, Plugin, signal, useConfig, usePlugin } from "@odoo/owl";
import { DependencyContainer } from "../store_engine/dependency_container";
import { Renderer, RendererStore } from "../stores/renderer_store";
import { OrderedLayers } from "../types/rendering";
import { ModelPlugin } from "./model_owl_plugin";

// FIXME OWL3: This plugin is only there to make sure that the useEffect of the useGridDrawing is triggered when the
// model or a store is updated. Should be removed once all the stores are transformed to owl plugins.
export class StoreRendererPlugin extends Plugin implements Renderer {
  renderer: RendererStore = useConfig("renderer");
  stores: DependencyContainer = useConfig("stores");

  storeSignal = signal(1);
  modelPlugin = usePlugin(ModelPlugin);

  setup() {
    onWillStart(() => {
      this.renderer.register(this);
      this.stores.on("store-updated", this, () => {
        signal.trigger(this.storeSignal);
      });
    });
    onWillDestroy(() => {
      this.renderer.unRegister(this);
      this.stores.off("store-updated", this);
    });
  }

  get renderingLayers() {
    return OrderedLayers();
  }

  drawLayer() {
    // touch the signals to trigger re-render on signal update
    this.storeSignal();
    this.modelPlugin.model();
  }
}
