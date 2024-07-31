import { DEFAULT_BORDER_DESC } from "../../constants";
import {
  deepEquals,
  groupConsecutive,
  isDefined,
  range,
  toCartesian,
  toXC,
  toZone,
} from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  Border,
  BorderCommand,
  BorderDescription,
  Command,
  ExcelWorkbookData,
  Sheet,
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
  static getters = ["getCellBorder"];

  public readonly borders: BordersPluginState["borders"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_MERGE":
        if (!cmd.interactive) {
          for (const zone of cmd.target) {
            this.addBordersToMerge(cmd.sheetId, zone);
          }
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
      case "SET_FORMATTING":
        if (cmd.border) {
          const sheet = this.getters.getSheet(cmd.sheetId);
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          this.setBorders(sheet, target, cmd.border);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearBorders(cmd.sheetId, cmd.target);
        break;
      case "REMOVE_COLUMNS_ROWS":
        cmd.elements.sort((a, b) => b - a);
        for (const group of groupConsecutive(cmd.elements)) {
          if (cmd.dimension === "COL") {
            this.shiftBordersHorizontally(cmd.sheetId, group[group.length - 1] + 1, -group.length);
          } else {
            this.shiftBordersVertically(cmd.sheetId, group[group.length - 1] + 1, -group.length);
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
    const sheet = this.getters.getSheet(cmd.sheetId);
    let colLeftOfInsertion: number;
    let colRightOfInsertion: number;
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
    this.ensureColumnBorderContinuity(sheet, colLeftOfInsertion, colRightOfInsertion);
  }

  /**
   * Move borders according to the inserted rows.
   * Ensure borders continuity.
   */
  private handleAddRows(cmd: AddColumnsRowsCommand) {
    // The new rows have already been inserted at this point.
    const sheet = this.getters.getSheet(cmd.sheetId);
    let rowAboveInsertion: number;
    let rowBelowInsertion: number;
    if (cmd.position === "before") {
      this.shiftBordersVertically(sheet.id, cmd.base, cmd.quantity, { moveFirstTopBorder: true });
      rowAboveInsertion = cmd.base - 1;
      rowBelowInsertion = cmd.base + cmd.quantity;
    } else {
      this.shiftBordersVertically(sheet.id, cmd.base + 1, cmd.quantity, {
        moveFirstTopBorder: false,
      });
      rowAboveInsertion = cmd.base;
      rowBelowInsertion = cmd.base + cmd.quantity + 1;
    }
    this.ensureRowBorderContinuity(sheet, rowAboveInsertion, rowBelowInsertion);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder(sheetId: UID, col: number, row: number): Border | null {
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

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Ensure border continuity between two columns.
   * If the two columns have the same borders (at each row respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureColumnBorderContinuity(sheet: Sheet, leftColumn: number, rightColumn: number) {
    const targetCols = range(leftColumn + 1, rightColumn);
    for (let row = 0; row < sheet.rows.length; row++) {
      const leftBorder = this.getCellBorder(sheet.id, leftColumn, row);
      const rightBorder = this.getCellBorder(sheet.id, rightColumn, row);
      if (leftBorder && rightBorder) {
        const commonSides = this.getCommonSides(leftBorder, rightBorder);
        for (let col of targetCols) {
          this.addBorder(sheet.id, col, row, commonSides);
        }
      }
    }
  }

  /**
   * Ensure border continuity between two rows.
   * If the two rows have the same borders (at each column respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureRowBorderContinuity(sheet: Sheet, topRow: number, bottomRow: number) {
    const targetRows = range(topRow + 1, bottomRow);
    for (let col = 0; col < sheet.cols.length; col++) {
      const aboveBorder = this.getCellBorder(sheet.id, col, topRow);
      const belowBorder = this.getCellBorder(sheet.id, col, bottomRow);
      if (aboveBorder && belowBorder) {
        const commonSides = this.getCommonSides(aboveBorder, belowBorder);
        for (let row of targetRows) {
          this.addBorder(sheet.id, col, row, commonSides);
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
      if (border1[side] && border1[side] === border2[side]) {
        commonBorder[side] = border1[side];
      }
    }
    return commonBorder;
  }

  /**
   * Get all the columns which contains at least a border
   */
  private getColumnsWithBorders(sheetId: UID): number[] {
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
  private getRowsRange(sheetId: UID): number[] {
    const sheetBorders = this.borders[sheetId];
    if (!sheetBorders) return [];
    const sheet = this.getters.getSheet(sheetId);
    return range(0, sheet.rows.length + 1);
  }

  /**
   * Move borders of a sheet horizontally.
   * @param sheetId
   * @param start starting column (included)
   * @param delta how much borders will be moved (negative if moved to the left)
   */
  private shiftBordersHorizontally(
    sheetId: UID,
    start: number,
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
    start: number,
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
    row: number,
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
    col: number,
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
   * Note that it override the current border
   */
  private setBorder(sheetId: UID, col: number, row: number, border?: Border) {
    this.history.update("borders", sheetId, col, row, {
      vertical: border?.left,
      horizontal: border?.top,
    });
    this.history.update("borders", sheetId, col + 1, row, "vertical", border?.right);
    this.history.update("borders", sheetId, col, row + 1, "horizontal", border?.bottom);
  }

  /**
   * Remove the borders of a zone
   */
  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
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
   * Add a border to the existing one to a cell
   */
  private addBorder(sheetId: UID, col: number, row: number, border: Border) {
    this.setBorder(sheetId, col, row, {
      ...this.getCellBorder(sheetId, col, row),
      ...border,
    });
  }

  /**
   * Set the borders of a zone by computing the borders to add from the given
   * command
   */
  private setBorders(sheet: Sheet, zones: Zone[], command: BorderCommand) {
    const sheetId = sheet.id;
    if (command === "clear") {
      return this.clearBorders(sheetId, zones);
    }
    for (let zone of zones) {
      if (command === "h" || command === "hv" || command === "all") {
        for (let row = zone.top + 1; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { top: DEFAULT_BORDER_DESC });
          }
        }
      }
      if (command === "v" || command === "hv" || command === "all") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left + 1; col <= zone.right; col++) {
            this.addBorder(sheetId, col, row, { left: DEFAULT_BORDER_DESC });
          }
        }
      }
      if (command === "left" || command === "all" || command === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.left, row, { left: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "right" || command === "all" || command === "external") {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.addBorder(sheetId, zone.right + 1, row, { left: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "top" || command === "all" || command === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.top, { top: DEFAULT_BORDER_DESC });
        }
      }
      if (command === "bottom" || command === "all" || command === "external") {
        for (let col = zone.left; col <= zone.right; col++) {
          this.addBorder(sheetId, col, zone.bottom + 1, { top: DEFAULT_BORDER_DESC });
        }
      }
    }
  }

  /**
   * Compute the borders to add to the given zone merged.
   */
  private addBordersToMerge(sheetId: UID, zone: Zone) {
    const sheet = this.getters.getSheet(sheetId);
    const { left, right, top, bottom } = zone;
    const bordersTopLeft = this.getCellBorder(sheet.id, left, top);
    const bordersBottomRight = this.getCellBorder(sheet.id, right, bottom);
    this.clearBorders(sheetId, [zone]);
    if (bordersTopLeft?.top) {
      this.setBorders(sheet, [{ ...zone, bottom: top }], "top");
    }
    if (bordersTopLeft?.left) {
      this.setBorders(sheet, [{ ...zone, right: left }], "left");
    }
    if (bordersBottomRight?.bottom || bordersTopLeft?.bottom) {
      this.setBorders(sheet, [{ ...zone, top: bottom }], "bottom");
    }
    if (bordersBottomRight?.right || bordersTopLeft?.right) {
      this.setBorders(sheet, [{ ...zone, left: right }], "right");
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // Borders
    if (data.borders) {
      for (let sheet of data.sheets) {
        for (let [xc, cell] of Object.entries(sheet.cells)) {
          if (cell?.border) {
            const border = data.borders[cell.border];
            const [col, row] = toCartesian(xc);
            this.setBorder(sheet.id, col, row, border);
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
    // Borders
    let borderId = 0;
    const borders: { [borderId: number]: Border } = {};
    /**
     * Get the id of the given border. If the border does not exist, it creates
     * one.
     */
    function getBorderId(border: Border) {
      for (let [key, value] of Object.entries(borders)) {
        if (deepEquals(value, border)) {
          return parseInt(key, 10);
        }
      }
      borders[++borderId] = border;
      return borderId;
    }
    for (let sheet of data.sheets) {
      for (let col = 0; col < sheet.colNumber; col++) {
        for (let row = 0; row < sheet.rowNumber; row++) {
          const border = this.getCellBorder(sheet.id, col, row);
          if (border) {
            const xc = toXC(col, row);
            const cell = sheet.cells[xc];
            const borderId = getBorderId(border);
            if (cell) {
              cell.border = borderId;
            } else {
              sheet.cells[xc] = { border: borderId };
            }
          }
        }
      }
    }
    data.borders = borders;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
