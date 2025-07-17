import type { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import { BarChartDefinition, BarChartRuntime } from "../../../types/chart/bar_chart";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { TimeMatrixChartDefinition } from "../../../types/chart/time_matrix_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { ColorScale } from "./colormap";
import {
  getBarChartData,
  getBarChartTooltip,
  getChartLayout,
  getChartTitle,
  getTimeMatrixChartDatasetAndLabels,
  getTimeMatrixChartScales,
} from "./runtime";

export class TimeMatrixChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly type = "timeMatrix";
  readonly showValues?: boolean;
  readonly colormap?: ColorScale;
  readonly axesDesign?: AxesDesign;

  constructor(definition: TimeMatrixChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, [{ dataRange: definition.dataRange }], sheetId, false);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.showValues = definition.showValues;
    this.colormap = definition.colormap;
    this.axesDesign = definition.axesDesign;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BarChartDefinition,
    applyChange: RangeAdapter
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): TimeMatrixChartDefinition {
    return {
      background: context.background,
      dataRange: context.range?.[0].dataRange ?? "",
      title: context.title || { text: "" },
      type: "timeMatrix",
      labelRange: context.auxiliaryRange || undefined,
      showValues: context.showValues,
      axesDesign: context.axesDesign,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [
      { dataRange: this.getters.getRangeString(this.dataSets[0].dataRange, this.sheetId) },
    ];
    return {
      ...this,
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): TimeMatrixChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new TimeMatrixChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): TimeMatrixChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new TimeMatrixChart(definition, sheetId, this.getters);
  }

  getDefinition(): TimeMatrixChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): TimeMatrixChartDefinition {
    const ranges: CustomizedDataSet[] = [
      {
        dataRange: this.getters.getRangeString(
          dataSets[0].dataRange,
          targetSheetId || this.sheetId
        ),
      },
    ];
    return {
      type: "timeMatrix",
      background: this.background,
      dataRange: ranges[0]?.dataRange || "",
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      showValues: this.showValues,
      colormap: this.colormap,
      axesDesign: this.axesDesign,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): TimeMatrixChart {
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
    return new TimeMatrixChart(definition, this.sheetId, this.getters);
  }
}

