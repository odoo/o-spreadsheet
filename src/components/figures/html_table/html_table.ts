import { Component } from "@odoo/owl";
import { CellPosition, Zone } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers";
import { HTMLCell } from "../html_cell/html_cell";

interface Props {
  zone: Zone;
}

export class HTMLGridContent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLGridContent";
  static props = {
    zone: Object,
  };
  static components = { HTMLCell };

  get containerStyle(): string {
    // ADRM TODO do it in the figure instead
    const tableZone = this.props.zone;
    const rect = this.env.model.getters.getRect(tableZone);
    return cssPropertiesToCss({
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      "z-index": "2",
    });
  }

  rowsToDisplay(): { rowStyle: string; cells: CellPosition[] }[] {
    const positions: { rowStyle: string; cells: CellPosition[] }[] = [];
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.props.zone;
    for (let row = zone.top; row <= zone.bottom; row++) {
      const rowPositions: CellPosition[] = [];
      for (let col = zone.left; col <= zone.right; col++) {
        rowPositions.push({ col, row, sheetId });
      }
      const rowSize = this.env.model.getters.getRowSize(sheetId, row);
      positions.push({
        rowStyle: cssPropertiesToCss({ height: `${rowSize}px`, overflow: "hidden" }),
        cells: rowPositions,
      });
    }
    return positions;
  }

  get tableColumnStyles() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const columnStyles: string[] = [];
    for (let col = this.props.zone.left; col <= this.props.zone.right; col++) {
      const width = this.env.model.getters.getColSize(sheetId, col);
      columnStyles.push(cssPropertiesToCss({ width: `${width}px` }));
    }
    return columnStyles;
  }
}
