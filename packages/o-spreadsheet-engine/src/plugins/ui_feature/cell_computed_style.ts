import { LINK_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/misc";
import { positionToZone } from "../../helpers/zones";
import {
  Command,
  invalidateBordersCommands,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Border, CellPosition, Style, UID, Zone } from "../../types/misc";
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
      cmd.type === "CLEAR_FORMATTING" ||
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

  getCellComputedBorder(position: CellPosition, precomputeZone?: Zone): Border | null {
    let border = this.borders.get(position);
    if (border === undefined) {
      this.precomputeCellBorders(position.sheetId, precomputeZone ?? positionToZone(position));
      border = this.borders.get(position);
    }
    return border ?? null;
  }

  private precomputeCellBorders(sheetId: UID, zone: Zone) {
    const borders = this.getters.getCellBordersInZone(sheetId, zone);
    const tableBorders = this.getters.getCellTableBorderZone(sheetId, zone);
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const position = { sheetId, col, row };
        if (this.borders.get(position) !== undefined) {
          continue;
        }
        const cellBorder = borders.get(position);
        const cellTableBorder = tableBorders.get(position);
        const border = {
          ...removeFalsyAttributes(cellTableBorder),
          ...removeFalsyAttributes(cellBorder),
        };
        if (isObjectEmptyRecursive(border)) {
          this.borders.set(position, null);
        } else {
          this.borders.set(position, border);
        }
      }
    }
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
    const cellStyle = this.getters.getCellStyle(position);
    const cfStyle = this.getters.getCellConditionalFormatStyle(position);
    const tableStyle = this.getters.getCellTableStyle(position);
    const dataValidationStyle = this.getters.getDataValidationCellStyle(position);
    const computedStyle = {
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(dataValidationStyle),
      ...removeFalsyAttributes(cellStyle),
      ...removeFalsyAttributes(cfStyle),
    };
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
    }

    return computedStyle;
  }
}
