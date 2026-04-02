import { sum } from "../../../functions/helper_math";
import { average, max, median, min } from "../../../functions/helper_statistical";
import { formatValue } from "../../../helpers/format/format";
import { isDefined } from "../../../helpers/misc";
import {
  computeStatisticFnResults,
  SelectionStatisticFunction,
  StatisticFnResults,
} from "../../../helpers/selection_statistic_functions";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { _t } from "../../../translation";
import {
  CellValue,
  CellValueType,
  Command,
  EvaluatedCell,
  invalidateEvaluationCommands,
  LocaleFormat,
  Position,
} from "../../../types";

const columnStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _t("Total rows"),
    types: Object.values(CellValueType),
    compute: (values, locale) => values.length,
    format: "0",
  },
  {
    name: _t("Unique values"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values, locale) => {
      const uniqueValues = new Set<string | number | boolean>();
      for (const cell of values) {
        uniqueValues.add(cell.value as string | number | boolean);
      }
      return uniqueValues.size;
    },
    format: "0",
  },
  {
    name: _t("Sum"),
    types: [CellValueType.number],
    compute: (values, locale) => sum([[values]], locale),
  },
  {
    name: _t("Average"),
    types: [CellValueType.number],
    compute: (values, locale) => average([[values]], locale),
  },
  {
    name: _t("Median"),
    types: [CellValueType.number],
    compute: (values, locale) => median([[values]], locale) ?? "",
  },
  {
    name: _t("Minimum value"),
    types: [CellValueType.number],
    compute: (values, locale) => min([[values]], locale).value,
  },
  {
    name: _t("Maximum value"),
    types: [CellValueType.number],
    compute: (values, locale) => max([[values]], locale).value,
  },
];

function buildEmptyStatisticFnResults(
  selectionStatisticFunctions: SelectionStatisticFunction[]
): StatisticFnResults {
  const statisticFnResults: StatisticFnResults = {};
  for (const fn of selectionStatisticFunctions) {
    statisticFnResults[fn.name] = undefined;
  }
  return statisticFnResults;
}

interface CountChartData {
  data: number[];
  labels: string[];
  positions: Position[][];
}

interface HistogramData {
  data: number[];
  tooltipLabels: string[];
  tickLabels: string[];
}

interface PositionedValue<T> extends Position {
  value: T;
}

