import { ChartDataset } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { toNumber } from "../../../functions/helpers";
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
import {
  AbstractChartAxesDesign,
  AbstractChartTitle,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "../../../types/chart/scatter_chart";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { formatValue } from "../../format";
import { isNumber } from "../../numbers";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkAxesDesign,
  checkChartTitle,
  checkDataset,
  checkLabelRange,
  copyAxesDesignWithNewSheetId,
  copyChartTitleReferenceWithNewSheetId,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  getAxesDesignWithRangeString,
  getAxesDesignWithValidRanges,
  getChartTitleWithRangeString,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { createLineOrScatterChartRuntime } from "./chart_common_line_scatter";

export class ScatterChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly aggregated?: boolean;
  readonly type = "scatter";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AbstractChartAxesDesign;

  constructor(definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = getAxesDesignWithValidRanges(getters, sheetId, definition.axesDesign);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      checkDataset,
      checkLabelRange,
      checkChartTitle,
      checkAxesDesign
    );
  }

  static transformDefinition(
    definition: ScatterChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScatterChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { type: "string", text: "" },
      type: "scatter",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
    };
  }

  getDefinition(): ScatterChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign
    );
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    title: AbstractChartTitle,
    axesDesign?: AbstractChartAxesDesign,
    targetSheetId?: UID
  ): ScatterChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "scatter",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: getChartTitleWithRangeString(this.getters, targetSheetId || this.sheetId, title),
      labelsAsText: this.labelsAsText,
      aggregated: this.aggregated,
      axesDesign: getAxesDesignWithRangeString(
        this.getters,
        targetSheetId || this.sheetId,
        axesDesign
      ),
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [];
    for (const [i, dataSet] of this.dataSets.entries()) {
      range.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, this.sheetId),
      });
    }
    return {
      ...this,
      title: getChartTitleWithRangeString(this.getters, this.sheetId, this.title),
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
      axesDesign: getAxesDesignWithRangeString(this.getters, this.sheetId, this.axesDesign),
    };
  }

  updateRanges(applyChange: ApplyRangeChange): ScatterChart {
    const { dataSets, labelRange, title, axesDesign, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.title,
      this.axesDesign,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
      labelRange,
      title,
      axesDesign
    );
    return new ScatterChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) {
      return undefined;
    }
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "");
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    const definition = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  copyForSheetId(sheetId: UID): ScatterChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const chartTitle = copyChartTitleReferenceWithNewSheetId(this.sheetId, sheetId, this.title);
    const axesDesign = copyAxesDesignWithNewSheetId(this.sheetId, sheetId, this.axesDesign);
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
      labelRange,
      chartTitle,
      axesDesign,
      sheetId
    );
    return new ScatterChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign,
      sheetId
    );
    return new ScatterChart(definition, sheetId, this.getters);
  }
}

export function createScatterChartRuntime(
  chart: ScatterChart,
  getters: Getters
): ScatterChartRuntime {
  const { chartJsConfig, background, dataSetsValues, dataSetFormat, labelValues, labelFormat } =
    createLineOrScatterChartRuntime(chart, getters);
  // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
  // have less options than the line chart (it only works with linear labels)
  chartJsConfig.type = "line";

  const configOptions = chartJsConfig.options!;
  const locale = getters.getLocale();

  configOptions.plugins!.tooltip!.callbacks!.title = () => "";
  configOptions.plugins!.tooltip!.callbacks!.label = (tooltipItem) => {
    const dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!];
    let label: string | number = tooltipItem.label || labelValues.values[tooltipItem.dataIndex!];
    if (isNumber(label, locale)) {
      label = toNumber(label, locale);
    }
    const formattedX = formatValue(label, { locale, format: labelFormat });
    const formattedY = formatValue(dataSetPoint, { locale, format: dataSetFormat });
    const dataSetTitle = tooltipItem.dataset.label;
    return formattedX
      ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
      : `${dataSetTitle}: ${formattedY}`;
  };

  for (const dataSet of chartJsConfig.data!.datasets!) {
    (dataSet as ChartDataset<"line">).showLine = false;
  }

  return { chartJsConfig, background };
}
