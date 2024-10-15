import { ChartDataset, TooltipItem, type ChartConfiguration } from "chart.js";
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
  GeoChartProjection,
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

/**
 * ADRM TODO: to put in spec/notes:
    - probably too many colorScales we should pick some to keep
    - same for projections => probably pick, one projection by region and stick with it
    - missingValueColor:
        + can set background color of chart without it being too ugly
        + can hover countries without data and be pretty
        - heavy to compute, kinda visible when trying to resize the chart, it's not very fluid (need to fill 150+ countries one by one)

    - put in spec: I can clip europe however I want, just say the word
    - vocabulary: territories/region ?
 */

export class GeoChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "geo";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly colorScale?: GeoChartColorScale;
  readonly projection?: GeoChartProjection;
  readonly missingValueColor?: Color;
  readonly displayedRegion?: string;

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
    this.projection = definition.projection;
    this.missingValueColor = definition.missingValueColor;
    this.displayedRegion = definition.displayedRegion;
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
      projection: this.projection,
      missingValueColor: this.missingValueColor,
      displayedRegion: this.displayedRegion,
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

function getGeoChartConfig(
  chart: GeoChart,
  regionId: string | undefined,
  dataset: ChartDataset<"choropleth">,
  getters: Getters
): ChartConfiguration<"choropleth"> {
  const locale = getters.getLocale();
  const format = getChartDatasetFormat(getters, chart.dataSets, "left");
  const localeFormat = { locale, format };
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime<"choropleth">(chart, [], fontColor, localeFormat);

  const geoLegendPosition = legendPositionToGeoLegendPosition(chart.legendPosition);
  const region = getters.getGeoChartAvailableRegions().find((r) => r.id === regionId);
  // ADRM TODO: remove this one francois picked a projection
  let projection = chart.projection || "mercator";
  if (region?.id === "usa") {
    projection = "albersUsa";
  }

  config.type = "choropleth";
  config.data.datasets = [dataset];
  config.options!.scales = {
    projection: {
      projection,
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
      missing: chart.missingValueColor || "#ffffff",
    },
  };
  config.options!.plugins!.legend = {
    display: false,
  };
  config.options!.plugins!.title!.padding = 0;
  config.options!.plugins!.tooltip = {
    filter: function (tooltipItem: TooltipItem<"choropleth">) {
      return (tooltipItem.raw as any).value !== undefined;
    },
    callbacks: {
      label: function (tooltipItem: TooltipItem<"choropleth">) {
        const rawItem = tooltipItem.raw as any;
        const xLabel = rawItem.feature.properties.name;
        const yLabel = rawItem.value;
        const toolTipFormat = !format && Math.abs(yLabel) >= 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };

  return config;
}

export function createGeoChartRuntime(chart: GeoChart, getters: Getters): GeoChartRuntime {
  const region = chart.displayedRegion || getters.getGeoChartAvailableRegions()[0]?.id;
  const features = region ? getters.getGeoJsonFeatures(region) : undefined;

  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  if (chart.dataSetsHaveTitle) {
    labels.shift();
  }
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));

  const dataset: ChartDataset<"choropleth"> = {
    outline: features,
    showOutline: !!features,
    data: [],
  };

  if (features && region) {
    const labelsAndValues: { [featureId: string]: { value: number; label: string } } = {};
    if (dataSetsValues[0]) {
      for (let i = 0; i < dataSetsValues[0].data.length; i++) {
        if (!labels[i] || dataSetsValues[0].data[i] === undefined) {
          continue;
        }
        const featureId = getters.geoFeatureNameToId(region, labels[i]);
        if (featureId) {
          labelsAndValues[featureId] = { value: dataSetsValues[0].data[i], label: labels[i] };
        }
      }
    }

    for (const feature of features) {
      if (!feature.id) {
        continue;
      }
      dataset.data.push({
        feature: {
          ...feature,
          properties: { name: labelsAndValues[feature.id]?.label },
        },
        value: labelsAndValues[feature.id]?.value,
      });
    }
  }

  const config = getGeoChartConfig(chart, region, dataset, getters);
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
    return chart.colorScale || "oranges";
  }
  const scaleColors = [{ value: 0, color: chart.colorScale.minColor }];
  if (chart.colorScale.midColor) {
    scaleColors.push({ value: 0.5, color: chart.colorScale.midColor });
  }
  scaleColors.push({ value: 1, color: chart.colorScale.maxColor });
  return getColorScale(scaleColors);
}
