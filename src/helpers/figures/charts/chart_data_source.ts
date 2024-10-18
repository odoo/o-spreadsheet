import { ChartTerms } from "../../../components/translations_terms";
import { isEvaluationError } from "../../../functions/helpers";
import { ComputedDataset, ComputedLabels, DataSet, Format, Getters, Range } from "../../../types";
import { range } from "../../misc";
import { isNumber } from "../../numbers";
import { getData, truncateLabel } from "./chart_ui_common";

interface Options {
  dataSetsHaveTitle?: boolean; // ADRM TODO it make no sense that this is only needed for labels but pre-computed in datasets
}

interface ChartData {
  datasets: ComputedDataset[];
  labels: ComputedLabels;
}

export interface ChartDataSource {
  getData(options?: Options): ChartData;
}

export class SpreadsheetChartDataSource implements ChartDataSource {
  constructor(
    private datasets: DataSet[],
    private labelRange: Range | undefined,
    private getters: Getters
  ) {}

  getData(options?: Options): ChartData {
    let datasets = this.getChartComputedDatasets(this.getters, this.datasets);
    let labels = this.getComputedLabels(this.getters, this.datasets, this.labelRange);

    if (
      options?.dataSetsHaveTitle &&
      datasets[0] &&
      labels.formattedValues.length > datasets[0].data.length // ADRM TODO: yeah this can probably be improved, this sounds a bit random
    ) {
      labels = {
        ...labels,
        formattedValues: labels.formattedValues.slice(1),
        values: labels.values.slice(1),
      };
    }

    ({ labels, datasets } = this.filterEmptyDataPoints(labels, datasets));
    return { datasets, labels };
  }

  private getChartComputedDatasets(getters: Getters, dataSets: DataSet[]): ComputedDataset[] {
    const datasetValues: ComputedDataset[] = [];
    for (const [dsIndex, ds] of Object.entries(dataSets)) {
      let format: Format | undefined = undefined;
      if (getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left)) {
        continue;
      }
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
        label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
      }
      let data = ds.dataRange ? getData(getters, ds) : [];
      if (
        data.every((e) => typeof e === "string" && !isEvaluationError(e)) &&
        data.some((e) => e !== "")
      ) {
        // In this case, we want a chart based on the string occurrences count
        // This will be done by associating each string with a value of 1 and
        // then using the classical aggregation method to sum the values.
        data.fill(1);
      } else if (
        data.every(
          (cell) =>
            cell === undefined || cell === null || !isNumber(cell.toString(), getters.getLocale())
        )
      ) {
        continue;
      }
      datasetValues.push({ data, label, format });
    }
    return datasetValues;
  }

  private getComputedLabels(
    getters: Getters,
    dataSets: DataSet[],
    labelRange?: Range
  ): ComputedLabels {
    let labels: Omit<ComputedLabels, "format"> = { values: [], formattedValues: [] };
    if (labelRange) {
      const { left } = labelRange.zone;
      if (
        !labelRange.invalidXc &&
        !labelRange.invalidSheetName &&
        !getters.isColHidden(labelRange.sheetId, left)
      ) {
        labels = {
          formattedValues: getters.getRangeFormattedValues(labelRange),
          values: getters.getRangeValues(labelRange).map((val) => String(val ?? "")),
        };
      } else if (dataSets[0]) {
        const ranges = getData(getters, dataSets[0]);
        labels = {
          formattedValues: range(0, ranges.length).map((r) => r.toString()),
          values: labels.formattedValues,
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

    const format = labelRange ? getters.getFirstFormatInRange(labelRange) : undefined;
    return { ...labels, format };
  }

  private filterEmptyDataPoints(labels: ComputedLabels, datasets: ComputedDataset[]): ChartData {
    const numberOfDataPoints = Math.max(
      labels.values.length,
      ...datasets.map((dataset) => dataset.data?.length || 0)
    );
    const dataPointsIndexes = range(0, numberOfDataPoints).filter((dataPointIndex) => {
      const label = labels.formattedValues[dataPointIndex];
      const values = datasets.map((dataset) => dataset.data?.[dataPointIndex]);
      return label || values.some((value) => value === 0 || Boolean(value));
    });
    return {
      labels: {
        ...labels,
        values: dataPointsIndexes.map((i) => labels[i] || ""),
        formattedValues: dataPointsIndexes.map((i) => labels.formattedValues[i] || ""),
      },
      datasets: datasets.map((dataset) => ({
        ...dataset,
        data: dataPointsIndexes.map((i) => dataset.data[i]),
      })),
    };
  }
}
