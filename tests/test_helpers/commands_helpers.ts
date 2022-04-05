import { BACKGROUND_CHART_COLOR } from "../../src/constants";
import { isInside, lettersToNumber, toCartesian, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import {
  AnchorZone,
  BasicChartUIDefinition,
  BorderCommand,
  ChartUIDefinitionUpdate,
  ClipboardOptions,
  CreateSheetCommand,
  DispatchResult,
  ScorecardChartUIDefinition,
  SortDirection,
  UID,
  UpDown,
} from "../../src/types";
import { SelectionDirection, SelectionStep } from "../../src/types/selection";
import { target } from "./helpers";

/**
 * Dispatch an UNDO to the model
 */
export function undo(model: Model): DispatchResult {
  return model.dispatch("REQUEST_UNDO");
}

/**
 * Dispatch a REDO to the model
 */
export function redo(model: Model): DispatchResult {
  return model.dispatch("REQUEST_REDO");
}

export function activateSheet(
  model: Model,
  sheetIdTo: UID,
  sheetIdFrom: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
}

/**
 * Create a new sheet. By default, the sheet is added at position 1
 * If data.activate is true, a "ACTIVATE_SHEET" is dispatched
 */
export function createSheet(
  model: Model,
  data: Partial<CreateSheetCommand & { activate: boolean }>
) {
  const sheetId = data.sheetId || model.uuidGenerator.uuidv4();
  const result = model.dispatch("CREATE_SHEET", {
    position: data.position !== undefined ? data.position : 1,
    sheetId,
    cols: data.cols,
    rows: data.rows,
    name: data.name,
  });
  if (data.activate) {
    activateSheet(model, sheetId);
  }
  return result;
}

export function renameSheet(model: Model, sheetId: UID, name: string): DispatchResult {
  return model.dispatch("RENAME_SHEET", { sheetId, name });
}

export function createSheetWithName(
  model: Model,
  data: Partial<CreateSheetCommand & { activate: boolean }>,
  name: string
): DispatchResult {
  let createResult = createSheet(model, data);
  if (!createResult.isSuccessful) {
    return createResult;
  }
  const sheets = model.getters.getSheetIds();
  return renameSheet(model, sheets[sheets.length - 1], name);
}

export function deleteSheet(model: Model, sheetId: UID): DispatchResult {
  return model.dispatch("DELETE_SHEET", { sheetId });
}

/**
 * Create a new chart by default of type bar with titles
 * in the data sets, on the active sheet.
 */
export function createChart(
  model: Model,
  data: Partial<BasicChartUIDefinition>,
  chartId?: UID,
  sheetId?: UID
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    id,
    sheetId,
    definition: {
      title: data.title || "test",
      dataSets: data.dataSets || [],
      dataSetsHaveTitle: data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true,
      labelRange: data.labelRange,
      type: data.type || "bar",
      background: data.background || BACKGROUND_CHART_COLOR,
      verticalAxisPosition: data.verticalAxisPosition || "left",
      legendPosition: data.legendPosition || "top",
      stackedBar: data.stackedBar || false,
      labelsAsText: data.labelsAsText || false,
    },
  });
}

export function createScorecardChart(
  model: Model,
  data: Partial<ScorecardChartUIDefinition>,
  chartId?: UID,
  sheetId?: UID
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    id,
    sheetId,
    definition: {
      type: "scorecard",
      title: data.title || "",
      baseline: data.baseline || "",
      keyValue: data.keyValue || "",
      baselineDescr: data.baselineDescr || "",
      baselineMode: data.baselineMode || "absolute",
      baselineColorDown: "#DC6965",
      baselineColorUp: "#00A04A",
      background: data.background,
    },
  });
}

/**
 * Update a chart
 */
export function updateChart(
  model: Model,
  chartId: UID,
  definition: ChartUIDefinitionUpdate,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("UPDATE_CHART", {
    id: chartId,
    sheetId,
    definition,
  });
}

/**
 * Copy a zone
 */
export function copy(model: Model, range: string): DispatchResult {
  return model.dispatch("COPY", { target: target(range) });
}

/**
 * Cut a zone
 */
export function cut(model: Model, range: string): DispatchResult {
  return model.dispatch("CUT", { target: target(range) });
}

