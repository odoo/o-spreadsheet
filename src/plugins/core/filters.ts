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
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  FilterId,
  FilterTableId,
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
        const tables: Record<FilterTableId, FilterTable | undefined> = {};
        for (const filterTable of Object.values(this.tables[cmd.sheetId] || {})) {
          if (filterTable) {
            const newFilterTable = deepCopy(filterTable);
            tables[newFilterTable.id] = newFilterTable;
          }
        }
        this.history.update("tables", cmd.sheetIdTo, tables);
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

  getFilter(sheetId: UID, col: number, row: number): Filter | undefined {
    return this.getFilterTable(sheetId, col, row)?.filters.find((filter) => filter.col === col);
  }

  getFilterId(sheetId: UID, col: number, row: number): FilterId | undefined {
    return this.getFilter(sheetId, col, row)?.id;
  }

  getFilterTable(sheetId: UID, col: number, row: number): FilterTable | undefined {
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
      if (filters.length < zoneToDimension(zone).width) {
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
      // Remove the filter tables whose data filter headers are in the removed rows.
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
      // Since this plugin is loaded before CellPlugin, the getters still give us the old cell content
      const cellContent = this.getters.getCell(sheetId, col, row)?.content;
      if (cellContent) {
        return false;
      }

      if (this.getters.getFilter(sheetId, col, row)) {
        return false;
      }

      if (this.getters.isInMerge(sheetId, col, row)) {
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
    for (const sheet of data.sheets) {
      for (const filterTable of this.getFilterTables(sheet.id)) {
        if (zoneToDimension(filterTable.zone).height === 1) {
          continue;
        }
        sheet.filterTables.push({
          range: zoneToXc(filterTable.zone),
          filters: [],
        });
      }
    }
  }
}
