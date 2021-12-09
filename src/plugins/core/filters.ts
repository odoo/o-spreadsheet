import { DEFAULT_FILTER_BORDER_DESC } from "../../constants";
import {
  expandZoneOnInsertion,
  isInside,
  isZoneValid,
  reduceZoneOnDeletion,
  reduceZoneToVisibleHeaders,
} from "../../helpers";
import {
  AddColumnsRowsCommand,
  Border,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Position,
  RemoveColumnsRowsCommand,
  UID,
  WorkbookData,
  Zone,
} from "../../types";
import { FilterZone } from "../../types/filters";
import { CorePlugin } from "../core_plugin";

interface FiltersState {
  filters: Record<UID, FilterZone | undefined>;
}

export class FiltersPlugin extends CorePlugin<FiltersState> implements FiltersState {
  static getters = [
    "getFilterBorder",
    "getFilterHeaders",
    "getFilterZoneOfCOl",
    "getFilter",
    "isFilterHeader",
    "isFilterActive",
    "isSheetContainsFilter",
  ] as const;

  readonly filters: Record<UID, FilterZone | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    switch (cmd.type) {
      case "CREATE_FILTERS":
        if (this.filters[cmd.sheetId]) {
          return CommandResult.TooManyFilters;
        }
        if (cmd.target.length !== 1 || !isZoneValid(cmd.target[0])) {
          return CommandResult.InvalidFilterZone;
        }
        break;
      case "SET_FILTER_VALUE": {
        const filter = this.filters[cmd.sheetId];
        if (!filter) {
          return CommandResult.MissingFilter;
        }
        if (!isInside(cmd.col, cmd.row, filter.zone) || cmd.row !== filter.zone.top) {
          return CommandResult.InvalidFilterZone;
        }
        break;
      }
      case "DELETE_FILTERS":
        if (!this.filters[cmd.sheetId]) {
          return CommandResult.MissingFilter;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FILTERS":
        this.createFilter(cmd.sheetId, cmd.target[0]);
        break;
      case "DELETE_FILTERS":
        this.deleteFilter(cmd.sheetId);
        break;
      case "ADD_COLUMNS_ROWS":
        this.onAddColumnsRows(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.onDeleteColumnsRows(cmd);
        break;
    }
  }

  getFilter(sheetId: UID): FilterZone {
    const filter = this.filters[sheetId];
    if (!filter) {
      throw new Error("Unable to get the filter");
    }
    return filter;
  }

  private createFilter(sheetId: UID, zone: Zone) {
    this.history.update("filters", sheetId, { zone, filters: {} });
  }

  private deleteFilter(sheetId: UID) {
    this.history.update("filters", sheetId, undefined);
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    const filter = this.filters[cmd.sheetId];
    if (!filter) {
      return;
    }
    const zone = expandZoneOnInsertion(
      filter.zone,
      cmd.dimension === "COL" ? "left" : "top",
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    this.history.update("filters", cmd.sheetId, "zone", zone);
  }

  private onDeleteColumnsRows(cmd: RemoveColumnsRowsCommand) {
    const filter = this.filters[cmd.sheetId];
    if (!filter) {
      return;
    }
    const zone = reduceZoneOnDeletion(
      filter.zone,
      cmd.dimension === "COL" ? "left" : "top",
      cmd.elements
    );
    if (!zone) {
      this.history.update("filters", cmd.sheetId, undefined);
    } else {
      this.history.update("filters", cmd.sheetId, "zone", zone);
    }
  }

  getFilterZoneOfCOl(sheetId: UID, col: number): Zone | undefined {
    const zone = this.getFilter(sheetId).zone;
    if (isInside(col, zone.top, zone) && zone.top !== zone.bottom) {
      return {
        top: zone.top + 1,
        left: col,
        right: col,
        bottom: zone.bottom,
      };
    }
    return undefined;
  }

  getFilterBorder(sheetId: UID, col: number, row: number): Border | null {
    const zone = this.filters[sheetId]?.zone;
    if (!zone) {
      return null;
    }
    if (isInside(col, row, zone)) {
      const sheet = this.getters.getSheet(sheetId);
      const reducedZone = reduceZoneToVisibleHeaders(sheet, zone);
      if (!reducedZone) {
        return null;
      }
      const border = {
        top: row === reducedZone.top ? DEFAULT_FILTER_BORDER_DESC : undefined,
        bottom: row === reducedZone.bottom ? DEFAULT_FILTER_BORDER_DESC : undefined,
        left: col === reducedZone.left ? DEFAULT_FILTER_BORDER_DESC : undefined,
        right: col === reducedZone.right ? DEFAULT_FILTER_BORDER_DESC : undefined,
      };
      if (Object.keys(border).length !== 0) {
        return border;
      }
    }
    return null;
  }

  getFilterHeaders(sheetId: UID): Position[] {
    const headers: Position[] = [];
    const zone = this.filters[sheetId]?.zone;
    if (!zone) {
      return headers;
    }
    const sheet = this.getters.getSheet(sheetId);
    const row = zone.top;
    for (let col = zone.left; col <= zone.right; col++) {
      if (sheet.cols[col].isHidden || sheet.rows[row].isHidden) {
        continue;
      }
      headers.push({ col, row });
    }
    return headers;
  }

  isFilterActive(sheetId: UID, col: number): boolean {
    const filter = this.filters[sheetId];
    return !!(filter && filter.filters[col]);
  }

  isFilterHeader(sheetId: UID, col: number, row: number): boolean {
    const zone = this.filters[sheetId]?.zone;
    if (zone && isInside(col, row, zone)) {
      if (row === zone.top) {
        return true;
      }
    }
    return false;
  }

  isSheetContainsFilter(sheetId: UID): boolean {
    return !!this.filters[sheetId];
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      if (sheet.filter) {
        this.filters[sheet.id] = JSON.parse(JSON.stringify(sheet.filter));
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const filter = this.filters[sheet.id];
      if (filter) {
        sheet.filter = JSON.parse(JSON.stringify(filter));
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
