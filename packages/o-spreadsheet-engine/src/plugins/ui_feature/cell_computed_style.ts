import { LINK_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { toCartesian } from "../../helpers/coordinates";
import { getItemId } from "../../helpers/data_normalization";
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/misc";
import {
  Command,
  invalidateBordersCommands,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Border, CellPosition, Style } from "../../types/misc";
import { ExcelWorkbookData } from "../../types/workbook_data";
import { UIPlugin } from "../ui_plugin";
import { doesCommandInvalidatesTableStyle } from "./table_computed_style";

export class CellComputedStylePlugin extends UIPlugin {
  static getters = ["getCellComputedBorder", "getCellComputedStyle"] as const;

  private styles: PositionMap<Style> = new PositionMap();
  private borders: PositionMap<Border | null> = new PositionMap();

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "UPDATE_CELL" ||
      cmd.type === "SET_FORMATTING" ||
      cmd.type === "ADD_DATA_VALIDATION_RULE" ||
      cmd.type === "REMOVE_DATA_VALIDATION_RULE" ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.styles = new PositionMap();
      this.borders = new PositionMap();
      return;
    }

    if (doesCommandInvalidatesTableStyle(cmd)) {
      if ("sheetId" in cmd) {
        this.styles.clearSheet(cmd.sheetId);
        this.borders.clearSheet(cmd.sheetId);
      } else {
        this.styles = new PositionMap();
        this.borders = new PositionMap();
      }
      return;
    }

    if (invalidateCFEvaluationCommands.has(cmd.type)) {
      this.styles = new PositionMap();
      return;
    }
    if (invalidateBordersCommands.has(cmd.type)) {
      this.borders = new PositionMap();
      return;
    }
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
    const cell = this.getters.getCell(position);
    const cfStyle = this.getters.getCellConditionalFormatStyle(position);
    const tableStyle = this.getters.getCellTableStyle(position);
    const dataValidationStyle = this.getters.getDataValidationCellStyle(position);
    return {
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(dataValidationStyle),
      ...removeFalsyAttributes(cell?.style),
      ...removeFalsyAttributes(cfStyle),
    };
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      for (const xc in sheet.cells) {
        const position = { sheetId: sheet.id, ...toCartesian(xc) };
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        const computedStyle = this.getComputedStyle(position);
        if (evaluatedCell.link && !computedStyle.textColor) {
          const cell = this.getters.getCell(position);
          const style = { ...cell?.style, textColor: LINK_COLOR };
          const newStyleId = getItemId(style, data.styles);
          sheet.styles[xc] = newStyleId;
        }
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
