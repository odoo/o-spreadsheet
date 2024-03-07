import { lazy } from "../../helpers";
import { getComputedTableStyle } from "../../helpers/table_helpers";
import {
  Border,
  CellPosition,
  Command,
  CommandTypes,
  Lazy,
  Style,
  Table,
  TableConfig,
  TableId,
  UID,
  invalidateEvaluationCommands,
} from "../../types";
import { UIPlugin } from "../ui_plugin";

interface ComputedTableStyle {
  styles: Record<number, Record<number, Style | undefined>>;
  borders: Record<number, Record<number, Border | undefined>>;
}

interface TableRuntime {
  config: TableConfig;
  numberOfCols: number;
  numberOfRows: number;
}

export class TableStylePlugin extends UIPlugin {
  static getters = ["getCellTableStyle", "getCellTableBorder"] as const;

  private tableStyles: Record<UID, Record<TableId, Lazy<ComputedTableStyle>>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && "content" in cmd) ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.tableStyles = {};
      return;
    }

    if (doesCommandInvalidatesTableStyle(cmd)) {
      delete this.tableStyles[cmd.sheetId];
      return;
    }
  }

  finalize() {
    for (const sheetId of this.getters.getSheetIds()) {
      if (!this.tableStyles[sheetId]) {
        this.tableStyles[sheetId] = {};
      }
      for (const table of this.getters.getTables(sheetId)) {
        if (!this.tableStyles[sheetId][table.id]) {
          this.tableStyles[sheetId][table.id] = this.computeTableStyle(sheetId, table);
        }
      }
    }
  }

  getCellTableStyle(position: CellPosition): Style | undefined {
    const table = this.getters.getTable(position);
    if (!table) {
      return undefined;
    }

    return this.tableStyles[position.sheetId][table.id]().styles[position.col]?.[position.row];
  }

  getCellTableBorder(position: CellPosition): Border | undefined {
    const table = this.getters.getTable(position);
    if (!table) {
      return undefined;
    }
    return this.tableStyles[position.sheetId][table.id]().borders[position.col]?.[position.row];
  }

  private computeTableStyle(sheetId: UID, table: Table): Lazy<ComputedTableStyle> {
    return lazy(() => {
      const { config, numberOfCols, numberOfRows } = this.getTableRuntimeConfig(sheetId, table);
      const relativeTableStyle = getComputedTableStyle(config, numberOfCols, numberOfRows);

      // Return the style with sheet coordinates instead of tables coordinates
      const mapping = this.getTableMapping(sheetId, table);
      const absoluteTableStyle: ComputedTableStyle = { borders: {}, styles: {} };
      for (let col = 0; col < numberOfCols; col++) {
        const colInSheet = mapping.colMapping[col];
        absoluteTableStyle.borders[colInSheet] = {};
        absoluteTableStyle.styles[colInSheet] = {};

        for (let row = 0; row < numberOfRows; row++) {
          const rowInSheet = mapping.rowMapping[row];
          absoluteTableStyle.borders[colInSheet][rowInSheet] = relativeTableStyle.borders[col][row];
          absoluteTableStyle.styles[colInSheet][rowInSheet] = relativeTableStyle.styles[col][row];
        }
      }
      return absoluteTableStyle;
    });
  }

  /**
   * Get the actual table config that will be used to compute the table style. It is different from
   * the config of the table because of hidden rows and columns in the sheet. For example remove the
   * hidden rows from config.numberOfHeaders.
   */
  private getTableRuntimeConfig(sheetId: UID, table: Table): TableRuntime {
    const tableZone = table.range.zone;
    const config = { ...table.config };
    let numberOfCols = tableZone.right - tableZone.left + 1;
    let numberOfRows = tableZone.bottom - tableZone.top + 1;

    for (let row = tableZone.top; row <= tableZone.bottom; row++) {
      if (!this.getters.isRowHidden(sheetId, row)) {
        continue;
      }
      numberOfRows--;

      if (row - tableZone.top < table.config.numberOfHeaders) {
        config.numberOfHeaders--;
        if (config.numberOfHeaders < 0) {
          config.numberOfHeaders = 0;
        }
      }
      if (row === tableZone.bottom) {
        config.totalRow = false;
      }
    }

    for (let col = tableZone.left; col <= tableZone.right; col++) {
      if (!this.getters.isColHidden(sheetId, col)) {
        continue;
      }
      numberOfCols--;

      if (col === tableZone.left) {
        config.firstColumn = false;
      }
      if (col === tableZone.right) {
        config.lastColumn = false;
      }
    }

    return {
      config,
      numberOfCols,
      numberOfRows,
    };
  }

  /**
   * Get a mapping: relative col/row position in the table <=> col/row in the sheet
   */
  private getTableMapping(sheetId: UID, table: Table) {
    const colMapping: Record<number, number> = {};
    const rowMapping: Record<number, number> = {};
    let colOffset = 0;
    let rowOffset = 0;

    const tableZone = table.range.zone;
    for (let col = tableZone.left; col <= tableZone.right; col++) {
      if (this.getters.isColHidden(sheetId, col)) {
        continue;
      }
      colMapping[colOffset] = col;
      colOffset++;
      for (let row = tableZone.top; row <= tableZone.bottom; row++) {
        if (this.getters.isRowHidden(sheetId, row)) {
          continue;
        }
        rowMapping[rowOffset] = row;
        rowOffset++;
      }
    }

    return {
      colMapping,
      rowMapping,
    };
  }
}

const invalidateTableStyleCommands = [
  "HIDE_COLUMNS_ROWS",
  "UNHIDE_COLUMNS_ROWS",
  "UNFOLD_HEADER_GROUP",
  "FOLD_HEADER_GROUP",
  "FOLD_ALL_HEADER_GROUPS",
  "UNFOLD_ALL_HEADER_GROUPS",
  "CREATE_TABLE",
  "UPDATE_TABLE",
  "UPDATE_FILTER",
  "REMOVE_TABLE",
  "RESIZE_TABLE",
] as const;
const invalidateTableStyleCommandsSet = new Set<CommandTypes>(invalidateTableStyleCommands);

export function doesCommandInvalidatesTableStyle(
  cmd: Command
): cmd is { type: (typeof invalidateTableStyleCommands)[number] } & Command {
  return invalidateTableStyleCommandsSet.has(cmd.type);
}
