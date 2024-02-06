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
  positionToZone,
  range,
  zoneToDimension,
  zoneToTopLeft,
  zoneToXc,
} from "../../helpers";
import { createFilter } from "../../helpers/table_helpers";
import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../helpers/table_presets";
import {
  ApplyRangeChange,
  CellPosition,
  CommandResult,
  CoreCommand,
  CoreTable,
  CoreTableType,
  DynamicTable,
  ExcelWorkbookData,
  Filter,
  Range,
  StaticTable,
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
  tables: Record<UID, Record<TableId, CoreTable | undefined>>;
}

export class TablePlugin extends CorePlugin<TableState> implements TableState {
  static getters = ["getCoreTable", "getCoreTables"] as const;

  readonly tables: Record<UID, Record<TableId, CoreTable | undefined>> = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    const sheetIds = sheetId ? [sheetId] : this.getters.getSheetIds();
    for (const sheetId of sheetIds) {
      for (const table of this.getCoreTables(sheetId)) {
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
        const updatedTable = this.getTableFromZone(cmd.sheetId, cmd.zone);
        if (!updatedTable) {
          return CommandResult.TableNotFound;
        }
        return this.checkValidations(cmd, this.checkUpdatedTableZoneIsValid, (cmd) =>
          this.checkTableConfigUpdateIsValid(cmd.config)
        );
      case "ADD_MERGE":
        for (const table of this.getCoreTables(cmd.sheetId)) {
          const tableZone = table.range.zone;
          for (const merge of cmd.target) {
            if (overlap(tableZone, merge)) {
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
        const newTables: Record<UID, CoreTable | undefined> = {};
        for (const table of this.getCoreTables(cmd.sheetId)) {
          newTables[table.id] =
            table.type === "dynamic"
              ? this.copyDynamicTableForSheet(cmd.sheetIdTo, table)
              : this.copyStaticTableForSheet(cmd.sheetIdTo, table);
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
        const config = cmd.config || DEFAULT_TABLE_CONFIG;
        const newTable =
          cmd.tableType === "dynamic"
            ? this.createDynamicTable(id, union, config)
            : this.createStaticTable(id, cmd.tableType, union, config);
        this.history.update("tables", cmd.sheetId, newTable.id, newTable);
        break;
      }
      case "REMOVE_TABLE": {
        const tables: Record<UID, CoreTable> = {};
        for (const table of this.getCoreTables(cmd.sheetId)) {
          if (cmd.target.every((zone) => !intersection(table.range.zone, zone))) {
            tables[table.id] = table;
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
      case "UPDATE_TABLE": {
        this.updateTable(cmd);
        break;
      }
      case "UPDATE_CELL": {
        const sheetId = cmd.sheetId;
        for (const table of this.getCoreTables(sheetId)) {
          if (table.type === "dynamic") {
            continue;
          }
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
        const tables: Record<TableId, CoreTable | undefined> = { ...this.tables[cmd.sheetId] };
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

  getCoreTables(sheetId: UID): CoreTable[] {
    return this.tables[sheetId] ? Object.values(this.tables[sheetId]).filter(isDefined) : [];
  }

  getCoreTable({ sheetId, col, row }: CellPosition): CoreTable | undefined {
    return this.getCoreTables(sheetId).find((table) => isInside(col, row, table.range.zone));
  }

  private getTablesOverlappingZones(sheetId: UID, zones: Zone[]): CoreTable[] {
    return this.getCoreTables(sheetId).filter((table) =>
      zones.some((zone) => overlap(table.range.zone, zone))
    );
  }

  /** Extend a table down one row */
  private extendTableDown(sheetId: UID, table: StaticTable) {
    const newRange = this.getters.extendRange(table.range, "ROW", 1);
    this.history.update("tables", sheetId, table.id, this.updateStaticTable(table, newRange));
  }

  /** Extend a table right one col */
  private extendTableRight(sheetId: UID, table: StaticTable) {
    const newRange = this.getters.extendRange(table.range, "COL", 1);
    this.history.update("tables", sheetId, table.id, this.updateStaticTable(table, newRange));
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
        this.getTablesOverlappingZones(sheetId, [positionToZone(position)]).length
      ) {
        return "none";
      }
    }
    return direction;
  }

  private getTableFromZone(sheetId: UID, zone: Zone): CoreTable | undefined {
    for (const table of this.getCoreTables(sheetId)) {
      const tableZone = table.range.zone;
      // Only check top left to match dynamic tables
      if (tableZone.left === zone.left && tableZone.top === zone.top) {
        return table;
      }
    }
    return undefined;
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
    const updatedTable = this.getTableFromZone(cmd.sheetId, cmd.zone);
    if (!updatedTable) {
      return CommandResult.TableNotFound;
    }
    const overlappingTables = this.getTablesOverlappingZones(cmd.sheetId, [newTableZone]).filter(
      (table) => table.id !== updatedTable.id
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

  private createStaticTable(
    id: UID,
    type: "static" | "forceStatic",
    tableRange: Range,
    config: TableConfig,
    filters?: Filter[]
  ): StaticTable {
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
      type,
    };
  }

  private createDynamicTable(id: UID, tableRange: Range, config: TableConfig): DynamicTable {
    const zone = zoneToTopLeft(tableRange.zone);
    return {
      id,
      range: this.getters.getRangeFromZone(tableRange.sheetId, zone),
      config,
      type: "dynamic",
    };
  }

  private updateTable(cmd: UpdateTableCommand) {
    const table = this.getTableFromZone(cmd.sheetId, cmd.zone);
    if (!table) {
      return;
    }
    const newTableRange = cmd.newTableRange
      ? this.getters.getRangeFromRangeData(cmd.newTableRange)
      : undefined;
    if (newTableRange) {
      const mergesInTarget = this.getters.getMergesInZone(cmd.sheetId, newTableRange.zone);
      this.dispatch("REMOVE_MERGE", { sheetId: cmd.sheetId, target: mergesInTarget });
    }

    const range = newTableRange || table.range;
    const newConfig = this.updateTableConfig(cmd.config, table.config);
    const newTableType = cmd.tableType ?? table.type;

    if (
      (newTableType === "dynamic" && table.type !== "dynamic") ||
      (newTableType !== "dynamic" && table.type === "dynamic")
    ) {
      const newTable =
        newTableType === "dynamic"
          ? this.createDynamicTable(table.id, range, newConfig)
          : this.createStaticTable(table.id, newTableType, range, newConfig);
      this.history.update("tables", cmd.sheetId, table.id, newTable);
    } else {
      const updatedTable =
        table.type === "dynamic"
          ? this.updateDynamicTable(table, range, newConfig)
          : this.updateStaticTable(table, range, newConfig, newTableType);
      this.history.update("tables", cmd.sheetId, table.id, updatedTable);
    }
  }

  private updateStaticTable(
    table: StaticTable,
    newRange?: Range,
    configUpdate?: Partial<TableConfig>,
    newTableType: CoreTableType = table.type
  ): StaticTable {
    if (newTableType === "dynamic") {
      throw new Error("Cannot use updateStaticTable to update a dynamic table");
    }
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
      type: newTableType,
    };
  }

  private updateDynamicTable(
    table: DynamicTable,
    newRange?: Range,
    newConfig?: TableConfig
  ): DynamicTable {
    const range = newRange
      ? this.getters.getRangeFromZone(newRange.sheetId, zoneToTopLeft(newRange.zone))
      : table.range;
    const config = newConfig ? newConfig : table.config;

    return { ...table, range, config };
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
    return createFilter(id, range, config, this.getters.getRangeFromZone);
  }

  private copyStaticTableForSheet(sheetId: UID, table: StaticTable): StaticTable {
    const newRange = this.getters.getRangeFromZone(sheetId, table.range.zone);
    const newFilters = table.filters.map((filter) => {
      const newFilterRange = this.getters.getRangeFromZone(sheetId, filter.rangeWithHeaders.zone);
      return createFilter(filter.id, newFilterRange, table.config, this.getters.getRangeFromZone);
    });
    return {
      id: table.id,
      range: newRange,
      filters: newFilters,
      config: deepCopy(table.config),
      type: table.type,
    };
  }

  private copyDynamicTableForSheet(sheetId: UID, table: DynamicTable): DynamicTable {
    const newRange = this.getters.getRangeFromZone(sheetId, table.range.zone);
    return {
      id: table.id,
      range: newRange,
      config: deepCopy(table.config),
      type: "dynamic",
    };
  }

  private applyRangeChangeOnTable(sheetId: UID, table: CoreTable, applyChange: ApplyRangeChange) {
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

    if (table.type === "dynamic") {
      const newTable = this.updateDynamicTable(table, newTableRange);
      this.history.update("tables", sheetId, table.id, newTable);
      return;
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
          const newFilter = createFilter(
            filter.id,
            newFilterRange,
            table.config,
            this.getters.getRangeFromZone
          );
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

    const newTable = this.createStaticTable(
      table.id,
      table.type,
      newTableRange,
      table.config,
      filters
    );
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
        const range = this.getters.getRangeFromSheetXC(sheet.id, tableData.range);
        const tableType = tableData.type || "static";
        const table =
          tableType === "dynamic"
            ? this.createDynamicTable(uuid, range, tableConfig)
            : this.createStaticTable(uuid, tableType, range, tableConfig);
        this.history.update("tables", sheet.id, table.id, table);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const table of this.getCoreTables(sheet.id)) {
        const range = zoneToXc(table.range.zone);
        const tableData: TableData = { range, type: table.type };
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