export class ColumnStatisticsStore extends SpreadsheetStore {
  mutators = ["updateIgnoredRows", "selectNextColumn", "selectPreviousColumn"] as const;
  statisticFnResults: StatisticFnResults = buildEmptyStatisticFnResults(columnStatisticFunctions);
  selectedColumn?: number;
  numericValues: PositionedValue<number>[] = [];
  values: PositionedValue<CellValue>[] = [];
  dataFormat?: string;
  countChartData?: CountChartData;
  histogramData?: HistogramData;
  private isDirty = false;
  ignoredRows = 0;

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.refreshStatistics.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.refreshStatistics();
  }

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this.isDirty = true;
    }
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "GROUP_HEADERS":
      case "UNGROUP_HEADERS":
      case "ACTIVATE_SHEET":
      case "ACTIVATE_NEXT_SHEET":
      case "ACTIVATE_PREVIOUS_SHEET":
      case "EVALUATE_CELLS":
      case "UNDO":
      case "REDO":
        this.isDirty = true;
    }
  }

  finalize() {
    if (this.isDirty) {
      this.isDirty = false;
      this.refreshStatistics();
    }
  }

  get hasSingleColumn(): boolean {
    return this.selectedColumn !== undefined;
  }

  private computeCountChartData(): CountChartData | undefined {
    if (this.selectedColumn === undefined) {
      return undefined;
    }
    const values = this.numericValues.length ? this.numericValues : this.values;
    if (!values.length) {
      return undefined;
    }
    const countMap = new Map<string, { positions: Position[]; count: number; value: CellValue }>();
    for (const val of values) {
      if (val.value === null || val.value === undefined) {
        continue;
      }
      const formattedValue =
        typeof val.value === "number"
          ? formatValue(val.value, this.localeFormat)
          : val.value.toString();
      if (!countMap.has(formattedValue)) {
        countMap.set(formattedValue, { positions: [], count: 0, value: val.value });
      }
      countMap.get(formattedValue)!.positions.push({ row: val.row, col: val.col });
      countMap.get(formattedValue)!.count += 1;
    }
    const data: number[] = [];
    const positions: Position[][] = [];
    const labels: string[] = [];
    Array.from(countMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([val, count]) => {
        labels.push(val);
        data.push(count.count);
        positions.push(count.positions);
      });

    return { data, labels, positions };
  }

  private computeHistogramData(): HistogramData | undefined {
    const values = this.numericValues.map((v) => v.value);
    if (!values.length) {
      return undefined;
    }

    const barCount = 1 + Math.floor(Math.log2(values.length)); // Sturge's formula for optimal bin count
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const step = range / barCount;
    const data = new Array(barCount).fill(0);

    if (range === 0) {
      data[0] = values.length;
    } else {
      for (const value of values) {
        const ratio = (value - minValue) / range;
        const rawIndex = Math.floor(ratio * barCount);
        const index = Math.min(barCount - 1, rawIndex);
        data[index] += 1;
      }
    }

    const localeFormat = this.localeFormat;

    const tickLabels: string[] = [];
    const tooltipLabels: string[] = [];
    for (let i = 0; i <= barCount; i++) {
      tickLabels.push(formatValue(minValue + i * step, localeFormat));
      if (i !== 0) {
        const value = minValue + (i - 1) * step;
        tooltipLabels.push(
          `${formatValue(value, localeFormat)}-${formatValue(value + step, localeFormat)}`
        );
      }
    }

    return { data, tooltipLabels, tickLabels };
  }

  get valueFrequencies(): {
    value: string;
    count: number;
    positions: Position[];
  }[] {
    const count = this.countChartData;
    if (!count) {
      return [];
    }
    return count.labels.map((value, index) => ({
      value,
      count: count.data[index],
      positions: count.positions[index],
    }));
  }

  updateIgnoredRows(ignoredRows: number) {
    this.ignoredRows = ignoredRows;
    this.refreshStatistics();
  }

  private refreshStatistics() {
    const getters = this.getters;
    if (!getters.isSingleColSelected()) {
      this.selectedColumn = undefined;
      this.numericValues = [];
      this.values = [];
      this.statisticFnResults = buildEmptyStatisticFnResults(columnStatisticFunctions);
      this.dataFormat = undefined;
      this.countChartData = undefined;
      this.histogramData = undefined;
      return;
    }

    const { sheetId, col } = getters.getActivePosition();
    this.selectedColumn = col;
    const formatsInDataset = getters.getRangeFormats(
      getters.getRangeFromZone(sheetId, {
        top: 0,
        left: col,
        bottom: getters.getNumberRows(sheetId) - 1,
        right: col,
      })
    );
    this.dataFormat = formatsInDataset.find(isDefined) ?? "0.00";

    const numberOfRows = getters.getNumberRows(sheetId);
    const cells: EvaluatedCell[] = [];
    const numericValues: { row: number; col: number; value: number }[] = [];
    const values: { row: number; col: number; value: EvaluatedCell["value"] }[] = [];

    let ignoredRowsCount = 0;

    for (let row = 0; row < numberOfRows; row++) {
      if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, col)) {
        continue;
      }
      if (ignoredRowsCount < this.ignoredRows) {
        ignoredRowsCount++;
        continue;
      }

      const evaluatedCell = getters.getEvaluatedCell({ sheetId, col: col, row });
      cells.push(evaluatedCell);
      if (
        evaluatedCell.type !== CellValueType.empty &&
        evaluatedCell.type !== CellValueType.error
      ) {
        values.push({ row, col, value: evaluatedCell.value });
        if (evaluatedCell.type === CellValueType.number) {
          numericValues.push({ row, col, value: evaluatedCell.value });
        }
      }
    }

    const locale = getters.getLocale();
    this.statisticFnResults = computeStatisticFnResults(columnStatisticFunctions, cells, locale);
    this.numericValues = numericValues;
    this.values = values;
    this.countChartData = this.computeCountChartData();
    this.histogramData = this.computeHistogramData();
  }

  selectPreviousColumn() {
    if (this.selectedColumn === undefined) {
      return;
    }
    this.model.selection.moveAnchorCell("left", 1);
  }

  selectNextColumn() {
    if (this.selectedColumn === undefined) {
      return;
    }
    this.model.selection.moveAnchorCell("right", 1);
  }

  private get localeFormat(): LocaleFormat {
    return { locale: this.getters.getLocale(), format: this.dataFormat };
  }

  get statItems(): {
    name: string;
    value: string;
  }[] {
    const localeFormat = this.localeFormat;
    return Object.entries(this.statisticFnResults).map(([name, fnValue]) => {
      if (fnValue?.value === undefined) {
        return { name, value: "—" };
      }
      return {
        name,
        value: formatValue(fnValue.value(), {
          locale: localeFormat.locale,
          format: fnValue.format ?? localeFormat.format,
        }),
      };
    });
  }
}
