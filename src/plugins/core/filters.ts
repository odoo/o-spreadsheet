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
import { Filter, FilterTable } from "../../helpers/filters";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  FilterId,
  FilterTableId,
  Position,
  RemoveColumnsRowsCommand,
  UID,
  UpdateCellCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FiltersState {
  tables: Record<UID, Record<FilterTableId, FilterTable | undefined>>;
}

export class FiltersPlugin extends CorePlugin<FiltersState> implements FiltersState {
  static getters = [
    "doesZonesContainFilter",
    "getFilter",
    "getFilters",
    "getFilterTable",
    "getFilterTables",
    "getFilterTablesInZone",
    "getFilterId",
    "getFilterHeaders",
    "isFilterHeader",
  ] as const;

  readonly tables: Record<UID, Record<FilterTableId, FilterTable | undefined>> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "CREATE_FILTER_TABLE":
        if (!areZonesContinuous(...cmd.target)) {
          return CommandResult.NonContinuousTargets;
        }
        const zone = union(...cmd.target);
        const checkFilterOverlap = () => {
          if (this.getFilterTables(cmd.sheetId).some((filter) => overlap(filter.zone, zone))) {
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
        return this.checkValidations(cmd, checkFilterOverlap, checkMergeInFilter);
        break;
      case "ADD_MERGE":
        for (let merge of cmd.target) {
          for (let filterTable of this.getFilterTables(cmd.sheetId)) {
            if (overlap(filterTable.zone, merge)) {
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
      case "DELETE_SHEET":
        const filterTables = { ...this.tables };
        delete filterTables[cmd.sheetId];
        this.history.update("tables", filterTables);
        break;
      case "DUPLICATE_SHEET":
        this.history.update("tables", cmd.sheetIdTo, deepCopy(this.tables[cmd.sheetId]));
        break;
      case "ADD_COLUMNS_ROWS":
        this.onAddColumnsRows(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.onDeleteColumnsRows(cmd);
        break;
      case "CREATE_FILTER_TABLE": {
        const zone = union(...cmd.target);
        const newFilterTable = this.createFilterTable(zone);
        this.history.update("tables", cmd.sheetId, newFilterTable.id, newFilterTable);
        break;
      }
      case "REMOVE_FILTER_TABLE": {
        const tables: Record<UID, FilterTable> = {};
        for (const filterTable of this.getFilterTables(cmd.sheetId)) {
          if (cmd.target.every((zone) => !intersection(zone, filterTable.zone))) {
            tables[filterTable.id] = filterTable;
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
      case "UPDATE_CELL": {
        const sheetId = cmd.sheetId;
        for (let table of this.getFilterTables(sheetId)) {
          if (this.canUpdateCellCmdExtendTable(cmd, table)) {
            this.extendTableDown(sheetId, table);
          }
        }
        break;
      }
    }
  }

  getFilters(sheetId: UID): Filter[] {
    return this.getFilterTables(sheetId)
      .map((filterTable) => filterTable.filters)
      .flat();
  }

  getFilterTables(sheetId: UID): FilterTable[] {
    return this.tables[sheetId] ? Object.values(this.tables[sheetId]).filter(isDefined) : [];
  }

  getFilter(position: CellPosition): Filter | undefined {
    return this.getFilterTable(position)?.filters.find((filter) => filter.col === position.col);
  }

  getFilterId(position: CellPosition): FilterId | undefined {
    return this.getFilter(position)?.id;
  }

  getFilterTable({ sheetId, col, row }: CellPosition): FilterTable | undefined {
    return this.getFilterTables(sheetId).find((filterTable) =>
      isInside(col, row, filterTable.zone)
    );
  }

  /** Get the filter tables that are fully inside the given zone */
  getFilterTablesInZone(sheetId: UID, zone: Zone): FilterTable[] {
    return this.getFilterTables(sheetId).filter((filterTable) =>
      isZoneInside(filterTable.zone, zone)
    );
  }

  doesZonesContainFilter(sheetId: UID, zones: Zone[]): boolean {
    for (const zone of zones) {
      for (const filterTable of this.getFilterTables(sheetId)) {
        if (intersection(zone, filterTable.zone)) {
          return true;
        }
      }
    }
    return false;
  }

  getFilterHeaders(sheetId: UID): Position[] {
    const headers: Position[] = [];
    for (let filterTable of this.getFilterTables(sheetId)) {
      const zone = filterTable.zone;
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
    for (const filterTable of this.getFilterTables(cmd.sheetId)) {
      const zone = expandZoneOnInsertion(
        filterTable.zone,
        cmd.dimension === "COL" ? "left" : "top",
        cmd.base,
        cmd.position,
        cmd.quantity
      );
      const filters: Filter[] = [];
      for (const filter of filterTable.filters) {
        const filterZone = expandZoneOnInsertion(
          filter.zoneWithHeaders,
          cmd.dimension === "COL" ? "left" : "top",
          cmd.base,
          cmd.position,
          cmd.quantity
        );
        filters.push(new Filter(filter.id, filterZone));
      }

      // Add filters for new columns
      if (filters.length < zoneToDimension(zone).numberOfCols) {
        for (let col = zone.left; col <= zone.right; col++) {
          if (!filters.find((filter) => filter.col === col)) {
            filters.push(
              new Filter(this.uuidGenerator.uuidv4(), { ...zone, left: col, right: col })
            );
          }
        }
        filters.sort((f1, f2) => f1.col - f2.col);
      }
      this.history.update("tables", cmd.sheetId, filterTable.id, "zone", zone);
      this.history.update("tables", cmd.sheetId, filterTable.id, "filters", filters);
    }
  }

  private onDeleteColumnsRows(cmd: RemoveColumnsRowsCommand) {
    for (const table of this.getFilterTables(cmd.sheetId)) {
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
              filters.push(new Filter(filter.id, newFilterZone));
            }
          }
          this.history.update("tables", cmd.sheetId, table.id, "zone", zone);
          this.history.update("tables", cmd.sheetId, table.id, "filters", filters);
        }
      }
    }
  }

  private createFilterTable(zone: Zone): FilterTable {
    return new FilterTable(zone);
  }

  /** Extend a table down one row */
  private extendTableDown(sheetId: UID, table: FilterTable) {
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
   * 4) Extending the table down would not overlap with another filter
   * 5) Extending the table down would not overlap with a merge
   *
   */
  private canUpdateCellCmdExtendTable(
    { content: newCellContent, sheetId, col, row }: UpdateCellCommand,
    table: FilterTable
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
      for (const filterTableData of sheet.filterTables || []) {
        const table = this.createFilterTable(toZone(filterTableData.range));
        this.history.update("tables", sheet.id, table.id, table);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const filterTable of this.getFilterTables(sheet.id)) {
        sheet.filterTables.push({
          range: zoneToXc(filterTable.zone),
        });
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
