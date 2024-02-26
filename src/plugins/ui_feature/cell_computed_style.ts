import { LINK_COLOR } from "../../constants";
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/index";
import { Command, invalidateCFEvaluationCommands, invalidateEvaluationCommands } from "../../types";
import { Border, CellPosition, Style, UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";
import { doesCommandInvalidatesTableStyle } from "./table_style";

export class CellComputedStylePlugin extends UIPlugin {
  static getters = ["getCellComputedBorder", "getCellComputedStyle"] as const;

  private styles: Record<UID, Record<number, Record<number, Style>>> = {};
  private borders: Record<UID, Record<number, Record<number, Border | null>>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "UPDATE_CELL" ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.styles = {};
      this.borders = {};
      return;
    }

    if (doesCommandInvalidatesTableStyle(cmd)) {
      delete this.styles[cmd.sheetId];
      delete this.borders[cmd.sheetId];
      return;
    }

    if (invalidateCFEvaluationCommands.has(cmd.type)) {
      this.styles = {};
      return;
    }
  }

  getCellComputedBorder(position: CellPosition): Border | null {
    const { sheetId, row, col } = position;
    if (this.borders[sheetId]?.[row]?.[col] !== undefined) {
      return this.borders[sheetId][row][col];
    }
    if (!this.borders[sheetId]) {
      this.borders[sheetId] = {};
    }
    if (!this.borders[sheetId][row]) {
      this.borders[sheetId][row] = {};
    }
    if (!this.borders[sheetId][row][col]) {
      this.borders[sheetId][row][col] = this.computeCellBorder(position);
    }
    return this.borders[sheetId][row][col];
  }

  getCellComputedStyle(position: CellPosition): Style {
    const { sheetId, row, col } = position;
    if (this.styles[sheetId]?.[row]?.[col] !== undefined) {
      return this.styles[sheetId][row][col];
    }
    if (!this.styles[sheetId]) {
      this.styles[sheetId] = {};
    }
    if (!this.styles[sheetId][row]) {
      this.styles[sheetId][row] = {};
    }
    if (!this.styles[sheetId][row][col]) {
      this.styles[sheetId][row][col] = this.computeCellStyle(position);
    }
    return this.styles[sheetId][row][col];
  }

  private computeCellBorder(position: CellPosition): Border | null {
    const cellBorder = this.getters.getCellBorder(position) || {};
    const cellTableBorder = this.getters.getCellTableBorder(position) || {};

    // Use removeFalsyAttributes to avoid overwriting borders with undefined values
    const border = {
      ...removeFalsyAttributes(cellTableBorder),
      ...removeFalsyAttributes(cellBorder),
    };

    return isObjectEmptyRecursive(border) ? null : border;
  }

  private computeCellStyle(position: CellPosition): Style {
    const cell = this.getters.getCell(position);
    const cfStyle = this.getters.getCellConditionalFormatStyle(position);
    const tableStyle = this.getters.getCellTableStyle(position);
    const computedStyle = {
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(cell?.style),
      ...removeFalsyAttributes(cfStyle),
    };
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
    }

    return computedStyle;
  }
}
