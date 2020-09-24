import { isEqual, toXC, union, clip, formatStandardNumber } from "../helpers/index";
import { BasePlugin } from "../base_plugin";
import {
  Command,
  Zone,
  Cell,
  LAYERS,
  GridRenderingContext,
  CommandResult,
  CancelledReason,
} from "../types/index";
import { Mode } from "../model";
import { SELECTION_BORDER_COLOR } from "../constants";

export interface Selection {
  anchor: [number, number];
  zones: Zone[];
}

interface SheetInfo {
  selection: Selection;
  activeCol: number;
  activeRow: number;
  activeXc: string;
}

export enum SelectionMode {
  idle,
  selecting,
  readyToExpand, //The next selection will add another zone to the current selection
  expanding,
}

/**
 * SelectionPlugin
 */
export class SelectionPlugin extends BasePlugin {
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  static getters = [
    "getActiveCell",
    "getActiveCols",
    "getActiveRows",
    "getSelectedZones",
    "getSelectedZone",
    "getAggregate",
    "getSelection",
    "getPosition",
    "getSelectionMode",
    "isSelected",
  ];

  private selection: Selection = {
    zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
    anchor: [0, 0],
  };
  private activeCol: number = 0;
  private activeRow: number = 0;
  private activeXc: string = "A1";
  private mode = SelectionMode.idle;
  private sheetsData: { [sheet: string]: SheetInfo } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "MOVE_POSITION": {
        const [refCol, refRow] = this.getReferenceCoords();
        const { cols, rows } = this.workbook.activeSheet;
        const outOfBound =
          (cmd.deltaY < 0 && refRow === 0) ||
          (cmd.deltaY > 0 && refRow === rows.length - 1) ||
          (cmd.deltaX < 0 && refCol === 0) ||
          (cmd.deltaX > 0 && refCol === cols.length - 1);
        if (outOfBound) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.SelectionOutOfBound,
          };
        }
        break;
      }
      case "SELECT_COLUMN": {
        const { index } = cmd;
        if (index < 0 || index >= this.workbook.activeSheet.cols.length) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.SelectionOutOfBound,
          };
        }
        break;
      }
      case "SELECT_ROW": {
        const { index } = cmd;
        if (index < 0 || index >= this.workbook.activeSheet.rows.length) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.SelectionOutOfBound,
          };
        }
        break;
      }
    }
    return {
      status: "SUCCESS",
    };
  }
  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.selectCell(0, 0);
        break;
      case "ACTIVATE_SHEET":
        this.sheetsData[cmd.from] = {
          selection: JSON.parse(JSON.stringify(this.selection)),
          activeCol: this.activeCol,
          activeRow: this.activeRow,
          activeXc: this.activeXc,
        };
        if (cmd.to in this.sheetsData) {
          Object.assign(this, this.sheetsData[cmd.to]);
        } else {
          this.selectCell(0, 0);
        }
        break;
      case "SET_SELECTION":
        this.setSelection(cmd.anchor, cmd.zones, cmd.strict);
        break;
      case "START_SELECTION":
        this.mode = SelectionMode.selecting;
        break;
      case "PREPARE_SELECTION_EXPANSION":
        this.mode = SelectionMode.readyToExpand;
        break;
      case "START_SELECTION_EXPANSION":
        this.mode = SelectionMode.expanding;
        break;
      case "STOP_SELECTION":
        this.mode = SelectionMode.idle;
        break;
      case "MOVE_POSITION":
        this.movePosition(cmd.deltaX, cmd.deltaY);
        break;
      case "SELECT_CELL":
        this.selectCell(cmd.col, cmd.row);
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
          this.onAddColumns(cmd.quantity);
        }
        break;
      case "ADD_ROWS":
        if (cmd.position === "before") {
          this.onAddRows(cmd.quantity);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveCell(): Cell | null {
    const activeSheet = this.getters.getActiveSheet();
    const mergeCellMap = this.getters.getMergeCellMap(activeSheet);
    const merges = this.getters.getMerges(activeSheet);
    let mergeId = mergeCellMap[this.activeXc];
    if (mergeId) {
      return this.workbook.activeSheet.cells[merges[mergeId].topLeft];
    } else {
      return this.getters.getCell(this.activeCol, this.activeRow);
    }
  }

  getActiveCols(): Set<number> {
    const activeCols = new Set<number>();
    for (let zone of this.selection.zones) {
      if (zone.top === 0 && zone.bottom === this.workbook.activeSheet.rows.length - 1) {
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
      if (zone.left === 0 && zone.right === this.workbook.activeSheet.cols.length - 1) {
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

  getSelectedZone(): Zone {
    return this.selection.zones[this.selection.zones.length - 1];
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
        const r = this.workbook.activeSheet.rows[row];
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = r.cells[col];
          if (cell && cell.type !== "text" && !cell.error && typeof cell.value === "number") {
            n++;
            aggregate += cell.value;
          }
        }
      }
    }
    return n < 2 ? null : formatStandardNumber(aggregate);
  }

  getSelectionMode(): SelectionMode {
    return this.mode;
  }

  isSelected(zone: Zone): boolean {
    return !!this.getters.getSelectedZones().find((z) => isEqual(z, zone));
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  /**
   * Return [col, row]
   */
  private getReferenceCoords(): [number, number] {
    const isSelectingRange = this.getters.isSelectingForComposer();
    return isSelectingRange ? this.selection.anchor : [this.activeCol, this.activeRow];
  }

  private selectColumn(index: number, createRange: boolean, updateRange: boolean) {
    const bottom = this.workbook.activeSheet.rows.length - 1;
    const zone = { left: index, right: index, top: 0, bottom };
    const current = this.selection.zones;
    let zones: Zone[], anchor: [number, number];
    if (updateRange) {
      const [col, row] = this.selection.anchor;
      const updatedZone = union(zone, { left: col, right: col, top: 0, bottom });
      zones = current.slice(0, -1).concat(updatedZone);
      anchor = [col, row];
    } else {
      zones = createRange ? current.concat(zone) : [zone];
      anchor = [index, 0];
    }
    this.dispatch("SET_SELECTION", { zones, anchor, strict: true });
  }

  private selectRow(index: number, createRange: boolean, updateRange: boolean) {
    const right = this.workbook.activeSheet.cols.length - 1;
    const zone = { top: index, bottom: index, left: 0, right };
    const current = this.selection.zones;
    let zones: Zone[], anchor: [number, number];
    if (updateRange) {
      const [col, row] = this.selection.anchor;
      const updatedZone = union(zone, { left: 0, right, top: row, bottom: row });
      zones = current.slice(0, -1).concat(updatedZone);
      anchor = [col, row];
    } else {
      zones = createRange ? current.concat(zone) : [zone];
      anchor = [0, index];
    }
    this.dispatch("SET_SELECTION", { zones, anchor, strict: true });
  }

  private selectAll() {
    const bottom = this.workbook.activeSheet.rows.length - 1;
    const right = this.workbook.activeSheet.cols.length - 1;
    const zone = { left: 0, top: 0, bottom, right };
    this.dispatch("SET_SELECTION", { zones: [zone], anchor: [0, 0] });
  }

  /**
   * Change the anchor of the selection active cell to an absolute col and row inded.
   *
   * This is a non trivial task. We need to stop the editing process and update
   * properly the current selection.  Also, this method can optionally create a new
   * range in the selection.
   */
  private selectCell(col: number, row: number) {
    const xc = toXC(col, row);
    let zone = this.getters.expandZone({ left: col, right: col, top: row, bottom: row });

    if (this.mode === SelectionMode.expanding) {
      this.selection.zones.push(zone);
    } else {
      this.selection.zones = [zone];
    }
    this.selection.anchor = [col, row];
    if (!this.getters.isSelectingForComposer()) {
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

    const activeSheet = this.getters.getActiveSheet();
    const mergeCellMap = this.getters.getMergeCellMap(activeSheet);
    let mergeId = mergeCellMap[activeReference];
    if (mergeId) {
      let targetCol = refCol;
      let targetRow = refRow;
      while (mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
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
    this.selection.anchor = anchor;
  }

  private moveSelection(deltaX: number, deltaY: number) {
    const selection = this.selection;
    const zones = selection.zones.slice();
    const lastZone = zones[selection.zones.length - 1];
    const [anchorCol, anchorRow] = selection.anchor;
    const { left, right, top, bottom } = lastZone;
    let result: Zone | null = lastZone;
    const expand = (z: Zone) => {
      const { left, right, top, bottom } = this.getters.expandZone(z);
      return {
        left: Math.max(0, left),
        right: Math.min(this.workbook.activeSheet.cols.length - 1, right),
        top: Math.max(0, top),
        bottom: Math.min(this.workbook.activeSheet.rows.length - 1, bottom),
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
        this.dispatch("SET_SELECTION", { zones, anchor: [anchorCol, anchorRow] });
        return;
      }
    }
    const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
    const zoneWithDelta = {
      top: top + deltaY,
      left: left + deltaX,
      bottom: bottom + deltaY,
      right: right + deltaX,
    };
    result = expand(union(currentZone, zoneWithDelta));
    if (!isEqual(result, lastZone)) {
      zones[zones.length - 1] = result;
      this.dispatch("SET_SELECTION", { zones, anchor: [anchorCol, anchorRow] });
    }
  }

  private addCellToSelection(col: number, row: number) {
    const selection = this.selection;
    const [anchorCol, anchorRow] = selection.anchor;
    const zone: Zone = {
      left: Math.min(anchorCol, col),
      top: Math.min(anchorRow, row),
      right: Math.max(anchorCol, col),
      bottom: Math.max(anchorRow, row),
    };
    const zones = selection.zones.slice(0, -1).concat(zone);
    this.dispatch("SET_SELECTION", { zones, anchor: [anchorCol, anchorRow] });
  }

  private updateSelection() {
    const cols = this.workbook.activeSheet.cols.length - 1;
    const rows = this.workbook.activeSheet.rows.length - 1;
    const zones = this.selection.zones.map((z) => ({
      left: clip(z.left, 0, cols),
      right: clip(z.right, 0, cols),
      top: clip(z.top, 0, rows),
      bottom: clip(z.bottom, 0, rows),
    }));
    const anchorCol = zones[zones.length - 1].left;
    const anchorRow = zones[zones.length - 1].top;
    this.dispatch("SET_SELECTION", { zones, anchor: [anchorCol, anchorRow] });
  }

  private onAddColumns(quantity: number) {
    const selection = this.getSelectedZone();
    const zone = {
      left: selection.left + quantity,
      right: selection.right + quantity,
      top: selection.top,
      bottom: selection.bottom,
    };
    this.dispatch("SET_SELECTION", { zones: [zone], anchor: [zone.left, zone.top], strict: true });
  }

  private onAddRows(quantity: number) {
    const selection = this.getSelectedZone();
    const zone = {
      left: selection.left,
      right: selection.right,
      top: selection.top + quantity,
      bottom: selection.bottom + quantity,
    };
    this.dispatch("SET_SELECTION", { zones: [zone], anchor: [zone.left, zone.top], strict: true });
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;

    // selection
    const zones = this.getSelectedZones();
    ctx.fillStyle = "#f3f7fe";
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    ctx.fillStyle = onlyOneCell ? "#f3f7fe" : "#e9f0ff";
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;
    ctx.globalCompositeOperation = "multiply";
    for (const zone of zones) {
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width > 0 && height > 0) {
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // active zone
    const activeSheet = this.getters.getActiveSheet();
    const mergeCellMap = this.getters.getMergeCellMap(activeSheet);
    const merges = this.getters.getMerges(activeSheet);
    const [col, row] = this.getPosition();
    const activeXc = toXC(col, row);

    ctx.strokeStyle = "#3266ca";
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (activeXc in mergeCellMap) {
      zone = merges[mergeCellMap[activeXc]];
    } else {
      zone = {
        top: row,
        bottom: row,
        left: col,
        right: col,
      };
    }
    const [x, y, width, height] = this.getters.getRect(zone, viewport);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
