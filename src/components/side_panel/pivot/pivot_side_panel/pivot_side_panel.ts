import { Component, onMounted, onWillUnmount } from "@odoo/owl";
import { getPivotHighlights } from "../../../../helpers/pivot/pivot_highlight";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { useStore } from "../../../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import {
  GridCellIconProvider,
  GridCellIconStore,
} from "../../../grid_cell_icon_overlay/grid_cell_icon_overlay_store";
import { useHighlights } from "../../../helpers/highlight_hook";
import { Section } from "../../components/section/section";
import { PivotLayoutConfigurator } from "../pivot_layout_configurator/pivot_layout_configurator";
import { PivotSortIcon } from "../pivot_sort_icon/pivot_sort_icon";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = {
    PivotLayoutConfigurator,
    Section,
  };

  setup() {
    const iconProvider: GridCellIconProvider = {
      component: PivotSortIcon,
      hasIcon: (getters, cellPosition) => {
        const cellPivotId = getters.getPivotIdFromPosition(cellPosition);
        if (cellPivotId !== this.props.pivotId) {
          return false;
        }
        const pivotCell = getters.getPivotCellFromPosition(cellPosition);
        return pivotCell.type === "MEASURE_HEADER";
      },
      type: "rightIcon",
    };
    const gridCellIconStore = useStore(GridCellIconStore);
    useHighlights(this);
    onMounted(() => {
      gridCellIconStore.addIconProvider(iconProvider);
    });
    onWillUnmount(() => {
      gridCellIconStore.removeIconProvider(iconProvider);
    });
  }

  get sidePanelEditor() {
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    if (!pivot) {
      throw new Error("pivotId does not correspond to a pivot.");
    }
    return pivotSidePanelRegistry.get(pivot.type).editor;
  }

  get highlights() {
    return getPivotHighlights(this.env.model.getters, this.props.pivotId);
  }
}
