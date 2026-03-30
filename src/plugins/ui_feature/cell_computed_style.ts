import { LINK_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { toCartesian } from "../../helpers/coordinates";
import { getItemId } from "../../helpers/data_normalization";
import { isObjectEmptyRecursive, removeFalsyAttributes } from "../../helpers/misc";
import { recomputeZones } from "../../helpers/recompute_zones";
import { isZoneInside, toZone, zoneToXc } from "../../helpers/zones";
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
      // Collect all link cells that need LINK_COLOR, grouped by their containing style zone to avoid O(n^2) calls to `recomputeZones`
      const linkCellsByStyleZone: Record<string, string[]> = {};
      // Some link cells might not be part of any style zone, handled separately
      const linkCellsWithoutStyleZone: string[] = [];

      for (const xc in sheet.cells) {
        const position = { sheetId: sheet.id, ...toCartesian(xc) };
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        const computedStyle = this.getComputedStyle(position);
        if (!evaluatedCell.link || computedStyle.textColor) {
          continue;
        }
        const styleXc = Object.keys(sheet.styles).find((styleXc) =>
          isZoneInside(toZone(xc), toZone(styleXc))
        );
        if (styleXc) {
          if (!linkCellsByStyleZone[styleXc]) {
            linkCellsByStyleZone[styleXc] = [];
          }
          linkCellsByStyleZone[styleXc].push(xc);
        } else {
          linkCellsWithoutStyleZone.push(xc);
        }
      }

      for (const [styleXc, linkXcs] of Object.entries(linkCellsByStyleZone)) {
        const existingStyleId = sheet.styles[styleXc];
        if (data.styles[existingStyleId].textColor) {
          continue;
        }
        const existingStyle = data.styles[existingStyleId];
        const linkZones = linkXcs.map(toZone);
        const remainingZones = recomputeZones([toZone(styleXc)], linkZones);

        delete sheet.styles[styleXc];

        for (const zone of remainingZones) {
          sheet.styles[zoneToXc(zone)] = existingStyleId;
        }
        const linkStyleId = getItemId({ ...existingStyle, textColor: LINK_COLOR }, data.styles);
        for (const xc of linkXcs) {
          sheet.styles[xc] = linkStyleId;
        }
      }

      for (const xc of linkCellsWithoutStyleZone) {
        const cell = this.getters.getCell({ sheetId: sheet.id, ...toCartesian(xc) });
        sheet.styles[xc] = getItemId({ ...cell?.style, textColor: LINK_COLOR }, data.styles);
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
