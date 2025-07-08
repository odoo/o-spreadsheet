import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import {
  colorToNumber,
  isInside,
  lettersToNumber,
  toCartesian,
  toZone,
} from "../../src/helpers/index";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { Model } from "../../src/model";
import {
  AnchorZone,
  Border,
  BorderData,
  Carousel,
  ChartDefinition,
  ChartWithDataSetDefinition,
  ClipboardPasteOptions,
  Color,
  CreateFigureCommand,
  CreateSheetCommand,
  CreateTableStyleCommand,
  DataValidationCriterion,
  Dimension,
  Direction,
  DispatchResult,
  HeaderIndex,
  Locale,
  ParsedOsClipboardContentWithImageData,
  Pixel,
  PixelPosition,
  SelectionStep,
  SortDirection,
  SortOptions,
  SplitTextIntoColumnsCommand,
  Style,
  UID,
} from "../../src/types";
import { createEqualCF, target, toRangeData, toRangesData } from "./helpers";

import { ICON_SETS } from "../../src/components/icons/icons";
import { SunburstChartDefinition } from "../../src/types/chart";
import { CalendarChartDefinition } from "../../src/types/chart/calendar_chart";
import { ComboChartDefinition } from "../../src/types/chart/combo_chart";
import { FunnelChartDefinition } from "../../src/types/chart/funnel_chart";
import { GaugeChartDefinition } from "../../src/types/chart/gauge_chart";
import { GeoChartDefinition } from "../../src/types/chart/geo_chart";
import { RadarChartDefinition } from "../../src/types/chart/radar_chart";
import { ScorecardChartDefinition } from "../../src/types/chart/scorecard_chart";
import { TreeMapChartDefinition } from "../../src/types/chart/tree_map_chart";
import { WaterfallChartDefinition } from "../../src/types/chart/waterfall_chart";
import { Image } from "../../src/types/image";
import { CoreTableType, CriterionFilter, TableConfig } from "../../src/types/table";
import { CarouselItem, FigureSize } from "./../../src/types/figure";

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
  data: Partial<CreateSheetCommand & { activate: boolean; hidden: boolean; color: Color }>
) {
  const sheetId = data.sheetId || model.uuidGenerator.uuidv4();
  const result = model.dispatch("CREATE_SHEET", {
    position: data.position !== undefined ? data.position : 1,
    sheetId,
    cols: data.cols,
    rows: data.rows,
    name: data.name ?? model.getters.getNextSheetName(),
  });
  if (data.hidden) {
    hideSheet(model, sheetId);
  }
  if (data.activate) {
    activateSheet(model, sheetId);
  }
  if (data.color) {
    colorSheet(model, sheetId, data.color);
  }
  return result;
}

export function renameSheet(model: Model, sheetId: UID, newName: string): DispatchResult {
  const oldName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("RENAME_SHEET", { sheetId, newName, oldName });
}

export function colorSheet(model: Model, sheetId: UID, color: Color | undefined): DispatchResult {
  return model.dispatch("COLOR_SHEET", { sheetId, color });
}

export function createSheetWithName(
  model: Model,
  data: Partial<CreateSheetCommand & { activate: boolean }>,
  name: string
): DispatchResult {
  return createSheet(model, { ...data, name });
}

export function deleteSheet(model: Model, sheetId: UID): DispatchResult {
  const sheetName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("DELETE_SHEET", {
    sheetId,
    sheetName,
  });
}

export function createFigure(
  model: Model,
  partialParam: {
    sheetId?: UID;
    figureId?: UID;
    id?: UID;
    offset?: PixelPosition;
    col?: HeaderIndex;
    row?: HeaderIndex;
    size?: FigureSize;
    width?: Pixel;
    height?: Pixel;
    tag?: string;
  }
) {
  const param = {
    sheetId: model.getters.getActiveSheetId(),
    figureId: partialParam.id ?? model.uuidGenerator.uuidv4(),
    offset: { x: 0, y: 0 },
    col: 0,
    row: 0,
    size: { width: partialParam.width ?? 380, height: partialParam.height ?? 380 },
    tag: "text",
    ...partialParam,
  };
  return model.dispatch("CREATE_FIGURE", {
    sheetId: param.sheetId,
    figureId: param.figureId,
    col: param.col,
    row: param.row,
    offset: param.offset,
    size: param.size,
    tag: param.tag,
  });
}

