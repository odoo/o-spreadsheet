import { providePlugins, Signal } from "@odoo/owl";
import { providePluginsIfNotPresent } from "../../helpers/owl3_helpers";
import { Model } from "../../model";
import { ImageProviderPlugin } from "../../owl_plugins/image_provider_owl_plugin";
import { IsSmallPlugin } from "../../owl_plugins/is_small_plugin";
import { ModelPlugin } from "../../owl_plugins/model_owl_plugin";
import { NavigatorClipboardPlugin } from "../../owl_plugins/navigator_clipboard_plugin";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { PrintModePlugin } from "../../owl_plugins/print_mode_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useStore, useStoreProvider } from "../../store_engine/store_hooks";
import { globalStores } from "../../store_engine/store_registries";
import { ModelStore } from "../../stores/model_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { Rect } from "../../types/rendering";
import { DraggedFigurePlugin } from "../figures/figure_dnd_container/figure_dnd_owl_plugin";
import { provideSpreadsheetRect } from "../helpers/position_hook";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";

interface SpreadsheetProvidersConfig {
  model: Model;
  spreadsheetRef: Signal<HTMLElement | null>;
  getPopoverContainerRect: () => Rect;
}

/**
 * Provide every plugin and store container shared by all the components of a spreadsheet.
 * It's used by the Spreadsheet component and in the tests. So both share the
 * same initialization logic.
 */
export function useSpreadsheetProviders(config: SpreadsheetProvidersConfig) {
  const { model, spreadsheetRef, getPopoverContainerRect } = config;
  provideSpreadsheetRect(spreadsheetRef);
  providePlugins(
    [
      ZoomPlugin,
      IsSmallPlugin,
      PopoverContainerPlugin,
      ModelPlugin,
      NavigatorClipboardPlugin,
      ImageProviderPlugin,
    ],
    {
      getPopoverContainerRect,
      model,
      fileStore: model.config.external.fileStore,
    }
  );
  providePluginsIfNotPresent([PrintModePlugin, NotificationPlugin]);

  const stores = useStoreProvider();
  stores.inject(ModelStore, model);

  const viewStore = useStore(ViewportsStore);
  providePlugins([DraggedFigurePlugin], { viewStore });

  for (const store of globalStores.getAll()) {
    useStore(store);
  }

  return { stores };
}
