import { sum } from "@odoo/o-spreadsheet-engine/functions/helper_math";
import { average, max, median, min } from "@odoo/o-spreadsheet-engine/functions/helper_statistical";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { formatValue, isDefined } from "../../../helpers";
import {
  buildEmptyStatisticFnResults,
  computeStatisticFnResults,
  SelectionStatisticFunction,
  StatisticFnResults,
} from "../../../helpers/selection_statistic_functions";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import {
  CellValueType,
  Command,
  EvaluatedCell,
  invalidateEvaluationCommands,
  LocaleFormat,
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
    compute: (values, locale) => median([[values]], locale),
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

export class ColumnStatisticsStore extends SpreadsheetStore {
  mutators = ["updateIgnoreHeader", "selectNextColumn", "selectPreviousColumn"] as const;
  statisticFnResults: StatisticFnResults = buildEmptyStatisticFnResults(columnStatisticFunctions);
  selectedColumn?: number;
  numericValues: {
    row: number;
    col: number;
    value: number;
  }[] = [];
  values: {
    row: number;
    col: number;
    value: any;
  }[] = [];
  dataFormat?: string;
  private isDirty = false;
  private ignoreHeader = false;

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

  get shouldIgnoreHeader(): boolean {
    return this.ignoreHeader;
  }

  get countChartData():
    | {
        data: number[];
        labels: string[];
        positions: { row: number; col: number }[][];
      }
    | undefined {
    if (this.selectedColumn === undefined) {
      return undefined;
    }
    const values = this.numericValues.length ? this.numericValues : this.values;
    if (!values.length) {
      return undefined;
    }
    const countMap = new Map<
      string,
      { positions: { row: number; col: number }[]; count: number; value: number }
    >();
    for (const val of values) {
      const formattedValue =
        typeof val.value === "number" ? formatValue(val.value, this.localeFormat) : val.value;
      countMap.set(formattedValue, {
        positions: [
          ...(countMap.get(formattedValue)?.positions ?? []),
          { row: val.row, col: val.col },
        ],
        count: (countMap.get(formattedValue)?.count ?? 0) + 1,
        value: val.value,
      });
    }
    const data: number[] = [];
    const positions: { row: number; col: number }[][] = [];
    const labels: string[] = [];
    Array.from(countMap.entries())
      .sort((a, b) => a[1].value - b[1].value)
      .forEach(([val, count]) => {
        labels.push(val);
        data.push(count.count);
        positions.push(count.positions);
      });

    return { data, labels, positions };
  }

  get histogramData():
    | {
        data: number[];
        labels: string[];
        tickLabels: string[];
      }
    | undefined {
    const values = this.numericValues;
    if (!values.length) {
      return undefined;
    }

    const barCount = 1 + Math.floor(Math.log2(Math.max(new Set(values).size, 1)));
    const minValue = Math.min(...values.map((v) => v.value));
    const maxValue = Math.max(...values.map((v) => v.value));
    const range = maxValue - minValue;
    const step = range / barCount;
    const data = new Array(barCount).fill(0);

    if (range === 0) {
      data[0] = values.length;
    } else {
      for (const value of values) {
        const ratio = (value.value - minValue) / range;
        const rawIndex = Math.floor(ratio * barCount);
        const index = Math.min(barCount - 1, Math.max(0, rawIndex));
        data[index] += 1;
      }
    }

    const localeFormat = this.localeFormat;

    const tickLabels: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i <= barCount; i++) {
      tickLabels.push(`${formatValue(minValue + i * step, localeFormat)}`);
      if (i !== 0) {
        const value = minValue + (i - 1) * step;
        labels.push(
          `${formatValue(value, localeFormat)}-${formatValue(value + step, localeFormat)}`
        );
      }
    }

    return { data, labels, tickLabels };
  }

  get valueFrequencies(): {
    value: any;
    count: number;
    positions: { row: number; col: number }[];
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

  updateIgnoreHeader(ignoreHeader: boolean) {
    this.ignoreHeader = ignoreHeader;
    this.refreshStatistics();
  }

  private refreshStatistics() {
    const getters = this.getters;
    if (!getters.isSingleColSelected()) {
      this.selectedColumn = undefined;
      this.numericValues = [];
      this.statisticFnResults = buildEmptyStatisticFnResults(columnStatisticFunctions);
      this.dataFormat = undefined;
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
    const values: { row: number; col: number; value: any }[] = [];

    let headerIgnored = false;

    for (let row = 0; row < numberOfRows; row++) {
      if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, col)) {
        continue;
      }

      const evaluatedCell = getters.getEvaluatedCell({ sheetId, col: col, row });
      if (evaluatedCell.type !== CellValueType.empty && this.ignoreHeader && !headerIgnored) {
        headerIgnored = true;
        continue;
      }
      cells.push(evaluatedCell);
      if (
        evaluatedCell.type !== CellValueType.empty &&
        evaluatedCell.type !== CellValueType.error
      ) {
        values.push({ row, col, value: evaluatedCell.value });
        if (evaluatedCell.type === CellValueType.number) {
          numericValues.push({ row, col, value: evaluatedCell.value as number });
        }
      }
    }

    const locale = getters.getLocale();
    this.statisticFnResults = computeStatisticFnResults(columnStatisticFunctions, cells, locale);
    this.numericValues = numericValues;
    this.values = values;
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

  get localeFormat(): LocaleFormat {
    return { locale: this.getters.getLocale(), format: this.dataFormat };
  }
}
