import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { isDefined } from "@odoo/o-spreadsheet-engine/helpers/misc";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartColorScale,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  GeoChartDefinition,
  GeoChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { ChartConfiguration } from "chart.js";
import { Color, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartTitle,
  getGeoChartData,
  getGeoChartDatasets,
  getGeoChartScales,
  getGeoChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class GeoChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRanges: Range[];
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "geo";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly region?: string;

  constructor(definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRanges = (definition.labelRanges || [])
      .map((r) => createValidRange(getters, sheetId, r))
      .filter(isDefined);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.colorScale = definition.colorScale;
    this.missingValueColor = definition.missingValueColor;
    this.region = definition.region;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: GeoChartDefinition,
    applyChange: RangeAdapter
  ): GeoChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
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
      labelRanges: context.auxiliaryRanges,
      humanize: context.humanize,
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
      auxiliaryRanges: this.labelRanges.length
        ? this.labelRanges.map((r) => this.getters.getRangeString(r, this.sheetId))
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): GeoChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRanges = this.labelRanges
      .map((r) =>
        createValidRange(this.getters, newSheetId, this.getters.getRangeString(r, this.sheetId))
      )
      .filter(isDefined);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges, newSheetId);
    return new GeoChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GeoChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRanges,
      sheetId
    );
    return new GeoChart(definition, sheetId, this.getters);
  }

  getDefinition(): GeoChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRanges);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRanges: Range[],
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
      labelRanges: labelRanges.length
        ? labelRanges.map((r) => this.getters.getRangeString(r, targetSheetId || this.sheetId))
        : undefined,
      title: this.title,
      colorScale: this.colorScale,
      missingValueColor: this.missingValueColor,
      region: this.region,
      humanize: this.humanize,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): GeoChart {
    const { dataSets, labelRanges, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRanges
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges || []);
    return new GeoChart(definition, this.sheetId, this.getters);
  }
}

export function createGeoChartRuntime(chart: GeoChart, getters: Getters): GeoChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getGeoChartData(definition, chart.dataSets, chart.labelRanges, getters);

  const config: ChartConfiguration = {
    type: "choropleth",
    data: {
      datasets: getGeoChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getGeoChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        tooltip: getGeoChartTooltip(definition, chartData),
        legend: { display: false },
        background: { color: chart.background },
      },
    },
  };

  return { chartJsConfig: config };
}
