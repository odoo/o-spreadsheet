import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  SunburstChartDefinition,
  SunburstChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartCreationContext,
  ChartData,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import type { ChartConfiguration, ChartOptions } from "chart.js";
import { ApplyRangeChange, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartTitle,
  getHierarchalChartData,
  getSunburstChartDatasets,
  getSunburstChartLegend,
  getSunburstChartTooltip,
  getSunburstShowValues,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class SunburstChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "sunburst";

  static allowedDefinitionKeys: readonly (keyof SunburstChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "legendPosition",
    "dataSets",
    "dataSetsHaveTitle",
    "labelRange",
    "showValues",
    "showLabels",
    "valuesDesign",
    "groupColors",
    "pieHolePercentage",
  ] as const;

  constructor(private definition: SunburstChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: SunburstChartDefinition,
    applyChange: RangeAdapter
  ): SunburstChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: SunburstChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): SunburstChartDefinition {
    const dataSets: CustomizedDataSet[] = [];
    if (context.hierarchicalRanges?.length) {
      dataSets.push(...context.hierarchicalRanges);
    } else if (context.auxiliaryRange) {
      dataSets.push({ ...context.range?.[0], dataRange: context.auxiliaryRange });
    }
    return {
      background: context.background,
      dataSets,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "sunburst",
      labelRange: context.range?.[0]?.dataRange,
      showValues: context.showValues,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      groupColors: context.groupColors,
      humanize: context.humanize,
      pieHolePercentage: context.pieHolePercentage,
    };
  }

  getDefinition(): SunburstChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getContextCreation(): ChartCreationContext {
    const leafRange = this.dataSets.at(-1)?.dataRange;
    return {
      ...this.getDefinition(),
      range: this.labelRange
        ? [{ dataRange: this.getters.getRangeString(this.labelRange, this.sheetId) }]
        : [],
      auxiliaryRange: leafRange ? this.getters.getRangeString(leafRange, this.sheetId) : undefined,
      hierarchicalRanges: this.dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, this.sheetId),
      })),
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): SunburstChartDefinition {
    return {
      ...this.definition,
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      dataSets: dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId),
      })),
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): SunburstChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new SunburstChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): SunburstChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new SunburstChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): SunburstChart {
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
    return new SunburstChart(definition, this.sheetId, this.getters);
  }
}

export function createSunburstChartRuntime(
  getters: Getters,
  chart: SunburstChart,
  data: ChartData
): SunburstChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getHierarchalChartData(definition, data, getters);

  const config: ChartConfiguration<"doughnut"> = {
    type: "doughnut",
    data: {
      datasets: getSunburstChartDatasets(definition, chartData),
    },
    options: {
      cutout:
        definition.pieHolePercentage === undefined ? "25%" : `${definition.pieHolePercentage}%`,
      ...(CHART_COMMON_OPTIONS as ChartOptions<"doughnut">),
      layout: getChartLayout(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getSunburstChartLegend(definition, chartData),
        tooltip: getSunburstChartTooltip(definition, chartData),
        sunburstLabelsPlugin: getSunburstShowValues(definition, chartData),
        sunburstHoverPlugin: { enabled: true },
      },
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
