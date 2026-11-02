import {
  onWillDestroy,
  Plugin,
  PluginInstance,
  signal,
  types,
  useConfig,
  usePlugin,
} from "@odoo/owl";
import { DependencyContainer } from "../store_engine/dependency_container";
import { OrderedLayers } from "../types/rendering";
import { ModelPlugin } from "./model_owl_plugin";
import { RendererPlugin } from "./renderer_plugin";

/**
 * FIXME OWL3: This plugin is only there to make sure that the useEffect of the useGridDrawing is triggered when the
 * model or a store is updated. Should be removed once all the stores are transformed to owl plugins.
 */
export class StoreRendererPlugin extends Plugin {
  stores = useConfig("stores", types.object<DependencyContainer>());
  renderer = useConfig("rendererPlugin", types.object<PluginInstance<typeof RendererPlugin>>());

  storeSignal = signal(1);
  modelPlugin = usePlugin(ModelPlugin);

  setup() {
    this.stores.on("store-updated", this, () => {
      signal.trigger(this.storeSignal);
    });
    this.renderer.register(this);
    onWillDestroy(() => {
      this.stores.off("store-updated", this);
      this.renderer.unRegister(this);
    });
  }

  get renderingLayers() {
    return OrderedLayers();
  }

  readSignals() {
    this.storeSignal();
    this.modelPlugin.model();
  }

  drawLayer() {
    this.readSignals();
  }
}
