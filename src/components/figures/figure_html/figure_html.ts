import { Component } from "@odoo/owl";
import { CellPosition, CSSProperties, FigureUI, Rect, UID } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers";
import { HTMLCell } from "../html_cell/html_cell";

interface Props {
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class HTMLFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { HTMLCell };

  get figureId(): UID {
    return this.props.figureUI.id;
  }

  get firstTableInSheet() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const tables = this.env.model.getters.getTables(sheetId);
    return tables[0];
  }

  get containerStyle(): string {
    // ADRM TODO do it in the figure instead
    const tableZone = this.firstTableInSheet.range.zone;
    const rect = this.env.model.getters.getRect(tableZone);
    return cssPropertiesToCss({
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      position: "relative",
      "z-index": "2",
    });
  }

  rowsToDisplay(): { rowStyle: string; cells: CellPosition[] }[] {
    const positions: { rowStyle: string; cells: CellPosition[] }[] = [];
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.firstTableInSheet.range.zone;
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
    const table = this.firstTableInSheet;
    const columnStyles: string[] = [];
    for (let col = table.range.zone.left; col <= table.range.zone.right; col++) {
      const width = this.env.model.getters.getColSize(sheetId, col);
      columnStyles.push(cssPropertiesToCss({ width: `${width}px` }));
    }
    return columnStyles;
  }
}
