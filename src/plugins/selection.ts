import { isEqual, toXC, union, clip } from "../helpers/index";
import { BasePlugin } from "../base_plugin";
import { GridCommand, Zone, Cell, Selection } from "../types/index";
import { formatNumber } from "../formatters";

interface SheetInfo {
  selection: Selection;
  activeCol: number;
  activeRow: number;
  activeXc: string;
}
/**
 * SelectionPlugin
 */
export class SelectionPlugin extends BasePlugin {
  static getters = [
    "getActiveCell",
    "getActiveXc",
    "getActiveCols",
    "getActiveRows",
    "getSelectedZones",
    "getAggregate",
    "getSelection",
    "getPosition"
  ];

  private selection: Selection = {
    zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
    anchor: { col: 0, row: 0 }
  };
  private activeCol: number = 0;
  private activeRow: number = 0;
  private activeXc: string = "A1";
  private sheetsData: { [sheet: string]: SheetInfo } = {};

  canDispatch(cmd: GridCommand): boolean {
    if (cmd.type === "MOVE_POSITION") {
      const [refCol, refRow] = this.getReferenceCoords();
      const { cols, rows } = this.workbook;
      return !(
        (cmd.deltaY < 0 && refRow === 0) ||
        (cmd.deltaY > 0 && refRow === rows.length - 1) ||
        (cmd.deltaX < 0 && refCol === 0) ||
        (cmd.deltaX > 0 && refCol === cols.length - 1)
      );
    }
    return true;
  }

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.sheetsData[cmd.from] = {
          selection: JSON.parse(JSON.stringify(this.selection)),
          activeCol: this.activeCol,
          activeRow: this.activeRow,
          activeXc: this.activeXc
        };
        if (cmd.to in this.sheetsData) {
          Object.assign(this, this.sheetsData[cmd.to]);
        }
        break;
      case "SET_SELECTION":
        this.setSelection(cmd.anchor, cmd.zones, cmd.strict);
        break;
      case "CREATE_SHEET":
        this.selectCell(0, 0);
        break;
      case "MOVE_POSITION":
        this.movePosition(cmd.deltaX, cmd.deltaY);
        break;
      case "SELECT_CELL":
        this.selectCell(cmd.col, cmd.row, cmd.createNewRange);
        break;
      case "SELECT_COLUMN":
        this.selectColumn(cmd.index, cmd.createRange || false, cmd.updateRange || false);
        break;
      case "SELECT_ROW":
        this.selectRow(cmd.index, cmd.createRange || false, cmd.updateRange || false);
        break;
      case "SELECT_ALL":
        this.selectAll();
        break;
      case "ALTER_SELECTION":
        if (cmd.delta) {
          this.moveSelection(cmd.delta[0], cmd.delta[1]);
        }
        if (cmd.cell) {
          this.addCellToSelection(...cmd.cell);
        }
        break;
      case "UNDO":
      case "REDO":
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
        this.updateSelection();
        break;
      case "ADD_COLUMNS":
        if (cmd.position === "before") {
          this.onAddColumns(cmd.column, cmd.quantity);
        }
        break;
      case "ADD_ROWS":
        if (cmd.position === "before") {
          this.onAddRows(cmd.row, cmd.quantity);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveCell(): Cell | null {
    const workbook = this.workbook;
    let mergeId = workbook.mergeCellMap[this.activeXc];
    if (mergeId) {
      return workbook.cells[workbook.merges[mergeId].topLeft];
    } else {
      return this.getters.getCell(this.activeCol, this.activeRow);
    }
  }

  getActiveXc(): string {
    return this.activeXc;
  }

  getActiveCols(): Set<number> {
    const activeCols = new Set<number>();
    for (let zone of this.selection.zones) {
      if (zone.top === 0 && zone.bottom === this.workbook.rows.length - 1) {
        for (let i = zone.left; i <= zone.right; i++) {
          activeCols.add(i);
        }
      }
    }
    return activeCols;
  }

  getActiveRows(): Set<number> {
    const activeRows = new Set<number>();
    for (let zone of this.selection.zones) {
      if (zone.left === 0 && zone.right === this.workbook.cols.length - 1) {
        for (let i = zone.top; i <= zone.bottom; i++) {
          activeRows.add(i);
        }
      }
    }
    return activeRows;
  }

  getSelectedZones(): Zone[] {
    return this.selection.zones;
  }

  getSelection(): Selection {
    return this.selection;
  }

  getPosition(): [number, number] {
    return [this.activeCol, this.activeRow];
  }

  getAggregate(): string | null {
    let aggregate = 0;
    let n = 0;
    for (let zone of this.selection.zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const r = this.workbook.rows[row];
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = r.cells[col];
          if (cell && cell.type !== "text" && !cell.error && typeof cell.value === "number") {
            n++;
            aggregate += cell.value;
          }
        }
      }
    }
    return n < 2 ? null : formatNumber(aggregate);
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  /**
   * Return [col, row]
   */
  private getReferenceCoords(): [number, number] {
    const { isSelectingRange } = this.workbook;
    const { selection, activeCol, activeRow } = this;
    return isSelectingRange ? [selection.anchor.col, selection.anchor.row] : [activeCol, activeRow];
  }

