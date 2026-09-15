import { isEvaluationError } from "../../functions/helpers";
import { lazy } from "../../helpers/misc";
import { getComputedTableStyle } from "../../helpers/table_helpers";
import { EvaluationCommand, UpdateCellCommand } from "../../types/commands";
import { EvaluationError } from "../../types/errors";
import { Border, CellPosition, Lazy, Style, TableId, UID } from "../../types/misc";
import { Table, TableConfig, TableMetaData } from "../../types/table";
import { EvaluationPlugin } from "../evaluation_plugin";

interface ComputedTableStyle {
  styles: Record<number, Record<number, Style | undefined>>;
  borders: Record<number, Record<number, Border | undefined>>;
}

interface TableRuntime {
  config: TableConfig;
  numberOfCols: number;
  numberOfRows: number;
}

export class TableComputedStylePlugin extends EvaluationPlugin {
  static getters = ["getCellTableStyle", "getCellTableBorder"] as const;

  private tableStyles: Record<UID, Record<TableId, Lazy<ComputedTableStyle>>> = {};

  handlers = {
    UPDATE_CELL: this.invalidateTableStyles,
    DELETE_CONTENT: this.invalidateSheetTableStyles,
    CREATE_TABLE: this.invalidateSheetTableStyles,
    REMOVE_TABLE: this.invalidateSheetTableStyles,
    UPDATE_TABLE: this.invalidateSheetTableStyles,
    UPDATE_FILTER: this.invalidateSheetTableStyles,
    HIDE_COLUMNS_ROWS: this.invalidateSheetTableStyles,
    UNHIDE_COLUMNS_ROWS: this.invalidateSheetTableStyles,
    GROUP_HEADERS: this.invalidateSheetTableStyles,
    UNGROUP_HEADERS: this.invalidateSheetTableStyles,
    FOLD_HEADER_GROUP: this.invalidateSheetTableStyles,
    UNFOLD_HEADER_GROUP: this.invalidateSheetTableStyles,
    FOLD_ALL_HEADER_GROUPS: this.invalidateSheetTableStyles,
    UNFOLD_ALL_HEADER_GROUPS: this.invalidateSheetTableStyles,
    FOLD_HEADER_GROUPS_IN_ZONE: this.invalidateSheetTableStyles,
    UNFOLD_HEADER_GROUPS_IN_ZONE: this.invalidateSheetTableStyles,
    CREATE_TABLE_STYLE: this.clearTableStyles,
    REMOVE_TABLE_STYLE: this.clearTableStyles,
    UPDATE_LOCALE: this.clearTableStyles,
    CREATE_NAMED_RANGE: this.clearTableStyles,
    UPDATE_NAMED_RANGE: this.clearTableStyles,
    DELETE_NAMED_RANGE: this.clearTableStyles,
    RENAME_PIVOT: this.clearTableStyles,
    REMOVE_PIVOT: this.clearTableStyles,
    INSERT_PIVOT: this.clearTableStyles,
    ADD_PIVOT: this.clearTableStyles,
    DUPLICATE_PIVOT: this.clearTableStyles,
    UPDATE_PIVOT: this.clearTableStyles,
    ADD_MERGE: this.clearTableStyles,
    REMOVE_MERGE: this.clearTableStyles,
    RENAME_SHEET: this.clearTableStyles,
    CREATE_SHEET: this.clearTableStyles,
    DUPLICATE_SHEET: this.clearTableStyles,
    DELETE_SHEET: this.clearTableStyles,
    ADD_COLUMNS_ROWS: this.clearTableStyles,
    REMOVE_COLUMNS_ROWS: this.clearTableStyles,
    UNDO: this.clearTableStyles,
    REDO: this.clearTableStyles,
  };

  private clearTableStyles() {
    this.tableStyles = {};
  }

  private invalidateTableStyles(cmd: UpdateCellCommand) {
    if ("content" in cmd || "format" in cmd) {
      this.tableStyles = {};
    }
  }

  private invalidateSheetTableStyles(cmd: { sheetId: UID }) {
    delete this.tableStyles[cmd.sheetId];
  }

  handle(cmd: EvaluationCommand) {
    if (cmd.type === "EVALUATE_CELLS") {
      this.tableStyles = {};
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

    try {
      return this.tableStyles[position.sheetId][table.id]().styles[position.col]?.[position.row];
    } catch (e) {
      if (isEvaluationError(e) || e instanceof EvaluationError) {
        return undefined;
      }
      throw e;
    }
  }

  getCellTableBorder(position: CellPosition): Border | undefined {
    const table = this.getters.getTable(position);
    if (!table) {
      return undefined;
    }
    try {
      return this.tableStyles[position.sheetId][table.id]().borders[position.col]?.[position.row];
    } catch (e) {
      if (isEvaluationError(e) || e instanceof EvaluationError) {
        return undefined;
      }
      throw e;
    }
  }

  private computeTableStyle(sheetId: UID, table: Table): Lazy<ComputedTableStyle> {
    return lazy(() => {
      const style = this.getters.getTableStyle(table.config.styleId);
      const tableMetaDataAndConfig = this.getTableMetaData(sheetId, table);
      if (!tableMetaDataAndConfig) {
        return { borders: {}, styles: {} };
      }
      const { tableMetaData, config } = tableMetaDataAndConfig;
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
  ): { tableMetaData: TableMetaData; config: TableConfig } | undefined {
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
    if (!pivot.isValid()) {
      return undefined;
    }
    const pivotStyle = pivotInfo.pivotStyle;
    const maxRowDepth = pivot.getExpandedTableStructure().getNumberOfRowGroupBys();
    const pivotTable = pivot.getCollapsedTableStructure();
    const pivotCells = pivotTable.getPivotCells(pivotStyle);

    const mainSubHeaderRows = new Set<number>();
    const firstAlternatingSubHeaderIndexes = new Set<number>();
    const secondAlternatingSubHeaderIndexes = new Set<number>();
    const numberOfHeaderCols = pivotTable.getNumberOfRowGroupBys();

    if (!pivotStyle.tabularForm) {
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
          firstAlternatingSubHeaderIndexes.add(row - hiddenRowsOffset);
        } else if (cell.domain.length % 2 === 1 && maxRowDepth > cell.domain.length) {
          secondAlternatingSubHeaderIndexes.add(row - hiddenRowsOffset);
        }
      }
    } else {
      let hiddenColsOffset = 0;
      for (let col = 0; col < numberOfHeaderCols; col++) {
        const isColHidden = this.getters.isColHidden(sheetId, col + table.range.zone.left);
        if (isColHidden) {
          hiddenColsOffset++;
          continue;
        }

        if (col === 0 && maxRowDepth > 1) {
          mainSubHeaderRows.add(0);
        } else if (col % 2 === 1) {
          firstAlternatingSubHeaderIndexes.add(col - hiddenColsOffset);
        } else if (col % 2 === 0) {
          secondAlternatingSubHeaderIndexes.add(col - hiddenColsOffset);
        }
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
      firstAlternatingSubHeaderIndexes,
      secondAlternatingSubHeaderIndexes,
      measureRow: hasMeasureRow ? config.numberOfHeaders - 1 : undefined,
      isTabular: pivotStyle.tabularForm,
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
