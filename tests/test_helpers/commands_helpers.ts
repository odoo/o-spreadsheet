import { isInside, lettersToNumber, toCartesian, toZone } from "../../src/helpers/index";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { Model } from "../../src/model";
import {
  AnchorZone,
  Border,
  BorderData,
  ChartDefinition,
  ClipboardPasteOptions,
  CreateSheetCommand,
  DataValidationCriterion,
  Dimension,
  Direction,
  DispatchResult,
  Locale,
  SelectionStep,
  SortDirection,
  SortOptions,
  SplitTextIntoColumnsCommand,
  Style,
  UID,
} from "../../src/types";
import { BarChartDefinition } from "../../src/types/chart/bar_chart";
import { GaugeChartDefinition } from "../../src/types/chart/gauge_chart";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import { PieChartDefinition } from "../../src/types/chart/pie_chart";
import { ScatterChartDefinition } from "../../src/types/chart/scatter_chart";
import { ScorecardChartDefinition } from "../../src/types/chart/scorecard_chart";
import { Image } from "../../src/types/image";
import { TableConfig } from "../../src/types/table";
import { FigureSize } from "./../../src/types/figure";
import { target, toRangeData, toRangesData } from "./helpers";

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
    size?: FigureSize;
  }
) {
  const param = {
    sheetId: model.getters.getActiveSheetId(),
    figureId: model.uuidGenerator.uuidv4(),
    position: { x: 0, y: 0 },
    ...partialParam,
    definition: {
      path: "image path",
      mimetype: "image/jpeg",
      ...partialParam.definition,
    },
  };
  const size = partialParam.size ?? { width: 380, height: 380 };
  return model.dispatch("CREATE_IMAGE", {
    sheetId: param.sheetId,
    figureId: param.figureId,
    position: param.position,
    size,
    definition: { size, ...param.definition },
  });
}

/**
 * Create a new chart by default of type bar with titles
 * in the data sets, on the active sheet.
 */
export function createChart(
  model: Model,
  data: Partial<
    LineChartDefinition | BarChartDefinition | PieChartDefinition | ScatterChartDefinition
  >,
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
      cumulative: ("cumulative" in data && data.cumulative) || false,
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
export function pasteFromOSClipboard(
  model: Model,
  range: string,
  content: string,
  pasteOption?: ClipboardPasteOptions
): DispatchResult {
  return model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
    text: content,
    target: target(range),
    pasteOption,
  });
}

/**
 * Copy cells above a zone and paste on zone
 */
export function copyPasteAboveCells(model: Model): DispatchResult {
  const result = model.dispatch("COPY_PASTE_CELLS_ABOVE");
  return result;
}

/**
 * Copy cells to the left of a zone and paste on zone
 */
