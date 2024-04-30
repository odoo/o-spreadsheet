import {
  deepCopy,
  positions,
  range,
  toLowerCase,
  toXC,
  toZone,
  zoneToDimension,
} from "../../helpers";
import {
  CellPosition,
  Command,
  CommandResult,
  ExcelFilterData,
  ExcelWorkbookData,
  FilterId,
  Table,
  UID,
} from "../../types";
import { LocalCommand, UpdateFilterCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class FilterEvaluationPlugin extends UIPlugin {
  static getters = [
    "getFilterHiddenValues",
    "getFirstTableInSelection",
    "isRowFiltered",
    "isFilterActive",
  ] as const;

  private filterValues: Record<UID, Record<FilterId, string[]>> = {};

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
      case "EVALUATE_CELLS":
      case "ACTIVATE_SHEET":
      case "REMOVE_TABLE":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "UPDATE_TABLE":
        this.isEvaluationDirty = true;
        break;
      case "START":
        // console.log((this as any).constructor.name);

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

  getFilterHiddenValues(position: CellPosition): string[] {
    const id = this.getters.getFilterId(position);
    const sheetId = position.sheetId;
    if (!id || !this.filterValues[sheetId]) return [];
    return this.filterValues[sheetId][id] || [];
  }

  isFilterActive(position: CellPosition): boolean {
    const id = this.getters.getFilterId(position);
    const sheetId = position.sheetId;
    return Boolean(id && this.filterValues[sheetId]?.[id]?.length);
  }

  getFirstTableInSelection(): Table | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const selection = this.getters.getSelectedZones();
    return this.getters.getTablesOverlappingZones(sheetId, selection)[0];
  }

  private updateFilter({ col, row, hiddenValues, sheetId }: UpdateFilterCommand) {
    const id = this.getters.getFilterId({ sheetId, col, row });
    if (!id) return;
    if (!this.filterValues[sheetId]) this.filterValues[sheetId] = {};
    this.filterValues[sheetId][id] = hiddenValues;
  }

  private updateHiddenRows(sheetId: UID) {
    const filters = this.getters
      .getFilters(sheetId)
      .sort(
        (filter1, filter2) => filter1.rangeWithHeaders.zone.top - filter2.rangeWithHeaders.zone.top
      );

    const hiddenRows = new Set<number>();
    for (let filter of filters) {
      // Disable filters whose header are hidden
      if (
        hiddenRows.has(filter.rangeWithHeaders.zone.top) ||
        this.getters.isRowHiddenByUser(sheetId, filter.rangeWithHeaders.zone.top)
      ) {
        continue;
      }
      const filteredValues = this.filterValues[sheetId]?.[filter.id]?.map(toLowerCase);
      const filteredZone = filter.filteredRange?.zone;
      if (!filteredValues || !filteredZone) continue;
      for (let row = filteredZone.top; row <= filteredZone.bottom; row++) {
        const value = this.getCellValueAsString(sheetId, filter.col, row);
        if (filteredValues.includes(value)) {
          hiddenRows.add(row);
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
          sheetData.cells[toXC(position.col, position.row)] = {
            ...sheetData.cells[toXC(position.col, position.row)],
            content: headerName,
            value: headerName,
            isFormula: false,
          };
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
    let currentColName = colName;
    let i = 2;
    while (usedColNames.includes(currentColName)) {
      currentColName = colName + String(i);
      i++;
    }
    return currentColName;
  }
}
