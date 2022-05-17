import { PADDING_AUTORESIZE } from "../../constants";
import { computeIconWidth, computeTextWidth } from "../../helpers/index";
import { Cell, CellValueType, Command, CommandResult, UID } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = ["getCellWidth", "getTextWidth", "getCellText"] as const;

  private ctx = document.createElement("canvas").getContext("2d")!;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "AUTORESIZE_ROWS":
      case "AUTORESIZE_COLUMNS":
        try {
          this.getters.getSheet(cmd.sheetId);
          break;
        } catch (error) {
          return CommandResult.InvalidSheetId;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [col],
              dimension: "COL",
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          this.dispatch("RESIZE_COLUMNS_ROWS", {
            elements: [row],
            dimension: "ROW",
            size: undefined,
            sheetId: cmd.sheetId,
          });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellWidth(cell: Cell): number {
    let width = this.getTextWidth(cell);
    const cellPosition = this.getters.getCellPosition(cell.id);
    const icon = this.getters.getConditionalIcon(cellPosition.col, cellPosition.row);
    if (icon) {
      width += computeIconWidth(this.ctx, this.getters.getCellStyle(cell));
    }
    return width;
  }

  getTextWidth(cell: Cell): number {
    const text = this.getters.getCellText(cell, this.getters.shouldShowFormulas());
    return computeTextWidth(this.ctx, text, this.getters.getCellStyle(cell));
  }

  getCellText(cell: Cell, showFormula: boolean = false): string {
    if (showFormula && (cell.isFormula() || cell.evaluated.type === CellValueType.error)) {
      return cell.content;
    } else {
      return cell.formattedValue;
    }
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: number): number {
    const cells = this.getters.getColCells(sheetId, index);
    const sizes = cells.map((cell: Cell) => this.getCellWidth(cell));
    return Math.max(0, ...sizes);
  }
}
