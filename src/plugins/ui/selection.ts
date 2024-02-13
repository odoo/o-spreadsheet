import { SELECTION_BORDER_COLOR } from "../../constants";
import { SUM } from "../../functions/module_math";
import { AVERAGE, COUNT, COUNTA, MAX, MIN } from "../../functions/module_statistical";
import { ClipboardCellsState } from "../../helpers/clipboard/clipboard_cells_state";
import {
  clip,
  deepCopy,
  formatValue,
  isEqual,
  positions,
  uniqueZones,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { ModelConfig } from "../../model";
import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { StateObserver } from "../../state_observer";
import { _lt } from "../../translation";
import { SelectionEvent } from "../../types/event_stream";
import {
  AddColumnsRowsCommand,
  AnchorZone,
  Cell,
  CellValueType,
  ClientPosition,
  Command,
  CommandDispatcher,
  CommandResult,
  Dimension,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  LAYERS,
  MoveColumnsRowsCommand,
  Position,
  RemoveColumnsRowsCommand,
  Selection,
  Sheet,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface SheetInfo {
  gridSelection: Selection;
}

interface SelectionStatisticFunction {
  name: string;
  compute: (values: (number | string | boolean)[]) => number;
  types: CellValueType[];
}

const selectionStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _lt("Sum"),
    types: [CellValueType.number],
    compute: (values) => SUM.compute([values]) as number,
  },
  {
    name: _lt("Avg"),
    types: [CellValueType.number],
    compute: (values) => AVERAGE.compute([values]) as number,
  },
  {
    name: _lt("Min"),
    types: [CellValueType.number],
    compute: (values) => MIN.compute([values]) as number,
  },
  {
    name: _lt("Max"),
    types: [CellValueType.number],
    compute: (values) => MAX.compute([values]) as number,
  },
  {
    name: _lt("Count"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values) => COUNTA.compute([values]) as number,
  },
  {
    name: _lt("Count Numbers"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values) => COUNT.compute([values]) as number,
  },
];

/**
 * SelectionPlugin
 */
export class GridSelectionPlugin extends UIPlugin {
  static layers = [LAYERS.Selection];
  static getters = [
    "getActiveSheet",
    "getActiveSheetId",
    "getActiveCell",
    "getActiveCols",
    "getActiveRows",
    "getCurrentStyle",
    "getSelectedZones",
    "getSelectedZone",
    "getStatisticFnResults",
    "getAggregate",
    "getSelectedFigureId",
    "getSelection",
    "getPosition",
    "getSheetPosition",
    "isSelected",
    "getElementsFromSelection",
    "isGridSelectionActive",
  ] as const;

  private gridSelection: {
    anchor: AnchorZone;
    zones: Zone[];
  } = {
    anchor: {
      cell: { col: 0, row: 0 },
      zone: { top: 0, left: 0, bottom: 0, right: 0 },
    },
    zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
  };
  private selectedFigureId: UID | null = null;
  private sheetsData: { [sheet: string]: SheetInfo } = {};
  private moveClient: (position: ClientPosition) => void;

  // This flag is used to avoid to historize the ACTIVE_SHEET command when it's
  // the main command.