export function createTimeMatrixChartRuntime(
  chart: TimeMatrixChart,
  getters: Getters
): BarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRange, getters);
  const { labels, datasets } = getTimeMatrixChartDatasetAndLabels(definition, chartData);

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "x",
      layout: getChartLayout(definition, chartData),
      scales: getTimeMatrixChartScales(definition, datasets),
      plugins: {
        title: getChartTitle(definition),
        legend: { display: false },
        tooltip: getBarChartTooltip(definition, chartData),
        //chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}

/*
import { Chart } from "chart.js";

const ctx = document.getElementById("myChart").getContext("2d");

function getPosition(time, stamp) {
  switch (stamp) {
    case "weekdays":
      return time.getDay();
    case "hour":
      return time.getHours();
    case "month":
      return time.getMonth();
    case "year":
      return time.getYear();
  }
  return time;
}
function computeValuesAndLabels(timeValues, values, xStamp, yStamp) {
  const grouping = {};
  const xLabels = new Set();
  const yLabels = new Set();
  for (let i = 0; i < timeValues?.length; i++) {
    const xCateg = getPosition(timeValues[i], xStamp);
    xLabels.add(xCateg);
    if (!(xCateg in grouping)) {
      grouping[xCateg] = {};
    }
    const yCateg = getPosition(timeValues[i], yStamp);
    yLabels.add(yCateg);
    if (!(yCateg in grouping[xCateg])) {
      grouping[xCateg][yCateg] = 0;
    }
    grouping[xCateg][yCateg] += values[i];
  }

  const finalXLabels = [...xLabels];
  const finalYLabels = [...yLabels];
  const finalValues = finalYLabels.map((yL) =>
    finalXLabels.map((xL) => grouping[xL][yL])
  );

  return {
    matrixValues: finalValues,
    xLabels: finalXLabels,
    yLabels: finalYLabels,
  };
}
const { matrixValues, xLabels, yLabels } = computeValuesAndLabels(
  [
    new Date("2025-06-01T08:15:30"),
    new Date("2025-06-01T09:15:30"),
    new Date("2025-06-01T10:15:30"),
    new Date("2025-06-01T11:15:30"),
    new Date("2025-06-01T12:15:30"),
    new Date("2025-06-01T13:15:30"),
    new Date("2025-06-01T14:15:30"),
    new Date("2025-06-01T15:15:30"),
    new Date("2025-06-01T16:15:30"),
    new Date("2025-06-02T08:15:30"),
    new Date("2025-06-02T09:15:30"),
    new Date("2025-06-02T10:15:30"),
    new Date("2025-06-02T11:15:30"),
    new Date("2025-06-02T12:15:30"),
    new Date("2025-06-02T13:15:30"),
    new Date("2025-06-02T14:15:30"),
    new Date("2025-06-02T15:15:30"),
    new Date("2025-06-02T16:15:30"),
    new Date("2025-06-03T08:15:30"),
    new Date("2025-06-03T09:15:30"),
    new Date("2025-06-03T10:15:30"),
    new Date("2025-06-03T11:15:30"),
    new Date("2025-06-03T12:15:30"),
    new Date("2025-06-03T13:15:30"),
    new Date("2025-06-03T14:15:30"),
    new Date("2025-06-03T15:15:30"),
    new Date("2025-06-03T16:15:30"),
    new Date("2025-06-04T08:15:30"),
    new Date("2025-06-04T09:15:30"),
    new Date("2025-06-04T10:15:30"),
    new Date("2025-06-04T11:15:30"),
    new Date("2025-06-04T12:15:30"),
    new Date("2025-06-04T13:15:30"),
    new Date("2025-06-04T14:15:30"),
    new Date("2025-06-04T15:15:30"),
    new Date("2025-06-04T16:15:30"),
    new Date("2025-06-05T08:15:30"),
    new Date("2025-06-05T09:15:30"),
    new Date("2025-06-05T10:15:30"),
    new Date("2025-06-05T11:15:30"),
    new Date("2025-06-05T12:15:30"),
    new Date("2025-06-05T13:15:30"),
    new Date("2025-06-05T14:15:30"),
    new Date("2025-06-05T15:15:30"),
    new Date("2025-06-05T16:15:30"),
    new Date("2025-06-06T08:15:30"),
    new Date("2025-06-06T09:15:30"),
    new Date("2025-06-06T10:15:30"),
    new Date("2025-06-06T11:15:30"),
    new Date("2025-06-06T12:15:30"),
    new Date("2025-06-06T13:15:30"),
    new Date("2025-06-06T14:15:30"),
    new Date("2025-06-06T15:15:30"),
    new Date("2025-06-06T16:15:30"),
    new Date("2025-06-07T08:15:30"),
    new Date("2025-06-07T09:15:30"),
    new Date("2025-06-07T10:15:30"),
    new Date("2025-06-07T11:15:30"),
    new Date("2025-06-07T12:15:30"),
    new Date("2025-06-07T13:15:30"),
    new Date("2025-06-07T14:15:30"),
    new Date("2025-06-07T15:15:30"),
    new Date("2025-06-07T16:15:30"),
  ],
  [
    30, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    60, 61, 62, 3,
  ],
  "weekdays",
  "hour"
);

const maxValue = Math.max(...matrixValues.flat());
const minValue = Math.min(...matrixValues.flat());
function computeColors(i) {
  return matrixValues[i].map(
    (v) => `rgba(0,0,0,${(v - minValue) / (maxValue - minValue)})`
  );
}

const dataSets = [];
for (let i = 0; i < matrixValues.length; i++) {
  dataSets.push({
    label: yLabels[i],
    data: matrixValues[i].map((v) => 1),
    backgroundColor: computeColors(i),
    barPercentage: 1.0,
    categoryPercentage: 1.0,
  });
}

const data = {
  labels: xLabels,
  datasets: dataSets,
};

const options = {
  legend: {
    display: false,
  },
  scales: {
    yAxes: [
      {
        stacked: true,
        ticks: {
          min: 0,
          max: yLabels.length,
          stepSize: 0.5,
          callback: function (label, index, labels) {
            if (Math.floor(label) === label) {
              return undefined;
            }
            return yLabels[Math.floor(label)];
          },
        },
        gridLines: {
          display: false,
        },
      },
    ],
    xAxes: [
      {
        stacked: true,
        ticks: { maxRotation: 90, minRotation: 90 },
      },
    ],
  },
  tooltips: {
    callbacks: {
      label: function (tooltipItem) {
        const label = yLabels[tooltipItem.datasetIndex];
        const value = matrixValues[tooltipItem.datasetIndex][tooltipItem.index];
        return `${label}: ${value}`;
      },
    },
  },
};

const chart = new Chart(ctx, {
  // The type of chart we want to create
  type: "bar",
  // The data for our dataset
  data: data,
  // Configuration options go here
  options: options,
});
document.getElementById("minValue").innerHTML = minValue;
document.getElementById("maxValue").innerHTML = maxValue;
*/