export function copyPasteCellsOnLeft(model: Model): DispatchResult {
  const result = model.dispatch("COPY_PASTE_CELLS_ON_LEFT");
  return result;
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

export function deleteHeaders(
  model: Model,
  dimension: Dimension,
  headers: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    dimension,
    elements: headers,
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

export function deleteContent(
  model: Model,
  ranges: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("DELETE_CONTENT", {
    sheetId,
    target: ranges.map(toZone),
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
export function setZoneBorders(model: Model, border: BorderData, xcs?: string[]) {
  const target = xcs ? xcs.map(toZone) : model.getters.getSelectedZones();
  model.dispatch("SET_ZONE_BORDERS", {
    sheetId: model.getters.getActiveSheetId(),
    target,
    border: {
      position: border.position,
      color: border.color,
      style: border.style,
    },
  });
}

export function setBorders(
  model: Model,
  xc: string,
  border?: Border,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.dispatch("SET_BORDER", {
    sheetId,
    col,
    row,
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
  return model.dispatch("CLEAR_CELL", { col, row, sheetId });
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
  direction: Direction,
  step: SelectionStep = 1
): DispatchResult {
  return model.selection.moveAnchorCell(direction, step);
}

export function resizeAnchorZone(
  model: Model,
  direction: Direction,
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
export function changeCFPriority(
  model: Model,
  cfId: UID,
  delta: number,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("CHANGE_CONDITIONAL_FORMAT_PRIORITY", { cfId, delta, sheetId });
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

export function selectHeader(
  model: Model,
  dimension: Dimension,
  index: number,
  mode: "overrideSelection" | "updateAnchor" | "newAnchor"
) {
  if (dimension === "ROW") {
    return model.selection.selectRow(index, mode);
  } else {
    return model.selection.selectColumn(index, mode);
  }
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
  position: "before" | "after" = "before",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("MOVE_COLUMNS_ROWS", {
    sheetId,
    base: lettersToNumber(target),
    dimension: "COL",
    elements: columns.map(lettersToNumber),
    position,
  });
}

export function moveRows(
  model: Model,
  target: number,
  rows: number[],
  position: "before" | "after" = "before",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("MOVE_COLUMNS_ROWS", {
    sheetId,
    base: target,
    dimension: "ROW",
    elements: rows,
    position,
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

export function createTable(
  model: Model,
  range: string,
  config?: Partial<TableConfig>,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  model.selection.selectTableAroundSelection();
  return model.dispatch("CREATE_TABLE", {
    sheetId,
    ranges: toRangesData(sheetId, range),
    config: { ...DEFAULT_TABLE_CONFIG, ...config },
  });
}

export function updateTableConfig(
  model: Model,
  range: string,
  config: Partial<TableConfig>,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const zone = toZone(range);
  const table = model.getters.getTable({ sheetId, col: zone.left, row: zone.top });
  if (!table) {
    throw new Error(`No table found at ${range}`);
  }
  return model.dispatch("UPDATE_TABLE", {
    sheetId,
    zone: table.range.zone,
    config,
  });
}

export function updateTableZone(
  model: Model,
  range: string,
  newZone: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const zone = toZone(range);
  const table = model.getters.getTable({ sheetId, col: zone.left, row: zone.top });
  if (!table) {
    throw new Error(`No table found at ${range}`);
  }
  return model.dispatch("UPDATE_TABLE", {
    sheetId,
    zone: table.range.zone,
    newTableRange: toRangeData(sheetId, newZone),
  });
}

export function updateFilter(
  model: Model,
  xc: string,
  hiddenValues: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_FILTER", { col, row, sheetId, hiddenValues });
}

export function deleteTable(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_TABLE", { sheetId, target: target(range) });
}

export function setFormat(
  model: Model,
  targetXc: string,
  format: string,
  sheetId = model.getters.getActiveSheetId()
) {
  return model.dispatch("SET_FORMATTING", {
    sheetId,
    target: target(targetXc),
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

export function updateLocale(model: Model, locale: Locale) {
  return model.dispatch("UPDATE_LOCALE", { locale });
}

/**
 * Group the given columns. The groupId isn't part of the command, but we'll use jest to mock the uuid generator to
 * return the given groupId, to make the writing of the tests easier.
 */
export function groupColumns(
  model: Model,
  start: string,
  end: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return groupHeaders(model, "COL", lettersToNumber(start), lettersToNumber(end), sheetId);
}

/**
 * Group the given rows. The groupId isn't part of the command, but we'll use jest to mock the uuid generator to
 * return the given groupId, to make the writing of the tests easier.
 */
export function groupRows(
  model: Model,
  start: number,
  end: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return groupHeaders(model, "ROW", start, end, sheetId);
}

/**
 * Group the given headers. The groupId isn't part of the command, but we'll use jest to mock the uuid generator to
 * return the given groupId, to make the writing of the tests easier.
 */
export function groupHeaders(
  model: Model,
  dimension: "ROW" | "COL",
  start: number,
  end: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("GROUP_HEADERS", { sheetId, dimension, start, end });
}

export function ungroupHeaders(
  model: Model,
  dimension: "ROW" | "COL",
  start: number,
  end: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("UNGROUP_HEADERS", { sheetId, dimension, start, end });
}

export function duplicateSheet(
  model: Model,
  sheetId: UID = model.getters.getActiveSheetId(),
  sheetIdTo: UID = model.uuidGenerator.uuidv4()
) {
  return model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo });
}

export function unfoldHeaderGroup(
  model: Model,
  dimension: Dimension,
  start: number,
  end: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("UNFOLD_HEADER_GROUP", { dimension, sheetId, start, end });
}

export function foldHeaderGroup(
  model: Model,
  dimension: Dimension,
  start: number,
  end: number,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("FOLD_HEADER_GROUP", { dimension, sheetId, start, end });
}

export function unfoldAllHeaderGroups(
  model: Model,
  dimension: Dimension,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
}

export function foldAllHeaderGroups(
  model: Model,
  dimension: Dimension,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
}

export function foldHeaderGroupsInZone(
  model: Model,
  dimension: Dimension,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("FOLD_HEADER_GROUPS_IN_ZONE", {
    dimension,
    zone: toZone(xc),
    sheetId,
  });
}

export function unfoldHeaderGroupsInZone(
  model: Model,
  dimension: Dimension,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", {
    dimension,
    zone: toZone(xc),
    sheetId,
  });
}

export function addDataValidation(
  model: Model,
  xcs: string,
  id: UID,
  criterion: DataValidationCriterion = { type: "textContains", values: ["test"] },
  isBlocking: "blocking" | "warning" = "warning",
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const ranges = toRangesData(sheetId, xcs);
  return model.dispatch("ADD_DATA_VALIDATION_RULE", {
    sheetId,
    ranges,
    rule: { id, criterion, isBlocking: isBlocking === "blocking" },
  });
}

export function removeDataValidation(
  model: Model,
  id: UID,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id });
}
