import { ChartConfiguration, TooltipItem } from "chart.js";
import { BACKGROUND_CHART_COLOR, GRAY_300 } from "../../../constants";
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
import { LegendPosition } from "../../../types/chart";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import {
  GeoChartColorScale,
  GeoChartDefinition,
  GeoChartRuntime,
} from "../../../types/chart/geo_chart";
import { Validator } from "../../../types/validator";
import { getColorScale } from "../../color";
import { formatValue } from "../../format/format";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  formatTickValue,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import {
  aggregateDataForLabels,
  getChartDatasetFormat,
  getChartDatasetValues,
  getChartLabelValues,
  getDefaultChartJsRuntime,
} from "./chart_ui_common";
import { WORLD_TOPOJSON } from "./geo_chart_topojson";

// ADRM TODO: test always aggregated
// ADRM TODO: test single dataset
// ADRM TODO: test no values/no label/wrong country name point are filtered
// ADRM TODO: test format
// ADRM TODO: tooltip & test

export class GeoChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "geo";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly colorScale?: GeoChartColorScale;

  constructor(definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.colorScale = definition.colorScale;
  }

  static transformDefinition(
    definition: GeoChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): GeoChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: GeoChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GeoChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated,
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
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  copyForSheetId(sheetId: UID): GeoChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new GeoChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GeoChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new GeoChart(definition, sheetId, this.getters);
  }

  getDefinition(): GeoChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): GeoChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "geo",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      colorScale: this.colorScale,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): GeoChart {
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
    return new GeoChart(definition, this.sheetId, this.getters);
  }
}

export function createGeoChartRuntime(chart: GeoChart, getters: Getters): GeoChartRuntime {
  // ADRM TODO DISCUSS: dev dependency: no typing unless explicitely imported (probably can be solved?)
  // but then using it is wrong ?
  const us = WORLD_TOPOJSON as any;

  // const nation = (topojson.feature(us, us.objects.nation) as any).features[0];
  const states = (window.ChartGeo.topojson.feature(us, us.objects.countries) as any).features;

  // const f1 = states.find((d) => d.properties.name === "United Kingdom");
  // const f2 = states.find((d) => d.properties.name === "Brazil");
  // console.log(f1, f2);

  const geoLegendPosition = legendPositionToGeoLegendPosition(chart.legendPosition);

  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  if (chart.dataSetsHaveTitle) {
    labels.shift();
  }
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));

  const dataset: any = {
    // ADRM TODO
    outline: states,
    showOutline: true,
    data: [],
  };
  const filteredLabels: string[] = [];
  for (let i = 0; i < dataSetsValues[0].data.length; i++) {
    if (!labels[i] || dataSetsValues[0].data[i] === undefined) {
      continue;
    }
    const feature = states.find((d) => d.properties.name === labels[i]);
    if (feature) {
      dataset.data.push({
        value: dataSetsValues[0].data[i],
        feature,
      });
      filteredLabels.push(labels[i]);
    }
  }
  console.log(filteredLabels, dataset.data);
  const locale = getters.getLocale();
  const format = getChartDatasetFormat(getters, chart.dataSets);
  const localeFormat = { locale, format };

  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(
    chart,
    filteredLabels,
    fontColor,
    localeFormat
  ) as ChartConfiguration<"choropleth">;

  config.type = "choropleth";
  config.data.datasets = [dataset];
  config.options!.scales = {
    projection: {
      projection: "equalEarth" as const,
      axis: "x" as const,
    },
    color: {
      axis: "x",
      display: chart.legendPosition !== "none",
      border: { color: GRAY_300 },
      grid: { color: GRAY_300 },
      ticks: {
        color: fontColor,
        callback: formatTickValue(localeFormat),
      },
      legend: {
        position: geoLegendPosition,
        align: geoLegendPosition.includes("right") ? "left" : "right",
      },
      interpolate: getRuntimeColorScale(chart),
    },
  };
  config.options!.plugins!.legend = {
    display: false,
  };
  config.options!.plugins!.title!.padding = 0;
  config.options!.plugins!.tooltip = {
    callbacks: {
      label: function (tooltipItem: TooltipItem<"choropleth">) {
        console.log(tooltipItem);
        const rawItem = tooltipItem.raw as any;
        const xLabel = rawItem.feature.properties.name;
        const yLabel = rawItem.value;
        const toolTipFormat = !format && Math.abs(yLabel) >= 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
  console.log(config);

  // @ts-ignore ADRM TODO
  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}

function legendPositionToGeoLegendPosition(position: LegendPosition) {
  switch (position) {
    case "top":
      return "top-left";
    case "right":
      return "top-right";
    case "bottom":
      return "bottom-right";
    case "left":
      return "bottom-left";
    case "none":
      return "bottom-left";
  }
}

function getRuntimeColorScale(chart: GeoChart) {
  if (!chart.colorScale || typeof chart.colorScale === "string") {
    return chart.colorScale || "blues";
  }
  const scaleColors = [{ value: 0, color: chart.colorScale.minColor }];
  if (chart.colorScale.midColor) {
    scaleColors.push({ value: 0.5, color: chart.colorScale.midColor });
  }
  scaleColors.push({ value: 1, color: chart.colorScale.maxColor });
  return getColorScale(scaleColors);
}
