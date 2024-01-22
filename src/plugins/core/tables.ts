import {
  areZonesContinuous,
  deepCopy,
  expandZoneOnInsertion,
  intersection,
  isDefined,
  isInside,
  isZoneInside,
  overlap,
  range,
  reduceZoneOnDeletion,
  toZone,
  union,
  zoneToDimension,
  zoneToXc,
} from "../../helpers";
import { Filter, Table, createFilter, createTable } from "../../helpers/filters";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  FilterId,
  Position,
  RemoveColumnsRowsCommand,
  TableId,
  UID,
  UpdateCellCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface TableState {
  tables: Record<UID, Record<TableId, Table | undefined>>;
}

export class TablePlugin extends CorePlugin<TableState> implements TableState {
  static getters = [
    "doesZonesContainFilter",
    "getFilter",
    "getFilters",
    "getTable",
    "getTables",
    "getTablesInZone",
    "getFilterId",
    "getFilterHeaders",
    "isFilterHeader",
  ] as const;

  readonly tables: Record<UID, Record<TableId, Table | undefined>> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "CREATE_TABLE":
        if (!areZonesContinuous(...cmd.target)) {
          return CommandResult.NonContinuousTargets;
        }
        const zone = union(...cmd.target);
        const checkTableOverlap = () => {
          if (this.getTables(cmd.sheetId).some((table) => overlap(table.zone, zone))) {
            return CommandResult.FilterOverlap;
          }
          return CommandResult.Success;
        };
        const checkMergeInFilter = () => {
          const mergesInTarget = this.getters.getMergesInZone(cmd.sheetId, zone);
          for (let merge of mergesInTarget) {
            if (overlap(zone, merge)) {
              return CommandResult.MergeInFilter;
            }
          }
          return CommandResult.Success;
        };
        return this.checkValidations(cmd, checkTableOverlap, checkMergeInFilter);
        break;
      case "ADD_MERGE":
        for (let merge of cmd.target) {
          for (let table of this.getTables(cmd.sheetId)) {
            if (overlap(table.zone, merge)) {
              return CommandResult.MergeInFilter;
            }
          }
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("tables", cmd.sheetId, {});
        break;
      case "DELETE_SHEET": {
        const tables = { ...this.tables };
        delete tables[cmd.sheetId];
        this.history.update("tables", tables);
        break;
      }
      case "DUPLICATE_SHEET": {
        const tables: Record<TableId, Table | undefined> = {};
        for (const table of Object.values(this.tables[cmd.sheetId] || {})) {
          if (table) {
            const newTable = deepCopy(table);
            tables[newTable.id] = newTable;
          }
        }
        this.history.update("tables", cmd.sheetIdTo, tables);
        break;
      }
      case "ADD_COLUMNS_ROWS":
        this.onAddColumnsRows(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.onDeleteColumnsRows(cmd);
        break;
      case "CREATE_TABLE": {
        const zone = union(...cmd.target);
        const newTable = this.createTable(zone);
        this.history.update("tables", cmd.sheetId, newTable.id, newTable);
        break;
      }
      case "REMOVE_TABLE": {
        const tables: Record<UID, Table> = {};
        for (const table of this.getTables(cmd.sheetId)) {
          if (cmd.target.every((zone) => !intersection(zone, table.zone))) {
            tables[table.id] = table;
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
      case "UPDATE_CELL": {
        const sheetId = cmd.sheetId;
        for (let table of this.getTables(sheetId)) {
          if (this.canUpdateCellCmdExtendTable(cmd, table)) {
            this.extendTableDown(sheetId, table);
          }
        }
        break;
      }
    }
  }

  getFilters(sheetId: UID): Filter[] {
    return this.getTables(sheetId)
      .map((table) => table.filters)
      .flat();
  }

  getTables(sheetId: UID): Table[] {
    return this.tables[sheetId] ? Object.values(this.tables[sheetId]).filter(isDefined) : [];
  }

  getFilter(position: CellPosition): Filter | undefined {
    return this.getTable(position)?.filters.find((table) => table.col === position.col);
  }

  getFilterId(position: CellPosition): FilterId | undefined {
    return this.getFilter(position)?.id;
  }

  getTable({ sheetId, col, row }: CellPosition): Table | undefined {
    return this.getTables(sheetId).find((table) => isInside(col, row, table.zone));
  }

  /** Get the tables that are fully inside the given zone */
  getTablesInZone(sheetId: UID, zone: Zone): Table[] {
    return this.getTables(sheetId).filter((table) => isZoneInside(table.zone, zone));
  }

  doesZonesContainFilter(sheetId: UID, zones: Zone[]): boolean {
    for (const zone of zones) {
      for (const table of this.getTables(sheetId)) {
        if (intersection(zone, table.zone)) {
          return true;
        }
      }
    }
    return false;
  }

  getFilterHeaders(sheetId: UID): Position[] {
    const headers: Position[] = [];
    for (let table of this.getTables(sheetId)) {
      const zone = table.zone;
      const row = zone.top;
      for (let col = zone.left; col <= zone.right; col++) {
        headers.push({ col, row });
      }
    }
    return headers;
  }

  isFilterHeader({ sheetId, col, row }: CellPosition): boolean {
    const headers = this.getFilterHeaders(sheetId);
    return headers.some((header) => header.col === col && header.row === row);
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    for (const table of this.getTables(cmd.sheetId)) {
      const zone = expandZoneOnInsertion(
        table.zone,
        cmd.dimension === "COL" ? "left" : "top",
        cmd.base,
        cmd.position,
        cmd.quantity
      );
      const filters: Filter[] = [];
      for (const filter of table.filters) {
        const filterZone = expandZoneOnInsertion(
          filter.zoneWithHeaders,
          cmd.dimension === "COL" ? "left" : "top",
          cmd.base,
          cmd.position,
          cmd.quantity
        );
        filters.push(createFilter(filter.id, filterZone));
      }

      // Add filters for new columns
      if (filters.length < zoneToDimension(zone).numberOfCols) {
        for (let col = zone.left; col <= zone.right; col++) {
          if (!filters.find((filter) => filter.col === col)) {
            filters.push(
              createFilter(this.uuidGenerator.uuidv4(), { ...zone, left: col, right: col })
            );
          }
        }
        filters.sort((f1, f2) => f1.col - f2.col);
      }
      this.history.update("tables", cmd.sheetId, table.id, "zone", zone);
      this.history.update("tables", cmd.sheetId, table.id, "filters", filters);
    }
  }

  private onDeleteColumnsRows(cmd: RemoveColumnsRowsCommand) {
    for (const table of this.getTables(cmd.sheetId)) {
      // Remove the tables whose data filter headers are in the removed rows.
      if (cmd.dimension === "ROW" && cmd.elements.includes(table.zone.top)) {
        const tables = { ...this.tables[cmd.sheetId] };
        delete tables[table.id];
        this.history.update("tables", cmd.sheetId, tables);
        continue;
      }

      const zone = reduceZoneOnDeletion(
        table.zone,
        cmd.dimension === "COL" ? "left" : "top",
        cmd.elements
      );
      if (!zone) {
        const tables = { ...this.tables[cmd.sheetId] };
        delete tables[table.id];
        this.history.update("tables", cmd.sheetId, tables);
      } else {
        if (zoneToXc(zone) !== zoneToXc(table.zone)) {
          const filters: Filter[] = [];
          for (const filter of table.filters) {
            const newFilterZone = reduceZoneOnDeletion(
              filter.zoneWithHeaders,
              cmd.dimension === "COL" ? "left" : "top",
              cmd.elements
            );
            if (newFilterZone) {
              filters.push(createFilter(filter.id, newFilterZone));
            }
          }
          this.history.update("tables", cmd.sheetId, table.id, "zone", zone);
          this.history.update("tables", cmd.sheetId, table.id, "filters", filters);
        }
      }
    }
  }

  private createTable(zone: Zone): Table {
    const uuid = this.uuidGenerator.uuidv4();
    return createTable(uuid, zone);
  }

  /** Extend a table down one row */
  private extendTableDown(sheetId: UID, table: Table) {
    const newZone = { ...table.zone, bottom: table.zone.bottom + 1 };
    this.history.update("tables", sheetId, table.id, "zone", newZone);
    for (let filterIndex = 0; filterIndex < table.filters.length; filterIndex++) {
      const filter = table.filters[filterIndex];
      const newFilterZone = {
        ...filter.zoneWithHeaders,
        bottom: filter.zoneWithHeaders.bottom + 1,
      };
      this.history.update(
        "tables",
        sheetId,
        table.id,
        "filters",
        filterIndex,
        "zoneWithHeaders",
        newFilterZone
      );
    }
    return;
  }

  /**
   * Check if an UpdateCell command should cause the given table to be extended by one row.
   *
   * The table should be extended if all of these conditions are true:
   * 1) The updated cell is right below the table
   * 2) The command adds a content to the cell
   * 3) No cell right below the table had any content before the command
   * 4) Extending the table down would not overlap with another table
   * 5) Extending the table down would not overlap with a merge
   *
   */
  private canUpdateCellCmdExtendTable(
    { content: newCellContent, sheetId, col, row }: UpdateCellCommand,
    table: Table
  ) {
    if (!newCellContent) {
      return;
    }

    const zone = table.zone;
    if (!(zone.bottom + 1 === row && col >= zone.left && col <= zone.right)) {
      return false;
    }

    for (const col of range(zone.left, zone.right + 1)) {
      const position = { sheetId, col, row };
      // Since this plugin is loaded before CellPlugin, the getters still give us the old cell content
      const cellContent = this.getters.getCell(position)?.content;
      if (cellContent) {
        return false;
      }

      if (this.getters.getFilter(position)) {
        return false;
      }

      if (this.getters.isInMerge(position)) {
        return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const tableData of sheet.tables || []) {
        const table = this.createTable(toZone(tableData.range));
        this.history.update("tables", sheet.id, table.id, table);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const table of this.getTables(sheet.id)) {
        sheet.tables.push({
          range: zoneToXc(table.zone),
        });
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