export function createImage(
  model: Model,
  partialParam: {
    sheetId?: UID;
    figureId?: UID;
    offset?: PixelPosition;
    col?: HeaderIndex;
    row?: HeaderIndex;
    definition?: Partial<Image>;
    size?: FigureSize;
  }
) {
  const param = {
    sheetId: model.getters.getActiveSheetId(),
    figureId: model.uuidGenerator.uuidv4(),
    offset: { x: 0, y: 0 },
    col: 0,
    row: 0,
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
    col: param.col,
    row: param.row,
    offset: param.offset,
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
  data: { type: ChartDefinition["type"] } & Partial<ChartWithDataSetDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();
  const definition = {
    ...data,
    title: data.title || { text: "test" },
    dataSets: ("dataSets" in data && data.dataSets) || [],
    dataSetsHaveTitle:
      "dataSetsHaveTitle" in data && data.dataSetsHaveTitle !== undefined
        ? data.dataSetsHaveTitle
        : true,
    labelRange: "labelRange" in data ? data.labelRange : undefined,
    verticalAxisPosition: ("verticalAxisPosition" in data && data.verticalAxisPosition) || "left",
    background: data.background,
    legendPosition: ("legendPosition" in data && data.legendPosition) || "top",
    stacked: ("stacked" in data && data.stacked) || false,
    labelsAsText: ("labelsAsText" in data && data.labelsAsText) || false,
    aggregated: ("aggregated" in data && data.aggregated) || false,
    cumulative: ("cumulative" in data && data.cumulative) || false,
    showSubTotals: ("showSubTotals" in data && data.showSubTotals) || false,
    showConnectorLines: ("showConnectorLines" in data && data.showConnectorLines) || false,
  };
  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition,
  });
}

export function createComboChart(
  model: Model,
  data: Partial<ComboChartDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      title: data.title || { text: "test" },
      dataSets: data.dataSets || [],
      dataSetsHaveTitle: data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true,
      labelRange: data.labelRange,
      type: "combo",
      background: data.background,
      legendPosition: data.legendPosition || "top",
      aggregated: ("aggregated" in data && data.aggregated) || false,
      humanize: data.humanize || false,
    },
  });
}

export function createRadarChart(
  model: Model,
  data: Partial<RadarChartDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      title: data.title || { text: "test" },
      dataSets: data.dataSets || [],
      dataSetsHaveTitle: data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true,
      labelRange: data.labelRange,
      type: "radar",
      background: data.background,
      legendPosition: data.legendPosition || "top",
      aggregated: ("aggregated" in data && data.aggregated) || false,
      fillArea: data.fillArea || false,
      stacked: data.stacked || false,
      humanize: data.humanize || false,
    },
  });
}

export function createCalendarChart(
  model: Model,
  data: Partial<CalendarChartDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId: sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      title: data.title || { text: "test" },
      dataSets: data.dataSets ?? [],
      dataSetsHaveTitle: data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true,
      labelRange: data.labelRange,
      type: "calendar",
      background: data.background,
      horizontalGroupBy: data.horizontalGroupBy,
      verticalGroupBy: data.verticalGroupBy,
      legendPosition: data.legendPosition || "top",
      colorScale: data.colorScale || "rainbow",
    },
  });
}

export function createWaterfallChart(model: Model, def?: Partial<WaterfallChartDefinition>): UID {
  createChart(model, { ...def, type: "waterfall" });
  const sheetId = model.getters.getActiveSheetId();
  return model.getters.getChartIds(sheetId)[0];
}

export function createFunnelChart(model: Model, def?: Partial<FunnelChartDefinition>): UID {
  createChart(model, { ...def, type: "funnel" });
  const sheetId = model.getters.getActiveSheetId();
  return model.getters.getChartIds(sheetId)[0];
}

export function createSunburstChart(model: Model, def?: Partial<SunburstChartDefinition>): UID {
  createChart(model, { ...def, type: "sunburst" });
  return model.getters.getChartIds(model.getters.getActiveSheetId())[0];
}

