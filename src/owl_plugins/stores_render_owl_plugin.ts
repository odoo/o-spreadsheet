import { onWillDestroy, onWillStart, Plugin, signal, useConfig, usePlugin } from "@odoo/owl";
import { DependencyContainer } from "../store_engine/dependency_container";
import { ModelPlugin } from "./model_owl_plugin";

// FIXME OWL3: This plugin is only there to make sure that the useEffect of the useGridDrawing is triggered when the
// model or a store is updated. Should be removed once all the stores are transformed to owl plugins.
export class StoreRendererPlugin extends Plugin {
  stores: DependencyContainer = useConfig("stores");

  storeSignal = signal(1);
  modelPlugin = usePlugin(ModelPlugin);

  setup() {
    onWillStart(() => {
      this.stores.on("store-updated", this, () => {
        signal.trigger(this.storeSignal);
      });
    });
    onWillDestroy(() => {
      this.stores.off("store-updated", this);
    });
  }

  /**
   * Touch the signals to make the caller depend on the stores/model signals
   */
  watchDependencies() {
    this.storeSignal();
    this.modelPlugin.model();
  }
}
