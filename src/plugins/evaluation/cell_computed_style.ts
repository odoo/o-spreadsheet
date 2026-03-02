import { LINK_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { toCartesian } from "../../helpers/coordinates";
import { addStyleToWorkbookData } from "../../helpers/data_normalization";
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/misc";
import { EvaluationCommand } from "../../types/commands";
import { Border, CellPosition, Style, UID } from "../../types/misc";
import { ExcelWorkbookData } from "../../types/workbook_data";
import { EvaluationPlugin } from "../evaluation_plugin";

export class CellComputedStylePlugin extends EvaluationPlugin {
  static getters = ["getCellComputedBorder", "getCellComputedStyle"] as const;

  private styles: PositionMap<Style> = new PositionMap();
  private borders: PositionMap<Border | null> = new PositionMap();

  handlers = {
    UPDATE_CELL: this.invalidateComputedStyles,
    SET_FORMATTING: this.invalidateComputedStyles,
    CLEAR_FORMATTING: this.invalidateComputedStyles,
    SET_SHEET_BACKGROUND_COLOR: this.invalidateComputedStyles,
    REMOVE_DATA_VALIDATION_RULE: this.invalidateComputedStyles,
    ADD_DATA_VALIDATION_RULE: this.invalidateComputedStyles,
    EVALUATE_CELLS: this.invalidateComputedStyles,
    "*invalidateEvaluationCommands": this.invalidateComputedStyles,
    "*invalidateBordersCommands": this.invalidateComputedBorders,
    "*invalidateCFEvaluationCommands": this.invalidateComputedCfStyles,
    "*invalidateTableStyleCommands": this.invalidateTableComputedStyles,
  };

  private invalidateTableComputedStyles(cmd: EvaluationCommand) {
    if ("sheetId" in cmd) {
      this.invalidateSheetComputedStyles(cmd);
    } else {
      this.invalidateComputedStyles();
    }
  }

  private invalidateComputedCfStyles() {
    if (!this.styles.isEmpty()) {
      this.styles = new PositionMap();
    }
  }

  private invalidateComputedBorders() {
    if (!this.borders.isEmpty()) {
      this.borders = new PositionMap();
    }
  }

  private invalidateComputedStyles() {
    this.styles = new PositionMap();
    this.borders = new PositionMap();
  }

  private invalidateSheetComputedStyles(cmd: { sheetId: UID }) {
    this.styles.clearSheet(cmd.sheetId);
    this.borders.clearSheet(cmd.sheetId);
  }

  getCellComputedBorder(position: CellPosition): Border | null {
    let border = this.borders.get(position);
    if (border === undefined) {
      border = this.computeCellBorder(position);
      this.borders.set(position, border);
    }
    return border;
  }

  getCellComputedStyle(position: CellPosition): Style {
    let style = this.styles.get(position);
    if (style === undefined) {
      style = this.computeCellStyle(position);
      this.styles.set(position, style);
    }
    return style;
  }

  private computeCellStyle(position: CellPosition): Style {
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    const computedStyle = this.getComputedStyle(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
    }
    return computedStyle;
  }

  private getComputedStyle(position: CellPosition): Style {
    const cellStyle = this.getters.getCellStyle(position);
    const cfStyle = this.getters.getCellConditionalFormatStyle(position);
    const tableStyle = this.getters.getCellTableStyle(position);
    const dataValidationStyle = this.getters.getDataValidationCellStyle(position);
    const sheet = this.getters.getSheet(position.sheetId);
    return {
      ...removeFalsyAttributes({ fillColor: sheet?.backgroundColor }),
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(dataValidationStyle),
      ...removeFalsyAttributes(cellStyle),
      ...removeFalsyAttributes(cfStyle),
    };
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      for (const xc in sheet.cells) {
        const position = { sheetId: sheet.id, ...toCartesian(xc) };
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        const computedStyle = this.getComputedStyle(position);
        if (!evaluatedCell.link || computedStyle.textColor) {
          continue;
        }
        const newStyle = { ...computedStyle, textColor: LINK_COLOR };
        addStyleToWorkbookData(data, "styles", position, newStyle);
      }
    }
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
}