/**
 * Paste on a zone
 */
export function paste(
  model: Model,
  range: string,
  force?: boolean,
  pasteOption?: ClipboardOptions
): DispatchResult {
  return model.dispatch("PASTE", { target: target(range), force, pasteOption });
}

/**
 * Paste from OS clipboard on a zone
 */
export function pasteFromOSClipboard(model: Model, range: string, content: string): DispatchResult {
  return model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: content, target: target(range) });
}

/**
 * Add columns
 */
export function addColumns(
  model: Model,
  position: "before" | "after",
  column: string,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    position,
    base: lettersToNumber(column),
    quantity,
  });
}

/**
 * Delete columns
 */
export function deleteColumns(
  model: Model,
  columns: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: columns.map(lettersToNumber),
  });
}

/**
 * Resize columns
 */
export function resizeColumns(
  model: Model,
  columns: string[],
  size: number,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("RESIZE_COLUMNS_ROWS", {
    dimension: "COL",
    elements: columns.map(lettersToNumber),
    sheetId,
    size,
  });
}

/**
 * Add rows
 */
export function addRows(
  model: Model,
  position: "before" | "after",
  row: number,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_COLUMNS_ROWS", {
    dimension: "ROW",
    sheetId,
    position,
    base: row,
    quantity,
  });
}

/**
 * Delete rows
 */
export function deleteRows(
  model: Model,
  rows: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    elements: rows,
    dimension: "ROW",
  });
}

/**
 * Resize rows
 */
export function resizeRows(
  model: Model,
  rows: number[],
  size: number,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("RESIZE_COLUMNS_ROWS", {
    dimension: "ROW",
    elements: rows,
    sheetId,
    size,
  });
}

/**
 * Hide Columns
 */
export function hideColumns(
  model: Model,
  columns: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: columns.map(lettersToNumber),
  });
}

/**
 * Unhide Columns
 */
export function unhideColumns(
  model: Model,
  columns: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: columns.map(lettersToNumber),
  });
}

/**
 * Hide Rows
 */
export function hideRows(
  model: Model,
  rows: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "ROW",
    elements: rows,
  });
}

/**
 * Unhide Rows
 */
export function unhideRows(
  model: Model,
  rows: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "ROW",
    elements: rows,
  });
}

export function deleteCells(model: Model, range: string, shift: "left" | "up"): DispatchResult {
  return model.dispatch("DELETE_CELL", {
    zone: toZone(range),
    shiftDimension: shift === "left" ? "COL" : "ROW",
  });
}

export function insertCells(model: Model, range: string, shift: "right" | "down"): DispatchResult {
  return model.dispatch("INSERT_CELL", {
    zone: toZone(range),
    shiftDimension: shift === "right" ? "COL" : "ROW",
  });
}

/**
 * Set a border to a given zone or the selected zones
 */
export function setBorder(model: Model, border: BorderCommand, xc?: string) {
  const target = xc ? [toZone(xc)] : model.getters.getSelectedZones();
  model.dispatch("SET_FORMATTING", {
    sheetId: model.getters.getActiveSheetId(),
    target,
    border,
  });
}

/**
 * Clear a cell
 */
export function clearCell(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  model.dispatch("CLEAR_CELL", { col, row, sheetId });
}

/**
 * Set the content of a cell
 */
export function setCellContent(
  model: Model,
  xc: string,
  content: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_CELL", { col, row, sheetId, content });
}

/**
 * Select a cell
 */
export function selectCell(model: Model, xc: string): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.selection.selectCell(col, row);
}

export function moveAnchorCell(
  model: Model,
  direction: SelectionDirection,
  step: SelectionStep = "one"
): DispatchResult {
  return model.selection.moveAnchorCell(direction, step);
}

export function resizeAnchorZone(
  model: Model,
  direction: SelectionDirection,
  step: SelectionStep = "one"
): DispatchResult {
  return model.selection.resizeAnchorZone(direction, step);
}

export function setAnchorCorner(model: Model, xc: string): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.selection.setAnchorCorner(col, row);
}

export function addCellToSelection(model: Model, xc: string): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.selection.addCellToSelection(col, row);
}

/**
 * Move a conditianal formatting rule
 */