export function createTreeMapChart(model: Model, def?: Partial<TreeMapChartDefinition>): UID {
  createChart(model, { ...def, type: "treemap" });
  const sheetId = model.getters.getActiveSheetId();
  return model.getters.getChartIds(sheetId)[0];
}

export function createScorecardChart(
  model: Model,
  data: Partial<ScorecardChartDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      type: "scorecard",
      title: data.title || { text: "" },
      baseline: data.baseline || "",
      keyValue: data.keyValue || "",
      baselineDescr: data.baselineDescr,
      keyDescr: data.keyDescr,
      baselineMode: data.baselineMode || "difference",
      baselineColorDown: data.baselineColorDown || DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baselineColorUp: data.baselineColorUp || DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      background: data.background,
      humanize: data.humanize || false,
    },
  });
}

export function createGaugeChart(
  model: Model,
  data: Partial<GaugeChartDefinition>,
  chartId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();
  sheetId = sheetId || model.getters.getActiveSheetId();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      type: "gauge",
      background: data.background,
      title: data.title || { text: "" },
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
          operator: "<=",
        },
        upperInflectionPoint: {
          type: "number",
          value: "66",
          operator: "<=",
        },
      },
      humanize: data.humanize || false,
    },
  });
}

export function createGeoChart(
  model: Model,
  data: Partial<GeoChartDefinition>,
  chartId: UID = "chartId",
  sheetId: UID = model.getters.getActiveSheetId(),
  figureData: Partial<CreateFigureCommand> = {}
) {
  const id = chartId || model.uuidGenerator.uuidv4();

  return model.dispatch("CREATE_CHART", {
    figureId: figureData.figureId || model.uuidGenerator.smallUuid(),
    chartId: id,
    sheetId,
    col: 0,
    row: 0,
    size: { width: 536, height: 335 },
    offset: { x: 0, y: 0 },
    ...figureData,
    definition: {
      title: data.title || { text: "test" },
      dataSets: data.dataSets || [],
      dataSetsHaveTitle: data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true,
      labelRange: data.labelRange,
      type: "geo",
      background: data.background,
      legendPosition: data.legendPosition || "top",
      colorScale: data.colorScale,
      missingValueColor: data.missingValueColor,
      region: data.region,
      humanize: data.humanize || false,
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
    figureId: model.getters.getFigureIdFromChartId(chartId),
    chartId,
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
  return model.dispatch("COPY");
}

/**
 * Cut a zone
 */
export function cut(model: Model, ...ranges: string[]): DispatchResult {
  if (ranges && ranges.length) {
    setSelection(model, ranges);
  }
  return model.dispatch("CUT");
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
  content: ParsedOsClipboardContentWithImageData,
  pasteOption?: ClipboardPasteOptions
): DispatchResult {
  return model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
    clipboardContent: content,
    target: target(range),
    pasteOption,
  });
}

/**
 * Copy cells above a zone and paste on zone
 */
export function copyPasteAboveCells(model: Model): DispatchResult {
  return model.dispatch("COPY_PASTE_CELLS_ABOVE");
}

/**
 * Copy cells to the left of a zone and paste on zone
 */
export function copyPasteCellsOnLeft(model: Model): DispatchResult {
  return model.dispatch("COPY_PASTE_CELLS_ON_LEFT");
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
  const sheetName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    position,
    base: lettersToNumber(column),
    quantity,
    sheetName,
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
  const sheetName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: columns.map(lettersToNumber),
    sheetName,
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
  const sheetName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("ADD_COLUMNS_ROWS", {
    dimension: "ROW",
    sheetId,
    position,
    base: row,
    quantity,
    sheetName,
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
  const sheetName = model.getters.tryGetSheet(sheetId)?.name ?? "SheetName";
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    elements: rows,
    dimension: "ROW",
    sheetName,
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
    sheetName: model.getters.getSheetName(sheetId),
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
      color: border.color ?? "#000000",
      style: border.style ?? "thin",
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

export function setBordersOnTarget(
  model: Model,
  xcs: string[],
  border?: Border,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("SET_BORDERS_ON_TARGET", {
    sheetId,
    target: xcs.map(toZone),
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
 * Clear cells in zones
 */
export function clearCells(
  model: Model,
  xcs: string[],
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("CLEAR_CELLS", { target: xcs.map(toZone), sheetId });
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
    unbounded?: boolean;
  } = { anchor: undefined, strict: false }
) {
  const sheetId = model.getters.getActiveSheetId();
  const zones = xcs
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
    model.selection.selectZone(
      { cell: { col: z1.left, row: z1.top }, zone: z1 },
      { unbounded: options.unbounded }
    );
    for (const zone of zones) {
      model.selection.addCellToSelection(zone.left, zone.top);
      model.selection.setAnchorCorner(zone.right, zone.bottom);
    }
    model.selection.addCellToSelection(anchor.zone.left, anchor.zone.top);
    model.selection.setAnchorCorner(anchor.zone.right, anchor.zone.bottom);
  } else {
    model.selection.selectZone(anchor, { scrollIntoView: true, unbounded: options.unbounded });
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
    sheetName: model.getters.getSheetName(sheetId),
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
    sheetName: model.getters.getSheetName(sheetId),
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
  tableType: CoreTableType = "static",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  model.selection.selectTableAroundSelection();
  return model.dispatch("CREATE_TABLE", {
    sheetId,
    ranges: toRangesData(sheetId, range),
    config: { ...DEFAULT_TABLE_CONFIG, ...config },
    tableType,
  });
}

export function createDynamicTable(
  model: Model,
  range: string,
  config?: Partial<TableConfig>,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return createTable(model, range, config, "dynamic", sheetId);
}

export function createTableWithFilter(
  model: Model,
  range: string,
  config?: Partial<TableConfig>,
  tableType: CoreTableType = "static",
  sheetId: UID = model.getters.getActiveSheetId()
) {
  return createTable(model, range, { hasFilters: true, ...config }, tableType, sheetId);
}

export function updateTableConfig(
  model: Model,
  range: string,
  config: Partial<TableConfig>,
  tableType?: CoreTableType,
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
    tableType,
  });
}

export function updateTableZone(
  model: Model,
  range: string,
  newZone: string,
  tableType?: CoreTableType,
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
    tableType,
  });
}

export function resizeTable(
  model: Model,
  range: string,
  newZone: string,
  tableType?: CoreTableType,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const zone = toZone(range);
  const table = model.getters.getTable({ sheetId, col: zone.left, row: zone.top });
  if (!table) {
    throw new Error(`No table found at ${range}`);
  }
  return model.dispatch("RESIZE_TABLE", {
    sheetId,
    zone: table.range.zone,
    newTableRange: toRangeData(sheetId, newZone),
    tableType,
  });
}

export function updateFilter(
  model: Model,
  xc: string,
  hiddenValues: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_FILTER", {
    col,
    row,
    sheetId,
    value: {
      filterType: "values",
      hiddenValues,
    },
  });
}

