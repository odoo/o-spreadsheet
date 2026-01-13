import { sum } from "@odoo/o-spreadsheet-engine/functions/helper_math";
import { average, max, median, min } from "@odoo/o-spreadsheet-engine/functions/helper_statistical";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { isDefined, numberToLetters } from "../../../helpers";
import {
  buildEmptyStatisticFnResults,
  computeStatisticFnResults,
  SelectionStatisticFunction,
  StatisticFnResults,
} from "../../../helpers/selection_statistic_functions";
import { Get, useLocalStore } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { HighlightStore } from "../../../stores/highlight_store";
import {
  CellValueType,
  Command,
  EvaluatedCell,
  Highlight,
  invalidateEvaluationCommands,
} from "../../../types";

const columnStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _t("Total rows"),
    types: Object.values(CellValueType),
    compute: (values, locale) => values.length.toString(),
  },
  {
    name: _t("Empty cells"),
    types: [CellValueType.empty],
    compute: (values, locale) => values.length.toString(),
  },
  {
    name: _t("Unique values"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values, locale) => {
      const uniqueValues = new Set<string | number | boolean>();
      for (const cell of values) {
        uniqueValues.add(cell.value as string | number | boolean);
      }
      return uniqueValues.size.toString();
    },
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
  numericValues: number[] = [];
  values: any[] = [];
  dataFormat?: string;
  private isDirty = false;
  private ignoreHeader = false;
  protected highlightStore = useLocalStore(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.refreshStatistics.bind(this),
    });
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.model.selection.unobserve(this);
      this.highlightStore.unRegister(this);
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

  get highlights(): Highlight[] {
    if (this.selectedColumn === undefined) {
      return [];
    }
    const column = numberToLetters(this.selectedColumn);
    return [
      {
        range: this.getters.getRangeFromSheetXC(
          this.getters.getActiveSheetId(),
          `${column}:${column}`
        ),
        color: "#5c9e5cff",
        interactive: true,
      },
    ];
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

    const sheetId = getters.getActiveSheetId();
    const column = getters.getActivePosition().col;
    this.selectedColumn = column;
    const formatsInDataset = getters
      .getEvaluatedCellsInZone(sheetId, {
        top: 0,
        left: column,
        bottom: getters.getNumberRows(sheetId) - 1,
        right: column,
      })
      .map((cell) => cell.format);
    this.dataFormat = formatsInDataset.find(isDefined) ?? "0.00";

    const numberOfRows = getters.getNumberRows(sheetId);
    const cells: EvaluatedCell[] = [];
    const numericValues: number[] = [];
    const values: any[] = [];

    let headerIgnored = false;

    for (let row = 0; row < numberOfRows; row++) {
      if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, column)) {
        continue;
      }

      const evaluatedCell = getters.getEvaluatedCell({ sheetId, col: column, row });
      if (evaluatedCell.type !== CellValueType.empty && this.ignoreHeader && !headerIgnored) {
        headerIgnored = true;
        continue;
      }
      cells.push(evaluatedCell);
      if (
        evaluatedCell.type !== CellValueType.empty &&
        evaluatedCell.type !== CellValueType.error
      ) {
        values.push(evaluatedCell.value);
        if (evaluatedCell.type === CellValueType.number) {
          numericValues.push(evaluatedCell.value as number);
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
}
