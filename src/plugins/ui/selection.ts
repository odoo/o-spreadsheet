import { SELECTION_BORDER_COLOR } from "../../constants";
import {
  clip,
  findVisibleHeader,
  formatStandardNumber,
  getNextVisibleCellCoords,
  groupConsecutive,
  isEqual,
  mapCellsInZone,
  range,
  union,
  uniqueZones,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { Mode, ModelConfig } from "../../model";
import { StateObserver } from "../../state_observer";
import {
  AddColumnsRowsCommand,
  Cell,
  CellType,
  ClientPosition,
  Command,
  CommandDispatcher,
  CommandResult,
  Dimension,
  Figure,
  Getters,
  GridRenderingContext,
  Header,
  LAYERS,
  Position,
  RemoveColumnsRowsCommand,
  SelectionDirection,
  SelectionStep,
  Sheet,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export interface Selection {
  anchor: [number, number];
  zones: Zone[];
  anchorZone: Zone;
}

interface SheetInfo {
  selection: Selection;
  activeCol: number;
  activeRow: number;
}

export enum SelectionMode {
  idle,
  selecting,
  readyToExpand, //The next selection will add another zone to the current selection
  expanding,
}

type SelectionAlterationMode = "move" | "alter";

interface SelectionPluginState {
  activeSheet: Sheet;
}

/**
 * SelectionPlugin
 */
export class SelectionPlugin extends UIPlugin<SelectionPluginState> {
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  static getters = [
    "getActiveSheet",
    "getActiveSheetId",
    "getActiveCell",
    "getActiveCols",
    "getActiveRows",
    "getCurrentStyle",
    "getSelectedZones",
    "getSelectedZone",
    "getAggregate",
    "getSelectedFigureId",
    "getVisibleFigures",
    "getSelection",
    "getPosition",
    "getSheetPosition",
    "getSelectionMode",
    "isSelected",
    "getElementsFromSelection",
  ];

  private selection: Selection = {
    zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
    anchor: [0, 0],
    anchorZone: { top: 0, left: 0, bottom: 0, right: 0 },
  };
  private selectedFigureId: string | null = null;
  private activeCol: number = 0;
  private activeRow: number = 0;
  private mode = SelectionMode.idle;
  private sheetsData: { [sheet: string]: SheetInfo } = {};
  private moveClient: (position: ClientPosition) => void;

  // This flag is used to avoid to historize the ACTIVE_SHEET command when it's
  // the main command.

  activeSheet: Sheet = null as any;

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, state, dispatch, config);
    this.moveClient = config.moveClient;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SET_SELECTION": {
        if (cmd.zones.findIndex((z: Zone) => isEqual(z, cmd.anchorZone)) === -1) {
          return CommandResult.InvalidAnchorZone;
        }
        break;
      }
      case "ALTER_SELECTION":
        if (cmd.direction) {
          const { left, right, top, bottom } = this.getSelectedZone();
          const sheet = this.getters.getActiveSheet();
          //prevent any movement if the whole selection is hidden.
          const refCol = findVisibleHeader(sheet, "cols", range(left, right + 1));
          const refRow = findVisibleHeader(sheet, "rows", range(top, bottom + 1));
          if (
            (["left", "right"].includes(cmd.direction) && refRow === undefined) ||
            (["up", "down"].includes(cmd.direction) && refCol === undefined)
          ) {
            return CommandResult.SelectionOutOfBound;
          }
        }
        break;
      case "MOVE_POSITION": {
        const { cols, rows } = this.getters.getActiveSheet();
        if (
          (["left", "right"].includes(cmd.direction) && rows[this.activeRow].isHidden) ||
          (["up", "down"].includes(cmd.direction) && cols[this.activeCol].isHidden)
        ) {
          return CommandResult.SelectionOutOfBound;
        }
        const { col: targetCol, row: targetRow } = this.getNextAvailablePosition(
          cmd.direction,
          cmd.step
        );
        const outOfBound =
          targetRow < 0 ||
          targetRow > rows.length - 1 ||
          targetCol < 0 ||
          targetCol > cols.length - 1;
        if (outOfBound) {
          return CommandResult.SelectionOutOfBound;
        }
        break;
      }
      case "SELECT_COLUMN": {
        const { index } = cmd;
        if (index < 0 || index >= this.getters.getActiveSheet().cols.length) {
          return CommandResult.SelectionOutOfBound;
        }
        break;
      }
      case "SELECT_ROW": {
        const { index } = cmd;
        if (index < 0 || index >= this.getters.getActiveSheet().rows.length) {
          return CommandResult.SelectionOutOfBound;
        }
        break;
      }
      case "ACTIVATE_SHEET":
        try {
          this.getters.getSheet(cmd.sheetIdTo);
          break;
        } catch (error) {
          return CommandResult.InvalidSheetId;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      // some commands should not remove the current selection
      case "CREATE_SHEET":
      case "DELETE_SHEET":
      case "CREATE_FIGURE":
      case "CREATE_CHART":
      case "UPDATE_FIGURE":
      case "EVALUATE_CELLS":
      case "DISABLE_SELECTION_INPUT":
      case "HIGHLIGHT_SELECTION":
      case "RESET_PENDING_HIGHLIGHT":
      case "REMOVE_ALL_HIGHLIGHTS":
      case "ENABLE_NEW_SELECTION_INPUT":
        break;
      case "DELETE_FIGURE":
        if (this.selectedFigureId === cmd.id) {
          this.selectedFigureId = null;
        }
        break;
      default:
        this.selectedFigureId = null;
    }
    switch (cmd.type) {
      case "START":
        const firstSheet = this.getters.getSheets()[0];
        const firstVisiblePosition = getNextVisibleCellCoords(firstSheet, 0, 0);
        this.activeCol = firstVisiblePosition[0];
        this.activeRow = firstVisiblePosition[1];
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdTo: this.getters.getSheets()[0].id,
          sheetIdFrom: this.getters.getSheets()[0].id,
        });
        this.selectCell(...firstVisiblePosition);
        break;
      case "ACTIVATE_SHEET":
        //TODO Change the way selectCell work, perhaps take the sheet as argument ?
        this.setActiveSheet(cmd.sheetIdTo);
        this.sheetsData[cmd.sheetIdFrom] = {
          selection: JSON.parse(JSON.stringify(this.selection)),
          activeCol: this.activeCol,
          activeRow: this.activeRow,
        };
        if (cmd.sheetIdTo in this.sheetsData) {
          Object.assign(this, this.sheetsData[cmd.sheetIdTo]);
        } else {
          this.selectCell(...getNextVisibleCellCoords(this.getters.getSheets()[0], 0, 0));
        }
        break;
      case "SET_SELECTION":
        this.setSelection(cmd.anchor, cmd.zones, cmd.anchorZone, cmd.strict);
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
        this.movePosition(cmd.direction, cmd.step);
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
        if (cmd.direction) {
          this.moveSelection(cmd.direction, cmd.step || "one");
        }
        if (cmd.cell) {
          this.addCellToSelection(...cmd.cell);
        }
        break;
      case "UNDO":
      case "REDO":
      case "DELETE_SHEET":
        if (!this.getters.tryGetSheet(this.getActiveSheetId())) {
          const currentSheets = this.getters.getVisibleSheets();
          this.activeSheet = this.getters.getSheet(currentSheets[0]);
          this.selectCell(0, 0);
        }
        this.ensureSelectionValidity();
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.sheetId === this.getActiveSheetId()) {
          if (cmd.dimension === "COL") {
            this.onColumnsRemoved(cmd);
          } else {
            this.onRowsRemoved(cmd);
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.sheetId === this.getActiveSheetId()) {
          this.onAddElements(cmd);
        }
        break;
      case "UPDATE_CHART":
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveSheet(): Sheet {
    return this.activeSheet;
  }

  getActiveSheetId(): UID {
    return this.activeSheet.id;
  }
  getActiveCell(): Cell | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, this.activeCol, this.activeRow);
    return this.getters.getCell(sheetId, mainCol, mainRow);
  }

  getActiveCols(): Set<number> {
    const activeCols = new Set<number>();
    for (let zone of this.selection.zones) {
      if (zone.top === 0 && zone.bottom === this.getters.getActiveSheet().rows.length - 1) {
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
      if (zone.left === 0 && zone.right === this.getters.getActiveSheet().cols.length - 1) {
        for (let i = zone.top; i <= zone.bottom; i++) {
          activeRows.add(i);
        }
      }
    }
    return activeRows;
  }

  getCurrentStyle(): Style {
    const cell = this.getters.getActiveCell();
    return cell ? this.getters.getCellStyle(cell) : {};
  }

  getSelectedZones(): Zone[] {
    return this.selection.zones;
  }

  getSelectedZone(): Zone {
    return this.selection.anchorZone;
  }

  getSelection(): Selection {
    return this.selection;
  }

  getSelectedFigureId(): string | null {
    return this.selectedFigureId;
  }

  getPosition(): [number, number] {
    return [this.activeCol, this.activeRow];
  }

  getSheetPosition(sheetId: UID): [number, number] {
    if (sheetId === this.getters.getActiveSheetId()) {
      return this.getPosition();
    } else {
      const sheetData = this.sheetsData[sheetId];
      return sheetData
        ? [sheetData.activeCol, sheetData.activeRow]
        : getNextVisibleCellCoords(this.getters.getSheet(sheetId), 0, 0);
    }
  }

  getAggregate(): string | null {
    let aggregate = 0;
    let n = 0;
    for (let zone of this.selection.zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const r = this.getters.getRow(this.getters.getActiveSheetId(), row);
        if (r === undefined) {
          continue;
        }
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

  getVisibleFigures(sheetId: UID): Figure[] {
    const result: Figure[] = [];
    const figures = this.getters.getFigures(sheetId);
    const { offsetX, offsetY } = this.getters.getSnappedViewport(sheetId);
    const { width, height } = this.getters.getViewportDimension();
    for (let figure of figures) {
      if (figure.x >= offsetX + width || figure.x + figure.width <= offsetX) {
        continue;
      }
      if (figure.y >= offsetY + height || figure.y + figure.height <= offsetY) {
        continue;
      }
      result.push(figure);
    }
    return result;
  }

  /**
   * Returns a sorted array of indexes of all columns (respectively rows depending
   * on the dimension parameter) intersected by the currently selected zones.
   *
   * example:
   * assume selectedZones: [{left:0, right: 2, top :2, bottom: 4}, {left:5, right: 6, top :3, bottom: 5}]
   *
   * if dimension === "COL" => [0,1,2,5,6]
   * if dimension === "ROW" => [2,3,4,5]
   */
  getElementsFromSelection(dimension: Dimension): number[] {
    if (dimension === "COL" && this.getters.getActiveCols().size === 0) {
      return [];
    }
    if (dimension === "ROW" && this.getters.getActiveRows().size === 0) {
      return [];
    }
    const zones = this.getters.getSelectedZones();
    let elements: number[] = [];
    const start: "left" | "top" = dimension === "COL" ? "left" : "top";
    const end: "right" | "bottom" = dimension === "COL" ? "right" : "bottom";
    for (const zone of zones) {
      const zoneRows = Array.from(
        { length: zone[end] - zone[start] + 1 },
        (_, i) => zone[start] + i
      );
      elements = elements.concat(zoneRows);
    }
    return [...new Set(elements)].sort();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private directionToDelta(
    direction: SelectionDirection,
    step: SelectionStep,
    extendSelectionMode: SelectionAlterationMode
  ): [number, number] {
    const sheet = this.getters.getActiveSheet();
    const [col, row] = this.getStartingPosition(
      ["up", "down"].includes(direction) ? "rows" : "cols",
      extendSelectionMode
    );
    switch (direction) {
      case "up":
        return step === "one"
          ? [0, -1]
          : [0, this.findNextClusterHeader(sheet, "rows", -1, extendSelectionMode) - row];
      case "down":
        return step === "one"
          ? [0, 1]
          : [0, this.findNextClusterHeader(sheet, "rows", 1, extendSelectionMode) - row];
      case "left":
        return step === "one"
          ? [-1, 0]
          : [this.findNextClusterHeader(sheet, "cols", -1, extendSelectionMode) - col, 0];
      case "right":
        return step === "one"
          ? [1, 0]
          : [this.findNextClusterHeader(sheet, "cols", 1, extendSelectionMode) - col, 0];
    }
  }

  private isCellValid(cell: Cell | undefined): boolean {
    return (cell && cell.type != CellType.empty) || false;
  }

  private getStartingPosition(
    dimension: "cols" | "rows",
    extendSelectionMode: SelectionAlterationMode
  ): [number, number] {
    let col: number, row: number;
    const [col1, row1] = this.getPosition();
    const zone = this.getSelectedZone();
    if (extendSelectionMode === "move") {
      [col, row] = [col1, row1];
    } else {
      switch (dimension) {
        case "cols":
          row = row1;
          col = zone.right > col1 ? zone.right : zone.left;
          break;
        case "rows":
          col = col1;
          row = zone.bottom > row1 ? zone.bottom : zone.top;
      }
    }
    return [col, row];
  }

  private findNextClusterHeader(
    sheet: Sheet,
    dimension: "cols" | "rows",
    delta: -1 | 1,
    extendSelectionMode: SelectionAlterationMode
  ): number {
    const position: [number, number] = this.getStartingPosition(dimension, extendSelectionMode);
    const [col, row] = getNextVisibleCellCoords(
      sheet,
      ...this.getters.getMainCell(sheet.id, ...position)
    );

    const zone: Zone = // this is a one-dimensional zone
      dimension === "cols"
        ? {
            top: row,
            bottom: row,
            left: delta > 0 ? col : 0,
            right: delta > 0 ? sheet[dimension].length - 1 : col,
          }
        : {
            top: delta > 0 ? row : 0,
            bottom: delta > 0 ? sheet[dimension].length - 1 : row,
            left: col,
            right: col,
          };

    const lowerBound = dimension === "cols" ? zone.left : zone.top;
    const index = dimension === "cols" ? col : row;
    const cells = mapCellsInZone(zone, sheet, (cell) => cell, undefined).flat();
    const cellHeaderIndexes =
      dimension === "cols" ? range(zone.left, zone.right + 1) : range(zone.top, zone.bottom + 1);
    const hiddenHeaders = (dimension === "cols"
      ? this.getters.getHiddenColsGroups(sheet.id)
      : this.getters.getHiddenRowsGroups(sheet.id)
    ).flat();

    let validCellIndexes = cellHeaderIndexes.filter(
      (position) =>
        this.isCellValid(cells[position - lowerBound]) && !hiddenHeaders.includes(position)
    );

    if (!validCellIndexes.length) {
      return delta > 0
        ? findVisibleHeader(sheet, dimension, range(index, sheet[dimension].length).reverse())!
        : findVisibleHeader(sheet, dimension, range(0, index + 1))!;
    }

    if (!validCellIndexes.includes(index)) {
      return delta > 0 ? validCellIndexes[0] : validCellIndexes[validCellIndexes.length - 1];
    }

    const groups = groupConsecutive(validCellIndexes);
    const groupIndex = groups.findIndex((group) => group.includes(index))!;
    const group = groups[groupIndex];

    if (delta > 0) {
      const extremity = group[group.length - 1];
      return index === extremity
        ? groups[groupIndex + 1]
          ? groups[groupIndex + 1][0]
          : sheet[dimension].length - 1
        : extremity;
    } else {
      const extremity = group[0];
      return index === extremity
        ? groups[groupIndex - 1]
          ? groups[groupIndex - 1][groups[groupIndex - 1].length - 1]
          : 0
        : extremity;
    }
  }

  private selectColumn(index: number, createRange: boolean, updateRange: boolean) {
    const bottom = this.getters.getActiveSheet().rows.length - 1;
    let zone = { left: index, right: index, top: 0, bottom };
    const current = this.selection.zones;
    let newZones: Zone[], anchor: [number, number];
    const top = this.getters.getActiveSheet().rows.findIndex((row) => !row.isHidden);
    if (updateRange) {
      const [col, row] = this.selection.anchor;
      zone = union(zone, { left: col, right: col, top, bottom });
      newZones = this.updateSelectionZones(zone);
      anchor = [col, row];
    } else {
      newZones = createRange ? current.concat(zone) : [zone];
      anchor = [index, top];
    }
    this.dispatch("SET_SELECTION", { zones: newZones, anchor, strict: true, anchorZone: zone });
  }

  private selectRow(index: number, createRange: boolean, updateRange: boolean) {
    const right = this.getters.getActiveSheet().cols.length - 1;
    let zone = { top: index, bottom: index, left: 0, right };
    const current = this.selection.zones;
    let zones: Zone[], anchor: [number, number];
    const left = this.getters.getActiveSheet().cols.findIndex((col) => !col.isHidden);
    if (updateRange) {
      const [col, row] = this.selection.anchor;
      zone = union(zone, { left, right, top: row, bottom: row });
      zones = this.updateSelectionZones(zone);
      anchor = [col, row];
    } else {
      zones = createRange ? current.concat(zone) : [zone];
      anchor = [left, index];
    }
    this.dispatch("SET_SELECTION", { zones, anchor, strict: true, anchorZone: zone });
  }

  private selectAll() {
    const bottom = this.getters.getActiveSheet().rows.length - 1;
    const right = this.getters.getActiveSheet().cols.length - 1;
    const zone = { left: 0, top: 0, bottom, right };
    this.dispatch("SET_SELECTION", { zones: [zone], anchor: [0, 0], anchorZone: zone });
  }

  /**
   * Change the anchor of the selection active cell to an absolute col and row index.
   *
   * This is a non trivial task. We need to stop the editing process and update
   * properly the current selection.  Also, this method can optionally create a new
   * range in the selection.
   */
  private selectCell(col: number, row: number) {
    const sheet = this.getters.getActiveSheet();
    this.moveClient({ sheetId: sheet.id, col, row });
    let zone = this.getters.expandZone(sheet.id, { left: col, right: col, top: row, bottom: row });
    if (this.mode === SelectionMode.expanding) {
      this.selection.zones.push(zone);
    } else {
      this.selection.zones = [zone];
    }
    this.selection.zones = uniqueZones(this.selection.zones);
    this.selection.anchorZone = zone;
    this.selection.anchor = [col, row];
    this.activeCol = col;
    this.activeRow = row;
  }

  private setActiveSheet(id: UID) {
    const sheet = this.getters.getSheet(id);
    this.activeSheet = sheet;
  }

  /** Computes the next cell position in the direction of deltaX and deltaY
   * by crossing through merges and skipping hidden cells.
   * Note that the resulting position might be out of the sheet, it needs to be validated.
   */
  private getNextAvailablePosition(
    direction: SelectionDirection,
    step: SelectionStep = "one"
  ): Position {
    const [deltaX, deltaY] = this.directionToDelta(direction, step, "move");
    return {
      col: this.getNextAvailableCol(deltaX, this.activeCol, this.activeRow),
      row: this.getNextAvailableRow(deltaY, this.activeCol, this.activeRow),
    };
  }

  private getNextAvailableCol(delta: number, colIndex: number, rowIndex: number): number {
    const { cols, id: sheetId } = this.getActiveSheet();
    const position = { col: colIndex, row: rowIndex };
    const isInPositionMerge = (nextCol) =>
      this.getters.isInSameMerge(sheetId, colIndex, rowIndex, nextCol, rowIndex);
    return this.getNextAvailableHeader(delta, cols, colIndex, position, isInPositionMerge);
  }

  private getNextAvailableRow(delta: number, colIndex: number, rowIndex: number): number {
    const { rows, id: sheetId } = this.getActiveSheet();
    const position = { col: colIndex, row: rowIndex };
    const isInPositionMerge = (nextRow) =>
      this.getters.isInSameMerge(sheetId, colIndex, rowIndex, colIndex, nextRow);
    return this.getNextAvailableHeader(delta, rows, rowIndex, position, isInPositionMerge);
  }

  private getNextAvailableHeader(
    delta: number,
    headers: Header[],
    startingHeaderIndex: number,
    position: Position,
    isInPositionMerge: (nextHeader: number) => boolean
  ): number {
    const sheetId = this.getters.getActiveSheetId();
    const { col, row } = position;
    if (delta === 0) {
      return startingHeaderIndex;
    }
    let header = startingHeaderIndex + delta;
    const step = Math.sign(delta);
    if (this.getters.isInMerge(sheetId, col, row)) {
      while (isInPositionMerge(header)) {
        header += step;
      }
      while (headers[header]?.isHidden) {
        header += step;
      }
    } else if (headers[header]?.isHidden) {
      while (headers[header]?.isHidden) {
        header += step;
      }
    }
    const outOfBound = header < 0 || header > headers.length - 1;
    if (outOfBound) {
      if (headers[startingHeaderIndex].isHidden) {
        return this.getNextAvailableHeader(
          -step,
          headers,
          startingHeaderIndex,
          position,
          isInPositionMerge
        );
      } else {
        return startingHeaderIndex;
      }
    }
    return header;
  }

  /**
   * Moves the position of either the active cell of the anchor of the current selection by a number of rows / cols delta
   */
  movePosition(direction: SelectionDirection, step: SelectionStep = "one") {
    const { col: targetCol, row: targetRow } = this.getNextAvailablePosition(direction, step);
    this.selectCell(targetCol, targetRow);
  }

  setSelection(anchor: [number, number], zones: Zone[], anchorZone: Zone, strict: boolean = false) {
    this.selectCell(...anchor);
    if (strict) {
      this.selection.zones = zones;
      this.selection.anchorZone = anchorZone;
    } else {
      const sheetId = this.getters.getActiveSheetId();
      this.selection.zones = zones.map((zone: Zone) => this.getters.expandZone(sheetId, zone));
      this.selection.anchorZone = this.getters.expandZone(sheetId, anchorZone);
    }
    this.selection.zones = uniqueZones(this.selection.zones);
    this.selection.anchor = anchor;
  }

  private organizeZone(zone: Zone): Zone {
    return {
      top: Math.min(zone.top, zone.bottom),
      bottom: Math.max(zone.top, zone.bottom),
      left: Math.min(zone.left, zone.right),
      right: Math.max(zone.left, zone.right),
    };
  }

  private moveSelection(direction: SelectionDirection, step: SelectionStep = "one") {
    let [deltaX, deltaY] = this.directionToDelta(direction, step, "alter");
    if (deltaX === 0 && deltaY === 0) {
      return;
    }
    const sheet = this.getters.getActiveSheet();
    const selection = this.selection;
    let newZones: Zone[] = [];
    const [anchorCol, anchorRow] = selection.anchor;
    const { left, right, top, bottom } = selection.anchorZone;
    let result: Zone | null = selection.anchorZone;
    const activeSheet = this.getters.getActiveSheet();
    const expand = (z: Zone) => {
      const { left, right, top, bottom } = this.getters.expandZone(activeSheet.id, z);
      return {
        left: Math.max(0, left),
        right: Math.min(activeSheet.cols.length - 1, right),
        top: Math.max(0, top),
        bottom: Math.min(activeSheet.rows.length - 1, bottom),
      };
    };

    const refCol = findVisibleHeader(sheet, "cols", range(left, right + 1));
    const refRow = findVisibleHeader(sheet, "rows", range(top, bottom + 1));
    // check if we can shrink selection
    let n = Math.abs(deltaX || deltaY);
    while (result !== null) {
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
      n++;
      if (result && !isEqual(result, selection.anchorZone)) {
        newZones = this.updateSelectionZones(this.organizeZone(result));
        this.dispatch("SET_SELECTION", {
          zones: newZones,
          anchor: [anchorCol, anchorRow],
          anchorZone: result,
        });
        return;
      }
    }
    const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
    let zoneWithDelta = this.organizeZone({
      top: this.getNextAvailableRow(deltaY, refCol!, top),
      left: this.getNextAvailableCol(deltaX, left, refRow!),
      bottom: this.getNextAvailableRow(deltaY, refCol!, bottom),
      right: this.getNextAvailableCol(deltaX, right, refRow!),
    });
    result = expand(union(currentZone, zoneWithDelta));
    if (!isEqual(result, selection.anchorZone)) {
      newZones = this.updateSelectionZones(result);
      this.dispatch("SET_SELECTION", {
        zones: newZones,
        anchor: [anchorCol, anchorRow],
        anchorZone: result,
      });
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
    const newZones = this.updateSelectionZones(zone);
    this.dispatch("SET_SELECTION", {
      zones: newZones,
      anchor: [anchorCol, anchorRow],
      anchorZone: zone,
    });
  }

  /**
   * Ensure selections are not outside sheet boundaries.
   * They are clipped to fit inside the sheet if needed.
   */
  private ensureSelectionValidity() {
    const { anchor, zones, anchorZone } = this.clipSelection(
      this.getActiveSheetId(),
      this.selection
    );
    this.setSelection(anchor, zones, anchorZone);
    const deletedSheetIds = Object.keys(this.sheetsData).filter(
      (sheetId) => !this.getters.tryGetSheet(sheetId)
    );
    for (const sheetId of deletedSheetIds) {
      delete this.sheetsData[sheetId];
    }
    for (const sheetId in this.sheetsData) {
      const { anchor, zones, anchorZone } = this.clipSelection(
        sheetId,
        this.sheetsData[sheetId].selection
      );
      this.sheetsData[sheetId] = {
        selection: { anchor, zones, anchorZone },
        activeCol: anchor[0],
        activeRow: anchor[1],
      };
    }
  }

  /**
   * Clip the selection if it spans outside the sheet
   */
  private clipSelection(sheetId: UID, selection: Selection): Selection {
    const sheet = this.getters.getSheet(sheetId);
    const cols = sheet.cols.length - 1;
    const rows = sheet.rows.length - 1;
    const zones = selection.zones.map((z) => ({
      left: clip(z.left, 0, cols),
      right: clip(z.right, 0, cols),
      top: clip(z.top, 0, rows),
      bottom: clip(z.bottom, 0, rows),
    }));
    const anchorCol = clip(selection.anchor[0], 0, cols);
    const anchorRow = clip(selection.anchor[1], 0, rows);
    const anchorZone = {
      left: clip(selection.anchorZone.left, 0, cols),
      right: clip(selection.anchorZone.right, 0, cols),
      top: clip(selection.anchorZone.top, 0, rows),
      bottom: clip(selection.anchorZone.bottom, 0, rows),
    };
    return {
      anchor: [anchorCol, anchorRow],
      zones,
      anchorZone,
    };
  }

  private onColumnsRemoved(cmd: RemoveColumnsRowsCommand) {
    const zone = updateSelectionOnDeletion(this.getSelectedZone(), "left", cmd.elements);
    this.setSelection([zone.left, zone.top], [zone], zone, true);
    this.ensureSelectionValidity();
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    const zone = updateSelectionOnDeletion(this.getSelectedZone(), "top", cmd.elements);
    this.setSelection([zone.left, zone.top], [zone], zone, true);
    this.ensureSelectionValidity();
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    const selection = this.getSelectedZone();
    const zone = updateSelectionOnInsertion(
      selection,
      cmd.dimension === "COL" ? "left" : "top",
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    this.setSelection([zone.left, zone.top], [zone], zone, true);
  }

  /**
   * this function searches for anchorZone in selection.zones
   * and modifies it by newZone
   */
  private updateSelectionZones(newZone: Zone): Zone[] {
    let zones = [...this.selection.zones];
    const current = this.selection.anchorZone;
    const index = zones.findIndex((z: Zone) => isEqual(z, current));
    if (index >= 0) {
      zones[index] = newZone;
    }
    return zones;
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
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
    ctx.globalCompositeOperation = "source-over";

    // active zone
    const activeSheet = this.getters.getActiveSheetId();
    const [col, row] = this.getPosition();

    ctx.strokeStyle = "#3266ca";
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (this.getters.isInMerge(activeSheet, col, row)) {
      zone = this.getters.getMerge(activeSheet, col, row)!;
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