  private selectColumn(index: number, createRange: boolean, updateRange: boolean) {
    const bottom = this.workbook.rows.length - 1;
    const zone = { left: index, right: index, top: 0, bottom };
    const current = this.selection.zones;
    let zones: Zone[], anchor: [number, number];
    if (updateRange) {
      const { col, row } = this.selection.anchor;
      const updatedZone = union(zone, { left: col, right: col, top: 0, bottom });
      zones = current.slice(0, -1).concat(updatedZone);
      anchor = [col, row];
    } else {
      zones = createRange ? current.concat(zone) : [zone];
      anchor = [index, 0];
    }
    this.dispatch({ type: "SET_SELECTION", zones, anchor, strict: true });
  }

  private selectRow(index: number, createRange: boolean, updateRange: boolean) {
    const right = this.workbook.cols.length - 1;
    const zone = { top: index, bottom: index, left: 0, right };
    const current = this.selection.zones;
    let zones: Zone[], anchor: [number, number];
    if (updateRange) {
      const { col, row } = this.selection.anchor;
      const updatedZone = union(zone, { left: 0, right, top: row, bottom: row });
      zones = current.slice(0, -1).concat(updatedZone);
      anchor = [col, row];
    } else {
      zones = createRange ? current.concat(zone) : [zone];
      anchor = [0, index];
    }
    this.dispatch({ type: "SET_SELECTION", zones, anchor, strict: true });
  }

  private selectAll() {
    const bottom = this.workbook.rows.length - 1;
    const right = this.workbook.cols.length - 1;
    const zone = { left: 0, top: 0, bottom, right };
    this.dispatch({ type: "SET_SELECTION", zones: [zone], anchor: [0, 0] });
  }

  /**
   * Change the anchor of the selection active cell to an absolute col and row inded.
   *
   * This is a non trivial task. We need to stop the editing process and update
   * properly the current selection.  Also, this method can optionally create a new
   * range in the selection.
   */
  private selectCell(col: number, row: number, newRange: boolean = false) {
    const xc = toXC(col, row);
    let zone = this.getters.expandZone({ left: col, right: col, top: row, bottom: row });

    if (newRange) {
      this.selection.zones.push(zone);
    } else {
      this.selection.zones = [zone];
    }
    this.selection.anchor.col = col;
    this.selection.anchor.row = row;
    if (!this.workbook.isSelectingRange) {
      this.activeCol = col;
      this.activeRow = row;
      this.activeXc = xc;
    }
  }

  /**
   * Moves the position of either the active cell of the anchor of the current selection by a number of rows / cols delta
   */
  movePosition(deltaX: number, deltaY: number) {
    const [refCol, refRow] = this.getReferenceCoords();
    const activeReference = toXC(refCol, refRow);

    let mergeId = this.workbook.mergeCellMap[activeReference];
    if (mergeId) {
      let targetCol = refCol;
      let targetRow = refRow;
      while (this.workbook.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
        targetCol += deltaX;
        targetRow += deltaY;
      }
      if (targetCol >= 0 && targetRow >= 0) {
        this.selectCell(targetCol, targetRow);
      }
    } else {
      this.selectCell(refCol + deltaX, refRow + deltaY);
    }
  }

