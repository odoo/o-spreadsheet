import { toScalar } from "../../functions/helper_matrices";
import { PositionMap } from "../../helpers/cells/position_map";
import { lazy } from "../../helpers/misc";
import { getPivotStyleFromFnArgs } from "../../helpers/pivot/pivot_helpers";
import { getComputedPivotTableStyle, TableInfo } from "../../helpers/pivot_table_helpers";
import { PIVOT_TABLE_PRESETS } from "../../helpers/pivot_table_presets";
import { FormulaCell } from "../../types/cells";
import { Command, CommandTypes, invalidateEvaluationCommands } from "../../types/commands";
import { Border, CellPosition, Lazy, Style, UID, Zone } from "../../types/misc";
import { TableConfig } from "../../types/table";
import { UIPlugin } from "../ui_plugin";

interface ComputedTableStyle {
  styles: Record<number, Record<number, Style | undefined>>;
  borders: Record<number, Record<number, Border | undefined>>;
}

// interface TableRuntime {
//   config: TableConfig;
//   numberOfCols: number;
//   numberOfRows: number;
// }

type CellId = string;

export class PivotTableComputedStylePlugin extends UIPlugin {
  static getters = [
    "getCellPivotTableStyle",
    "getCellPivotTableStyleZone",
    "getCellPivotTableBorder",
    "getCellPivotTableBorderZone",
  ] as const;

