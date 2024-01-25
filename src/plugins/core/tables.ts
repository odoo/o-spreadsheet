import {
  areZonesContinuous,
  deepCopy,
  deepEquals,
  intersection,
  isDefined,
  isInside,
  isZoneInside,
  overlap,
  positions,
  range,
  zoneToDimension,
  zoneToXc,
} from "../../helpers";
import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../helpers/table_presets";
import {
  ApplyRangeChange,
  CellPosition,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Filter,
  FilterId,
  Position,
  Range,
  Table,
  TableConfig,
  TableData,
  TableId,
  UID,
  UpdateCellCommand,
  UpdateTableCommand,
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
    "getTablesOverlappingZones",
    "getFilterId",
    "getFilterHeaders",
    "isFilterHeader",
  ] as const;

  readonly tables: Record<UID, Record<TableId, Table | undefined>> = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    const sheetIds = sheetId ? [sheetId] : this.getters.getSheetIds();
    for (const sheetId of sheetIds) {
      for (const table of this.getTables(sheetId)) {
        this.applyRangeChangeOnTable(sheetId, table, applyChange);
      }
    }
  }

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "CREATE_TABLE":
        const zones = cmd.ranges.map(
          (rangeData) => this.getters.getRangeFromRangeData(rangeData).zone
        );
        if (!areZonesContinuous(zones)) {
          return CommandResult.NonContinuousTargets;
        }
        return this.checkValidations(
          cmd,
          (cmd) =>
            this.getTablesOverlappingZones(cmd.sheetId, zones).length
              ? CommandResult.TableOverlap
              : CommandResult.Success,
          (cmd) => this.checkTableConfigUpdateIsValid(cmd.config)
        );
      case "UPDATE_TABLE":
        const updatedTable = this.getTables(cmd.sheetId).find((table) =>
          deepEquals(table.range.zone, cmd.zone)
        );
        if (!updatedTable) {
          return CommandResult.TableNotFound;
        }
        return this.checkValidations(cmd, this.checkUpdatedTableZoneIsValid, (cmd) =>
          this.checkTableConfigUpdateIsValid(cmd.config)
        );
      case "ADD_MERGE":
        for (const merge of cmd.target) {
          for (const table of this.getTables(cmd.sheetId)) {
            if (overlap(table.range.zone, merge)) {
              return CommandResult.MergeInTable;
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
        const newTables: Record<UID, Table | undefined> = {};
        for (const table of this.getTables(cmd.sheetId)) {
          newTables[table.id] = this.copyTableForSheet(cmd.sheetIdTo, table);
        }
        this.history.update("tables", cmd.sheetIdTo, newTables);
        break;
      }
      case "CREATE_TABLE": {
        const ranges = cmd.ranges.map((rangeData) => this.getters.getRangeFromRangeData(rangeData));
        const union = this.getters.getRangesUnion(ranges);
        const mergesInTarget = this.getters.getMergesInZone(cmd.sheetId, union.zone);
        this.dispatch("REMOVE_MERGE", { sheetId: cmd.sheetId, target: mergesInTarget });

        const id = this.uuidGenerator.uuidv4();
        const newTable = this.createTable(id, union, cmd.config || DEFAULT_TABLE_CONFIG);
        this.history.update("tables", cmd.sheetId, newTable.id, newTable);
        break;
      }
      case "REMOVE_TABLE": {
        const tables: Record<UID, Table> = {};
        for (const table of this.getTables(cmd.sheetId)) {
          if (cmd.target.every((zone) => !intersection(zone, table.range.zone))) {
            tables[table.id] = table;
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
      case "UPDATE_TABLE": {
        const table = this.getTables(cmd.sheetId).find((table) =>
          deepEquals(table.range.zone, cmd.zone)
        );
        if (table) {
          const newTableRange = cmd.newTableRange
            ? this.getters.getRangeFromRangeData(cmd.newTableRange)
            : undefined;
          if (newTableRange) {
            const mergesInTarget = this.getters.getMergesInZone(cmd.sheetId, newTableRange.zone);
            this.dispatch("REMOVE_MERGE", { sheetId: cmd.sheetId, target: mergesInTarget });
          }

          const newTable = this.updateTable(table, newTableRange, cmd.config);
          this.history.update("tables", cmd.sheetId, table.id, newTable);
        }
        break;
      }
      case "UPDATE_CELL": {
        const sheetId = cmd.sheetId;
        for (const table of this.getTables(sheetId)) {
          const direction = this.canUpdateCellCmdExtendTable(cmd, table);
          if (direction === "down") {
            this.extendTableDown(sheetId, table);
          } else if (direction === "right") {
            this.extendTableRight(sheetId, table);
          }
        }
        break;
      }
      case "DELETE_CONTENT": {
        const tables: Record<TableId, Table | undefined> = { ...this.tables[cmd.sheetId] };
        for (const tableId in tables) {
          const table = tables[tableId];
          if (table && cmd.target.some((zone) => isZoneInside(table.range.zone, zone))) {
            delete tables[tableId];
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
    }
  }

  getFilters(sheetId: UID): Filter[] {
    return this.getTables(sheetId)
      .filter((table) => table.config.hasFilters)
      .map((table) => table.filters)
      .flat();
  }

  getTables(sheetId: UID): Table[] {
    return this.tables[sheetId] ? Object.values(this.tables[sheetId]).filter(isDefined) : [];
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

  /** Get the filter tables that are fully inside the given zone */
  getTablesInZone(sheetId: UID, zone: Zone): Table[] {
    return this.getTables(sheetId).filter((table) => isZoneInside(table.range.zone, zone));
  }

  getTablesOverlappingZones(sheetId: UID, zones: Zone[]): Table[] {
    return this.getTables(sheetId).filter((table) =>
      zones.some((zone) => overlap(table.range.zone, zone))
    );
  }

  doesZonesContainFilter(sheetId: UID, zones: Zone[]): boolean {
    return (
      this.getTablesOverlappingZones(sheetId, zones).filter((table) => table.config.hasFilters)
        .length > 0
    );
  }

  getFilterHeaders(sheetId: UID): Position[] {
    const headers: Position[] = [];
    for (const table of this.getTables(sheetId)) {
      if (!table.config.hasFilters) {
        continue;
      }
      const zone = table.range.zone;
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

  /** Extend a table down one row */
  private extendTableDown(sheetId: UID, table: Table) {
    const newRange = this.getters.extendRange(table.range, "ROW", 1);
    this.history.update("tables", sheetId, table.id, this.updateTable(table, newRange));
  }

  /** Extend a table right one col */
  private extendTableRight(sheetId: UID, table: Table) {
    const newRange = this.getters.extendRange(table.range, "COL", 1);
    this.history.update("tables", sheetId, table.id, this.updateTable(table, newRange));
  }

  /**
   * Check if an UpdateCell command should cause the given table to be extended by one row or col.
   *
   * The table should be extended if all of these conditions are true:
   * 1) The updated cell is right below/right of the table
   * 2) The command adds a content to the cell
   * 3) No cell right below/right next to the table had any content before the command
   * 4) Extending the table down/right would not overlap with another table
   * 5) Extending the table down/right would not overlap with a merge
   *
   */
  private canUpdateCellCmdExtendTable(
    { content: newCellContent, sheetId, col, row }: UpdateCellCommand,
    table: Table
  ): "down" | "right" | "none" {
    if (!newCellContent) {
      return "none";
    }

    const zone = table.range.zone;
    let direction: "down" | "right" | "none" = "none";
    if (zone.bottom + 1 === row && col >= zone.left && col <= zone.right) {
      direction = "down";
    } else if (zone.right + 1 === col && row >= zone.top && row <= zone.bottom) {
      direction = "right";
    }

    if (direction === "none") {
      return "none";
    }
    const zoneToCheckIfEmpty =
      direction === "down"
        ? { ...zone, bottom: zone.bottom + 1, top: zone.bottom + 1 }
        : { ...zone, right: zone.right + 1, left: zone.right + 1 };

    for (const position of positions(zoneToCheckIfEmpty)) {
      const cellPosition = { sheetId, ...position };
      // Since this plugin is loaded before CellPlugin, the getters still give us the old cell content
      const cellContent = this.getters.getCell(cellPosition)?.content;

      if (
        cellContent ||
        this.getters.isInMerge(cellPosition) ||
        this.getters.getTable(cellPosition)
      ) {
        return "none";
      }
    }
    return direction;
  }

  private checkUpdatedTableZoneIsValid(cmd: UpdateTableCommand): CommandResult {
    if (!cmd.newTableRange) {
      return CommandResult.Success;
    }
    const newTableZone = this.getters.getRangeFromRangeData(cmd.newTableRange).zone;
    const zoneIsInSheet = this.getters.checkZonesExistInSheet(cmd.sheetId, [newTableZone]);
    if (zoneIsInSheet !== CommandResult.Success) {
      return zoneIsInSheet;
    }
    const overlappingTables = this.getTablesOverlappingZones(cmd.sheetId, [newTableZone]).filter(
      (table) => !deepEquals(table.range.zone, cmd.zone)
    );

    return overlappingTables.length ? CommandResult.TableOverlap : CommandResult.Success;
  }

  private checkTableConfigUpdateIsValid(config: Partial<TableConfig> | undefined): CommandResult {
    if (!config) {
      return CommandResult.Success;
    }
    if (config.numberOfHeaders !== undefined && config.numberOfHeaders < 0) {
      return CommandResult.InvalidTableConfig;
    }
    if (config.styleId && !TABLE_PRESETS[config.styleId]) {
      return CommandResult.InvalidTableConfig;
    }

    if (config.hasFilters && config.numberOfHeaders === 0) {
      return CommandResult.InvalidTableConfig;
    }

    return CommandResult.Success;
  }

  private createTable(id: UID, tableRange: Range, config: TableConfig, filters?: Filter[]): Table {
    const zone = tableRange.zone;
    if (!filters) {
      filters = [];
      for (const i of range(zone.left, zone.right + 1)) {
        const filterZone = { ...zone, left: i, right: i };
        const uid = this.uuidGenerator.uuidv4();
        filters.push(this.createFilterFromZone(uid, tableRange.sheetId, filterZone, config));
      }
    }

    return {
      id,
      range: tableRange,
      filters,
      config,
    };
  }

  private updateTable(table: Table, newRange?: Range, configUpdate?: Partial<TableConfig>): Table {
    const tableRange = newRange ? newRange : table.range;
    const tableZone = tableRange.zone;
    const newConfig = this.updateTableConfig(configUpdate, table.config);
    const config = newConfig ? newConfig : table.config;

    const filters: Filter[] = [];
    if (newRange || (newConfig && "numberOfHeaders" in newConfig)) {
      for (const i of range(tableZone.left, tableZone.right + 1)) {
        const oldFilter =
          tableZone.top === table.range.zone.top
            ? table.filters.find((f) => f.col === i)
            : undefined;
        const filterZone = { ...tableZone, left: i, right: i };
        const filterId = oldFilter?.id || this.uuidGenerator.uuidv4();
        filters.push(this.createFilterFromZone(filterId, tableRange.sheetId, filterZone, config));
      }
    }

    return {
      ...table,
      range: tableRange,
      config,
      filters: filters.length ? filters : table.filters,
    };
  }

  /**
   * Update the old config of a table with the new partial config from an UpdateTable command.
   *
   * Make sure the new config make sense (e.g. if the table has no header, it should not have
   * filters and number of headers should be 0)
   */
  private updateTableConfig(
    update: Partial<TableConfig> | undefined,
    oldConfig: TableConfig
  ): TableConfig {
    if (!update) {
      return oldConfig;
    }
    const saneConfig = { ...oldConfig, ...update };
    if (update.numberOfHeaders === 0) {
      saneConfig.hasFilters = false;
    } else if (update.hasFilters === true) {
      saneConfig.numberOfHeaders ||= 1;
    }
    return saneConfig;
  }

  private createFilterFromZone(id: UID, sheetId: UID, zone: Zone, config: TableConfig): Filter {
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.createFilter(id, range, config);
  }

  private createFilter(id: UID, range: Range, config: TableConfig): Filter {
    const zone = range.zone;
    if (zone.left !== zone.right) {
      throw new Error("Can only define a filter on a single column");
    }
    const filteredZone = { ...zone, top: zone.top + config.numberOfHeaders };
    const filteredRange = this.getters.getRangeFromZone(range.sheetId, filteredZone);
    return {
      id,
      rangeWithHeaders: range,
      col: zone.left,
      filteredRange: filteredZone.top > filteredZone.bottom ? undefined : filteredRange,
    };
  }

  private copyTableForSheet(sheetId: UID, table: Table): Table {
    const newRange = this.getters.getRangeFromZone(sheetId, table.range.zone);
    const newFilters = table.filters.map((filter) => {
      const newFilterRange = this.getters.getRangeFromZone(sheetId, filter.rangeWithHeaders.zone);
      return this.createFilter(filter.id, newFilterRange, table.config);
    });
    return {
      id: table.id,
      range: newRange,
      filters: newFilters,
      config: deepCopy(table.config),
    };
  }

  private applyRangeChangeOnTable(sheetId: UID, table: Table, applyChange: ApplyRangeChange) {
    const tableRangeChange = applyChange(table.range);
    let newTableRange: Range;
    switch (tableRangeChange.changeType) {
      case "REMOVE":
        this.history.update("tables", sheetId, table.id, undefined);
        return;
      case "NONE":
        return;
      default:
        newTableRange = tableRangeChange.range;
    }

    const filters: Filter[] = [];
    for (const filter of table.filters) {
      const filterRangeChange = applyChange(filter.rangeWithHeaders);
      switch (filterRangeChange.changeType) {
        case "REMOVE":
          continue;
        case "NONE":
          filters.push(filter);
          break;
        default:
          const newFilterRange = filterRangeChange.range;
          const newFilter = this.createFilter(filter.id, newFilterRange, table.config);
          filters.push(newFilter);
      }
    }

    const tableZone = newTableRange.zone;
    if (filters.length < zoneToDimension(tableZone).numberOfCols) {
      for (let col = tableZone.left; col <= tableZone.right; col++) {
        if (!filters.find((filter) => filter.col === col)) {
          const uid = this.uuidGenerator.uuidv4();
          const filterZone = { ...tableZone, left: col, right: col };
          filters.push(this.createFilterFromZone(uid, sheetId, filterZone, table.config));
        }
      }
      filters.sort((f1, f2) => f1.col - f2.col);
    }

    const newTable = this.createTable(table.id, newTableRange, table.config, filters);
    this.history.update("tables", sheetId, table.id, newTable);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const tableData of sheet.tables || []) {
        const uuid = this.uuidGenerator.uuidv4();
        const tableConfig = tableData.config || DEFAULT_TABLE_CONFIG;
        const tableRange = this.getters.getRangeFromSheetXC(sheet.id, tableData.range);
        const table = this.createTable(uuid, tableRange, tableConfig);
        this.history.update("tables", sheet.id, table.id, table);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const table of this.getTables(sheet.id)) {
        const tableData: TableData = { range: zoneToXc(table.range.zone) };
        if (!deepEquals(table.config, DEFAULT_TABLE_CONFIG)) {
          tableData.config = table.config;
        }
        sheet.tables.push(tableData);
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
