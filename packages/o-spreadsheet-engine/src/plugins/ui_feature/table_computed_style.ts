import { PositionMap } from "../../helpers/cells/position_map";
import { lazy } from "../../helpers/misc";
import { getComputedTableStyle } from "../../helpers/table_helpers";
import { Command, CommandTypes, invalidateEvaluationCommands } from "../../types/commands";
import { Border, CellPosition, Lazy, Style, TableId, UID, Zone } from "../../types/misc";
import { Table, TableConfig, TableMetaData } from "../../types/table";
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

export class TableComputedStylePlugin extends UIPlugin {
  static getters = [
    "getCellTableStyle",
    "getCellTableBorder",
    "getCellTableBorderZone",
    "getCellTableStyleZone",
  ] as const;

  private tableStyles: Record<UID, Record<TableId, Lazy<ComputedTableStyle>>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd)) ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.tableStyles = {};
      return;
    }

    if (doesCommandInvalidatesTableStyle(cmd)) {
      if ("sheetId" in cmd) {
        delete this.tableStyles[cmd.sheetId];
      } else {
        this.tableStyles = {};
      }
      return;
    }
  }

  onEvaluationComplete() {
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

  getCellTableStyleZone(sheetId: UID, zone: Zone): PositionMap<Style> {
    const map = new PositionMap<Style>();
    for (const table of this.getters.getTablesOverlappingZones(sheetId, [zone])) {
      const tableStyles = this.tableStyles[sheetId][table.id]().styles;
      for (const colIdx of Object.keys(tableStyles)) {
        const colStyle = tableStyles[colIdx];
        const col = parseInt(colIdx);
        for (const rowIdx of Object.keys(colStyle)) {
          const cellStyle = colStyle[rowIdx];
          if (cellStyle) {
            map.set({ sheetId, col, row: parseInt(rowIdx) }, cellStyle);
          }
        }
      }
    }
    return map;
  }

  getCellTableBorder(position: CellPosition): Border | undefined {
    const table = this.getters.getTable(position);
    if (!table) {
      return undefined;
    }
    return this.tableStyles[position.sheetId][table.id]().borders[position.col]?.[position.row];
  }

  getCellTableBorderZone(sheetId: UID, zone: Zone): PositionMap<Border> {
    const map = new PositionMap<Border>();
    for (const table of this.getters.getTablesOverlappingZones(sheetId, [zone])) {
      const tableBorders = this.tableStyles[sheetId][table.id]().borders;
      for (const colIdx of Object.keys(tableBorders)) {
        const colStyle = tableBorders[colIdx];
        const col = parseInt(colIdx);
        for (const rowIdx of Object.keys(colStyle)) {
          const cellBorder = colStyle[rowIdx];
          if (cellBorder) {
            map.set({ sheetId, col, row: parseInt(rowIdx) }, cellBorder);
          }
        }
      }
    }
    return map;
  }

  private computeTableStyle(sheetId: UID, table: Table): Lazy<ComputedTableStyle> {
    return lazy(() => {
      const style = this.getters.getTableStyle(table.config.styleId);
      const { tableMetaData, config } = this.getTableMetaData(sheetId, table);
      const relativeTableStyle = getComputedTableStyle(config, style, tableMetaData);

      // Return the style with sheet coordinates instead of tables coordinates
      const mapping = this.getTableMapping(sheetId, table);
      const absoluteTableStyle: ComputedTableStyle = { borders: {}, styles: {} };
      for (let col = 0; col < tableMetaData.numberOfCols; col++) {
        const colInSheet = mapping.colMapping[col];
        absoluteTableStyle.borders[colInSheet] = {};
        absoluteTableStyle.styles[colInSheet] = {};

        for (let row = 0; row < tableMetaData.numberOfRows; row++) {
          const rowInSheet = mapping.rowMapping[row];
          absoluteTableStyle.borders[colInSheet][rowInSheet] = relativeTableStyle.borders[col][row];
          absoluteTableStyle.styles[colInSheet][rowInSheet] = relativeTableStyle.styles[col][row];
        }
      }
      return absoluteTableStyle;
    });
  }

  private getTableMetaData(
    sheetId: UID,
    table: Table
  ): { tableMetaData: TableMetaData; config: TableConfig } {
    const { config, numberOfCols, numberOfRows } = this.getTableRuntimeConfig(sheetId, table);
    if (!table.isPivotTable) {
      return { tableMetaData: { numberOfCols, numberOfRows, mode: "table" }, config };
    }

    const mainPosition = { sheetId, col: table.range.zone.left, row: table.range.zone.top };
    const pivotInfo = this.getters.getPivotStyleAtPosition(mainPosition);
    if (!pivotInfo) {
      throw new Error("No dynamic pivot info found at pivot table position");
    }
    const pivot = this.getters.getPivot(pivotInfo.pivotId);
    const pivotStyle = pivotInfo.pivotStyle;
    const maxRowDepth = pivot.getExpandedTableStructure().getNumberOfRowGroupBys();
    const pivotCells = pivot.getCollapsedTableStructure().getPivotCells(pivotStyle);

    const mainSubHeaderRows = new Set<number>();
    const firstAlternatingSubHeaderRows = new Set<number>();
    const secondAlternatingSubHeaderRows = new Set<number>();
    let hiddenRowsOffset = 0;

    for (let row = 0; row < pivotCells[0].length; row++) {
      const isRowHidden = this.getters.isRowHidden(sheetId, row + table.range.zone.top);
      if (isRowHidden) {
        hiddenRowsOffset++;
        continue;
      }

      const cell = pivotCells[0][row];
      if (cell.type !== "HEADER" || cell.domain.length === 0) {
        continue;
      }
      if (cell.domain.length === 1 && maxRowDepth > 1) {
        mainSubHeaderRows.add(row - hiddenRowsOffset);
      } else if (cell.domain.length % 2 === 0 && maxRowDepth > cell.domain.length) {
        firstAlternatingSubHeaderRows.add(row - hiddenRowsOffset);
      } else if (cell.domain.length % 2 === 1 && maxRowDepth > cell.domain.length) {
        secondAlternatingSubHeaderRows.add(row - hiddenRowsOffset);
      }
    }

    const hasMeasureRow =
      config.numberOfHeaders &&
      pivotStyle.displayMeasuresRow &&
      !this.getters.isRowHidden(sheetId, config.numberOfHeaders - 1 + table.range.zone.top);
    const tableMetaData: TableMetaData = {
      mode: "pivot",
      numberOfCols,
      numberOfRows,
      mainSubHeaderRows,
      firstAlternatingSubHeaderRows,
      secondAlternatingSubHeaderRows,
      measureRow: hasMeasureRow ? config.numberOfHeaders - 1 : undefined,
    };

    return { tableMetaData, config };
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
  "UNGROUP_HEADERS",
  "FOLD_HEADER_GROUP",
  "FOLD_ALL_HEADER_GROUPS",
  "UNFOLD_ALL_HEADER_GROUPS",
  "FOLD_HEADER_GROUPS_IN_ZONE",
  "UNFOLD_HEADER_GROUPS_IN_ZONE",
  "CREATE_TABLE",
  "UPDATE_TABLE",
  "UPDATE_FILTER",
  "REMOVE_TABLE",
  "RESIZE_TABLE",
  "CREATE_TABLE_STYLE",
  "REMOVE_TABLE_STYLE",
] as const;
const invalidateTableStyleCommandsSet = new Set<CommandTypes>(invalidateTableStyleCommands);

export function doesCommandInvalidatesTableStyle(
  cmd: Command
): cmd is { type: (typeof invalidateTableStyleCommands)[number] } & Command {
  return invalidateTableStyleCommandsSet.has(cmd.type);
}