  private pivotStyle: Record<UID, Record<CellId, Lazy<ComputedTableStyle>>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd)) ||
      cmd.type === "EVALUATE_CELLS"
    ) {
      this.pivotStyle = {};
      return;
    }

    if (doesCommandInvalidatesTableStyle(cmd)) {
      if ("sheetId" in cmd) {
        delete this.pivotStyle[cmd.sheetId];
      } else {
        this.pivotStyle = {};
      }
      return;
    }
  }

  getCellPivotTableStyle(position: CellPosition): Style | undefined {
    const id = this.computePivotTableStyleAtPosition(position);
    return id
      ? this.pivotStyle[position.sheetId][id]().styles[position.col]?.[position.row]
      : undefined;
  }

  getCellPivotTableStyleZone(sheetId: UID, zone: Zone): PositionMap<Style> {
    const map = new PositionMap<Style>();
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const position = { sheetId, col, row };
        const style = this.getters.getCellPivotTableStyle(position);
        if (style) {
          map.set(position, style);
        }
      }
    }
    return map;
  }

  getCellPivotTableBorder(position: CellPosition): Border | undefined {
    const id = this.computePivotTableStyleAtPosition(position);
    return id
      ? this.pivotStyle[position.sheetId][id]().borders[position.col]?.[position.row]
      : undefined;
  }

  getCellPivotTableBorderZone(sheetId: UID, zone: Zone): PositionMap<Border> {
    const map = new PositionMap<Border>();
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const position = { sheetId, col, row };
        const border = this.getters.getCellPivotTableBorder(position);
        if (border) {
          map.set(position, border);
        }
      }
    }
    return map;
  }

  private computePivotTableStyleAtPosition(position: CellPosition) {
    if (!this.pivotStyle[position.sheetId]) {
      this.pivotStyle[position.sheetId] = {};
    }

    const pivotId = this.getters.getPivotIdFromPosition(position);
    const cell = this.getters.getCorrespondingFormulaCell(position);
    if (!pivotId || !cell) {
      return undefined;
    }

    if (!(cell.id in this.pivotStyle[position.sheetId])) {
      this.pivotStyle[position.sheetId][cell.id] = this.computePivotTableStyle(
        position.sheetId,
        cell,
        pivotId
      );
    }

    return cell.id;
  }

  private computePivotTableStyle(
    sheetId: UID,
    rootCell: FormulaCell,
    pivotId: UID
  ): Lazy<ComputedTableStyle> {
    return lazy(() => {
      const result = this.getters.getFirstPivotFunction(sheetId, rootCell.compiledFormula.tokens);
      if (!result) {
        return { borders: {}, styles: {} };
      }
      const { args } = result;

      const pivotStyle = getPivotStyleFromFnArgs(
        this.getters.getPivotCoreDefinition(pivotId),
        toScalar(args[1]),
        toScalar(args[2]),
        toScalar(args[3]),
        toScalar(args[4]),
        toScalar(args[5]),
        this.getters.getLocale()
      );
      const pivot = this.getters.getPivot(pivotId);
      const pivotTable = pivot.getCollapsedTableStructure();
      const pivotCells = pivotTable.getPivotCells(pivotStyle);

      const maxRowDepth = Math.max(
        ...pivot
          .getExpandedTableStructure()
          .getPivotCells(pivotStyle)[0]
          .filter((cell) => cell.type === "HEADER")
          .map((cell) => cell.domain.length)
      );

      const mainSubHeaderRows = new Set<number>();
      const firstSubSubHeaderRows = new Set<number>();
      const secondSubSubHeaderRows = new Set<number>();
      for (let r = 0; r < pivotCells[0].length; r++) {
        const cell = pivotCells[0][r];
        if (cell.type !== "HEADER" || cell.domain.length === 0) {
          continue;
        }
        if (cell.domain.length === 1 && maxRowDepth > 1) {
          mainSubHeaderRows.add(r);
        } else if (cell.domain.length % 2 === 0 && maxRowDepth > cell.domain.length) {
          firstSubSubHeaderRows.add(r);
        } else if (cell.domain.length % 2 === 1 && maxRowDepth > cell.domain.length) {
          secondSubSubHeaderRows.add(r);
        }
      }

      const numberOfHeaderRows = Math.max(
        ...pivotCells
          .slice(1)
          .map((col) =>
            col.reduce(
              (count, cell) =>
                cell.type === "HEADER" || cell.type === "MEASURE_HEADER" ? count + 1 : count,
              0
            )
          )
      );

      console.log({ numberOfHeaderRows });
      // const { config, numberOfCols, numberOfRows } = this.getTableRuntimeConfig(sheetId, table);
      const config: TableConfig = {
        hasFilters: false,
        totalRow: pivotStyle.displayTotals,
        firstColumn: false,
        lastColumn: false,
        numberOfHeaders: numberOfHeaderRows,
        bandedRows: false,
        bandedColumns: true,
        styleId: "TableStyleMedium5",
      };
      const style = PIVOT_TABLE_PRESETS["PivotTableStyleMedium7"];

      const tableInfo: TableInfo = {
        numberOfCols: pivotCells.length,
        numberOfRows: pivotCells[0].length,
        mainSubHeaderRows,
        firstSubSubHeaderRows,
        secondSubSubHeaderRows,
        measureHeaderRowIndex:
          numberOfHeaderRows && pivotStyle.displayMeasuresRow ? numberOfHeaderRows - 1 : undefined,
      };
      const relativeTableStyle = getComputedPivotTableStyle(config, style, tableInfo);
      const rootCellPosition = this.getters.getCellPosition(rootCell.id);

      // Return the style with sheet coordinates instead of tables coordinates
      const absoluteTableStyle: ComputedTableStyle = { borders: {}, styles: {} };
      for (let col = 0; col < pivotCells.length; col++) {
        const colInSheet = rootCellPosition.col + col;
        absoluteTableStyle.borders[colInSheet] = {};
        absoluteTableStyle.styles[colInSheet] = {};

        for (let row = 0; row < pivotCells[0].length; row++) {
          const rowInSheet = rootCellPosition.row + row;
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
  // private getTableRuntimeConfig(sheetId: UID, table: Table): TableRuntime {
  //   const tableZone = table.range.zone;
  //   const config = { ...table.config };
  //   let numberOfCols = tableZone.right - tableZone.left + 1;
  //   let numberOfRows = tableZone.bottom - tableZone.top + 1;

  //   for (let row = tableZone.top; row <= tableZone.bottom; row++) {
  //     if (!this.getters.isRowHidden(sheetId, row)) {
  //       continue;
  //     }
  //     numberOfRows--;

  //     if (row - tableZone.top < table.config.numberOfHeaders) {
  //       config.numberOfHeaders--;
  //       if (config.numberOfHeaders < 0) {
  //         config.numberOfHeaders = 0;
  //       }
  //     }
  //     if (row === tableZone.bottom) {
  //       config.totalRow = false;
  //     }
  //   }

  //   for (let col = tableZone.left; col <= tableZone.right; col++) {
  //     if (!this.getters.isColHidden(sheetId, col)) {
  //       continue;
  //     }
  //     numberOfCols--;

  //     if (col === tableZone.left) {
  //       config.firstColumn = false;
  //     }
  //     if (col === tableZone.right) {
  //       config.lastColumn = false;
  //     }
  //   }

  //   return {
  //     config,
  //     numberOfCols,
  //     numberOfRows,
  //   };
  // }

  // /**
  //  * Get a mapping: relative col/row position in the table <=> col/row in the sheet
  //  */
  // private getTableMapping(sheetId: UID, table: Table) {
  //   const colMapping: Record<number, number> = {};
  //   const rowMapping: Record<number, number> = {};
  //   let colOffset = 0;
  //   let rowOffset = 0;

  //   const tableZone = table.range.zone;
  //   for (let col = tableZone.left; col <= tableZone.right; col++) {
  //     if (this.getters.isColHidden(sheetId, col)) {
  //       continue;
  //     }
  //     colMapping[colOffset] = col;
  //     colOffset++;
  //     for (let row = tableZone.top; row <= tableZone.bottom; row++) {
  //       if (this.getters.isRowHidden(sheetId, row)) {
  //         continue;
  //       }
  //       rowMapping[rowOffset] = row;
  //       rowOffset++;
  //     }
  //   }

  //   return {
  //     colMapping,
  //     rowMapping,
  //   };
  // }
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

// ADRM TODO: adapt for pivot
export function doesCommandInvalidatesTableStyle(
  cmd: Command
): cmd is { type: (typeof invalidateTableStyleCommands)[number] } & Command {
  return invalidateTableStyleCommandsSet.has(cmd.type);
}
