import { LINK_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f:packages/o-spreadsheet-engine/src/plugins/ui_feature/cell_computed_style.ts
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/misc";
import { positionToZone } from "../../helpers/zones";
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7:src/plugins/ui_feature/cell_computed_style.ts
import { isObjectEmptyRecursive, positionToZone, removeFalsyAttributes } from "../../helpers/index";
=======
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/index";
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de:src/plugins/ui_feature/cell_computed_style.ts
import {
  Command,
  invalidateBordersCommands,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f:packages/o-spreadsheet-engine/src/plugins/ui_feature/cell_computed_style.ts
} from "../../types/commands";
import { Border, CellPosition, Style, UID, Zone } from "../../types/misc";
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7:src/plugins/ui_feature/cell_computed_style.ts
} from "../../types";
import { Border, CellPosition, Style, UID, Zone } from "../../types/misc";
=======
} from "../../types";
import { Border, CellPosition, Style } from "../../types/misc";
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de:src/plugins/ui_feature/cell_computed_style.ts
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

  getCellComputedStyle(position: CellPosition, precomputeZone?: Zone): Style {
    let style = this.styles.get(position);
    if (style === undefined) {
      this.precomputeCellStyle(position.sheetId, precomputeZone ?? positionToZone(position));
      style = this.styles.get(position) ?? {};
    }
    return style;
  }

<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f:packages/o-spreadsheet-engine/src/plugins/ui_feature/cell_computed_style.ts
  private precomputeCellStyle(sheetId: UID, zone: Zone) {
    //Todo batch cf/dv style
    const styles = this.getters.getCellStyleInZone(sheetId, zone);
    const tableStyles = this.getters.getCellTableStyleZone(sheetId, zone);
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const position = { sheetId, col, row };
        if (this.styles.get(position) !== undefined) continue;
        const computedStyle = {
          ...removeFalsyAttributes(tableStyles.get(position)),
          ...removeFalsyAttributes(this.getters.getDataValidationCellStyle(position)),
          ...removeFalsyAttributes(styles.get(position)),
          ...removeFalsyAttributes(this.getters.getCellConditionalFormatStyle(position)),
        };
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        if (evaluatedCell.link && !computedStyle.textColor) {
          computedStyle.textColor = LINK_COLOR;
        }
        this.styles.set(position, computedStyle);
      }
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7:src/plugins/ui_feature/cell_computed_style.ts
  private computeCellStyle(position: CellPosition): Style {
    const cell = this.getters.getCell(position);
    const cfStyle = this.getters.getCellConditionalFormatStyle(position);
    const tableStyle = this.getters.getCellTableStyle(position);
    const dataValidationStyle = this.getters.getDataValidationCellStyle(position);
    const computedStyle = {
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(dataValidationStyle),
      ...removeFalsyAttributes(cell?.style),
      ...removeFalsyAttributes(cfStyle),
    };
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
=======
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
    const dataValidationStyle = this.getters.getDataValidationCellStyle(position);
    const computedStyle = {
      ...removeFalsyAttributes(tableStyle),
      ...removeFalsyAttributes(dataValidationStyle),
      ...removeFalsyAttributes(cell?.style),
      ...removeFalsyAttributes(cfStyle),
    };
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de:src/plugins/ui_feature/cell_computed_style.ts
    }
  }
}
