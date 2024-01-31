import { GRID_ICON_MARGIN, ICON_EDGE_LENGTH, PADDING_AUTORESIZE_HORIZONTAL } from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  isEqual,
  positions,
  range,
  splitTextToWidth,
} from "../../helpers/index";
import { localizeFormula } from "../../helpers/locale";
import { CellValueType, Command, CommandResult, LocalCommand, UID } from "../../types";
import { CellPosition, HeaderIndex, Pixel, Style, Zone } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = [
    "doesCellHaveGridIcon",
    "getCellWidth",
    "getTextWidth",
    "getCellText",
    "getCellMultiLineText",
    "getContiguousZone",
    "isEvaluatedCellEmpty",
  ] as const;

  private ctx = document.createElement("canvas").getContext("2d")!;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    return this.chainValidations(this.checkSheetExists, this.checkZonesAreInSheet)(cmd);
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
              size,
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
            size: null,
            sheetId: cmd.sheetId,
          });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

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

    const icon = this.getters.getConditionalIcon(position);
    if (icon) {
      contentWidth += computeIconWidth(style);
    }

    if (this.getters.doesCellHaveGridIcon(position)) {
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

  getTextWidth(text: string, style: Style): Pixel {
    return computeTextWidth(this.ctx, text, style);
  }

  getCellText(position: CellPosition, showFormula: boolean = false): string {
    const cell = this.getters.getCell(position);
    if (showFormula && cell?.isFormula) {
      return localizeFormula(cell.content, this.getters.getLocale());
    } else {
      return this.getters.getEvaluatedCell(position).formattedValue;
    }
  }

  /**
   * Return the text of a cell, split in multiple lines if needed. The text will be split in multiple
   * line if it contains NEWLINE characters, or if it's longer than the given width.
   */
  getCellMultiLineText(position: CellPosition, width: number | undefined): string[] {
    const style = this.getters.getCellStyle(position);
    const text = this.getters.getCellText(position, this.getters.shouldShowFormulas());
    return splitTextToWidth(this.ctx, text, style, width);
  }

  doesCellHaveGridIcon(position: CellPosition): boolean {
    const isFilterHeader = this.getters.isFilterHeader(position);
    const hasListIcon =
      !this.getters.isReadonly() && this.getters.cellHasListDataValidationIcon(position);
    return isFilterHeader || hasListIcon;
  }

  /**
   * Expands the given zone until bordered by empty cells or reached the sheet boundaries.
   */
  getContiguousZone(sheetId: UID, zoneToExpand: Zone): Zone {
    /** Try to expand the zone by one col/row in any direction to include a new non-empty cell */
    const expandZone = (zone: Zone): Zone => {
      for (const col of range(zone.left, zone.right + 1)) {
        if (!this.isCellEmpty({ sheetId, col, row: zone.top - 1 })) {
          return { ...zone, top: zone.top - 1 };
        }
        if (!this.isCellEmpty({ sheetId, col, row: zone.bottom + 1 })) {
          return { ...zone, bottom: zone.bottom + 1 };
        }
      }
      for (const row of range(zone.top, zone.bottom + 1)) {
        if (!this.isCellEmpty({ sheetId, col: zone.left - 1, row })) {
          return { ...zone, left: zone.left - 1 };
        }
        if (!this.isCellEmpty({ sheetId, col: zone.right + 1, row })) {
          return { ...zone, right: zone.right + 1 };
        }
      }
      return zone;
    };

    let hasExpanded = false;
    let zone = zoneToExpand;
    do {
      hasExpanded = false;
      const newZone = expandZone(zone);
      if (!isEqual(zone, newZone)) {
        hasExpanded = true;
        zone = newZone;
        continue;
      }
    } while (hasExpanded);

    return zone;
  }

  /**
   * Checks if a cell evaluated value is empty. If the cell is part of a merge,
   * the check applies to the main cell of the merge.
   */
  //TODORAR this does not fit the new scheme where a cell with an empty string is not empty anymore
  // this means the navigation was acually altered with the recent change
  // remove the getter and put it back in selection processor as nobody uses it
  isEvaluatedCellEmpty(position: CellPosition): boolean {
    const mainPosition = this.getters.getMainCellPosition(position);
    const cell = this.getters.getEvaluatedCell(mainPosition);
    return cell.type === CellValueType.empty;
  }

  /**
   * Checks if a cell is empty (i.e. does not have a content or a formula does not spread over it).
   * If the cell is part of a merge, the check applies to the main cell of the merge.
   */
  private isCellEmpty(position: CellPosition): boolean {
    const mainPosition = this.getters.getMainCellPosition(position);
    return !(
      this.getters.getCorrespondingFormulaCell(mainPosition) ||
      this.getters.getCell(mainPosition)?.content
    );
  }

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): number {
    const cellsPositions = positions(this.getters.getColsZone(sheetId, index, index));
    const sizes = cellsPositions.map((position) => this.getCellWidth({ sheetId, ...position }));
    return Math.max(0, ...sizes);
  }

  /**
   * Check that any "sheetId" in the command matches an existing
   * sheet.
   */
  private checkSheetExists(cmd: Command): CommandResult {
    if ("sheetId" in cmd && this.getters.tryGetSheet(cmd.sheetId) === undefined) {
      return CommandResult.InvalidSheetId;
    }
    return CommandResult.Success;
  }

  /**
   * Check if zones in the command are well formed and
   * not outside the sheet.
   */
  private checkZonesAreInSheet(cmd: Command): CommandResult {
    const sheetId = "sheetId" in cmd ? cmd.sheetId : this.getters.tryGetActiveSheetId();
    const zones = this.getters.getCommandZones(cmd);
    if (!sheetId && zones.length > 0) {
      return CommandResult.NoActiveSheet;
    }
    if (sheetId && zones.length > 0) {
      return this.getters.checkZonesExistInSheet(sheetId, zones);
    }
    return CommandResult.Success;
  }
}
