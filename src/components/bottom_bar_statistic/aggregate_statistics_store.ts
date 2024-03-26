import { sum } from "../../functions/helper_math";
import { average, countAny, countNumbers, max, min } from "../../functions/helper_statistical";
import { memoize } from "../../helpers";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { _t } from "../../translation";
import {
  CellValueType,
  Command,
  EvaluatedCell,
  Locale,
  invalidateEvaluationCommands,
} from "../../types";

export interface StatisticFnResults {
  [name: string]: number | undefined;
}

interface SelectionStatisticFunction {
  name: string;
  compute: (data: EvaluatedCell[], locale: Locale) => number;
  types: CellValueType[];
}

const selectionStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _t("Sum"),
    types: [CellValueType.number],
    compute: (values, locale) => sum([[values]], locale),
  },
  {
    name: _t("Avg"),
    types: [CellValueType.number],
    compute: (values, locale) => average([[values]], locale),
  },
  {
    name: _t("Min"),
    types: [CellValueType.number],
    compute: (values, locale) => min([[values]], locale),
  },
  {
    name: _t("Max"),
    types: [CellValueType.number],
    compute: (values, locale) => max([[values]], locale),
  },
  {
    name: _t("Count"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values) => countAny([[values]]),
  },
  {
    name: _t("Count Numbers"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values, locale) => countNumbers([[values]], locale),
  },
];

export class AggregateStatisticsStore extends SpreadsheetStore {
  statisticFnResults: StatisticFnResults = this._computeStatisticFnResults();
  private isDirty = false;

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.handleEvent.bind(this),
    });
  }

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && "content" in cmd)
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
      this.statisticFnResults = this._computeStatisticFnResults();
    }
  }

  handleEvent() {
    if (this.getters.isGridSelectionActive()) {
      this.statisticFnResults = this._computeStatisticFnResults();
    }
  }

  private _computeStatisticFnResults(): StatisticFnResults {
    const getters = this.getters;
    const sheetId = getters.getActiveSheetId();
    const cells = new Set<EvaluatedCell>();

    const zones = getters.getSelectedZones();
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, col)) {
            continue; // Skip hidden cells
          }

          const evaluatedCell = getters.getEvaluatedCell({ sheetId, col, row });
          if (evaluatedCell.type !== CellValueType.empty) {
            cells.add(evaluatedCell);
          }
        }
      }
    }
    const locale = getters.getLocale();
    let statisticFnResults: StatisticFnResults = {};
    const cellsArray = [...cells];

    const getCells = memoize((typeStr: string) => {
      const types = typeStr.split(",");
      return cellsArray.filter((c) => types.includes(c.type));
    });
    for (let fn of selectionStatisticFunctions) {
      // We don't want to display statistical information when there is no interest:
      // We set the statistical result to undefined if the data handled by the selection
      // does not match the data handled by the function.
      // Ex: if there are only texts in the selection, we prefer that the SUM result
      // be displayed as undefined rather than 0.
      let fnResult: number | undefined = undefined;
      const evaluatedCells = getCells(fn.types.join(","));
      if (evaluatedCells.length) {
        fnResult = fn.compute(evaluatedCells, locale);
      }
      statisticFnResults[fn.name] = fnResult;
    }
    return statisticFnResults;
  }
}
