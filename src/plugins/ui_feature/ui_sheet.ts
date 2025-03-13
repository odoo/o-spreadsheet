import {
  DEFAULT_CELL_HEIGHT,
  GRID_ICON_MARGIN,
  ICON_EDGE_LENGTH,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  getCellContentHeight,
  largeMax,
  positions,
  splitTextToWidth,
} from "../../helpers/index";
import { localizeFormula } from "../../helpers/locale";
import { Command, CommandResult, LocalCommand, UID } from "../../types";
import { CellPosition, HeaderIndex, Pixel, Style } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = [
    "doesCellHaveGridIcon",
    "getCellWidth",
    "getTextWidth",
    "getCellText",
    "getCellMultiLineText",
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
        this.autoResizeRows(cmd.sheetId, cmd.rows);
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
    } else if (showFormula && !cell?.content) {
      return "";
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
      for (const cellId of this.getters.getRowCells(sheetId, row)) {
        const cell = this.getters.getCellById(cellId);
        if (!cell) {
          continue;
        }
        const position = this.getters.getCellPosition(cell.id);
        const colSize = this.getters.getColSize(sheetId, position.col);

        if (cell.isFormula) {
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
