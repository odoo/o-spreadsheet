import {
  FILTER_ICON_MARGIN,
  ICON_EDGE_LENGTH,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  largeMax,
  positions,
  splitTextToWidth,
} from "../../helpers/index";
import { localizeFormula } from "../../helpers/locale";
import { Command, CommandResult, LocalCommand, UID } from "../../types";
import {
  CellPosition,
  Dimension,
  HeaderDimensions,
  HeaderIndex,
  Pixel,
  Style,
} from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = [
    "getCellWidth",
    "getTextWidth",
    "getCellText",
    "getCellMultiLineText",
    "getColDimensions",
    "getRowDimensions",
    "getColRowOffset",
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

    const isFilterHeader = this.getters.isFilterHeader(position);
    if (isFilterHeader) {
      contentWidth += ICON_EDGE_LENGTH + FILTER_ICON_MARGIN;
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

  /**
   * Returns the size, start and end coordinates of a column on an unfolded sheet
   */
  getColDimensions(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    const start = this.getColRowOffset("COL", 0, col, sheetId);
    const size = this.getters.getColSize(sheetId, col);
    const isColHidden = this.getters.isColHidden(sheetId, col);
    return {
      start,
      size,
      end: start + (isColHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row an unfolded sheet
   */
  getRowDimensions(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    const start = this.getColRowOffset("ROW", 0, row, sheetId);
    const size = this.getters.getRowSize(sheetId, row);
    const isRowHidden = this.getters.isRowHidden(sheetId, row);
    return {
      start,
      size: size,
      end: start + (isRowHidden ? 0 : size),
    };
  }

  /**
   * Returns the offset of a header (determined by the dimension) at the given index
   * based on the referenceIndex given. If start === 0, this method will return
   * the start attribute of the header.
   *
   * i.e. The size from A to B is the distance between A.start and B.end
   */
  getColRowOffset(
    dimension: Dimension,
    referenceIndex: HeaderIndex,
    index: HeaderIndex,
    sheetId: UID = this.getters.getActiveSheetId()
  ): Pixel {
    if (index < referenceIndex) {
      return -this.getColRowOffset(dimension, index, referenceIndex);
    }
    let offset = 0;
    for (let i = referenceIndex; i < index; i++) {
      if (this.getters.isHeaderHidden(sheetId, dimension, i)) {
        continue;
      }
      offset +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
    }
    return offset;
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

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
