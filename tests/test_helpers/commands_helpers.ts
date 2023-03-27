import { isInside, lettersToNumber, toCartesian, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import {
  AnchorZone,
  BorderCommand,
  ChartDefinition,
  ClipboardPasteOptions,
  CreateSheetCommand,
  DispatchResult,
  SortDirection,
  SortOptions,
  SplitTextIntoColumnsCommand,
  Style,
  UID,
  UpDown,
} from "../../src/types";
import { BarChartDefinition } from "../../src/types/chart/bar_chart";
import { GaugeChartDefinition } from "../../src/types/chart/gauge_chart";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import { PieChartDefinition } from "../../src/types/chart/pie_chart";
import { ScorecardChartDefinition } from "../../src/types/chart/scorecard_chart";
import { Image } from "../../src/types/image";
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

export function createImage(
  model: Model,
  partialParam: {
    sheetId?: UID;
    figureId?: UID;
    position?: { x: number; y: number };
    definition?: Partial<Image>;
  }
) {
  const param = {
    sheetId: model.getters.getActiveSheetId(),
    figureId: model.uuidGenerator.uuidv4(),
    position: { x: 0, y: 0 },
    ...partialParam,
    definition: {
      path: "image path",
      size: { width: 380, height: 380 },
      ...partialParam.definition,
    },
  };
  return model.dispatch("CREATE_IMAGE", {
    sheetId: param.sheetId,
    figureId: param.figureId,
    position: param.position,
    size: param.definition.size,
    definition: param.definition,
  });
}

/**
 * Create a new chart by default of type bar with titles
 * in the data sets, on the active sheet.
 */
export function createChart(
  model: Model,
  data: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>,
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
      background: data.background,
      verticalAxisPosition: ("verticalAxisPosition" in data && data.verticalAxisPosition) || "left",
      legendPosition: data.legendPosition || "top",
      stacked: ("stacked" in data && data.stacked) || false,
      labelsAsText: ("labelsAsText" in data && data.labelsAsText) || false,
      aggregated: ("aggregated" in data && data.aggregated) || false,
    },
  });
}

export function createScorecardChart(
  model: Model,
  data: Partial<ScorecardChartDefinition>,
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
      baselineMode: data.baselineMode || "difference",
      baselineColorDown: data.baselineColorDown || "#DC6965",
      baselineColorUp: data.baselineColorUp || "#00A04A",
      background: data.background,
    },
  });
}

export function createGaugeChart(
  model: Model,
  data: Partial<GaugeChartDefinition>,
  chartId?: UID,
  sheetId?: UID
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    id,
    sheetId,
    definition: {
      type: "gauge",
      background: data.background,
      title: data.title || "",
      dataRange: data.dataRange || "",
      sectionRule: data.sectionRule || {
        rangeMin: "0",
        rangeMax: "100",
        colors: {
          lowerColor: "#6aa84f",
          middleColor: "#f1c232",
          upperColor: "#cc0000",
        },
        lowerInflectionPoint: {
          type: "number",
          value: "33",
        },
        upperInflectionPoint: {
          type: "number",
          value: "66",
        },
      },
    },
  });
}

/**
 * Update a chart
 */
export function updateChart(
  model: Model,
  chartId: UID,
  definition: Partial<ChartDefinition>,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const def: ChartDefinition = {
    ...model.getters.getChartDefinition(chartId),
    ...definition,
  } as ChartDefinition;
  return model.dispatch("UPDATE_CHART", {
    id: chartId,
    sheetId,
    definition: def,
  });
}

/**
 * Copy a zone
 */
export function copy(model: Model, ...ranges: string[]): DispatchResult {
  if (ranges && ranges.length) {
    setSelection(model, ranges);
  }
  const result = model.dispatch("COPY");
  return result;
}

/**
 * Cut a zone
 */
export function cut(model: Model, ...ranges: string[]): DispatchResult {
  if (ranges && ranges.length) {
    setSelection(model, ranges);
  }
  const result = model.dispatch("CUT");
  return result;
}

/**
 * Paste on a zone
 */