  setSelection(anchor: [number, number], zones: Zone[], strict: boolean = false) {
    this.selectCell(...anchor);
    if (strict) {
      this.selection.zones = zones;
    } else {
      this.selection.zones = zones.map(this.getters.expandZone);
    }
    this.selection.anchor.col = anchor[0];
    this.selection.anchor.row = anchor[1];
  }

  private moveSelection(deltaX: number, deltaY: number) {
    const selection = this.selection;
    const zones = selection.zones.slice();
    const lastZone = zones[selection.zones.length - 1];
    const anchorCol = selection.anchor.col;
    const anchorRow = selection.anchor.row;
    const { left, right, top, bottom } = lastZone;
    let result: Zone | null = lastZone;
    const expand = (z: Zone) => {
      const { left, right, top, bottom } = this.getters.expandZone(z);
      return {
        left: Math.max(0, left),
        right: Math.min(this.workbook.cols.length - 1, right),
        top: Math.max(0, top),
        bottom: Math.min(this.workbook.rows.length - 1, bottom)
      };
    };

    // check if we can shrink selection
    let n = 0;
    while (result !== null) {
      n++;
      if (deltaX < 0) {
        result = anchorCol <= right - n ? expand({ top, left, bottom, right: right - n }) : null;
      }
      if (deltaX > 0) {
        result = left + n <= anchorCol ? expand({ top, left: left + n, bottom, right }) : null;
      }
      if (deltaY < 0) {
        result = anchorRow <= bottom - n ? expand({ top, left, bottom: bottom - n, right }) : null;
      }
      if (deltaY > 0) {
        result = top + n <= anchorRow ? expand({ top: top + n, left, bottom, right }) : null;
      }
      if (result && !isEqual(result, lastZone)) {
        zones[zones.length - 1] = result;
        this.dispatch({ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] });
        return;
      }
    }
    const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
    const zoneWithDelta = {
      top: top + deltaY,
      left: left + deltaX,
      bottom: bottom + deltaY,
      right: right + deltaX
    };
    result = expand(union(currentZone, zoneWithDelta));
    if (!isEqual(result, lastZone)) {
      zones[zones.length - 1] = result;
      this.dispatch({ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] });
    }
  }

  private addCellToSelection(col: number, row: number) {
    const selection = this.selection;
    const anchorCol = selection.anchor.col;
    const anchorRow = selection.anchor.row;
    const zone: Zone = {
      left: Math.min(anchorCol, col),
      top: Math.min(anchorRow, row),
      right: Math.max(anchorCol, col),
      bottom: Math.max(anchorRow, row)
    };
    const zones = selection.zones.slice(0, -1).concat(zone);
    this.dispatch({ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] });
  }

  private updateSelection() {
    const cols = this.workbook.cols.length - 1;
    const rows = this.workbook.rows.length - 1;
    const zones = this.selection.zones.map(z => ({
      left: clip(z.left, 0, cols),
      right: clip(z.right, 0, cols),
      top: clip(z.top, 0, rows),
      bottom: clip(z.bottom, 0, rows)
    }));
    const anchorCol = zones[zones.length - 1].left;
    const anchorRow = zones[zones.length - 1].top;
    this.dispatch({ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] });
  }

  private onAddColumns(column: number, quantity: number) {
    let start = column + quantity;
    const zone = this.getters.getColsZone(start, start + quantity - 1);
    this.dispatch({ type: "SET_SELECTION", zones: [zone], anchor: [start, 0], strict: true });
  }

  private onAddRows(row: number, quantity: number) {
    const start = row + quantity;
    const zone = this.getters.getRowsZone(start, start + quantity - 1);
    this.dispatch({ type: "SET_SELECTION", zones: [zone], anchor: [0, start], strict: true });
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import() {
    this.selectCell(0, 0);
  }
}
