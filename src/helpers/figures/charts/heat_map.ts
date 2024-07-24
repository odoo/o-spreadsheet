import { DEFAULT_CHART_PADDING } from "../../../constants";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import { ChartCreationContext, DataSet } from "../../../types/chart/chart";
import { HeatMapDefinition, HeatMapRuntime } from "../../../types/chart/heat_map";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { clipTextWithEllipsis, getDefaultContextFont } from "../../text_helper";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { getChartDatasetValues, getChartLabelValues } from "./chart_ui_common";
import { HeatMapConfig } from "./heat_map_config_builder";

export class HeatMap extends AbstractChart {
  readonly background?: Color;
  readonly dataSets: DataSet[];
  readonly type = "heatmap";
  readonly labelRange?: Range | undefined;
  readonly dataSetsHaveTitle: boolean;

  constructor(definition: HeatMapDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.background = definition.background;
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
  }

  static transformDefinition(
    definition: HeatMapDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): HeatMapDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: HeatMapDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): HeatMapDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      title: context.title || { text: "" },
      type: "heatmap",
      labelRange: context.auxiliaryRange || undefined,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range = this.dataSets.map((ds) => ({
      dataRange: this.getters.getRangeString(ds.dataRange, this.sheetId),
    }));
    return {
      ...this,
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  copyForSheetId(sheetId: UID): HeatMap {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new HeatMap(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): HeatMap {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new HeatMap(definition, sheetId, this.getters);
  }

  getDefinition(): HeatMapDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): HeatMapDefinition {
    const ranges = dataSets.map((ds) => ({
      dataRange: this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId),
    }));
    return {
      type: "heatmap",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): HeatMap {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new HeatMap(definition, this.sheetId, this.getters);
  }
}

export function drawHeatMap(structure: HeatMapConfig, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = structure.canvas.width;
  const availableWidth = canvas.width - DEFAULT_CHART_PADDING;
  canvas.height = structure.canvas.height;

  ctx.fillStyle = structure.canvas.backgroundColor;
  ctx.fillRect(0, 0, structure.canvas.width, structure.canvas.height);
  const baseline = ctx.textBaseline;

  if (structure.title) {
    ctx.font = structure.title.style.font;
    ctx.fillStyle = structure.title.style.color;
    ctx.textBaseline = "middle";
    ctx.fillText(
      clipTextWithEllipsis(ctx, structure.title.text, availableWidth - structure.title.position.x),
      structure.title.position.x,
      structure.title.position.y
    );
  }
  const grid = structure.grid;
  if (grid) {
    ctx.strokeRect(grid.x, grid.y, grid.width, grid.height);
  }

  for (const element of structure.elements ?? []) {
    ctx.fillStyle = element.color;
    ctx.fillRect(element.x, element.y, element.width, element.height);
    ctx.strokeRect(element.x, element.y, element.width, element.height);
  }

  ctx.font = getDefaultContextFont(12);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  for (const label of structure.xLabels ?? []) {
    ctx.fillText(label.value, label.x, label.y);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const label of structure.yLabels ?? []) {
    ctx.fillText(label.value, label.x, label.y);
  }
  ctx.textBaseline = baseline;
}

export function createHeatMapRuntime(chart: HeatMap, getters: Getters): HeatMapRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  const labels = labelValues.formattedValues;
  const dataSets = getChartDatasetValues(getters, chart.dataSets);

  return {
    title: {
      ...chart.title,
      // chart titles are extracted from .json files and they are translated at runtime here
      text: _t(chart.title.text ?? ""),
    },
    fontColor: chartFontColor(chart.background),
    background: chart.background ?? "#ffffff",
    labels,
    dataSets,
    colorMap: "inferno",
  };
}
