import { DEFAULT_FILTER_BORDER_DESC } from "../../constants";
import {
  isInside,
  isObjectEmptyRecursive,
  range,
  removeFalsyAttributes,
  toLowerCase,
} from "../../helpers";
import { Border, Command, CommandResult, FilterId, Position, UID } from "../../types";
import { UIPlugin } from "../ui_plugin";
import { UpdateFilterCommand } from "./../../types/commands";

export class FilterEvaluationPlugin extends UIPlugin {
  static getters = [
    "getCellBorderWithFilterBorder",
    "getFilterHeaders",
    "getFilterValues",
    "isFilterHeader",
    "isRowFiltered",
    "isFilterActive",
  ] as const;

  private filterValues: Record<UID, Record<FilterId, string[]>> = {};

  hiddenRows: Set<number> = new Set();
  isEvaluationDirty = false;

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_FILTER":
        if (!this.getters.getFilterId(cmd.sheetId, cmd.col, cmd.row)) {
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
        this.isEvaluationDirty = true;
        break;
      case "UPDATE_FILTER":
        this.updateFilter(cmd);
        this.updateHiddenRows();
        break;
      case "DUPLICATE_SHEET":
        const filterValues: Record<FilterId, string[]> = {};
        for (const copiedFilter of this.getters.getFilters(cmd.sheetId)) {
          const zone = copiedFilter.zoneWithHeaders;
          const newFilter = this.getters.getFilter(cmd.sheetIdTo, zone.left, zone.top)!;
          filterValues[newFilter.id] = this.filterValues[cmd.sheetId][copiedFilter.id];
        }
        this.filterValues[cmd.sheetIdTo] = filterValues;
        break;
      // If we don't handle DELETE_SHEET, on one hand we will have some residual data, on the other hand we keep the data
      // on DELETE_SHEET followed by undo
    }
  }

  finalize() {
    if (this.isEvaluationDirty) {
      this.updateHiddenRows();
      this.isEvaluationDirty = false;
    }
  }

  isRowFiltered(sheetId: UID, row: number) {
    if (sheetId !== this.getters.getActiveSheetId()) {
      return false;
    }

    return this.hiddenRows.has(row);
  }

  getCellBorderWithFilterBorder(sheetId: UID, col: number, row: number): Border | null {
    let filterBorder: Border | undefined = undefined;
    for (let filters of this.getters.getFilterTables(sheetId)) {
      const zone = filters.zone;

      // The borders should be at the edges of the visible zone of the filter
      const colsRange = range(zone.left, zone.right + 1);
      const rowsRange = range(zone.top, zone.bottom + 1);
      const visibleLeft = this.getters.findVisibleHeader(sheetId, "COL", colsRange);
      const visibleRight = this.getters.findVisibleHeader(sheetId, "COL", colsRange.reverse());
      const visibleTop = this.getters.findVisibleHeader(sheetId, "ROW", rowsRange);
      const visibleBottom = this.getters.findVisibleHeader(sheetId, "ROW", rowsRange.reverse());

      if (isInside(col, row, zone)) {
        filterBorder = {
          top: row === visibleTop ? DEFAULT_FILTER_BORDER_DESC : undefined,
          bottom: row === visibleBottom ? DEFAULT_FILTER_BORDER_DESC : undefined,
          left: col === visibleLeft ? DEFAULT_FILTER_BORDER_DESC : undefined,
          right: col === visibleRight ? DEFAULT_FILTER_BORDER_DESC : undefined,
        };
      }
    }

    const cellBorder = this.getters.getCellBorder(sheetId, col, row);

    // Use removeFalsyAttributes to avoid overwriting filter borders with undefined values
    const border = { ...filterBorder, ...removeFalsyAttributes(cellBorder || {}) };

    return isObjectEmptyRecursive(border) ? null : border;
  }

  getFilterHeaders(sheetId: UID): Position[] {
    const headers: Position[] = [];
    for (let filters of this.getters.getFilterTables(sheetId)) {
      const zone = filters.zone;
      if (!zone) {
        continue;
      }
      const row = zone.top;
      for (let col = zone.left; col <= zone.right; col++) {
        if (this.getters.isColHidden(sheetId, col) || this.getters.isRowHidden(sheetId, row)) {
          continue;
        }
        headers.push({ col, row });
      }
    }
    return headers;
  }

  getFilterValues(sheetId: UID, col: number, row: number): string[] {
    const id = this.getters.getFilterId(sheetId, col, row);
    if (!id || !this.filterValues[sheetId]) return [];
    return this.filterValues[sheetId][id] || [];
  }

  isFilterHeader(sheetId: UID, col: number, row: number): boolean {
    const headers = this.getFilterHeaders(sheetId);
    return headers.some((header) => header.col === col && header.row === row);
  }

  isFilterActive(sheetId: UID, col: number, row: number): boolean {
    const id = this.getters.getFilterId(sheetId, col, row);
    return Boolean(id && this.filterValues[sheetId]?.[id]?.length);
  }

  private updateFilter({ col, row, values, sheetId }: UpdateFilterCommand) {
    const id = this.getters.getFilterId(sheetId, col, row);
    if (!id) return;
    if (!this.filterValues[sheetId]) this.filterValues[sheetId] = {};
    this.filterValues[sheetId][id] = values;
  }

  private updateHiddenRows() {
    const sheetId = this.getters.getActiveSheetId();
    const filters = this.getters.getFilters(sheetId);

    const hiddenRows = new Set<number>();
    for (let filter of filters) {
      const filteredValues = this.filterValues[sheetId]?.[filter.id]?.map(toLowerCase);
      if (!filteredValues || !filter.filteredZone) continue;
      for (let row = filter.filteredZone.top; row <= filter.filteredZone.bottom; row++) {
        const value = this.getCellValueAsString(sheetId, filter.col, row);
        if (filteredValues.includes(value)) {
          hiddenRows.add(row);
        }
      }
    }
    this.hiddenRows = hiddenRows;
  }

  private getCellValueAsString(sheetId: UID, col: number, row: number): string {
    const value = this.getters.getCell(sheetId, col, row)?.formattedValue;
    return value?.toLowerCase() || "";
  }
}
