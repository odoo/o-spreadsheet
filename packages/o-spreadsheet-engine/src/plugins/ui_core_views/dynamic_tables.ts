import { CellPosition, FilterId, TableId, UID, Zone } from "../..";
import { deepEquals } from "../../helpers/misc";
import { createFilter } from "../../helpers/table_helpers";
import {
  areZonesContinuous,
  getZoneArea,
  isInside,
  overlap,
  positionToZone,
  toZone,
  union,
  zoneToXc,
} from "../../helpers/zones";
import { Command, invalidateEvaluationCommands } from "../../types/commands";
import { CellErrorType } from "../../types/errors";
import { PivotStyle } from "../../types/pivot";
import { CoreTable, DynamicTable, Filter, Table, TableConfig } from "../../types/table";
import { ExcelWorkbookData } from "../../types/workbook_data";

import { CoreViewPlugin } from "../core_view_plugin";

export class DynamicTablesPlugin extends CoreViewPlugin {
  static getters = [
    "canCreateDynamicTableOnZones",
    "doesZonesContainFilter",
    "getFilter",
    "getFilters",
    "getTable",
    "getTables",
    "getTablesOverlappingZones",
    "getFilterId",
    "getFilterHeaders",
    "isFilterHeader",
  ] as const;

  tables: Record<UID, Table[]> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd)) ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.tables = {};
      return;
    }
    switch (cmd.type) {
      case "CREATE_TABLE":
      case "REMOVE_TABLE":
      case "UPDATE_TABLE":
      case "DELETE_CONTENT":
        this.tables = {};
        break;
    }
  }

  finalize() {
    for (const sheetId of this.getters.getSheetIds()) {
      if (!this.tables[sheetId]) {
        this.tables[sheetId] = this.computeTables(sheetId);
      }
    }
  }

  private computeTables(sheetId: UID): Table[] {
    const tables: Table[] = [];
    const coreTables = this.getters.getCoreTables(sheetId);

    // First we create the static tables, so we can use them to compute collision with dynamic tables
    const staticTables = [...coreTables].filter((table) => table.type !== "dynamic");
    tables.push(...staticTables);

    // Then we create the dynamic tables
    for (const coreTable of this.getDynamicTables(sheetId)) {
      const table = this.coreTableToTable(sheetId, coreTable);
      let tableZone = table.range.zone;
      // Reduce the zone to avoid collision with static tables. Per design, dynamic tables can't overlap with other
      // dynamic tables, because formulas cannot spread on the same area, so we don't need to check for that.
      for (const staticTable of staticTables) {
        if (overlap(tableZone, staticTable.range.zone)) {
          tableZone = { ...tableZone, right: staticTable.range.zone.left - 1 };
        }
      }
      tables.push({ ...table, range: this.getters.getRangeFromZone(sheetId, tableZone) });
    }

    return tables;
  }

  private getDynamicTables(sheetId: UID): DynamicTable[] {
    const dynamicTablesFromCore = this.getters
      .getCoreTables(sheetId)
      .filter((table) => table.type === "dynamic");
    const pivotTables = this.getTablesFromPivots(sheetId);

    const pivotRanges = new Set(
      pivotTables.map((t) => this.getters.getRangeString(t.range, sheetId))
    );

    const nonPivotDynamicTables = dynamicTablesFromCore.filter(
      (t) => !pivotRanges.has(this.getters.getRangeString(t.range, sheetId))
    );

    return [...pivotTables, ...nonPivotDynamicTables];
  }

  private getTablesFromPivots(sheetId: UID): DynamicTable[] {
    const tables: DynamicTable[] = [];
    for (const { position, pivotStyle, pivotId } of this.getters.getAllPivotArrayFormulas()) {
      const spreadZone = this.getters.getSpreadZone(position);
      const cell = this.getters.getCell(position);
      if (
        position.sheetId !== sheetId ||
        !spreadZone ||
        !cell ||
        pivotStyle.tableStyleId === "None"
      ) {
        continue;
      }
      tables.push({
        type: "dynamic",
        id: "pivot_table_" + pivotId + "_" + cell.id,
        range: this.getters.getRangeFromZone(sheetId, positionToZone(position)),
        config: this.getTableConfigFromPivotStyle(pivotId, pivotStyle),
        isPivotTable: true,
      });
    }
    return tables;
  }

  private getTableConfigFromPivotStyle(
    pivotId: UID,
    pivotStyle: Required<PivotStyle>
  ): TableConfig {
    const pivot = this.getters.getPivot(pivotId);
    const pivotTable = pivot.getCollapsedTableStructure();
    const { numberOfRows, numberOfHeaderRows } = pivotTable.getPivotTableDimensions(pivotStyle);
    const lastVisibleCell = pivotTable.getPivotCells(pivotStyle)[0]?.[numberOfRows - 1];
    const hasVisibleTotalRow =
      pivotStyle.displayTotals &&
      lastVisibleCell?.type === "HEADER" &&
      lastVisibleCell.domain.length === 0;

    return {
      hasFilters: pivotStyle.hasFilters,
      totalRow: hasVisibleTotalRow,
      firstColumn: true,
      lastColumn: true,
      numberOfHeaders: numberOfHeaderRows,
      bandedRows: pivotStyle.bandedRows,
      bandedColumns: pivotStyle.bandedColumns,
      styleId: pivotStyle.tableStyleId,
    };
  }

  getFilters(sheetId: UID): Filter[] {
    return this.getTables(sheetId)
      .filter((table) => table.config.hasFilters)
      .map((table) => table.filters)
      .flat();
  }

  getTables(sheetId: UID): Table[] {
    return this.tables[sheetId] || [];
  }

  getFilter(position: CellPosition): Filter | undefined {
    const table = this.getTable(position);
    if (!table || !table.config.hasFilters) {
      return undefined;
    }
    return table.filters.find((filter) => filter.col === position.col);
  }

  getFilterId(position: CellPosition): FilterId | undefined {
    return this.getFilter(position)?.id;
  }

  getTable({ sheetId, col, row }: CellPosition): Table | undefined {
    return this.getTables(sheetId).find((table) => isInside(col, row, table.range.zone));
  }

  getTablesOverlappingZones(sheetId: UID, zones: Zone[]): Table[] {
    return this.getTables(sheetId).filter((table) =>
      zones.some((zone) => overlap(table.range.zone, zone))
    );
  }

  doesZonesContainFilter(sheetId: UID, zones: Zone[]): boolean {
    return this.getTablesOverlappingZones(sheetId, zones).some((table) => table.config.hasFilters);
  }

  getFilterHeaders(sheetId: UID): CellPosition[] {
    const headers: CellPosition[] = [];
    for (const table of this.getTables(sheetId)) {
      if (!table.config.hasFilters) {
        continue;
      }
      const zone = table.range.zone;
      const row = zone.top;
      for (let col = zone.left; col <= zone.right; col++) {
        headers.push({ sheetId, col, row });
      }
    }
    return headers;
  }

  isFilterHeader({ sheetId, col, row }: CellPosition): boolean {
    const headers = this.getFilterHeaders(sheetId);
    return headers.some((header) => header.col === col && header.row === row);
  }

  /**
   * Check if we can create a dynamic table on the given zones.
   * - The zones must be continuous
   * - The union of the zones must be either:
   *    - A single cell that contains an array formula
   *    - All the spread cells of a single array formula
   */
  canCreateDynamicTableOnZones(sheetId: UID, zones: Zone[]): boolean {
    if (!areZonesContinuous(zones)) {
      return false;
    }
    const unionZone = union(...zones);
    const topLeft = { col: unionZone.left, row: unionZone.top, sheetId };

    const parentSpreadingCell = this.getters.getArrayFormulaSpreadingOn(topLeft);
    if (!parentSpreadingCell) {
      const evaluatedCell = this.getters.getEvaluatedCell(topLeft);
      return (
        evaluatedCell.value === CellErrorType.SpilledBlocked && !evaluatedCell.errorOriginPosition
      );
    } else if (deepEquals(parentSpreadingCell, topLeft) && getZoneArea(unionZone) === 1) {
      return true;
    }

    const zone = this.getters.getSpreadZone(parentSpreadingCell);

    return deepEquals(unionZone, zone);
  }

  private coreTableToTable(sheetId: UID, table: CoreTable): Table {
    if (table.type !== "dynamic") {
      return table;
    }

    const tableZone = table.range.zone;
    const tablePosition = { sheetId, col: tableZone.left, row: tableZone.top };
    const zone = this.getters.getSpreadZone(tablePosition) ?? table.range.zone;
    const range = this.getters.getRangeFromZone(sheetId, zone);
    const filters = this.getDynamicTableFilters(sheetId, table, zone);
    return { id: table.id, range, filters, config: table.config, isPivotTable: table.isPivotTable };
  }

  private getDynamicTableFilters(sheetId: UID, table: DynamicTable, tableZone: Zone): Filter[] {
    const filters: Filter[] = [];
    const { top, bottom, left, right } = tableZone;
    for (let col = left; col <= right; col++) {
      const tableColIndex = col - left;
      const zone = { left: col, right: col, top, bottom };
      const filter = createFilter(
        this.getDynamicTableFilterId(table.id, tableColIndex),
        this.getters.getRangeFromZone(sheetId, zone),
        table.config,
        this.getters.getRangeFromZone
      );
      filters.push(filter);
    }
    return filters;
  }

  private getDynamicTableFilterId(tableId: TableId, tableCol: number): string {
    return tableId + "_" + tableCol;
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      for (const tableData of sheet.tables) {
        const zone = toZone(tableData.range);
        const topLeft = { sheetId: sheet.id, col: zone.left, row: zone.top };
        const coreTable = this.getters.getCoreTable(topLeft);
        const table = this.getTable(topLeft);

        if (coreTable?.type !== "dynamic" || !table) {
          continue;
        }
        tableData.range = zoneToXc(table.range.zone);
      }
    }
  }
}
