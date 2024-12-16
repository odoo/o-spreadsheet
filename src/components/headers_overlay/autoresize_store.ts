import { CellPosition, Command, HeaderIndex, UID } from "../..";
import { GRID_ICON_MARGIN, ICON_EDGE_LENGTH, PADDING_AUTORESIZE_HORIZONTAL } from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  largeMax,
  positionToXc,
  positions,
  splitTextToWidth,
} from "../../helpers";
import { SpreadsheetStore } from "../../stores";
import { GridCellIconStore } from "../grid_cell_icon_overlay/grid_cell_icon_overlay_store";

export class AutoresizeStore extends SpreadsheetStore {
  private ctx = document.createElement("canvas").getContext("2d")!;

  protected gridCellIconStore = this.get(GridCellIconStore);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.model.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [col],
              dimension: "COL",
              size,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          this.model.dispatch("RESIZE_COLUMNS_ROWS", {
            elements: [row],
            dimension: "ROW",
            size: null,
            sheetId: cmd.sheetId,
          });
        }
        break;
    }
  }

  getCellWidth(position: CellPosition): number {
    const style = this.getters.getCellComputedStyle(position);

    let contentWidth = 0;

    const content = this.getters.getEvaluatedCell(position).formattedValue;
    if (content) {
      const multiLineText = splitTextToWidth(this.ctx, content, style, undefined);
      contentWidth += Math.max(
        ...multiLineText.map((line) => computeTextWidth(this.ctx, line, style))
      );
    }

    const icon = this.getters.getCellIconSrc(position);
    if (icon) {
      contentWidth += computeIconWidth(style);
    }

    const xc = positionToXc(position);
    const cellIcon = this.gridCellIconStore.icons[xc];
    if (cellIcon) {
      contentWidth += ICON_EDGE_LENGTH + GRID_ICON_MARGIN;
    }

    if (contentWidth === 0) {
      return 0;
    }

    contentWidth += 2 * PADDING_AUTORESIZE_HORIZONTAL;
    if (style.wrapping === "wrap") {
      const colWidth = this.getters.getColSize(this.getters.getActiveSheetId(), position.col);
      return Math.min(colWidth, contentWidth);
    }

    return contentWidth;
  }

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): number {
    const cellsPositions = positions(this.getters.getColsZone(sheetId, index, index));
    const sizes = cellsPositions.map((position) => this.getCellWidth({ sheetId, ...position }));
    return Math.max(0, largeMax(sizes));
  }
}
