import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { toXC } from "../../helpers/coordinates";
import { deepCopy, getUniqueText, range } from "../../helpers/misc";
import { toTrimmedLowerCase } from "../../helpers/text_helper";
import { positions, toZone, zoneToDimension } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { Command, CommandResult, LocalCommand, UpdateFilterCommand } from "../../types/commands";
import { GenericCriterion } from "../../types/generic_criterion";
import { DEFAULT_LOCALE } from "../../types/locale";
import { CellPosition, FilterId, UID } from "../../types/misc";
import { BoundedRange } from "../../types/range";
import { CriterionFilter, DataFilterValue, Table } from "../../types/table";
import { ExcelFilterData, ExcelWorkbookData } from "../../types/workbook_data";
import { UIPlugin } from "../ui_plugin";

const EMPTY_CRITERION: CriterionFilter = { filterType: "criterion", type: "none", values: [] };

// Prefix for filter entity IDs in the registry
const FILTER_ENTITY_PREFIX = "filter_sheet_";

function getFilterEntityId(sheetId: UID): string {
  return FILTER_ENTITY_PREFIX + sheetId;
}

export class FilterEvaluationPlugin extends UIPlugin {
  static getters = [
    "getFilterValue",
    "getFilterHiddenValues",
    "getFilterCriterionValue",
    "getFirstTableInSelection",
    "isRowFiltered",
    "isFilterActive",
  ] as const;

  private filterValues: Record<UID, Record<FilterId, DataFilterValue>> = {};

  hiddenRows: Record<UID, Set<number> | undefined> = {};

  /**
   * Set of sheet IDs that need their hidden rows to be recalculated
   */
  private dirtySheets: Set<UID> = new Set();

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
      case "START":
        this.getters
          .getEntityDependencyRegistry()
          .registerInvalidationCallback("filter", (entityId) => this.invalidateFilter(entityId));

        for (const sheetId of this.getters.getSheetIds()) {
          this.filterValues[sheetId] = {};
          // Note: Filter dependencies are registered in finalize() because
          // DynamicTablesPlugin.finalize() needs to run first to compute the filters
          this.dirtySheets.add(sheetId);
        }
        break;
      case "UNDO":
      case "REDO":
        // Re-register all filter dependencies after undo/redo
        this.getters.getEntityDependencyRegistry().unregisterAllEntitiesOfType("filter");
        for (const sheetId of this.getters.getSheetIds()) {
          this.registerFilterDependencies(sheetId);
          this.dirtySheets.add(sheetId);
        }
        break;
      case "EVALUATE_CELLS":
      case "ACTIVATE_SHEET":
        // These commands may affect all sheets
        for (const sheetId of this.getters.getSheetIds()) {
          this.dirtySheets.add(sheetId);
        }
        break;
      case "CREATE_SHEET":
        this.filterValues[cmd.sheetId] = {};
        break;
      case "REMOVE_TABLE":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "UPDATE_TABLE":
        // Re-register filter dependencies when table structure changes
        this.registerFilterDependencies(cmd.sheetId);
        this.dirtySheets.add(cmd.sheetId);
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
        this.registerFilterDependencies(cmd.sheetIdTo);
        break;
      case "DELETE_SHEET":
        this.getters.getEntityDependencyRegistry().unregisterEntity(getFilterEntityId(cmd.sheetId));
        delete this.filterValues[cmd.sheetId];
        delete this.hiddenRows[cmd.sheetId];
        this.dirtySheets.delete(cmd.sheetId);
        break;
      // Note: UPDATE_CELL is now handled via EntityDependencyRegistry callback
    }
  }

  finalize() {
    if (this.dirtySheets.size > 0) {
      for (const sheetId of this.dirtySheets) {
        if (this.getters.tryGetSheet(sheetId)) {
          // Register dependencies first (filters are now available from DynamicTablesPlugin.finalize())
          this.registerFilterDependencies(sheetId);
          this.updateHiddenRows(sheetId);
        }
      }
      this.dirtySheets.clear();
    }
  }

  private invalidateFilter(entityId: UID): void {
    // Extract sheetId from the entity ID
    const sheetId = entityId.replace(FILTER_ENTITY_PREFIX, "");
    this.dirtySheets.add(sheetId);
  }

  private registerFilterDependencies(sheetId: UID): void {
    const filters = this.getters.getFilters(sheetId);
    const dependencies: BoundedRange[] = [];

    for (const filter of filters) {
      if (filter.filteredRange) {
        dependencies.push({
          sheetId: filter.filteredRange.sheetId,
          zone: filter.filteredRange.zone,
        });
      }
    }

    if (dependencies.length === 0) {
      // Unregister if no filters
      this.getters.getEntityDependencyRegistry().unregisterEntity(getFilterEntityId(sheetId));
      return;
    }

    this.getters.getEntityDependencyRegistry().registerEntity({
      id: getFilterEntityId(sheetId),
      type: "filter",
      dependencies,
    });
  }

  isRowFiltered(sheetId: UID, row: number): boolean {
    return !!this.hiddenRows[sheetId]?.has(row);
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
        const filteredValues = filterValue.hiddenValues?.map(toTrimmedLowerCase);
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
    return toTrimmedLowerCase(value);
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
