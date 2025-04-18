import { DEFAULT_BORDER_DESC } from "../../constants";
import {
  deepEquals,
  getItemId,
  groupConsecutive,
  groupItemIdsByZones,
  isDefined,
  range,
  recomputeZones,
  toXC,
  toZone,
} from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  Border,
  BorderDescr,
  BorderDescription,
  BorderPosition,
  CellPosition,
  Color,
  CommandResult,
  CoreCommand,
  ExcelCellData,
  ExcelWorkbookData,
  HeaderIndex,
  SetBorderCommand,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface BordersPluginState {
  readonly borders: Record<UID, (BorderDescription[] | undefined)[] | undefined>;
}
/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - borders
 */
export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = ["getCellBorder", "getBordersColors"] as const;

  public readonly borders: BordersPluginState["borders"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_BORDER":
        return this.checkBordersUnchanged(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.addBordersToMerge(cmd.sheetId, zone);
        }
        break;
      case "DUPLICATE_SHEET":
        const borders = this.borders[cmd.sheetId];
        if (borders) {
          // borders is a sparse 2D array.
          // map and slice preserve empty values and do not set `undefined` instead
          const bordersCopy = borders
            .slice()
            .map((col) => col?.slice().map((border) => ({ ...border })));
          this.history.update("borders", cmd.sheetIdTo, bordersCopy);
        }
        break;
      case "DELETE_SHEET":
        const allBorders = { ...this.borders };
        delete allBorders[cmd.sheetId];
        this.history.update("borders", allBorders);
        break;
      case "SET_BORDER":
        this.setBorder(cmd.sheetId, cmd.col, cmd.row, cmd.border);
        break;
      case "SET_BORDERS_ON_TARGET":
        for (const zone of cmd.target) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            for (let col = zone.left; col <= zone.right; col++) {
              this.setBorder(cmd.sheetId, col, row, cmd.border);
            }
          }
        }
        break;
      case "SET_ZONE_BORDERS":
        if (cmd.border) {
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          this.setBorders(
            cmd.sheetId,
            target,
            cmd.border.position,
            cmd.border.color === ""
              ? undefined
              : {
                  style: cmd.border.style || DEFAULT_BORDER_DESC.style,
                  color: cmd.border.color || DEFAULT_BORDER_DESC.color,
                }
          );
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearBorders(cmd.sheetId, cmd.target);
        break;
      case "REMOVE_COLUMNS_ROWS":
        const elements = [...cmd.elements].sort((a, b) => b - a);
        for (const group of groupConsecutive(elements)) {
          if (cmd.dimension === "COL") {
            if (group[0] >= this.getters.getNumberCols(cmd.sheetId)) {
              for (let row: HeaderIndex = 0; row < this.getters.getNumberRows(cmd.sheetId); row++) {
                this.history.update(
                  "borders",
                  cmd.sheetId,
                  group[0] + 1,
                  row,
                  "vertical",
                  undefined
                );
              }
            }
            if (group[group.length - 1] === 0) {
              for (let row: HeaderIndex = 0; row < this.getters.getNumberRows(cmd.sheetId); row++) {
                this.history.update("borders", cmd.sheetId, 0, row, "vertical", undefined);
              }
            }
            const zone = this.getters.getColsZone(
              cmd.sheetId,
              group[group.length - 1] + 1,
              group[0]
            );
            this.clearInsideBorders(cmd.sheetId, [zone]);
            this.shiftBordersHorizontally(cmd.sheetId, group[0] + 1, -group.length);
          } else {
            if (group[0] >= this.getters.getNumberRows(cmd.sheetId)) {
              for (let col = 0; col < this.getters.getNumberCols(cmd.sheetId); col++) {
                this.history.update(
                  "borders",
                  cmd.sheetId,
                  col,
                  group[0] + 1,
                  "horizontal",
                  undefined
                );
              }
            }
            if (group[group.length - 1] === 0) {
              for (let col = 0; col < this.getters.getNumberCols(cmd.sheetId); col++) {
                this.history.update("borders", cmd.sheetId, col, 0, "horizontal", undefined);
              }
            }
            const zone = this.getters.getRowsZone(
              cmd.sheetId,
              group[group.length - 1] + 1,
              group[0]
            );
            this.clearInsideBorders(cmd.sheetId, [zone]);
            this.shiftBordersVertically(cmd.sheetId, group[0] + 1, -group.length);
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumns(cmd);
        } else {
          this.handleAddRows(cmd);
        }
        break;
    }
  }

  /**
   * Move borders according to the inserted columns.
   * Ensure borders continuity.
   */
  private handleAddColumns(cmd: AddColumnsRowsCommand) {
    // The new columns have already been inserted in the sheet at this point.
    let colLeftOfInsertion: HeaderIndex;
    let colRightOfInsertion: HeaderIndex;
    if (cmd.position === "before") {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.base, cmd.quantity, {
        moveFirstLeftBorder: true,
      });
      colLeftOfInsertion = cmd.base - 1;
      colRightOfInsertion = cmd.base + cmd.quantity;
    } else {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.base + 1, cmd.quantity, {
        moveFirstLeftBorder: false,
      });
      colLeftOfInsertion = cmd.base;
      colRightOfInsertion = cmd.base + cmd.quantity + 1;
    }
    this.ensureColumnBorderContinuity(cmd.sheetId, colLeftOfInsertion, colRightOfInsertion);
  }

  /**
   * Move borders according to the inserted rows.
   * Ensure borders continuity.
   */
  private handleAddRows(cmd: AddColumnsRowsCommand) {
    // The new rows have already been inserted at this point.
    let rowAboveInsertion: HeaderIndex;
    let rowBelowInsertion: HeaderIndex;
    if (cmd.position === "before") {
      this.shiftBordersVertically(cmd.sheetId, cmd.base, cmd.quantity, {
        moveFirstTopBorder: true,
      });
      rowAboveInsertion = cmd.base - 1;
      rowBelowInsertion = cmd.base + cmd.quantity;
    } else {
      this.shiftBordersVertically(cmd.sheetId, cmd.base + 1, cmd.quantity, {
        moveFirstTopBorder: false,
      });
      rowAboveInsertion = cmd.base;
      rowBelowInsertion = cmd.base + cmd.quantity + 1;
    }
    this.ensureRowBorderContinuity(cmd.sheetId, rowAboveInsertion, rowBelowInsertion);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder({ sheetId, col, row }: CellPosition): Border | null {
    const border = {
      top: this.borders[sheetId]?.[col]?.[row]?.horizontal,
      bottom: this.borders[sheetId]?.[col]?.[row + 1]?.horizontal,
      left: this.borders[sheetId]?.[col]?.[row]?.vertical,
      right: this.borders[sheetId]?.[col + 1]?.[row]?.vertical,
    };
    if (!border.bottom && !border.left && !border.right && !border.top) {
      return null;
    }
    return border;
  }

  getBordersColors(sheetId: UID): Color[] {
    const colors: Color[] = [];
    const sheetBorders = this.borders[sheetId];
    if (sheetBorders) {
      for (const borders of sheetBorders.filter(isDefined)) {
        for (const cellBorder of borders) {
          if (cellBorder?.horizontal) {
            colors.push(cellBorder.horizontal.color);
          }
          if (cellBorder?.vertical) {
            colors.push(cellBorder.vertical.color);
          }
        }
      }
    }
    return colors;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Ensure border continuity between two columns.
   * If the two columns have the same borders (at each row respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureColumnBorderContinuity(
    sheetId: UID,
    leftColumn: HeaderIndex,
    rightColumn: HeaderIndex
  ) {
    const targetCols = range(leftColumn + 1, rightColumn);
    for (let row: HeaderIndex = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const leftBorder = this.getCellBorder({ sheetId, col: leftColumn, row });
      const rightBorder = this.getCellBorder({ sheetId, col: rightColumn, row });
      if (leftBorder && rightBorder) {
        const commonSides = this.getCommonSides(leftBorder, rightBorder);
        for (let col of targetCols) {
          this.addBorder(sheetId, col, row, commonSides);
        }
      }
    }
  }

  /**
   * Ensure border continuity between two rows.
   * If the two rows have the same borders (at each column respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureRowBorderContinuity(sheetId: UID, topRow: HeaderIndex, bottomRow: HeaderIndex) {
    const targetRows = range(topRow + 1, bottomRow);
    for (let col: HeaderIndex = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const aboveBorder = this.getCellBorder({ sheetId, col, row: topRow });
      const belowBorder = this.getCellBorder({ sheetId, col, row: bottomRow });
      if (aboveBorder && belowBorder) {
        const commonSides = this.getCommonSides(aboveBorder, belowBorder);
        for (let row of targetRows) {
          this.addBorder(sheetId, col, row, commonSides);
        }
      }
    }
  }

  /**
   * From two borders, return a new border with sides defined in both borders.
   * i.e. the intersection of two borders.
   */
  private getCommonSides(border1: Border, border2: Border): Border {
    const commonBorder = {};
    for (let side of ["top", "bottom", "left", "right"]) {
      if (border1[side] && deepEquals(border1[side], border2[side])) {
        commonBorder[side] = border1[side];
      }
    }
    return commonBorder;
  }

  /**
   * Get all the columns which contains at least a border
   */
  private getColumnsWithBorders(sheetId: UID): HeaderIndex[] {
    const sheetBorders = this.borders[sheetId];
    if (!sheetBorders) return [];
    return Object.keys(sheetBorders).map((index) => parseInt(index, 10));
  }

  /**
   * Get all the rows which contains at least a border
   */
  private getRowsWithBorders(sheetId: UID): number[] {
    const sheetBorders = this.borders[sheetId]?.filter(isDefined);
    if (!sheetBorders) return [];
    const rowsWithBorders = new Set<number>();
    for (const rowBorders of sheetBorders) {
      for (const rowBorder in rowBorders) {
        rowsWithBorders.add(parseInt(rowBorder, 10));
      }
    }
    return Array.from(rowsWithBorders);
  }

  /**
   * Get the range of all the rows in the sheet
   */
  private getRowsRange(sheetId: UID): HeaderIndex[] {
    const sheetBorders = this.borders[sheetId];
    if (!sheetBorders) return [];
    return range(0, this.getters.getNumberRows(sheetId) + 1);
  }

  /**
   * Move borders of a sheet horizontally.
   * @param sheetId
   * @param start starting column (included)
   * @param delta how much borders will be moved (negative if moved to the left)
   */
  private shiftBordersHorizontally(
    sheetId: UID,
    start: HeaderIndex,
    delta: number,
    { moveFirstLeftBorder }: { moveFirstLeftBorder?: boolean } = {}
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    if (delta < 0) {
      this.moveBordersOfColumn(sheetId, start, delta, "vertical", {
        destructive: false,
      });
    }
    this.getColumnsWithBorders(sheetId)
      .filter((col) => col >= start)
      .sort((a, b) => (delta < 0 ? a - b : b - a)) // start by the end when moving up
      .forEach((col) => {
        if ((col === start && moveFirstLeftBorder) || col !== start) {
          this.moveBordersOfColumn(sheetId, col, delta, "vertical");
        }
        this.moveBordersOfColumn(sheetId, col, delta, "horizontal");
      });
  }

  /**
   * Move borders of a sheet vertically.
   * @param sheetId
   * @param start starting row (included)
   * @param delta how much borders will be moved (negative if moved to the above)
   */
  private shiftBordersVertically(
    sheetId: UID,
    start: HeaderIndex,
    delta: number,
    { moveFirstTopBorder }: { moveFirstTopBorder?: boolean } = {}
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    if (delta < 0) {
      this.moveBordersOfRow(sheetId, start, delta, "horizontal", {
        destructive: false,
      });
    }
    this.getRowsWithBorders(sheetId)
      .filter((row) => row >= start)
      .sort((a, b) => (delta < 0 ? a - b : b - a)) // start by the end when moving up
      .forEach((row) => {
        if ((row === start && moveFirstTopBorder) || row !== start) {
          this.moveBordersOfRow(sheetId, row, delta, "horizontal");
        }
        this.moveBordersOfRow(sheetId, row, delta, "vertical");
      });
  }

  /**
   * Moves the borders (left if `vertical` or top if `horizontal` depending on
   * `borderDirection`) of all cells in an entire row `delta` rows to the right
   * (`delta` > 0) or to the left (`delta` < 0).
   * Note that as the left of a cell is the right of the cell-1, if the left is
   * moved the right is also moved. However, if `horizontal`, the bottom border
   * is not moved.
   * It does it by replacing the target border by the moved border. If the
   * argument `destructive` is given false, the target border is preserved if
   * the moved border is empty
   */
  private moveBordersOfRow(
    sheetId: UID,
    row: HeaderIndex,
    delta: number,
    borderDirection: "vertical" | "horizontal",
    { destructive }: { destructive: boolean } = { destructive: true }
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    this.getColumnsWithBorders(sheetId).forEach((col) => {
      const targetBorder = borders[col]?.[row + delta]?.[borderDirection];
      const movedBorder = borders[col]?.[row]?.[borderDirection];
      this.history.update(
        "borders",
        sheetId,
        col,
        row + delta,
        borderDirection,
        destructive ? movedBorder : movedBorder || targetBorder
      );
      this.history.update("borders", sheetId, col, row, borderDirection, undefined);
    });
  }

  /**
   * Moves the borders (left if `vertical` or top if `horizontal` depending on
   * `borderDirection`) of all cells in an entire column `delta` columns below
   * (`delta` > 0) or above (`delta` < 0).
   * Note that as the top of a cell is the bottom of the cell-1, if the top is
   * moved the bottom is also moved. However, if `vertical`, the right border
   * is not moved.
   * It does it by replacing the target border by the moved border. If the
   * argument `destructive` is given false, the target border is preserved if
   * the moved border is empty
   */
  private moveBordersOfColumn(
    sheetId: UID,
    col: HeaderIndex,
    delta: number,
    borderDirection: "vertical" | "horizontal",
    { destructive }: { destructive: boolean } = { destructive: true }
  ) {
    const borders = this.borders[sheetId];
    if (!borders) return;
    this.getRowsRange(sheetId).forEach((row) => {
      const targetBorder = borders[col + delta]?.[row]?.[borderDirection];
      const movedBorder = borders[col]?.[row]?.[borderDirection];
      this.history.update(
        "borders",
        sheetId,
        col + delta,
        row,
        borderDirection,
        destructive ? movedBorder : movedBorder || targetBorder
      );
      this.history.update("borders", sheetId, col, row, borderDirection, undefined);
    });
  }

  /**
   * Set the borders of a cell.
   * It overrides the current border if override === true.
   */
  private setBorder(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    border?: Border,
    override = true
  ) {
    if (override || !this.borders?.[sheetId]?.[col]?.[row]?.vertical) {
      this.history.update("borders", sheetId, col, row, "vertical", border?.left);
    }
    if (override || !this.borders?.[sheetId]?.[col]?.[row]?.horizontal) {
      this.history.update("borders", sheetId, col, row, "horizontal", border?.top);
    }
    if (override || !this.borders?.[sheetId]?.[col + 1]?.[row]?.vertical) {
      this.history.update("borders", sheetId, col + 1, row, "vertical", border?.right);
    }
    if (override || !this.borders?.[sheetId]?.[col]?.[row + 1]?.horizontal) {
      this.history.update("borders", sheetId, col, row + 1, "horizontal", border?.bottom);
    }
  }

  /**
   * Remove the borders of a zone
   */
  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (let zone of recomputeZones(zones)) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.history.update("borders", sheetId, zone.right + 1, row, "vertical", undefined);
        for (let col = zone.left; col <= zone.right; col++) {
          this.history.update("borders", sheetId, col, row, undefined);
        }
      }
      for (let col = zone.left; col <= zone.right; col++) {
        this.history.update("borders", sheetId, col, zone.bottom + 1, "horizontal", undefined);
      }
    }
  }

  /**
   * Remove the borders inside of a zone
   */
  private clearInsideBorders(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.history.update("borders", sheetId, col, row, undefined);
        }
      }
    }
  }

  /**
   * Add a border to the existing one to a cell
   */
  private addBorder(sheetId: UID, col: HeaderIndex, row: HeaderIndex, border: Border) {
    this.setBorder(sheetId, col, row, {
      ...this.getCellBorder({ sheetId, col, row }),
      ...border,
    });
  }

  /**
   * Set the borders of a zone by computing the borders to add from the given
   * command
   */
  private setBorders(
    sheetId: UID,
    zones: Zone[],
    position: BorderPosition,
    border: BorderDescr | undefined
  ) {
    if (position === "clear") {
      return this.clearBorders(sheetId, zones);
    }
    for (let zone of recomputeZones(zones)) {
      if (position === "h" || position === "hv" || position === "all") {
        for (let row = zone.top + 1; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { top: border });
          }
        }
      }
      if (position === "v" || position === "hv" || position === "all") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left + 1; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { left: border });
          }
        }
      }
      if (position === "left" || position === "all" || position === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.left, row, { left: border });
        }
      }
      if (position === "right" || position === "all" || position === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.right + 1, row, { left: border });
        }
      }
      if (position === "top" || position === "all" || position === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.top, { top: border });
        }
      }
      if (position === "bottom" || position === "all" || position === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.bottom + 1, { top: border });
        }
      }
    }
  }

  /**
   * Compute the borders to add to the given zone merged.
   */
  private addBordersToMerge(sheetId: UID, zone: Zone) {
    const { left, right, top, bottom } = zone;
    const bordersTopLeft = this.getCellBorder({ sheetId, col: left, row: top });
    const bordersBottomRight = this.getCellBorder({ sheetId, col: right, row: bottom });
    this.clearBorders(sheetId, [zone]);
    if (bordersTopLeft?.top) {
      this.setBorders(sheetId, [{ ...zone, bottom: top }], "top", bordersTopLeft.top);
    }
    if (bordersTopLeft?.left) {
      this.setBorders(sheetId, [{ ...zone, right: left }], "left", bordersTopLeft.left);
    }
    if (bordersBottomRight?.bottom) {
      this.setBorders(sheetId, [{ ...zone, top: bottom }], "bottom", bordersBottomRight.bottom);
    } else if (bordersTopLeft?.bottom) {
      this.setBorders(sheetId, [{ ...zone, top: bottom }], "bottom", bordersTopLeft.bottom);
    }
    if (bordersBottomRight?.right) {
      this.setBorders(sheetId, [{ ...zone, left: right }], "right", bordersBottomRight.right);
    } else if (bordersTopLeft?.right) {
      this.setBorders(sheetId, [{ ...zone, left: right }], "right", bordersTopLeft.right);
    }
  }

  private checkBordersUnchanged(cmd: SetBorderCommand) {
    const currentBorder = this.getCellBorder(cmd);
    const areAllNewBordersUndefined =
      !cmd.border?.bottom && !cmd.border?.left && !cmd.border?.right && !cmd.border?.top;
    if ((!currentBorder && areAllNewBordersUndefined) || deepEquals(currentBorder, cmd.border)) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // Borders
    if (Object.keys(data.borders || {}).length) {
      for (let sheet of data.sheets) {
        for (const zoneXc in sheet.borders) {
          const borderId = sheet.borders[zoneXc];
          const border = data.borders[borderId];
          const zone = toZone(zoneXc);
          for (let row = zone.top; row <= zone.bottom; row++) {
            for (let col = zone.left; col <= zone.right; col++) {
              this.setBorder(sheet.id, col, row, border, false);
            }
          }
        }
      }
    }
    // Merges
    for (let sheetData of data.sheets) {
      if (sheetData.merges) {
        for (let merge of sheetData.merges) {
          this.addBordersToMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    const borders: { [borderId: number]: Border } = {};
    for (let sheet of data.sheets) {
      const positionsByBorder: Record<number, CellPosition[]> = {};
      for (let col: HeaderIndex = 0; col < sheet.colNumber; col++) {
        for (let row: HeaderIndex = 0; row < sheet.rowNumber; row++) {
          const border = this.getCellBorder({ sheetId: sheet.id, col, row });
          if (border) {
            const borderId = getItemId(border, borders);
            const position = { sheetId: sheet.id, col, row };
            positionsByBorder[borderId] ??= [];
            positionsByBorder[borderId].push(position);
          }
        }
      }
      sheet.borders = groupItemIdsByZones(positionsByBorder);
    }
    data.borders = borders;
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      for (let col: HeaderIndex = 0; col < sheet.colNumber; col++) {
        for (let row: HeaderIndex = 0; row < sheet.rowNumber; row++) {
          const border = this.getCellBorder({ sheetId: sheet.id, col, row });
          if (border) {
            const xc = toXC(col, row);
            sheet.cells[xc] ??= {} as ExcelCellData;
            sheet.cells[xc]!.border = getItemId<Border>(border, data.borders);
          }
        }
      }
    }
  }
}