  activeSheet: Sheet = null as any;

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(getters, state, dispatch, config, selection);
    this.moveClient = config.moveClient;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        try {
          this.getters.getSheet(cmd.sheetIdTo);
          break;
        } catch (error) {
          return CommandResult.InvalidSheetId;
        }
      case "MOVE_COLUMNS_ROWS":
        return this.isMoveElementAllowed(cmd);
    }
    return CommandResult.Success;
  }

  private handleEvent(event: SelectionEvent) {
    const anchor = event.anchor;
    let zones: Zone[] = [];
    switch (event.mode) {
      case "overrideSelection":
        zones = [anchor.zone];
        break;
      case "updateAnchor":
        zones = [...this.gridSelection.zones];
        const index = zones.findIndex((z: Zone) => isEqual(z, event.previousAnchor.zone));
        if (index >= 0) {
          zones[index] = anchor.zone;
        }
        break;
      case "newAnchor":
        zones = [...this.gridSelection.zones, anchor.zone];
        break;
    }
    this.setSelectionMixin(event.anchor, zones);
    /** Any change to the selection has to be  reflected in the selection processor. */
    this.selection.resetDefaultAnchor(this, deepCopy(this.gridSelection.anchor));
    const { col, row } = this.gridSelection.anchor.cell;
    this.moveClient({
      sheetId: this.getters.getActiveSheetId(),
      col,
      row,
    });
    this.selectedFigureId = null;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START_EDITION":
      case "ACTIVATE_SHEET":
        this.selectedFigureId = null;
        break;
      case "DELETE_FIGURE":
        if (this.selectedFigureId === cmd.id) {
          this.selectedFigureId = null;
        }
        break;
      case "DELETE_SHEET":
        if (this.selectedFigureId && this.getters.getFigure(cmd.sheetId, this.selectedFigureId)) {
          this.selectedFigureId = null;
        }
        break;
    }
    switch (cmd.type) {
      case "START":
        const firstSheetId = this.getters.getVisibleSheetIds()[0];
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdTo: firstSheetId,
          sheetIdFrom: firstSheetId,
        });
        const { col, row } = this.getters.getNextVisibleCellPosition(firstSheetId, 0, 0);
        this.selectCell(col, row);
        this.selection.registerAsDefault(this, this.gridSelection.anchor, {
          handleEvent: this.handleEvent.bind(this),
        });
        this.moveClient({ sheetId: firstSheetId, col: 0, row: 0 });
        break;
      case "ACTIVATE_SHEET": {
        if (!this.getters.isSheetVisible(cmd.sheetIdTo)) {
          this.dispatch("SHOW_SHEET", { sheetId: cmd.sheetIdTo });
        }
        this.setActiveSheet(cmd.sheetIdTo);
        this.sheetsData[cmd.sheetIdFrom] = {
          gridSelection: deepCopy(this.gridSelection),
        };
        if (cmd.sheetIdTo in this.sheetsData) {
          Object.assign(this, this.sheetsData[cmd.sheetIdTo]);
          this.selection.resetDefaultAnchor(this, deepCopy(this.gridSelection.anchor));
        } else {
          const { col, row } = this.getters.getNextVisibleCellPosition(cmd.sheetIdTo, 0, 0);
          this.selectCell(col, row);
        }
        break;
      }
      case "REMOVE_COLUMNS_ROWS": {
        const sheetId = this.getters.getActiveSheetId();
        if (cmd.sheetId === sheetId) {
          if (cmd.dimension === "COL") {
            this.onColumnsRemoved(cmd);
          } else {
            this.onRowsRemoved(cmd);
          }
          const { col, row } = this.gridSelection.anchor.cell;
          this.moveClient({ sheetId, col, row });
        }
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const sheetId = this.getters.getActiveSheetId();
        if (cmd.sheetId === sheetId) {
          this.onAddElements(cmd);
          const { col, row } = this.gridSelection.anchor.cell;
          this.moveClient({ sheetId, col, row });
        }
        break;
      }
      case "MOVE_COLUMNS_ROWS":
        if (cmd.sheetId === this.getActiveSheetId()) {
          this.onMoveElements(cmd);
        }
        break;
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
      case "ACTIVATE_NEXT_SHEET":
        this.activateNextSheet("right");
        break;
      case "ACTIVATE_PREVIOUS_SHEET":
        this.activateNextSheet("left");
        break;
      case "HIDE_SHEET":
        if (cmd.sheetId === this.getActiveSheetId()) {
          this.dispatch("ACTIVATE_SHEET", {
            sheetIdFrom: cmd.sheetId,
            sheetIdTo: this.getters.getVisibleSheetIds()[0],
          });
        }
        break;
      case "UNDO":
      case "REDO":
      case "DELETE_SHEET":
        const deletedSheetIds = Object.keys(this.sheetsData).filter(
          (sheetId) => !this.getters.tryGetSheet(sheetId)
        );
        for (const sheetId of deletedSheetIds) {
          delete this.sheetsData[sheetId];
        }
        for (const sheetId in this.sheetsData) {
          const gridSelection = this.clipSelection(sheetId, this.sheetsData[sheetId].gridSelection);
          this.sheetsData[sheetId] = {
            gridSelection: deepCopy(gridSelection),
          };
        }
        if (!this.getters.tryGetSheet(this.getters.getActiveSheetId())) {
          const currentSheetIds = this.getters.getVisibleSheetIds();
          this.activeSheet = this.getters.getSheet(currentSheetIds[0]);
          if (this.activeSheet.id in this.sheetsData) {
            const { anchor } = this.clipSelection(
              this.activeSheet.id,
              this.sheetsData[this.activeSheet.id].gridSelection
            );
            this.selectCell(anchor.cell.col, anchor.cell.row);
          } else {
            this.selectCell(0, 0);
          }
          const { col, row } = this.gridSelection.anchor.cell;
          this.moveClient({
            sheetId: this.getters.getActiveSheetId(),
            col,
            row,
          });
        }
        const sheetId = this.getters.getActiveSheetId();
        this.gridSelection.zones = this.gridSelection.zones.map((z) =>
          this.getters.expandZone(sheetId, z)
        );
        this.gridSelection.anchor.zone = this.getters.expandZone(
          sheetId,
          this.gridSelection.anchor.zone
        );
        this.setSelectionMixin(this.gridSelection.anchor, this.gridSelection.zones);
        this.selectedFigureId = null;
        break;
    }
    /** Any change to the selection has to be  reflected in the selection processor. */
    this.selection.resetDefaultAnchor(this, deepCopy(this.gridSelection.anchor));
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  isGridSelectionActive(): boolean {
    return this.selection.isListening(this);
  }

  getActiveSheet(): Readonly<Sheet> {
    return this.activeSheet;
  }

  getActiveSheetId(): UID {
    return this.activeSheet.id;
  }
  getActiveCell(): Cell | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const { col, row } = this.gridSelection.anchor.cell;
    const { col: mainCol, row: mainRow } = this.getters.getMainCellPosition(sheetId, col, row);
    return this.getters.getCell(sheetId, mainCol, mainRow);
  }

  getActiveCols(): Set<number> {
    const activeCols = new Set<number>();
    for (let zone of this.gridSelection.zones) {
      if (
        zone.top === 0 &&
        zone.bottom === this.getters.getNumberRows(this.getters.getActiveSheetId()) - 1
      ) {
        for (let i = zone.left; i <= zone.right; i++) {
          activeCols.add(i);
        }
      }
    }
    return activeCols;
  }

  getActiveRows(): Set<number> {
    const activeRows = new Set<number>();
    const sheetId = this.getters.getActiveSheetId();
    for (let zone of this.gridSelection.zones) {
      if (zone.left === 0 && zone.right === this.getters.getNumberCols(sheetId) - 1) {
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
    return deepCopy(this.gridSelection.zones);
  }

  getSelectedZone(): Zone {
    return deepCopy(this.gridSelection.anchor.zone);
  }

  getSelection(): Selection {
    return deepCopy(this.gridSelection);
  }

  getSelectedFigureId(): UID | null {
    return this.selectedFigureId;
  }

  getPosition(): Position {
    return { col: this.gridSelection.anchor.cell.col, row: this.gridSelection.anchor.cell.row };
  }

  getSheetPosition(sheetId: UID): Position {
    if (sheetId === this.getters.getActiveSheetId()) {
      return this.getPosition();
    } else {
      const sheetData = this.sheetsData[sheetId];
      return sheetData
        ? {
            col: sheetData.gridSelection.anchor.cell.col,
            row: sheetData.gridSelection.anchor.cell.row,
          }
        : this.getters.getNextVisibleCellPosition(sheetId, 0, 0);
    }
  }

  getStatisticFnResults(): { [name: string]: number | undefined } {
    const sheetId = this.getters.getActiveSheetId();
    // get deduplicated cells in zones
    const cells = new Set(
      this.gridSelection.zones
        .map((zone) => this.getters.getCellsInZone(sheetId, zone))
        .flat()
        .filter((cell) => {
          if (!cell) {
            return false;
          }
          const { col, row } = this.getters.getCellPosition(cell?.id!);
          return !this.getters.isRowHidden(sheetId, row) && !this.getters.isColHidden(sheetId, col);
        })
    );

    let cellsTypes = new Set<CellValueType>();
    let cellsValues: (string | number | boolean)[] = [];
    for (let cell of cells) {
      cellsTypes.add(cell!.evaluated.type);
      cellsValues.push(cell!.evaluated.value);
    }

    let statisticFnResults: { [name: string]: number | undefined } = {};
    for (let fn of selectionStatisticFunctions) {
      // We don't want to display statistical information when there is no interest:
      // We set the statistical result to undefined if the data handled by the selection
      // does not match the data handled by the function.
      // Ex: if there are only texts in the selection, we prefer that the SUM result
      // be displayed as undefined rather than 0.
      let fnResult: number | undefined = undefined;
      if (fn.types.some((t) => cellsTypes.has(t))) {
        fnResult = fn.compute(cellsValues);
      }
      statisticFnResults[fn.name] = fnResult;
    }
    return statisticFnResults;
  }

  getAggregate(): string | null {
    let aggregate = 0;
    let n = 0;
    const sheetId = this.getters.getActiveSheetId();
    const cellPositions = this.gridSelection.zones.map(positions).flat();
    for (const { col, row } of cellPositions) {
      const cell = this.getters.getCell(sheetId, col, row);
      if (cell?.evaluated.type === CellValueType.number) {
        n++;
        aggregate += cell.evaluated.value;
      }
    }
    return n < 2 ? null : formatValue(aggregate);
  }

  isSelected(zone: Zone): boolean {
    return !!this.getters.getSelectedZones().find((z) => isEqual(z, zone));
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
  /**
   * Ensure selections are not outside sheet boundaries.
   * They are clipped to fit inside the sheet if needed.
   */
  private setSelectionMixin(anchor: AnchorZone, zones: Zone[]) {
    const { anchor: clippedAnchor, zones: clippedZones } = this.clipSelection(
      this.getters.getActiveSheetId(),
      { anchor, zones }
    );
    this.gridSelection.anchor = clippedAnchor;
    this.gridSelection.zones = uniqueZones(clippedZones);
  }
  /**
   * Change the anchor of the selection active cell to an absolute col and row index.
   *
   * This is a non trivial task. We need to stop the editing process and update
   * properly the current selection.  Also, this method can optionally create a new
   * range in the selection.
   */
  private selectCell(col: HeaderIndex, row: HeaderIndex) {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.expandZone(sheetId, { left: col, right: col, top: row, bottom: row });
    this.setSelectionMixin({ zone, cell: { col, row } }, [zone]);
  }

  private setActiveSheet(id: UID) {
    const sheet = this.getters.getSheet(id);
    this.activeSheet = sheet;
  }

  private activateNextSheet(direction: "left" | "right") {
    const sheetIds = this.getters.getSheetIds();
    const oldSheetPosition = sheetIds.findIndex((id) => id === this.activeSheet.id);
    const delta = direction === "left" ? sheetIds.length - 1 : 1;
    const newPosition = (oldSheetPosition + delta) % sheetIds.length;
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getActiveSheetId(),
      sheetIdTo: sheetIds[newPosition],
    });
  }

  private onColumnsRemoved(cmd: RemoveColumnsRowsCommand) {
    const { cell, zone } = this.gridSelection.anchor;
    const selectedZone = updateSelectionOnDeletion(zone, "left", [...cmd.elements]);
    let anchorZone = { left: cell.col, right: cell.col, top: cell.row, bottom: cell.row };
    anchorZone = updateSelectionOnDeletion(anchorZone, "left", [...cmd.elements]);

    const anchor = {
      cell: {
        col: anchorZone.left,
        row: anchorZone.top,
      },
      zone: selectedZone,
    };
    this.setSelectionMixin(anchor, [selectedZone]);
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    const { cell, zone } = this.gridSelection.anchor;
    const selectedZone = updateSelectionOnDeletion(zone, "top", [...cmd.elements]);
    let anchorZone = { left: cell.col, right: cell.col, top: cell.row, bottom: cell.row };
    anchorZone = updateSelectionOnDeletion(anchorZone, "top", [...cmd.elements]);
    const anchor = {
      cell: {
        col: anchorZone.left,
        row: anchorZone.top,
      },
      zone: selectedZone,
    };
    this.setSelectionMixin(anchor, [selectedZone]);
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    const selection = this.gridSelection.anchor.zone;
    const zone = updateSelectionOnInsertion(
      selection,
      cmd.dimension === "COL" ? "left" : "top",
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    const anchor = { cell: { col: zone.left, row: zone.top }, zone };
    this.setSelectionMixin(anchor, [zone]);
  }

  private onMoveElements(cmd: MoveColumnsRowsCommand) {
    const thickness = cmd.elements.length;

    this.dispatch("ADD_COLUMNS_ROWS", {
      dimension: cmd.dimension,
      sheetId: cmd.sheetId,
      base: cmd.base,
      quantity: thickness,
      position: cmd.position,
    });

    const isCol = cmd.dimension === "COL";
    const start = cmd.elements[0];
    const end = cmd.elements[thickness - 1];
    const isBasedBefore = cmd.base < start;
    const deltaCol = isBasedBefore && isCol ? thickness : 0;
    const deltaRow = isBasedBefore && !isCol ? thickness : 0;

    const target = [
      {
        left: isCol ? start + deltaCol : 0,
        right: isCol ? end + deltaCol : this.getters.getNumberCols(cmd.sheetId) - 1,
        top: !isCol ? start + deltaRow : 0,
        bottom: !isCol ? end + deltaRow : this.getters.getNumberRows(cmd.sheetId) - 1,
      },
    ];
    const state = new ClipboardCellsState(
      target,
      "CUT",
      this.getters,
      this.dispatch,
      this.selection
    );
    const base = isBasedBefore ? cmd.base : cmd.base + 1;
    const pasteTarget = [
      {
        left: isCol ? base : 0,
        right: isCol ? base + thickness - 1 : this.getters.getNumberCols(cmd.sheetId) - 1,
        top: !isCol ? base : 0,
        bottom: !isCol ? base + thickness - 1 : this.getters.getNumberRows(cmd.sheetId) - 1,
      },
    ];
    state.paste(pasteTarget, { selectTarget: true });

    const toRemove = isBasedBefore ? cmd.elements.map((el) => el + thickness) : cmd.elements;
    let currentIndex = cmd.base;
    for (const element of toRemove) {
      const size =
        cmd.dimension === "COL"
          ? this.getters.getColSize(cmd.sheetId, element)
          : this.getters.getRowSize(cmd.sheetId, element);
      this.dispatch("RESIZE_COLUMNS_ROWS", {
        dimension: cmd.dimension,
        sheetId: cmd.sheetId,
        size,
        elements: [currentIndex],
      });
      currentIndex += 1;
    }

    this.dispatch("REMOVE_COLUMNS_ROWS", {
      dimension: cmd.dimension,
      sheetId: cmd.sheetId,
      elements: toRemove,
    });
  }

  private isMoveElementAllowed(cmd: MoveColumnsRowsCommand): CommandResult {
    const isCol = cmd.dimension === "COL";
    const start = cmd.elements[0];
    const end = cmd.elements[cmd.elements.length - 1];
    const id = cmd.sheetId;
    const doesElementsHaveCommonMerges = isCol
      ? this.getters.doesColumnsHaveCommonMerges
      : this.getters.doesRowsHaveCommonMerges;
    if (
      doesElementsHaveCommonMerges(id, start - 1, start) ||
      doesElementsHaveCommonMerges(id, end, end + 1) ||
      doesElementsHaveCommonMerges(id, cmd.base - 1, cmd.base)
    ) {
      return CommandResult.WillRemoveExistingMerge;
    }
    const headers = [cmd.base, ...cmd.elements];
    const maxHeaderValue = isCol ? this.getters.getNumberCols(id) : this.getters.getNumberRows(id);
    if (headers.some((h) => h < 0 || h >= maxHeaderValue)) {
      return CommandResult.InvalidHeaderIndex;
    }
    return CommandResult.Success;
  }

  //-------------------------------------------
  // Helpers for extensions
  // ------------------------------------------
  /**
   * Clip the selection if it spans outside the sheet
   */
  private clipSelection(sheetId: UID, selection: Selection): Selection {
    const cols = this.getters.getNumberCols(sheetId) - 1;
    const rows = this.getters.getNumberRows(sheetId) - 1;
    const zones = selection.zones.map((z) => {
      return {
        left: clip(z.left, 0, cols),
        right: clip(z.right, 0, cols),
        top: clip(z.top, 0, rows),
        bottom: clip(z.bottom, 0, rows),
      };
    });
    const anchorCol = clip(selection.anchor.cell.col, 0, cols);
    const anchorRow = clip(selection.anchor.cell.row, 0, rows);
    const anchorZone = {
      left: clip(selection.anchor.zone.left, 0, cols),
      right: clip(selection.anchor.zone.right, 0, cols),
      top: clip(selection.anchor.zone.top, 0, rows),
      bottom: clip(selection.anchor.zone.bottom, 0, rows),
    };
    return {
      zones,
      anchor: {
        cell: { col: anchorCol, row: anchorRow },
        zone: anchorZone,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    if (this.getters.isDashboard()) {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;
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
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
    ctx.globalCompositeOperation = "source-over";

    // active zone
    const activeSheet = this.getters.getActiveSheetId();
    const { col, row } = this.getPosition();

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
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
    const { x, y, width, height } = this.getters.getVisibleRect(zone);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
