import { sum } from "../../../functions/helper_math";
import { average, countAny, countNumbers, max, min } from "../../../functions/helper_statistical";
import { isDateTimeFormat } from "../../../helpers/format/format";
import { recomputeZones } from "../../../helpers/recompute_zones";
import {
  SelectionStatisticFunction,
  StatisticFnResults,
  computeStatisticFnResults,
} from "../../../helpers/selection_statistic_functions";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { _t } from "../../../translation";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

const selectionStatisticFunctions: SelectionStatisticFunction[] = [
  {
    name: _t("Sum"),
    types: [CellValueType.number],
    compute: (values, locale) => sum([[values]], locale),
    visible: (values, locale) =>
      values.some((cell) => !cell.format || !isDateTimeFormat(cell.format)),
    computeFormat: (values, locale) =>
      values.find((cell) => !cell.format || !isDateTimeFormat(cell.format))?.format ?? "",
  },
  {
    name: _t("Avg"),
    types: [CellValueType.number],
    compute: (values, locale) => average([[values]], locale),
    visible: (values, locale) =>
      values.some((cell) => !cell.format || !isDateTimeFormat(cell.format)),
    computeFormat: (values, locale) => values[0]?.format ?? "",
  },
  {
    name: _t("Min"),
    types: [CellValueType.number],
    compute: (values, locale) => min([[values]], locale).value,
    visible: (values, locale) => values.length > 0,
    computeFormat: (values, locale) => values[0]?.format ?? "",
  },
  {
    name: _t("Max"),
    types: [CellValueType.number],
    compute: (values, locale) => max([[values]], locale).value,
    visible: (values, locale) => values.length > 0,
    computeFormat: (values, locale) => values[0]?.format ?? "",
  },
  {
    name: _t("Count"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values) => countAny([[values]]),
    computeFormat: (values, locale) => "",
  },
  {
    name: _t("Count Numbers"),
    types: [CellValueType.number, CellValueType.text, CellValueType.boolean, CellValueType.error],
    compute: (values, locale) => countNumbers([[values]], locale),
    computeFormat: (values, locale) => "",
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
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
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
    const cells: EvaluatedCell[] = [];

    const recomputedZones = recomputeZones(getters.getSelectedZones(), []);
    const heightMax = this.getters.getSheetSize(sheetId).numberOfRows - 1;
    const widthMax = this.getters.getSheetSize(sheetId).numberOfCols - 1;

    for (const zone of recomputedZones) {
      for (let col = zone.left; col <= (zone.right ?? widthMax); col++) {
        for (let row = zone.top; row <= (zone.bottom ?? heightMax); row++) {
          if (getters.isRowHidden(sheetId, row) || getters.isColHidden(sheetId, col)) {
            continue; // Skip hidden cells
          }

          const evaluatedCell = getters.getEvaluatedCell({ sheetId, col, row });
          if (evaluatedCell.type !== CellValueType.empty) {
            cells.push(evaluatedCell);
          }
        }
      }
    }
    const locale = getters.getLocale();
    return computeStatisticFnResults(selectionStatisticFunctions, cells, locale);
  }
}