export function paste(
  model: Model,
  range: string,
  pasteOption?: ClipboardPasteOptions
): DispatchResult {
  return model.dispatch("PASTE", { target: target(range), pasteOption });
}

/**
 * Paste from OS clipboard on a zone
 */
export function pasteFromOSClipboard(model: Model, range: string, content: string): DispatchResult {
  return model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: content, target: target(range) });
}

/**
 * Clean clipboard highlight selection.
 */
export function cleanClipBoardHighlight(model: Model): DispatchResult {
  return model.dispatch("CLEAN_CLIPBOARD_HIGHLIGHT");
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
 * Set the content of a cell
 */
export function setCellFormat(
  model: Model,
  xc: string,
  format: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_CELL", { col, row, sheetId, format });
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
  step: SelectionStep = 1
): DispatchResult {
  return model.selection.moveAnchorCell(direction, step);
}

export function resizeAnchorZone(
  model: Model,
  direction: SelectionDirection,
  step: SelectionStep = 1
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
    sortOptions = {},
  }: {
    zone: string;
    sheetId?: UID;
    anchor: string;
    direction: SortDirection;
    sortOptions?: SortOptions;
  }
) {
  const { col, row } = toCartesian(anchor);
  return model.dispatch("SORT_CELLS", {
    sheetId: sheetId || model.getters.getActiveSheetId(),
    zone: toZone(zone),
    col,
    row,
    sortDirection: direction,
    sortOptions,
  });
}

export function merge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId(),
  force: boolean = true
): DispatchResult {
  return model.dispatch("ADD_MERGE", {
    sheetId,
    target: target(range),
    force,
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
  delta: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("MOVE_SHEET", {
    sheetId,
    delta,
  });
}

export function hideSheet(model: Model, sheetId: UID) {
  return model.dispatch("HIDE_SHEET", { sheetId });
}

export function showSheet(model: Model, sheetId: UID) {
  return model.dispatch("SHOW_SHEET", { sheetId });
}

export function setViewportOffset(model: Model, offsetX: number, offsetY: number) {
  return model.dispatch("SET_VIEWPORT_OFFSET", {
    offsetX,
    offsetY,
  });
}

export function setStyle(
  model: Model,
  targetXc: string,
  style: Style,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("SET_FORMATTING", {
    sheetId: sheetId,
    target: target(targetXc),
    style: style,
  });
}

/**
 * Freeze a given number of rows on top of the sheet
 */
export function freezeRows(
  model: Model,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("FREEZE_ROWS", {
    sheetId,
    quantity,
  });
}

export function unfreezeRows(model: Model, sheetId: UID = model.getters.getActiveSheetId()) {
  return model.dispatch("UNFREEZE_ROWS", {
    sheetId,
  });
}

/**
 * Freeze a given number of columns on top of the sheet
 */
export function freezeColumns(
  model: Model,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("FREEZE_COLUMNS", {
    sheetId,
    quantity,
  });
}

export function unfreezeColumns(model: Model, sheetId: UID = model.getters.getActiveSheetId()) {
  return model.dispatch("UNFREEZE_COLUMNS", {
    sheetId,
  });
}

export function createFilter(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  model.selection.selectTableAroundSelection();
  return model.dispatch("CREATE_FILTER_TABLE", {
    sheetId,
    target: target(range),
  });
}

export function updateFilter(
  model: Model,
  xc: string,
  values: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_FILTER", { col, row, sheetId, values });
}

export function deleteFilter(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_FILTER_TABLE", { sheetId, target: target(range) });
}

export function setFormat(
  model: Model,
  format: string,
  target = model.getters.getSelectedZones(),
  sheetId = model.getters.getActiveSheetId()
) {
  model.dispatch("SET_FORMATTING", {
    sheetId,
    target,
    format,
  });
}

export function splitTextToColumns(
  model: Model,
  separator: string,
  target?: string,
  options: Partial<Omit<SplitTextIntoColumnsCommand, "type" | "separator">> = {}
) {
  if (target) {
    setSelection(model, [target]);
  }
  return model.dispatch("SPLIT_TEXT_INTO_COLUMNS", {
    separator,
    force: options.force || false,
    addNewColumns: options.addNewColumns || false,
  });
}
