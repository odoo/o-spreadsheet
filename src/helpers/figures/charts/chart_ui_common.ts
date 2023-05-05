import { ChartConfiguration } from "chart.js";
import { ChartTerms } from "../../../components/translations_terms";
import { MAX_CHAR_LABEL } from "../../../constants";
import { _t } from "../../../translation";
import { Color, Format, Getters, LocaleFormat, Range } from "../../../types";
import { DataSet, DatasetValues, LabelValues } from "../../../types/chart/chart";
import { formatValue, isDateTimeFormat } from "../../format";
import { range } from "../../misc";
import { recomputeZones, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
/**
 * This file contains helpers that are common to different runtime charts (mainly
 * line, bar and pie charts)
 */

/**
 * Get the data from a dataSet
 */
export function getData(getters: Getters, ds: DataSet): any[] {
  if (ds.dataRange) {
    const labelCellZone = ds.labelCell ? [zoneToXc(ds.labelCell.zone)] : [];
    const dataXC = recomputeZones([zoneToXc(ds.dataRange.zone)], labelCellZone)[0];
    if (dataXC === undefined) {
      return [];
    }
    const dataRange = getters.getRangeFromSheetXC(ds.dataRange.sheetId, dataXC);
    return getters.getRangeValues(dataRange).map((value) => (value === "" ? undefined : value));
  }
  return [];
}

export function filterEmptyDataPoints(
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

/**
 * Aggregates data based on labels
 */
export function aggregateDataForLabels(
  labels: string[],
  datasets: DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const parseNumber = (value) => (typeof value === "number" ? value : 0);
  const labelSet = new Set(labels);
  const labelMap: { [key: string]: number[] } = {};
  labelSet.forEach((label) => {
    labelMap[label] = new Array(datasets.length).fill(0);
  });

  for (const indexOfLabel of range(0, labels.length)) {
    const label = labels[indexOfLabel];
    for (const indexOfDataset of range(0, datasets.length)) {
      labelMap[label][indexOfDataset] += parseNumber(datasets[indexOfDataset].data[indexOfLabel]);
    }
  }

  return {
    labels: Object.keys(labelMap),
    dataSetsValues: datasets.map((dataset, indexOfDataset) => ({
      ...dataset,
      data: Object.values(labelMap).map((dataOfLabel: any[]) => dataOfLabel[indexOfDataset]),
    })),
  };
}

export function truncateLabel(label: string | undefined): string {
  if (!label) {
    return "";
  }
  if (label.length > MAX_CHAR_LABEL) {
    return label.substring(0, MAX_CHAR_LABEL) + "…";
  }
  return label;
}

/**
 * Get a default chart js configuration
 */
export function getDefaultChartJsRuntime(
  chart: AbstractChart,
  labels: string[],
  fontColor: Color,
  { format, locale }: LocaleFormat
): ChartConfiguration {
  return {
    type: chart.type,
    options: {
      // https://www.chartjs.org/docs/latest/general/responsive.html
      responsive: true, // will resize when its container is resized
      maintainAspectRatio: false, // doesn't maintain the aspect ration (width/height =2 by default) so the user has the choice of the exact layout
      layout: {
        padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
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
        display: !!chart.title,
        fontSize: 22,
        fontStyle: "normal",
        text: _t(chart.title),
        fontColor,
      },
      legend: {
        // Disable default legend onClick (show/hide dataset), to allow us to set a global onClick on the chart container.
        // If we want to re-enable this in the future, we need to override the default onClick to stop the event propagation
        onClick: undefined,
      },
      tooltips: {
        callbacks: {
          label: function (tooltipItem: Chart.ChartTooltipItem, data: Chart.ChartData) {
            let xLabel = data.datasets?.[tooltipItem.datasetIndex || 0]?.label;

            const yLabel =
              tooltipItem.yLabel !== ""
                ? tooltipItem.yLabel
                : data.datasets?.[tooltipItem.datasetIndex || 0]?.data?.[tooltipItem.index || 0];
            const yLabelStr =
              format && typeof yLabel === "number"
                ? formatValue(yLabel, { format, locale })
                : yLabel?.toLocaleString() || "";

            return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
          },
        },
      },
    },
    data: {
      labels: labels.map(truncateLabel),
      datasets: [],
    },
  };
}

export function getChartLabelFormat(
  getters: Getters,
  range: Range | undefined
): Format | undefined {
  if (!range) return undefined;
  return getters.getEvaluatedCell({
    sheetId: range.sheetId,
    col: range.zone.left,
    row: range.zone.top,
  }).format;
}

export function getChartLabelValues(
  getters: Getters,
  dataSets: DataSet[],
  labelRange?: Range
): LabelValues {
  let labels: LabelValues = { values: [], formattedValues: [] };
  if (labelRange) {
    if (!labelRange.invalidXc && !labelRange.invalidSheetName) {
      labels = {
        formattedValues: getters.getRangeFormattedValues(labelRange),
        values: getters.getRangeValues(labelRange).map((val) => String(val)),
      };
    }
  } else if (dataSets.length === 1) {
    for (let i = 0; i < getData(getters, dataSets[0]).length; i++) {
      labels.formattedValues.push("");
      labels.values.push("");
    }
  } else {
    if (dataSets[0]) {
      const ranges = getData(getters, dataSets[0]);
      labels = {
        formattedValues: range(0, ranges.length).map((r) => r.toString()),
        values: labels.formattedValues,
      };
    }
  }
  return labels;
}

/**
 * Get the format to apply to the the dataset values. This format is defined as the first format
 * found in the dataset ranges that isn't a date format.
 */
export function getChartDatasetFormat(getters: Getters, dataSets: DataSet[]): Format | undefined {
  for (const ds of dataSets) {
    const formatsInDataset = getters.getRangeFormats(ds.dataRange);
    const format = formatsInDataset.find((f) => f !== undefined && !isDateTimeFormat(f));
    if (format) return format;
  }
  return undefined;
}

export function getChartDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  const datasetValues: DatasetValues[] = [];
  for (const [dsIndex, ds] of Object.entries(dataSets)) {
    let label: string;
    if (ds.labelCell) {
      const labelRange = ds.labelCell;
      const cell = labelRange
        ? getters.getEvaluatedCell({
            sheetId: labelRange.sheetId,
            col: labelRange.zone.left,
            row: labelRange.zone.top,
          })
        : undefined;
      label =
        cell && labelRange
          ? truncateLabel(cell.formattedValue)
          : (label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`);
    } else {
      label = label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
    }
    let data = ds.dataRange ? getData(getters, ds) : [];
    datasetValues.push({ data, label });
  }
  return datasetValues;
}

/** See https://www.chartjs.org/docs/latest/charts/area.html#filling-modes */
export function getFillingMode(index: number): "origin" | number {
  if (index === 0) {
    return "origin";
  } else {
    return index - 1;
  }
}
