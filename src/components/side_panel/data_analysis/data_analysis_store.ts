import { sum } from "../../../functions/helper_math";
import { average, max, median, min } from "../../../functions/helper_statistical";
import { formatValue } from "../../../helpers/format/format";
import { isDefined } from "../../../helpers/misc";
import { splitReference } from "../../../helpers/references";
import {
  computeStatisticFnResults,
  SelectionStatisticFunction,
  StatisticFnResults,
} from "../../../helpers/selection_statistic_functions";
import { toZone } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { _t } from "../../../translation";
import { CellValue, CellValueType, EvaluatedCell } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { LocaleFormat } from "../../../types/format";
import { Position } from "../../../types/misc";
import { Get } from "../../../types/store_engine";

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

interface PositionedValue<T> extends Position {
  value: T;
}

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = ["updateRanges"] as const;
  statisticFnResults: StatisticFnResults = buildEmptyStatisticFnResults(columnStatisticFunctions);
  numericValues: PositionedValue<number>[] = [];
  values: PositionedValue<CellValue>[] = [];
  dataFormat?: string;
  countChartData?: CountChartData;
  private isDirty = false;
  ranges?: string[];

  constructor(get: Get, initialRanges: string[]) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.refreshStatistics.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.ranges = initialRanges;
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

  private computeCountChartData(): CountChartData | undefined {
    if (this.ranges === undefined) {
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

  updateRanges(ranges: string[]) {
    this.ranges = ranges;
    this.refreshStatistics();
  }

  private refreshStatistics() {
    const getters = this.getters;
    const { col } = getters.getActivePosition();
    const formatsInDataset = this.ranges
      ?.map((range) => {
        const { sheetName, xc } = splitReference(range);
        const sheetId = getters.getSheetIdByName(sheetName) ?? getters.getActiveSheetId();
        const zone = toZone(xc);
        getters
          .getEvaluatedCellsInZone(sheetId, {
            top: zone.top,
            left: col,
            bottom: getters.getNumberRows(sheetId) - 1,
            right: col,
          })
          .map((cell) => cell.format);
      })
      .flat();
    this.dataFormat = formatsInDataset?.find(isDefined) ?? "0.00";

    const cells: EvaluatedCell[] = [];
    const numericValues: { row: number; col: number; value: number }[] = [];
    const values: { row: number; col: number; value: EvaluatedCell["value"] }[] = [];

    for (const range of this.ranges ?? []) {
      const { sheetName, xc } = splitReference(range);
      const zone = toZone(xc);
      const sheetId = getters.getSheetIdByName(sheetName) ?? getters.getActiveSheetId();
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, col)) {
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
      }
    }

    const locale = getters.getLocale();
    this.statisticFnResults = computeStatisticFnResults(columnStatisticFunctions, cells, locale);
    this.numericValues = numericValues;
    this.values = values;
    this.countChartData = this.computeCountChartData();
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