export function updateFilterCriterion(
  model: Model,
  xc: string,
  criterion: Omit<CriterionFilter, "filterType">,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  const { col, row } = toCartesian(xc);
  return model.dispatch("UPDATE_FILTER", {
    col,
    row,
    sheetId,
    value: {
      filterType: "criterion",
      ...criterion,
    },
  });
}

export function deleteTable(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("REMOVE_TABLE", { sheetId, target: target(range) });
}

export function createTableStyle(
  model: Model,
  tableStyleId: string,
  style?: Partial<Omit<CreateTableStyleCommand, "type" | "styleId">>
): DispatchResult {
  return model.dispatch("CREATE_TABLE_STYLE", {
    tableStyleId,
    primaryColor: style?.primaryColor || "#FF0000",
    templateName: style?.templateName || "mediumBandedBorders",
    tableStyleName: style?.tableStyleName || tableStyleId,
  });
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
  return model.dispatch("DUPLICATE_SHEET", {
    sheetId,
    sheetIdTo,
    sheetNameTo: model.getters.getDuplicateSheetName(model.getters.getSheetName(sheetId)),
  });
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
  criterion: DataValidationCriterion = { type: "containsText", values: ["test"] },
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

export function insertPivot(
  model: Model,
  xc: string,
  pivotId: UID = "1",
  newSheetId: UID = "newSheet1"
) {
  setSelection(model, [xc]);
  return model.dispatch("INSERT_NEW_PIVOT", { pivotId, newSheetId });
}

export function setSheetviewSize(model: Model, height: Pixel, width: Pixel, hasHeaders = true) {
  return model.dispatch("RESIZE_SHEETVIEW", {
    height,
    width,
    gridOffsetX: hasHeaders ? HEADER_WIDTH : 0,
    gridOffsetY: hasHeaders ? HEADER_HEIGHT : 0,
  });
}

export function addEqualCf(
  model: Model,
  xc: string,
  style: Style,
  value: string,
  cfId: UID = "cfId",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_CONDITIONAL_FORMAT", {
    cf: createEqualCF(value, style, cfId),
    sheetId,
    ranges: toRangesData(sheetId, xc),
  });
}

