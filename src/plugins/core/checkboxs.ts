import {
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
  zoneToDimension,
  zoneToXc,
} from "../../helpers";
import { Checkbox, CheckboxTable } from "../../helpers/checkbox";
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

interface CheckboxState {
  tables: Record<UID, Record<FilterTableId, CheckboxTable | undefined>>;
}

export class CheckboxsPlugin extends CorePlugin<CheckboxState> implements CheckboxState {
  private valueCheck;

  static getters = [
    // "doesZonesContainCheckbox",
    // "getCheckbox",
    // "getCheckboxs",
    // "getCheckboxTable",
    // "getCheckboxTables",
    // "getCheckboxTablesInZone",
    // "getCheckboxId",
    "getCheckboxddHeaders",
    // "isCheckboxHeader",
  ] as const;

  readonly tables: Record<UID, Record<FilterTableId, CheckboxTable | undefined>> = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "CREATE_CHECKBOX":
        // if (!areZonesContinuous(...cmd.target)) {
        //   return CommandResult.NonContinuousTargets;
        // }
        // const zone = union(...cmd.target);
        // const checkCheckboxOverlap = () => {
        //   if (this.getCheckboxTables(cmd.sheetId).some((filter) => overlap(filter.zone, zone))) {
        //     return CommandResult.FilterOverlap;
        //   }
        // return CommandResult.Success;
        // };
        // const checkMergeInCheckbox = () => {
        //   const mergesInTarget = this.getters.getMergesInZone(cmd.sheetId, zone);
        //   for (let merge of mergesInTarget) {
        //     if (overlap(zone, merge)) {
        //       return CommandResult.MergeInFilter;
        //     }
        //   }
        //   return CommandResult.Success;
        // };
        // return this.checkValidations(cmd, checkCheckboxOverlap, checkMergeInCheckbox);
        break;
      case "ADD_MERGE":
        for (let merge of cmd.target) {
          for (let filterTable of this.getCheckboxTables(cmd.sheetId)) {
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
        const tables: Record<FilterTableId, CheckboxTable | undefined> = {};
        for (const filterTable of Object.values(this.tables[cmd.sheetId] || {})) {
          if (filterTable) {
            const newCheckboxTable = deepCopy(filterTable);
            tables[newCheckboxTable.id] = newCheckboxTable;
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
      case "CREATE_CHECKBOX": {
        console.log(
          "COMMAND DISPATCHED CHECKBOX >>> >>>>>>>>>>>>>>>> >>>>>>>>>>>>>> >>>>>>>> >>>>>>>..",
          cmd
        );
        this.valueCheck = { ...cmd };
        // const zone = union(...cmd.target);
        // const newCheckboxTable = this.createCheckbox(zone);
        // this.history.update("tables", cmd.sheetId, newCheckboxTable.id, newCheckboxTable);
        break;
      }
      case "REMOVE_FILTER_TABLE": {
        const tables: Record<UID, CheckboxTable> = {};
        for (const filterTable of this.getCheckboxTables(cmd.sheetId)) {
          if (cmd.target.every((zone) => !intersection(zone, filterTable.zone))) {
            tables[filterTable.id] = filterTable;
          }
        }
        this.history.update("tables", cmd.sheetId, tables);
        break;
      }
      case "UPDATE_CELL": {
        const sheetId = cmd.sheetId;
        for (let table of this.getCheckboxTables(sheetId)) {
          if (this.canUpdateCellCmdExtendTable(cmd, table)) {
            this.extendTableDown(sheetId, table);
          }
        }
        break;
      }
    }
  }

  getCheckboxs(sheetId: UID): Checkbox[] {
    return this.getCheckboxTables(sheetId)
      .map((filterTable) => filterTable.filters)
      .flat();
  }

  getCheckboxTables(sheetId: UID): CheckboxTable[] {
    return this.tables[sheetId] ? Object.values(this.tables[sheetId]).filter(isDefined) : [];
  }

  getCheckbox(position: CellPosition): Checkbox | undefined {
    return this.getCheckboxTable(position)?.filters.find((filter) => filter.col === position.col);
  }

  getCheckboxId(position: CellPosition): FilterId | undefined {
    return this.getCheckbox(position)?.id;
  }

  getCheckboxTable({ sheetId, col, row }: CellPosition): CheckboxTable | undefined {
    return this.getCheckboxTables(sheetId).find((filterTable) =>
      isInside(col, row, filterTable.zone)
    );
  }

  /** Get the filter tables that are fully inside the given zone */
  getCheckboxTablesInZone(sheetId: UID, zone: Zone): CheckboxTable[] {
    return this.getCheckboxTables(sheetId).filter((filterTable) =>
      isZoneInside(filterTable.zone, zone)
    );
  }

  doesZonesContainCheckbox(sheetId: UID, zones: Zone[]): boolean {
    for (const zone of zones) {
      for (const filterTable of this.getCheckboxTables(sheetId)) {
        if (intersection(zone, filterTable.zone)) {
          return true;
        }
      }
    }
    return false;
  }

  getCheckboxddHeaders(sheetId: UID): Position[] {
    return this.valueCheck;
  }

  isCheckboxHeader({ sheetId, col, row }: CellPosition): boolean {
    const headers = this.getCheckboxddHeaders(sheetId);
    // console.log("iSFILTERHEADER : ",headers.some((header) => header.col === col && header.row === row))

    return headers.some((header) => header.col === col && header.row === row);
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    for (const filterTable of this.getCheckboxTables(cmd.sheetId)) {
      const zone = expandZoneOnInsertion(
        filterTable.zone,
        cmd.dimension === "COL" ? "left" : "top",
        cmd.base,
        cmd.position,
        cmd.quantity
      );
      const filters: Checkbox[] = [];
      for (const filter of filterTable.filters) {
        const filterZone = expandZoneOnInsertion(
          filter.zoneWithHeaders,
          cmd.dimension === "COL" ? "left" : "top",
          cmd.base,
          cmd.position,
          cmd.quantity
        );
        filters.push(new Checkbox(filter.id, filterZone));
      }

      // Add filters for new columns
      if (filters.length < zoneToDimension(zone).numberOfCols) {
        for (let col = zone.left; col <= zone.right; col++) {
          if (!filters.find((filter) => filter.col === col)) {
            filters.push(
              new Checkbox(this.uuidGenerator.uuidv4(), { ...zone, left: col, right: col })
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
    for (const table of this.getCheckboxTables(cmd.sheetId)) {
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
          const filters: Checkbox[] = [];
          for (const filter of table.filters) {
            const newCheckboxZone = reduceZoneOnDeletion(
              filter.zoneWithHeaders,
              cmd.dimension === "COL" ? "left" : "top",
              cmd.elements
            );
            if (newCheckboxZone) {
              filters.push(new Checkbox(filter.id, newCheckboxZone));
            }
          }
          this.history.update("tables", cmd.sheetId, table.id, "zone", zone);
          this.history.update("tables", cmd.sheetId, table.id, "filters", filters);
        }
      }
    }
  }

  private createCheckboxTable(zone: Zone): CheckboxTable {
    console.log("create filter");
    return new CheckboxTable(zone);
  }
  private createCheckbox(zone: Zone): CheckboxTable {
    console.log("create checkbox CREATE");
    return new CheckboxTable(zone);
  }
  /** Extend a table down one row */
  private extendTableDown(sheetId: UID, table: CheckboxTable) {
    const newZone = { ...table.zone, bottom: table.zone.bottom + 1 };
    this.history.update("tables", sheetId, table.id, "zone", newZone);
    for (let filterIndex = 0; filterIndex < table.filters.length; filterIndex++) {
      const filter = table.filters[filterIndex];
      const newCheckboxZone = {
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
        newCheckboxZone
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
    table: CheckboxTable
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
        const table = this.createCheckboxTable(toZone(filterTableData.range));
        this.history.update("tables", sheet.id, table.id, table);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const filterTable of this.getCheckboxTables(sheet.id)) {
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
