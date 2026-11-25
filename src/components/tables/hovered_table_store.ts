import { usePlugin } from "@odoo/owl";
import { range } from "../../helpers/misc";
import { CellHoverOverlayPlugin } from "../../owl_plugins/cell_hover_overlay_owl_plugin";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellPosition } from "../../types/misc";
import { Get } from "../../types/store_engine";

export class HoveredTableStore extends SpreadsheetStore {
  mutators = ["hover"] as const;
  storeGetters = ["getCellHoverOverlayColor"] as const;

  private hoveredCellOverlayPlugin = usePlugin(CellHoverOverlayPlugin);

  constructor(get: Get) {
    super(get);
    this.hoveredCellOverlayPlugin.register(this);
    this.onDispose(() => this.hoveredCellOverlayPlugin.unRegister(this));
  }

  getHighlightedPositions(hoveredPosition: CellPosition): CellPosition[] {
    const highlightedPositions: CellPosition[] = [];
    const { sheetId, row } = hoveredPosition;
    const table = this.getters.getTable(hoveredPosition);
    if (!table) {
      return highlightedPositions;
    }
    const { left, right, top } = table.range.zone;
    const isTableHeader = row < top + table.config.numberOfHeaders;
    const doesTableRowHaveContent = range(left, right + 1).some((col) => {
      return (
        !this.getters.isColHidden(sheetId, col) &&
        this.getters.getEvaluatedCell({ sheetId, col, row }).formattedValue
      );
    });

    if (!isTableHeader && doesTableRowHaveContent) {
      for (let col = left; col <= right; col++) {
        highlightedPositions.push({ sheetId, col, row });
      }
    }

    return highlightedPositions;
  }
}
