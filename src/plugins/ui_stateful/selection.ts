import { CellClipboardHandler } from "../../clipboard_handlers/cell_clipboard";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { sum } from "../../functions/helper_math";
import { average, countAny, countNumbers, max, min } from "../../functions/helper_statistical";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import {
  clip,
  deepCopy,
  formatValue,
  isEqual,
  positionToZone,
  positions,
  uniqueZones,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { _t } from "../../translation";
import { SelectionEvent } from "../../types/event_stream";
import {
  AddColumnsRowsCommand,
  AnchorZone,
  CellPosition,
  CellValueType,
  ClientPosition,
  Command,
  CommandResult,
  Dimension,
  EvaluatedCell,
  GridRenderingContext,
  HeaderIndex,
  LAYERS,
  LocalCommand,
  Locale,
  MoveColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  Selection,
  Sheet,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

interface SheetInfo {
  gridSelection: Selection;
}

interface SelectionStatisticFunction {
  name: string;
  compute: (data: EvaluatedCell[], locale: Locale) => number;
  types: CellValueType[];
}

const selectionStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _t("Sum"),
    types: [CellValueType.number],
    compute: (values, locale) => sum([[values]], locale),
  },
  {
    name: _t("Avg"),
    types: [CellValueType.number],
    compute: (values, locale) => average([[values]], locale),
  },
  {
    name: _t("Min"),
    types: [CellValueType.number],
    compute: (values, locale) => min([[values]], locale),
  },
  {
    name: _t("Max"),
    types: [CellValueType.number],
    compute: (values, locale) => max([[values]], locale),
  },
  {
    name: _t("Count"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values) => countAny([[values]]),
  },
  {
    name: _t("Count Numbers"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values, locale) => countNumbers([[values]], locale),
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
    "getSelectedCells",
    "getStatisticFnResults",
    "getAggregate",
    "getSelectedFigureId",
    "getSelection",
    "getActivePosition",
    "getSheetPosition",
    "isSelected",
    "isSingleColSelected",
    "getElementsFromSelection",
    "tryGetActiveSheetId",
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

  constructor(config: UIPluginConfig) {
    super(config);
    this.moveClient = config.moveClient;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
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
    /** Any change to the selection has to be reflected in the selection processor. */
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
        this.activateSheet(firstSheetId, firstSheetId);
        const { col, row } = this.getters.getNextVisibleCellPosition({
          sheetId: firstSheetId,
          col: 0,
          row: 0,
        });
        this.selectCell(col, row);
        this.selection.registerAsDefault(this, this.gridSelection.anchor, {
          handleEvent: this.handleEvent.bind(this),
        });
        this.moveClient({ sheetId: firstSheetId, col: 0, row: 0 });
        break;
      case "ACTIVATE_SHEET": {
        this.activateSheet(cmd.sheetIdFrom, cmd.sheetIdTo);
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

  tryGetActiveSheetId(): UID | undefined {
    return this.activeSheet?.id;
  }

  getActiveCell(): EvaluatedCell {
    return this.getters.getEvaluatedCell(this.getActivePosition());
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
    const zone = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    return this.getters.getCellStyle({ sheetId, col: zone.left, row: zone.top });
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

  getSelectedCells(): EvaluatedCell[] {
    const sheetId = this.getters.getActiveSheetId();
    const cells: EvaluatedCell[] = [];
    for (const zone of this.gridSelection.zones) {
      cells.push(...this.getters.getEvaluatedCellsInZone(sheetId, zone));
    }
    return cells;
  }

  getSelectedFigureId(): UID | null {
    return this.selectedFigureId;
  }

  getActivePosition(): CellPosition {
    return this.getters.getMainCellPosition({
      sheetId: this.getActiveSheetId(),
      col: this.gridSelection.anchor.cell.col,
      row: this.gridSelection.anchor.cell.row,
    });
  }

  getSheetPosition(sheetId: UID): CellPosition {
    if (sheetId === this.getters.getActiveSheetId()) {
      return this.getActivePosition();
    } else {
      const sheetData = this.sheetsData[sheetId];
      return sheetData
        ? {
            sheetId,
            col: sheetData.gridSelection.anchor.cell.col,
            row: sheetData.gridSelection.anchor.cell.row,
          }
        : this.getters.getNextVisibleCellPosition({ sheetId, col: 0, row: 0 });
    }
  }

  getStatisticFnResults(): { [name: string]: number | undefined } {
    const sheetId = this.getters.getActiveSheetId();
    const cells = new Set<EvaluatedCell>();

    for (const zone of this.gridSelection.zones) {
      for (const { col, row } of positions(zone)) {
        if (this.getters.isRowHidden(sheetId, row) || this.getters.isColHidden(sheetId, col)) {
          continue; // Skip hidden cells
        }

        const evaluatedCell = this.getters.getEvaluatedCell({ sheetId, col, row });
        if (evaluatedCell.type !== CellValueType.empty) {
          cells.add(evaluatedCell);
        }
      }
    }

    const locale = this.getters.getLocale();

    let statisticFnResults: { [name: string]: number | undefined } = {};
    for (let fn of selectionStatisticFunctions) {
      // We don't want to display statistical information when there is no interest:
      // We set the statistical result to undefined if the data handled by the selection
      // does not match the data handled by the function.
      // Ex: if there are only texts in the selection, we prefer that the SUM result
      // be displayed as undefined rather than 0.
      let fnResult: number | undefined = undefined;
      const evaluatedCells = [...cells].filter((c) => fn.types.includes(c.type));
      if (evaluatedCells.length) {
        fnResult = fn.compute(evaluatedCells, locale);
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
      const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
      if (cell.type === CellValueType.number) {
        n++;
        aggregate += cell.value;
      }
    }
    const locale = this.getters.getLocale();
    return n < 2 ? null : formatValue(aggregate, { locale });
  }

  isSelected(zone: Zone): boolean {
    return !!this.getters.getSelectedZones().find((z) => isEqual(z, zone));
  }

  isSingleColSelected() {
    const selection = this.getters.getSelectedZones();
    if (selection.length !== 1 || selection[0].left !== selection[0].right) {
      return false;
    }
    return true;
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

  private activateSheet(sheetIdFrom: UID, sheetIdTo: UID) {
    if (!this.getters.isSheetVisible(sheetIdTo)) {
      this.dispatch("SHOW_SHEET", { sheetId: sheetIdTo });
    }
    this.setActiveSheet(sheetIdTo);
    this.sheetsData[sheetIdFrom] = {
      gridSelection: deepCopy(this.gridSelection),
    };
    if (sheetIdTo in this.sheetsData) {
      Object.assign(this, this.sheetsData[sheetIdTo]);
      this.selection.resetDefaultAnchor(this, deepCopy(this.gridSelection.anchor));
    } else {
      const { col, row } = this.getters.getNextVisibleCellPosition({
        sheetId: sheetIdTo,
        col: 0,
        row: 0,
      });
      this.selectCell(col, row);
    }
  }

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

    const selections = this.gridSelection.zones.map((zone) =>
      updateSelectionOnDeletion(zone, "left", [...cmd.elements])
    );
    this.setSelectionMixin(anchor, selections);
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
    const selections = this.gridSelection.zones.map((zone) =>
      updateSelectionOnDeletion(zone, "top", [...cmd.elements])
    );
    this.setSelectionMixin(anchor, selections);
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    const start = cmd.dimension === "COL" ? "left" : "top";
    const anchorZone = updateSelectionOnInsertion(
      this.gridSelection.anchor.zone,
      start,
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    const selection = this.gridSelection.zones.map((zone) =>
      updateSelectionOnInsertion(zone, start, cmd.base, cmd.position, cmd.quantity)
    );
    const anchor = {
      cell: { col: anchorZone.left, row: anchorZone.top },
      zone: anchorZone,
    };
    this.setSelectionMixin(anchor, selection);
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

    const handler = new CellClipboardHandler(this.getters, this.dispatch);
    const data = handler.copy(getClipboardDataPositions(target));
    if (!data) {
      return;
    }
    const base = isBasedBefore ? cmd.base : cmd.base + 1;
    const pasteTarget = [
      {
        left: isCol ? base : 0,
        right: isCol ? base + thickness - 1 : this.getters.getNumberCols(cmd.sheetId) - 1,
        top: !isCol ? base : 0,
        bottom: !isCol ? base + thickness - 1 : this.getters.getNumberRows(cmd.sheetId) - 1,
      },
    ];
    handler.paste({ zones: pasteTarget }, data, { isCutOperation: true });

    const toRemove = isBasedBefore ? cmd.elements.map((el) => el + thickness) : cmd.elements;
    let currentIndex = cmd.base;
    for (const element of toRemove) {
      const size = this.getters.getHeaderSize(cmd.sheetId, cmd.dimension, element);
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

  drawLayer(renderingContext: GridRenderingContext) {
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
    for (const zone of zones) {
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(x, y, width, height);
    }

    ctx.globalCompositeOperation = "source-over";
    // active zone
    const position = this.getActivePosition();

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (this.getters.isInMerge(position)) {
      zone = this.getters.getMerge(position)!;
    } else {
      zone = positionToZone(position);
    }
    const { x, y, width, height } = this.getters.getVisibleRect(zone);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