export function addIconCF(
  model: Model,
  xc: string,
  inflectionPoints: string[],
  iconSet: keyof typeof ICON_SETS,
  cfId: UID = "cfId",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_CONDITIONAL_FORMAT", {
    cf: {
      id: cfId,
      rule: {
        type: "IconSetRule",
        lowerInflectionPoint: { type: "number", value: inflectionPoints[0], operator: "ge" },
        upperInflectionPoint: { type: "number", value: inflectionPoints[1], operator: "ge" },
        icons: {
          upper: ICON_SETS[iconSet].good,
          middle: ICON_SETS[iconSet].neutral,
          lower: ICON_SETS[iconSet].bad,
        },
      },
    },
    ranges: toRangesData(sheetId, xc),
    sheetId,
  });
}

export function addDataBarCF(
  model: Model,
  xc: string,
  color: string,
  cfId: UID = "cfId",
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_CONDITIONAL_FORMAT", {
    cf: {
      id: cfId,
      rule: {
        type: "DataBarRule",
        color: colorToNumber(color),
      },
    },
    ranges: toRangesData(sheetId, xc),
    sheetId,
  });
}

export function createCarousel(
  model: Model,
  data: Carousel = { items: [] },
  carouselId?: UID,
  sheetId?: UID,
  figureData: Partial<CreateFigureCommand> = {}
) {
  return model.dispatch("CREATE_CAROUSEL", {
    figureId: carouselId || model.uuidGenerator.smallUuid(),
    sheetId: sheetId || model.getters.getActiveSheetId(),
    col: 0,
    row: 0,
    definition: data,
    size: { width: 100, height: 100 },
    offset: { x: 0, y: 0 },
    ...figureData,
  });
}

export function updateCarousel(
  model: Model,
  carouselId: UID,
  data: Partial<Carousel>,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("UPDATE_CAROUSEL", {
    figureId: carouselId,
    sheetId,
    definition: {
      ...model.getters.getCarousel(carouselId),
      ...data,
    },
  });
}

export function addChartFigureToCarousel(
  model: Model,
  carouselId: UID,
  chartFigureId: UID,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("ADD_FIGURE_CHART_TO_CAROUSEL", {
    carouselFigureId: carouselId,
    chartFigureId,
    sheetId,
  });
}

export function popOutChartFromCarousel(
  model: Model,
  sheetId: UID,
  carouselId: UID,
  chartId: UID
): DispatchResult {
  return model.dispatch("POPOUT_CHART_FROM_CAROUSEL", { carouselId, chartId, sheetId });
}

export function addNewChartToCarousel(
  model: Model,
  carouselId: UID,
  definition?: Partial<ChartDefinition>
): UID {
  model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
    figureId: carouselId,
    sheetId: model.getters.getActiveSheetId(),
  });
  const chartId = model.getters.getCarousel(carouselId).items.at(-1)!["chartId"];
  if (definition) {
    updateChart(model, chartId, definition);
  }
  return chartId;
}

export function selectCarouselItem(
  model: Model,
  carouselId: UID,
  item: CarouselItem,
  sheetId: UID = model.getters.getActiveSheetId()
): DispatchResult {
  return model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
    figureId: carouselId,
    item,
    sheetId,
  });
}
