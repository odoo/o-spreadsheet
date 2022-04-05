import {
  ChartConfiguration,
  ChartData,
  ChartDataSets,
  ChartLegendOptions,
  ChartTooltipItem,
} from "chart.js";
import { ChartTerms } from "../../components/translations_terms";
import { MAX_CHAR_LABEL } from "../../constants";
import {
  ChartColors,
  chartFontColor,
  getBaselineArrowDirection,
  getBaselineColor,
  getBaselineText,
} from "../../helpers/chart";
import { getChartTimeOptions, timeFormatMomentCompatible } from "../../helpers/chart_date";
import { formatValue, recomputeZones, zoneToXc } from "../../helpers/index";
import { deepCopy, findNextDefinedValue, range } from "../../helpers/misc";
import { Cell, Format } from "../../types";
import {
  BasicChartDefinition,
  ChartDefinition,
  DataSet,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../types/chart";
import { Command, invalidateEvaluationCommands } from "../../types/commands";
import { Color, UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

interface LabelValues {
  values: string[];
  formattedValues: string[];
}

interface DatasetValues {
  label?: string;
  data: any[];
}

type AxisType = "category" | "linear" | "time";

export class EvaluationChartPlugin extends UIPlugin {
  static getters = [
    "getBasicChartRuntime",
    "getScorecardChartRuntime",
    "canChartParseLabels",
  ] as const;

  // contains the configuration of the chart with it's values like they should be displayed,
  // as well as all the options needed for the chart library to work correctly
  readonly chartRuntime: { [figureId: string]: ChartConfiguration } = {};
  readonly scorecardChartRuntime: { [figureId: string]: ScorecardChartRuntime } = {};

  private outOfDate: Set<UID> = new Set<UID>();

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && "content" in cmd)
    ) {
      for (let chartId of Object.keys(this.chartRuntime)) {
        this.outOfDate.add(chartId);
      }
      for (let chartId of Object.keys(this.scorecardChartRuntime)) {
        this.outOfDate.add(chartId);
      }
    }
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        this.removeChartEvaluation(cmd.id);
        let chartDefinition: ChartDefinition | undefined;
        if ((chartDefinition = this.getters.getBasicChartDefinition(cmd.id))) {
          this.chartRuntime[cmd.id] = this.mapDefinitionToRuntime(chartDefinition);
        }
        if ((chartDefinition = this.getters.getScorecardChartDefinition(cmd.id))) {
          this.scorecardChartRuntime[cmd.id] =
            this.mapScorecardDefinitionToRuntime(chartDefinition);
        }
        break;
      case "DELETE_FIGURE":
        this.removeChartEvaluation(cmd.id);
        break;
      case "REFRESH_CHART":
        this.evaluateUsedSheets([cmd.id]);
        this.outOfDate.add(cmd.id);
        break;
      case "ACTIVATE_SHEET":
        const chartsIds = this.getters.getChartsIdBySheet(cmd.sheetIdTo);
        this.evaluateUsedSheets(chartsIds);
        break;
      case "DELETE_SHEET":
        for (let chartId of this.getAllChartIds()) {
          if (!this.getters.isChartDefined(chartId)) {
            if (this.chartRuntime[chartId]) {
              delete this.chartRuntime[chartId];
            }
            if (this.scorecardChartRuntime[chartId]) {
              delete this.scorecardChartRuntime[chartId];
            }
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getBasicChartRuntime(figureId: string): ChartConfiguration | undefined {
    if (this.outOfDate.has(figureId) || !(figureId in this.chartRuntime)) {
      const chartDefinition = this.getters.getBasicChartDefinition(figureId);
      if (chartDefinition === undefined) return;
      this.chartRuntime[figureId] = this.mapDefinitionToRuntime(chartDefinition);
      this.outOfDate.delete(figureId);
    }
    return this.chartRuntime[figureId];
  }

  /**
   * Check if the labels of the chart can be parsed to not be interpreted as text, ie. if the chart
   * can be a date chart or a linear chart
   */
  canChartParseLabels(figureId: string): boolean {
    const definition = this.getters.getBasicChartDefinition(figureId);
    if (definition === undefined) return false;

    return this.canBeLinearChart(definition) || this.canBeDateChart(definition);
  }

  getScorecardChartRuntime(figureId: string): ScorecardChartRuntime | undefined {
    if (this.outOfDate.has(figureId) || !(figureId in this.scorecardChartRuntime)) {
      const chartDefinition = this.getters.getScorecardChartDefinition(figureId);
      if (!chartDefinition) return;

      this.scorecardChartRuntime[figureId] = this.mapScorecardDefinitionToRuntime(chartDefinition);
      this.outOfDate.delete(figureId);
    }
    return this.scorecardChartRuntime[figureId];
  }

  private removeChartEvaluation(chartId: string) {
    if (this.chartRuntime[chartId]) {
      delete this.chartRuntime[chartId];
    }
    if (this.scorecardChartRuntime[chartId]) {
      delete this.scorecardChartRuntime[chartId];
    }
  }

  private truncateLabel(label: string | undefined): string {
    if (!label) {
      return "";
    }
    if (label.length > MAX_CHAR_LABEL) {
      return label.substring(0, MAX_CHAR_LABEL) + "…";
    }
    return label;
  }

  private getDefaultConfiguration(
    definition: BasicChartDefinition,
    labels: string[],
    fontColor: Color
  ): ChartConfiguration {
    const legend: ChartLegendOptions = {
      labels: { fontColor },
    };
    if (!definition.labelRange && definition.dataSets.length === 1) {
      legend.display = false;
    } else {
      legend.position = definition.legendPosition;
    }
    const config: ChartConfiguration = {
      type: definition.type,
      options: {
        legend,
        // https://www.chartjs.org/docs/latest/general/responsive.html
        responsive: true, // will resize when its container is resized
        maintainAspectRatio: false, // doesn't maintain the aspect ration (width/height =2 by default) so the user has the choice of the exact layout
        layout: {
          padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
        },
        elements: {
          line: {
            fill: false, // do not fill the area under line charts
          },
          point: {
            hitRadius: 15, // increased hit radius to display point tooltip when hovering nearby
          },
        },
        animation: {
          duration: 0, // general animation time
        },
        hover: {
          animationDuration: 10, // duration of animations when hovering an item
        },
        responsiveAnimationDuration: 0, // animation duration after a resize
        title: {
          display: !!definition.title,
          fontSize: 22,
          fontStyle: "normal",
          text: definition.title,
          fontColor,
        },
      },
      data: {
        labels: labels.map(this.truncateLabel),
        datasets: [],
      },
    };

    if (definition.type !== "pie") {
      config.options!.scales = {
        xAxes: [
          {
            offset: true, // prevent bars at the edges from being cut when using linear/time axis
            ticks: {
              // x axis configuration
              maxRotation: 60,
              minRotation: 15,
              padding: 5,
              labelOffset: 2,
              fontColor,
            },
          },
        ],
        yAxes: [
          {
            position: definition.verticalAxisPosition,
            ticks: {
              fontColor,
              // y axis configuration
              beginAtZero: true, // the origin of the y axis is always zero
            },
          },
        ],
      };
      if (definition.type === "bar" && definition.stackedBar) {
        config.options!.scales.xAxes![0].stacked = true;
        config.options!.scales.yAxes![0].stacked = true;
      }
    } else {
      config.options!.tooltips = {
        callbacks: {
          title: function (tooltipItems: ChartTooltipItem[], data: ChartData) {
            return data.datasets![tooltipItems[0]!.datasetIndex!].label!;
          },
        },
      };
    }
    return config;
  }

  /** Get the ids of all the charts defined in this plugin (basicCharts + scorecards) */
  private getAllChartIds() {
    return [...Object.keys(this.chartRuntime), ...Object.keys(this.scorecardChartRuntime)];
  }

  private getSheetIdsUsedInChart(chartId: UID): Set<UID> {
    const sheetIds: Set<UID> = new Set();
    const chartRanges = this.getters.getChartRanges(chartId);
    for (let range of chartRanges) {
      sheetIds.add(range.sheetId);
    }
    return sheetIds;
  }

  private evaluateUsedSheets(chartsIds: UID[]) {
    const usedSheetsId: Set<UID> = new Set();
    for (let chartId of chartsIds) {
      const sheetsIds = this.getters.isChartDefined(chartId)
        ? this.getSheetIdsUsedInChart(chartId)
        : [];
      sheetsIds.forEach((sheetId) => {
        if (sheetId !== this.getters.getActiveSheetId()) {
          usedSheetsId.add(sheetId);
        }
      });
    }
    for (let sheetId of usedSheetsId) {
      this.dispatch("EVALUATE_CELLS", { sheetId });
    }
  }

  /** Get the format of the first cell in the label range of the chart, if any */
  private getLabelFormat(definition: BasicChartDefinition): Format | undefined {
    if (!definition.labelRange) return undefined;
    const firstLabelCell = this.getters.getCell(
      definition.labelRange.sheetId,
      definition.labelRange.zone.left,
      definition.labelRange.zone.top
    );
    return firstLabelCell?.format;
  }

  private getChartAxisType(definition: BasicChartDefinition): AxisType {
    if (this.isDateChart(definition)) {
      return "time";
    }
    if (this.isLinearChart(definition)) {
      return "linear";
    }
    return "category";
  }

  private mapScorecardDefinitionToRuntime(
    definition: ScorecardChartDefinition
  ): ScorecardChartRuntime {
    let keyValue = "";
    let formattedKeyValue = "";
    if (definition.keyValue) {
      const keyValueCell = this.getters.getCellsInZone(
        definition.keyValue.sheetId,
        definition.keyValue.zone
      )[0];
      keyValue = keyValueCell?.evaluated.value ? String(keyValueCell?.evaluated.value) : "";
      formattedKeyValue = keyValueCell?.formattedValue || "";
    }
    let baseline = definition.baseline
      ? this.getters.getRangeValues(definition.baseline)[0]
      : undefined;
    baseline = baseline !== undefined ? String(baseline) : "";
    return {
      type: definition.type,
      title: definition.title,
      keyValue: formattedKeyValue || keyValue,
      baseline: getBaselineText(baseline, keyValue, definition.baselineMode),
      baselineArrow: getBaselineArrowDirection(baseline, keyValue),
      baselineColor: getBaselineColor(
        baseline,
        keyValue,
        definition.baselineColorUp,
        definition.baselineColorDown
      ),
      baselineDescr: definition.baselineDescr,
      background: definition.background,
      fontColor: chartFontColor(definition.background),
    };
  }

  private mapDefinitionToRuntime(definition: BasicChartDefinition): ChartConfiguration {
    const axisType = this.getChartAxisType(definition);
    const labelValues = this.getChartLabelValues(definition);
    let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
    let dataSetsValues = this.getChartDatasetValues(definition);

    ({ labels, dataSetsValues } = this.filterEmptyDataPoints(labels, dataSetsValues));
    if (axisType === "time") {
      ({ labels, dataSetsValues } = this.fixEmptyLabelsForDateCharts(labels, dataSetsValues));
    }
    const fontColor = chartFontColor(definition.background);
    const runtime = this.getDefaultConfiguration(definition, labels, fontColor);
    const labelFormat = this.getLabelFormat(definition)!;
    if (axisType === "time") {
      runtime.options!.scales!.xAxes![0].type = "time";
      runtime.options!.scales!.xAxes![0].time = getChartTimeOptions(labels, labelFormat);
      runtime.options!.scales!.xAxes![0].ticks!.maxTicksLimit = 15;
    } else if (axisType === "linear") {
      runtime.options!.scales!.xAxes![0].type = "linear";
      runtime.options!.scales!.xAxes![0].ticks!.callback = (value) =>
        formatValue(value, labelFormat);
    }

    const colors = new ChartColors();

    for (let { label, data } of dataSetsValues) {
      if (["linear", "time"].includes(axisType)) {
        // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
        data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
      }

      const color = definition.type !== "pie" ? colors.next() : "#FFFFFF"; // white border for pie chart
      const backgroundColor =
        definition.type === "pie" ? this.getPieColors(colors, dataSetsValues) : color;
      const dataset: ChartDataSets = {
        label,
        data,
        lineTension: 0, // 0 -> render straight lines, which is much faster
        borderColor: color,
        backgroundColor,
      };
      runtime.data!.datasets!.push(dataset);
    }

    return runtime;
  }

  /** Return the current cell values of the labels */
  private getChartLabelValues(definition: BasicChartDefinition): LabelValues {
    const labels: LabelValues = { values: [], formattedValues: [] };
    if (definition.labelRange) {
      if (!definition.labelRange.invalidXc && !definition.labelRange.invalidSheetName) {
        labels.formattedValues = this.getters.getRangeFormattedValues(definition.labelRange);
        labels.values = this.getters
          .getRangeValues(definition.labelRange)
          .map((val) => (val ? String(val) : ""));
      }
    } else if (definition.dataSets.length === 1) {
      for (let i = 0; i < this.getData(definition.dataSets[0], definition.sheetId).length; i++) {
        labels.formattedValues.push("");
        labels.values.push("");
      }
    } else {
      if (definition.dataSets[0]) {
        const ranges = this.getData(definition.dataSets[0], definition.sheetId);
        labels.formattedValues = range(0, ranges.length).map((r) => r.toString());
        labels.values = labels.formattedValues;
      }
    }
    return labels;
  }

  /** Return the current cell values of the datasets */
  private getChartDatasetValues(definition: BasicChartDefinition): DatasetValues[] {
    const datasetValues: DatasetValues[] = [];
    for (const [dsIndex, ds] of Object.entries(definition.dataSets)) {
      let label: string;
      if (ds.labelCell) {
        const labelRange = ds.labelCell;
        const cell: Cell | undefined = labelRange
          ? this.getters.getCell(labelRange.sheetId, labelRange.zone.left, labelRange.zone.top)
          : undefined;
        label =
          cell && labelRange
            ? this.truncateLabel(cell.formattedValue)
            : (label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`);
      } else {
        label = label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
      }
      let data = ds.dataRange ? this.getData(ds, definition.sheetId) : [];
      datasetValues.push({ data, label });
    }
    return datasetValues;
  }

  /** Get array of colors of a pie chart */
  private getPieColors(colors: ChartColors, dataSetsValues: DatasetValues[]): string[] {
    const pieColors: string[] = [];
    const maxLength = Math.max(...dataSetsValues.map((ds) => ds.data.length));
    for (let i = 0; i <= maxLength; i++) {
      pieColors.push(colors.next());
    }

    return pieColors;
  }

  /**
   * Replace the empty labels by the closest label, and set the values corresponding to this label in
   * the dataset to undefined.
   *
   * Replacing labels with empty value is needed for date charts, because otherwise chartJS will consider them
   * to have a value of 01/01/1970, messing up the scale. Setting their corresponding value to undefined
   * will have the effect of breaking the line of the chart at this point.
   */
  private fixEmptyLabelsForDateCharts(
    labels: string[],
    dataSetsValues: DatasetValues[]
  ): { labels: string[]; dataSetsValues: DatasetValues[] } {
    if (labels.length === 0 || labels.every((label) => !label)) {
      return { labels, dataSetsValues };
    }
    const newLabels = [...labels];
    const newDatasets = deepCopy(dataSetsValues);
    for (let i = 0; i < newLabels.length; i++) {
      if (!newLabels[i]) {
        newLabels[i] = findNextDefinedValue(newLabels, i);
        for (let ds of newDatasets) {
          ds.data[i] = undefined;
        }
      }
    }
    return { labels: newLabels, dataSetsValues: newDatasets };
  }

  private filterEmptyDataPoints(
    labels: string[],
    datasets: DatasetValues[]
  ): { labels: string[]; dataSetsValues: DatasetValues[] } {
    const numberOfDataPoints = Math.max(
      labels.length,
      ...datasets.map((dataset) => dataset.data?.length || 0)
    );
    const dataPointsIndexes = range(0, numberOfDataPoints).filter((dataPointIndex) => {
      const label = labels[dataPointIndex];
      const values = datasets.map((dataset) => dataset.data?.[dataPointIndex]);
      return label || values.some((value) => value === 0 || Boolean(value));
    });
    return {
      labels: dataPointsIndexes.map((i) => labels[i] || ""),
      dataSetsValues: datasets.map((dataset) => ({
        ...dataset,
        data: dataPointsIndexes.map((i) => dataset.data[i]),
      })),
    };
  }

  // TODO type this with Chart.js types.
  private getData(ds: DataSet, sheetId: UID): any[] {
    if (ds.dataRange) {
      const labelCellZone = ds.labelCell ? [zoneToXc(ds.labelCell.zone)] : [];
      const dataXC = recomputeZones([zoneToXc(ds.dataRange.zone)], labelCellZone)[0];
      if (dataXC === undefined) {
        return [];
      }
      const dataRange = this.getters.getRangeFromSheetXC(ds.dataRange.sheetId, dataXC);
      return this.getters.getRangeValues(dataRange);
    }
    return [];
  }

  private canBeDateChart(definition: BasicChartDefinition): boolean {
    if (!definition.labelRange || !definition.dataSets || definition.type !== "line") {
      return false;
    }

    if (!this.canBeLinearChart(definition)) {
      return false;
    }

    const labelFormat = this.getLabelFormat(definition);
    return Boolean(labelFormat && timeFormatMomentCompatible.test(labelFormat));
  }

  private isDateChart(definition: BasicChartDefinition): boolean {
    return !definition.labelsAsText && this.canBeDateChart(definition);
  }

  private canBeLinearChart(definition: BasicChartDefinition): boolean {
    if (!definition.labelRange || !definition.dataSets || definition.type !== "line") {
      return false;
    }

    const labels = this.getters.getRangeValues(definition.labelRange);
    if (labels.some((label) => isNaN(Number(label)) && label)) {
      return false;
    }
    if (labels.every((label) => !label)) {
      return false;
    }

    return true;
  }

  private isLinearChart(definition: BasicChartDefinition): boolean {
    return !definition.labelsAsText && this.canBeLinearChart(definition);
  }
}
