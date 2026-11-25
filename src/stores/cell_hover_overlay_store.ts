import { computed, signal, usePlugin } from "@odoo/owl";
import { HoveredCellPlugin } from "../components/grid/delayed_hovered_cell_owl_plugin";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../constants";
import { arePositionMapEqual, PositionMap } from "../helpers/cells/position_map";
import { OwlPluginWithModel } from "../owl_plugins/owl_plugin_with_model";
import { CellPosition, Color } from "../types/misc";

export interface CellHoverOverlayProvider {
  getHighlightedPositions: (hoveredPosition: CellPosition) => CellPosition[];
}

export class CellHoverOverlayPlugin extends OwlPluginWithModel {
  private providers = signal.Array<CellHoverOverlayProvider>([]);
  private hoveredCell = usePlugin(HoveredCellPlugin);

  overlayColors = computed<PositionMap<Color>>(
    () => {
      const newColors = new PositionMap<Color>();
      const hoveredPosition = this.hoveredCell.position();
      if (!this.providers().length || hoveredPosition === undefined) {
        return newColors;
      }

      // FIXME OWL3: manually register to model changes. Can be removed once the provider stores are transformed into plugins,
      // and getting the highlights read the model signal
      this.model();

      for (const provider of this.providers()) {
        const positions = provider.getHighlightedPositions(hoveredPosition);
        for (const position of positions) {
          newColors.set(position, TABLE_HOVER_BACKGROUND_COLOR);
        }
      }
      return newColors;
    },
    { equals: arePositionMapEqual }
  );

  register(highlightProvider: CellHoverOverlayProvider) {
    this.providers().push(highlightProvider);
  }

  unRegister(highlightProvider: CellHoverOverlayProvider) {
    this.providers.set(this.providers().filter((h) => h !== highlightProvider));
  }
}
