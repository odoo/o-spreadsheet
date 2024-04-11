import { ChartConfiguration } from "chart.js";
import { ChartTerms } from "../../components/translations_terms";
import { MAX_CHAR_LABEL } from "../../constants";
import { _t } from "../../translation";
import { Cell, Color, Format, Getters, Range } from "../../types";
import { DataSet, DatasetValues, LabelValues } from "../../types/chart/chart";
import { range } from "../misc";
import { recomputeZones, zoneToXc } from "../zones";
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
    return getters.getRangeValues(dataRange);
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
  truncateLabels: boolean = true
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
    },
    data: {
      labels: truncateLabels ? labels.map(truncateLabel) : labels,
      datasets: [],
    },
  };
}

export function getLabelFormat(getters: Getters, range: Range | undefined): Format | undefined {
  if (!range) return undefined;
  return getters.getCell(range.sheetId, range.zone.left, range.zone.top)?.evaluated.format;
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
        values: getters
          .getRangeValues(labelRange)
          .map((val) => (val !== undefined && val !== null ? String(val) : "")),
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

export function getChartDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  const datasetValues: DatasetValues[] = [];
  for (const [dsIndex, ds] of Object.entries(dataSets)) {
    let label: string;
    if (ds.labelCell) {
      const labelRange = ds.labelCell;
      const cell: Cell | undefined = labelRange
        ? getters.getCell(labelRange.sheetId, labelRange.zone.left, labelRange.zone.top)
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