export function moveConditionalFormat(
  model: Model,
  cfId: UID,
  direction: UpDown,
  sheetId: UID
): DispatchResult {
  return model.dispatch("MOVE_CONDITIONAL_FORMAT", {
    cfId: cfId,
    direction: direction,
    sheetId,
  });
}

export function setSelection(
  model: Model,
  xcs: string[],
  options: {
    anchor?: string | undefined;
    strict?: boolean;
  } = { anchor: undefined, strict: false }
) {
  const sheetId = model.getters.getActiveSheetId();
  let zones = xcs
    .reverse()
    .map(toZone)
    .map((z) => model.getters.expandZone(sheetId, z));
  let anchor: AnchorZone;

  if (options.anchor) {
    const { col, row } = toCartesian(options.anchor);

    // find the zones that contain the anchor and if several found ,select the last one as the anchorZone
    const anchorZoneIndex = zones.findIndex((zone) => isInside(col, row, zone));
    if (anchorZoneIndex === -1) {
      throw new Error(`Anchor cell ${options.anchor} should be inside a selected zone`);
    }
    const anchorZone = zones.splice(anchorZoneIndex, 1)[0]; // remove the zone from zones
    anchor = {
      cell: {
        col,
        row,
      },
      zone: anchorZone,
    };
  } else {
    const anchorZone = zones.splice(0, 1)[0]; // the default for most tests is to have the anchor as the first zone
    anchor = {
      cell: {
        col: anchorZone.left,
        row: anchorZone.top,
      },
      zone: anchorZone,
    };
  }

  if (zones.length !== 0) {
    const z1 = zones.splice(0, 1)[0];
    model.selection.selectZone({ cell: { col: z1.left, row: z1.top }, zone: z1 });
    for (const zone of zones) {
      model.selection.addCellToSelection(zone.left, zone.top);
      model.selection.setAnchorCorner(zone.right, zone.bottom);
    }
    model.selection.addCellToSelection(anchor.zone.left, anchor.zone.top);
    model.selection.setAnchorCorner(anchor.zone.right, anchor.zone.bottom);
  } else {
    model.selection.selectZone(anchor);
  }
}

export function selectColumn(
  model: Model,
  col: number,
  mode: "overrideSelection" | "updateAnchor" | "newAnchor"
) {
  return model.selection.selectColumn(col, mode);
}

export function selectRow(
  model: Model,
  row: number,
  mode: "overrideSelection" | "updateAnchor" | "newAnchor"
) {
  return model.selection.selectRow(row, mode);
}

export function selectAll(model: Model) {
  return model.selection.selectAll();
}

export function sort(
  model: Model,
  {
    zone,
    sheetId,
    anchor,
    direction,
  }: {
    zone: string;
    sheetId?: UID;
    anchor: string;
    direction: SortDirection;
  }
) {
  const { col, row } = toCartesian(anchor);
  return model.dispatch("SORT_CELLS", {
    sheetId: sheetId || model.getters.getActiveSheetId(),
    zone: toZone(zone),
    col,
    row,
    sortDirection: direction,
  });
}

export function merge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_MERGE", {
    sheetId,
    target: target(range),
    force: true,
  });
}

export function interactiveMerge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_MERGE", {
    sheetId,
    target: target(range),
    force: false,
  });
}

export function unMerge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_MERGE", {
    sheetId,
    target: target(range),
  });
}

export function snapshot(model: Model) {
  model["session"].snapshot(model.exportData());
}

export function moveColumns(
  model: Model,
  target: string,
  columns: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("MOVE_COLUMNS_ROWS", {
    sheetId,
    base: lettersToNumber(target),
    dimension: "COL",
    elements: columns.map(lettersToNumber),
  });
}

export function moveRows(
  model: Model,
  target: number,
  rows: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("MOVE_COLUMNS_ROWS", {
    sheetId,
    base: target,
    dimension: "ROW",
    elements: rows,
  });
}

export function moveSheet(
  model: Model,
  direction: "left" | "right",
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("MOVE_SHEET", {
    sheetId,
    direction,
  });
}

export function hideSheet(model: Model, sheetId: UID) {
  return model.dispatch("HIDE_SHEET", { sheetId });
}

export function showSheet(model: Model, sheetId: UID) {
  return model.dispatch("SHOW_SHEET", { sheetId });
}
