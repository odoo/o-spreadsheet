import {
  DATA_VALIDATION_CHIP_MARGIN,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_VERTICAL_ALIGN,
  MIN_CELL_TEXT_MARGIN,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../constants";
import { formatValue } from "../../helpers/format/format";
import { localizeFormula } from "../../helpers/locale";
import { groupConsecutive, largeMax, range } from "../../helpers/misc";
import {
  computeMultilineTextSize,
  computeTextLinesHeight,
  computeTextWidth,
  getCanvas,
  getCellContentHeight,
  splitTextToWidth,
} from "../../helpers/text_helper";
import { isEqual, positions } from "../../helpers/zones";
import { CellValueType } from "../../types/cells";
import { Command, CommandResult, LocalCommand } from "../../types/commands";
import {
  CellPosition,
  HeaderIndex,
  Pixel,
  Style,
  UID,
  VerticalAlign,
  Zone,
} from "../../types/misc";
import { Rect } from "../../types/rendering";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = [
    "getCellWidth",
    "getTextWidth",
    "getCellText",
    "getCellMultiLineText",
    "getMultilineTextSize",
    "getContiguousZone",
    "computeTextYCoordinate",
  ] as const;

  private ctx = getCanvas();

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    return this.chainValidations(this.checkSheetExists, this.checkZonesAreInSheet)(cmd);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (const col of cmd.cols) {
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
        this.autoResizeRows(cmd.sheetId, cmd.rows);
        break;
      case "DELETE_UNFILTERED_CONTENT":
        const newTarget: Zone[] = [];
        for (const target of cmd.target) {
          const nonFilteredRows = range(target.top, target.bottom + 1).filter(
            (row) => !this.getters.isRowFiltered(cmd.sheetId, row)
          );
          const consecutiveRows = groupConsecutive(nonFilteredRows);
          for (const group of consecutiveRows) {
            newTarget.push({ ...target, top: group[0], bottom: group[group.length - 1] });
          }
        }
        this.dispatch("DELETE_CONTENT", { sheetId: cmd.sheetId, target: newTarget });
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
      contentWidth += computeMultilineTextSize(this.ctx, multiLineText, style).width;
    }

    for (const icon of this.getters.getCellIcons(position)) {
      contentWidth += icon.margin + icon.size;
    }
    if (this.getters.getDataValidationChipStyle(position)) {
      contentWidth += DATA_VALIDATION_CHIP_MARGIN * 2;
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

  getMultilineTextSize(text: string[], style: Style) {
    return computeMultilineTextSize(this.ctx, text, style);
  }

  getCellText(
    position: CellPosition,
    args?: { showFormula?: boolean; availableWidth?: number }
  ): string {
    const cell = this.getters.getCell(position);
    const locale = this.getters.getLocale();
    if (args?.showFormula && cell?.isFormula) {
      return localizeFormula(cell.content, locale);
    } else if (args?.showFormula && !cell?.content) {
      return "";
    } else {
      const evaluatedCell = this.getters.getEvaluatedCell(position);
      const formatWidth = args?.availableWidth
        ? {
            availableWidth: args.availableWidth,
            measureText: (text: string) => computeTextWidth(this.ctx, text, cell?.style || {}),
          }
        : undefined;
      return formatValue(evaluatedCell.value, {
        format: evaluatedCell.format,
        locale,
        formatWidth,
      });
    }
  }

  /**
   * Return the text of a cell, split in multiple lines if needed. The text will be split in multiple
   * line if it contains NEWLINE characters, or if it's longer than the given width.
   */
  getCellMultiLineText(
    position: CellPosition,
    args: { wrapText: boolean; maxWidth: number }
  ): string[] {
    const style = this.getters.getCellStyle(position);
    const text = this.getters.getCellText(position, {
      showFormula: this.getters.shouldShowFormulas(),
      availableWidth: args.maxWidth,
    });
    return splitTextToWidth(this.ctx, text, style, args.wrapText ? args.maxWidth : undefined);
  }

  /** Computes the vertical start point from which a text line should be draw in a cell.
   *
   * Note that in case the cell does not have enough spaces to display its text lines,
   * (wrapping cell case) then the vertical align should be at the top.
   * */
  computeTextYCoordinate(
    cellRect: Rect,
    textLineHeight: number,
    verticalAlign: VerticalAlign = DEFAULT_VERTICAL_ALIGN,
    numberOfLines: number = 1
  ): number {
    const y = cellRect.y + 1; // +1 to skip the cell grid line at the top
    const textHeight = computeTextLinesHeight(textLineHeight, numberOfLines);
    const hasEnoughSpaces = cellRect.height > textHeight + MIN_CELL_TEXT_MARGIN * 2;

    if (hasEnoughSpaces) {
      if (verticalAlign === "middle") {
        return Math.ceil(y + (cellRect.height - textHeight) / 2);
      }
      if (verticalAlign === "bottom") {
        return y + cellRect.height - textHeight - MIN_CELL_TEXT_MARGIN;
      }
    }
    return y + MIN_CELL_TEXT_MARGIN;
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
      }
    } while (hasExpanded);

    return zone;
  }

  /**
   * Checks if a cell is empty (i.e. does not have a content or a formula does not spread over it).
   * If the cell is part of a merge, the check applies to the main cell of the merge.
   */
  private isCellEmpty(position: CellPosition): boolean {
    const mainPosition = this.getters.getMainCellPosition(position);
    return this.getters.getEvaluatedCell(mainPosition).type === CellValueType.empty;
  }

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): number {
    const cellsPositions = positions(this.getters.getColsZone(sheetId, index, index));
    const sizes = cellsPositions.map((position) => this.getCellWidth({ sheetId, ...position }));
    return Math.max(0, largeMax(sizes));
  }

  /**
   * Check that any "sheetId" in the command matches an existing
   * sheet.
   */
  private checkSheetExists(cmd: Command): CommandResult {
    if (
      "sheetId" in cmd &&
      this.getters.tryGetSheet(cmd.sheetId) === undefined &&
      cmd.type !== "CREATE_SHEET"
    ) {
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
    if (
      "ranges" in cmd &&
      cmd.ranges.some((rangeData) => !this.getters.tryGetSheet(rangeData._sheetId))
    ) {
      return CommandResult.InvalidSheetId;
    }
    const zones = this.getters.getCommandZones(cmd);
    if (!sheetId && zones.length > 0) {
      return CommandResult.NoActiveSheet;
    }
    if (sheetId && zones.length > 0) {
      return this.getters.checkZonesExistInSheet(sheetId, zones);
    }
    return CommandResult.Success;
  }

  private autoResizeRows(sheetId: UID, rows: HeaderIndex[]) {
    const rowSizes: (number | null)[] = [];
    for (const row of rows) {
      let evaluatedRowSize = 0;
      for (const cellId of this.getters.getRowCellIds(sheetId, row)) {
        const cell = this.getters.getCellById(cellId);
        if (!cell) {
          continue;
        }
        const position = this.getters.getCellPosition(cell.id);
        const colSize = this.getters.getColSize(sheetId, position.col);

        if (cell.isFormula || this.getters.getArrayFormulaSpreadingOn(position)) {
          const content = this.getters.getEvaluatedCell(position).formattedValue;
          const evaluatedSize = getCellContentHeight(this.ctx, content, cell?.style, colSize);
          if (evaluatedSize > evaluatedRowSize && evaluatedSize > DEFAULT_CELL_HEIGHT) {
            evaluatedRowSize = evaluatedSize;
          }
        } else {
          const content = cell.content;
          const dynamicRowSize = getCellContentHeight(this.ctx, content, cell?.style, colSize);
          // Only keep the size of evaluated cells if it's bigger than the dynamic row size
          if (dynamicRowSize >= evaluatedRowSize && dynamicRowSize > DEFAULT_CELL_HEIGHT) {
            evaluatedRowSize = 0;
          }
        }
      }
      rowSizes.push(evaluatedRowSize || null);
    }

    const groupedSizes = new Map<number | null, HeaderIndex[]>(rowSizes.map((size) => [size, []]));
    for (let i = 0; i < rowSizes.length; i++) {
      groupedSizes.get(rowSizes[i])?.push(rows[i]);
    }
    for (const [size, rows] of groupedSizes) {
      this.dispatch("RESIZE_COLUMNS_ROWS", {
        elements: rows,
        dimension: "ROW",
        size,
        sheetId,
      });
    }
  }
}
