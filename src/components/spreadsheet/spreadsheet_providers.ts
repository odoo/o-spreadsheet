import { PluginConstructor, providePlugins } from "@odoo/owl";
import { Model } from "../../model";
import { ImageProviderPlugin } from "../../owl_plugins/image_provider_owl_plugin";
import { IsSmallPlugin } from "../../owl_plugins/is_small_plugin";
import { ModelPlugin } from "../../owl_plugins/model_owl_plugin";
import { NavigatorClipboardPlugin } from "../../owl_plugins/navigator_clipboard_plugin";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { PrintModePlugin } from "../../owl_plugins/print_mode_owl_plugin";
import { SpreadsheetRectPlugin } from "../../owl_plugins/spreadsheet_rect_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useStore, useStoreProvider } from "../../store_engine/store_hooks";
import { globalStores } from "../../store_engine/store_registries";
import { ModelStore } from "../../stores/model_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { DraggedFigurePlugin } from "../figures/figure_dnd_container/figure_dnd_owl_plugin";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";

interface SpreadsheetPluginsConfig {
  model: Model;
}

const SPREADSHEET_PLUGINS: PluginConstructor[] = [
  ZoomPlugin,
  IsSmallPlugin,
  SpreadsheetRectPlugin,
  PopoverContainerPlugin,
  ModelPlugin,
  NavigatorClipboardPlugin,
  ImageProviderPlugin,
  PrintModePlugin,
  NotificationPlugin,
];

/**
 * Provide every plugin and store container shared by all the components of a spreadsheet.
 * It can be called by an integrator in a parent of the Spreadsheet component (to access
 * the plugins/stores), otherwise the Spreadsheet component calls it itself.
 *
 * A custom plugin replaces a default one if they share the same static `id`.
 */
export function provideSpreadsheetPlugins(
  config: SpreadsheetPluginsConfig,
  customPlugins: PluginConstructor[] = []
) {
  const { model } = config;
  const customIds = new Set(customPlugins.map((plugin) => plugin.id));
  const defaultPlugins = SPREADSHEET_PLUGINS.filter((plugin) => !customIds.has(plugin.id));
  providePlugins([...defaultPlugins, ...customPlugins], {
    model,
    fileStore: model.config.external.fileStore,
  });

  const stores = useStoreProvider();
  stores.inject(ModelStore, model);

  const viewStore = useStore(ViewportsStore);
  providePlugins([DraggedFigurePlugin], { viewStore });

  for (const store of globalStores.getAll()) {
    useStore(store);
  }

  return { stores };
}
