import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { toXC } from "../../helpers/coordinates";
import { deepCopy, getUniqueText, range } from "../../helpers/misc";
import { toLowerCase } from "../../helpers/text_helper";
import { positions, toZone, zoneToDimension } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { Command, CommandResult, LocalCommand, UpdateFilterCommand } from "../../types/commands";
import { GenericCriterion } from "../../types/generic_criterion";
import { DEFAULT_LOCALE } from "../../types/locale";
import { CellPosition, FilterId, HeaderIndex, UID } from "../../types/misc";
import { CriterionFilter, DataFilterValue, Table } from "../../types/table";
import { ExcelFilterData, ExcelWorkbookData } from "../../types/workbook_data";
import { UIPlugin } from "../ui_plugin";

const EMPTY_CRITERION: CriterionFilter = { filterType: "criterion", type: "none", values: [] };

export class FilterEvaluationPlugin extends UIPlugin {
  static getters = [
    "getFilterValue",
    "getFilterHiddenValues",
    "getFilterCriterionValue",
    "getFirstTableInSelection",
    "isRowFiltered",
    "isFilterActive",
    "getFilteredRows",
  ] as const;

  private filterValues: Record<UID, Record<FilterId, DataFilterValue>> = {};

  hiddenRows: Record<UID, Set<number> | undefined> = {};
  isEvaluationDirty = false;

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "UPDATE_FILTER":
        if (!this.getters.getFilterId(cmd)) {
          return CommandResult.FilterNotFound;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "UPDATE_CELL":
      case "SET_FORMATTING":
      case "EVALUATE_CELLS":
      case "ACTIVATE_SHEET":
      case "REMOVE_TABLE":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "UPDATE_TABLE":
        this.isEvaluationDirty = true;
        break;
      case "START":
        for (const sheetId of this.getters.getSheetIds()) {
          this.filterValues[sheetId] = {};
        }
        break;
      case "CREATE_SHEET":
        this.filterValues[cmd.sheetId] = {};
        break;
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "GROUP_HEADERS":
      case "UNGROUP_HEADERS":
      case "FOLD_HEADER_GROUP":
      case "UNFOLD_HEADER_GROUP":
      case "FOLD_ALL_HEADER_GROUPS":
      case "UNFOLD_ALL_HEADER_GROUPS":
      case "FOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_HEADER_GROUPS_IN_ZONE":
        this.updateHiddenRows(cmd.sheetId);
        break;
      case "UPDATE_FILTER":
        this.updateFilter(cmd);
        this.updateHiddenRows(cmd.sheetId);
        break;
      case "DUPLICATE_SHEET":
        this.filterValues[cmd.sheetIdTo] = deepCopy(this.filterValues[cmd.sheetId]);
        break;
      // If we don't handle DELETE_SHEET, on one hand we will have some residual data, on the other hand we keep the data
      // on DELETE_SHEET followed by undo
    }
  }

  finalize() {
    if (this.isEvaluationDirty) {
      for (const sheetId of this.getters.getSheetIds()) {
        this.updateHiddenRows(sheetId);
      }
      this.isEvaluationDirty = false;
    }
  }

  isRowFiltered(sheetId: UID, row: number): boolean {
    return !!this.hiddenRows[sheetId]?.has(row);
  }

  getFilteredRows(sheetId: UID): HeaderIndex[] {
    if (!this.hiddenRows[sheetId]) return [];
    return [...this.hiddenRows[sheetId].values()];
  }

  getFilterValue(position: CellPosition): DataFilterValue | undefined {
    const id = this.getters.getFilterId(position);
    const sheetId = position.sheetId;
    return id ? this.filterValues[sheetId]?.[id] : undefined;
  }

  getFilterHiddenValues(position: CellPosition): string[] {
    const id = this.getters.getFilterId(position);
    const sheetId = position.sheetId;
    if (!id || !this.filterValues[sheetId]) {
      return [];
    }
    const value = this.filterValues[sheetId][id] || [];
    return value.filterType === "values" ? value.hiddenValues : [];
  }

  getFilterCriterionValue(position: CellPosition): CriterionFilter {
    const id = this.getters.getFilterId(position);
    const sheetId = position.sheetId;
    if (!id || !this.filterValues[sheetId]) {
      return EMPTY_CRITERION;
    }
    const value = this.filterValues[sheetId][id];
    return value && value.filterType === "criterion" ? value : EMPTY_CRITERION;
  }

  isFilterActive(position: CellPosition): boolean {
    const id = this.getters.getFilterId(position);
    if (!id) {
      return false;
    }
    const sheetId = position.sheetId;
    const value = this.filterValues[sheetId]?.[id];
    if (!value) {
      return false;
    }
    return value.filterType === "values" ? value.hiddenValues.length > 0 : value.type !== "none";
  }

  getFirstTableInSelection(): Table | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const selection = this.getters.getSelectedZones();
    return this.getters.getTablesOverlappingZones(sheetId, selection)[0];
  }

  private updateFilter({ col, row, value, sheetId }: UpdateFilterCommand) {
    const id = this.getters.getFilterId({ sheetId, col, row });
    if (!id) {
      return;
    }
    if (!this.filterValues[sheetId]) {
      this.filterValues[sheetId] = {};
    }
    this.filterValues[sheetId][id] = value;
  }

  private updateHiddenRows(sheetId: UID) {
    const filters = this.getters
      .getFilters(sheetId)
      .sort(
        (filter1, filter2) => filter1.rangeWithHeaders.zone.top - filter2.rangeWithHeaders.zone.top
      );

    const hiddenRows = new Set<number>();
    for (const filter of filters) {
      // Disable filters whose header are hidden
      const filterValue = this.filterValues[sheetId]?.[filter.id];
      const filteredZone = filter.filteredRange?.zone;
      if (
        !filterValue ||
        !filteredZone ||
        hiddenRows.has(filter.rangeWithHeaders.zone.top) ||
        this.getters.isRowHiddenByUser(sheetId, filter.rangeWithHeaders.zone.top)
      ) {
        continue;
      }
      if (filterValue.filterType === "values") {
        const filteredValues = filterValue.hiddenValues?.map(toLowerCase);
        if (!filteredValues) {
          continue;
        }
        const filteredValuesSet = new Set(filteredValues);
        for (let row = filteredZone.top; row <= filteredZone.bottom; row++) {
          const value = this.getCellValueAsString(sheetId, filter.col, row);
          if (filteredValuesSet.has(value)) {
            hiddenRows.add(row);
          }
        }
      } else {
        if (filterValue.type === "none") {
          continue;
        }
        const evaluator = criterionEvaluatorRegistry.get(filterValue.type);
        const preComputedCriterion = evaluator.preComputeCriterion?.(
          filterValue as GenericCriterion,
          [filter.filteredRange],
          this.getters
        );

        const evaluatedCriterionValues = filterValue.values.map((value) => {
          if (!value.startsWith("=")) {
            return parseLiteral(value, DEFAULT_LOCALE);
          }
          return this.getters.evaluateFormula(sheetId, value) ?? "";
        });
        if (evaluatedCriterionValues.some(isMultipleElementMatrix)) {
          continue;
        }

        const evaluatedCriterion = {
          type: filterValue.type,
          values: evaluatedCriterionValues.map(toScalar),
          dateValue: filterValue.dateValue,
        };
        for (let row = filteredZone.top; row <= filteredZone.bottom; row++) {
          const position = { sheetId, col: filter.col, row };
          const value = this.getters.getEvaluatedCell(position).value ?? "";
          if (!evaluator.isValueValid(value, evaluatedCriterion, preComputedCriterion)) {
            hiddenRows.add(row);
          }
        }
      }
    }
    this.hiddenRows[sheetId] = hiddenRows;
  }

  private getCellValueAsString(sheetId: UID, col: number, row: number): string {
    const value = this.getters.getEvaluatedCell({ sheetId, col, row }).formattedValue;
    return value.toLowerCase();
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheetData of data.sheets) {
      const sheetId = sheetData.id;
      for (const tableData of sheetData.tables) {
        const tableZone = toZone(tableData.range);
        const filters: ExcelFilterData[] = [];
        const headerNames: string[] = [];
        for (const i of range(0, zoneToDimension(tableZone).numberOfCols)) {
          const position = {
            sheetId: sheetData.id,
            col: tableZone.left + i,
            row: tableZone.top,
          };
          const filteredValues: string[] = this.getFilterHiddenValues(position);

          const filter = this.getters.getFilter(position);

          const valuesInFilterZone = filter?.filteredRange
            ? positions(filter.filteredRange.zone).map(
                (position) => this.getters.getEvaluatedCell({ sheetId, ...position }).formattedValue
              )
            : [];

          if (filteredValues.length) {
            const xlsxDisplayedValues = valuesInFilterZone
              .filter((val) => val)
              .filter((val) => !filteredValues.includes(val));
            filters.push({
              colId: i,
              displayedValues: [...new Set(xlsxDisplayedValues)],
              displayBlanks: !filteredValues.includes("") && valuesInFilterZone.some((val) => !val),
            });
          }

          // In xlsx, column header should ALWAYS be a string and should be unique in the table
          const headerString = this.getters.getEvaluatedCell(position).formattedValue;
          const headerName = this.getUniqueColNameForExcel(i, headerString, headerNames);
          headerNames.push(headerName);
          const xc = toXC(position.col, position.row);
          sheetData.cells[xc] = headerName;
          sheetData.cellValues[xc] = headerName;
        }
        tableData.filters = filters;
      }
    }
  }

  /**
   * Get an unique column name for the column at colIndex. If the column name is already in the array of used column names,
   * concatenate a number to the name until we find a new unique name (eg. "ColName" => "ColName1" => "ColName2" ...)
   */
  private getUniqueColNameForExcel(
    colIndex: number,
    colName: string | undefined,
    usedColNames: string[]
  ): string {
    if (!colName) {
      colName = `Column${colIndex}`;
    }
    return getUniqueText(colName, usedColNames, {
      compute: (name, i) => colName + String(i),
      start: 2,
    });
  }
}
