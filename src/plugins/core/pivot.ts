import { deepCopy, deepEquals, isDefined } from "../../helpers";
import { getMaxObjectId, makePivotFormula } from "../../helpers/pivot/pivot_helpers";
import { SpreadsheetPivotTable } from "../../helpers/pivot/spreadsheet_pivot_table";
import { _t } from "../../translation";
import { CommandResult, CoreCommand, Position, UID, WorkbookData } from "../../types";
import { CorePivotDefinition, PivotDefinition, SPTableCell } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";

export class PivotCorePlugin extends CorePlugin {
  static getters = /** @type {const} */ [
    "getPivotDefinition",
    "getPivotDisplayName",
    "getPivotId",
    "getPivotFormulaId",
    "getPivotIds",
    "getPivotName",
    "isExistingPivot",
  ];

  private nextFormulaId: number = 1;
  private pivots: { [key: UID]: CorePivotDefinition } = {};
  private formulaIds: { [key: UID]: string } = {};

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_PIVOT": {
        if (deepEquals(cmd.pivot, this.pivots[cmd.pivotId])) {
          return CommandResult.NoChanges;
        }
        break;
      }
      case "RENAME_PIVOT":
        if (!(cmd.pivotId in this.pivots)) {
          return CommandResult.PivotIdNotFound;
        }
        if (cmd.name === "") {
          return CommandResult.EmptyName;
        }
        break;
      case "INSERT_PIVOT": {
        if (!(cmd.pivotId in this.pivots)) {
          return CommandResult.PivotIdNotFound;
        }
        break;
      }
      case "DUPLICATE_PIVOT":
        if (!(cmd.pivotId in this.pivots)) {
          return CommandResult.PivotIdNotFound;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_PIVOT": {
        const { pivotId, pivot } = cmd;
        this.addPivot(pivotId, pivot);
        break;
      }
      case "INSERT_PIVOT": {
        const { sheetId, col, row, pivotId, table } = cmd;
        /** @type { { col: number, row: number } } */
        const position = { col, row };
        const { cols, rows, measures, rowTitle } = table;
        const spTable = new SpreadsheetPivotTable(cols, rows, measures, rowTitle);
        const formulaId = this.getPivotFormulaId(pivotId);
        this.insertPivot(sheetId, position, formulaId, spTable);
        break;
      }
      case "RENAME_PIVOT": {
        this.history.update("pivots", cmd.pivotId, "name", cmd.name);
        break;
      }
      case "REMOVE_PIVOT": {
        const pivots = { ...this.pivots };
        delete pivots[cmd.pivotId];
        const formulaId = this.getPivotFormulaId(cmd.pivotId);
        this.history.update("formulaIds", formulaId, undefined);
        this.history.update("pivots", pivots);
        break;
      }
      case "DUPLICATE_PIVOT": {
        const { pivotId, newPivotId } = cmd;
        const pivot = deepCopy(this.pivots[pivotId]);
        this.addPivot(newPivotId, pivot);
        break;
      }
      // this command is deprecated. use UPDATE_PIVOT instead
      // TODOPRO
      // @ts-ignore This is bad :snif:
      case "UPDATE_ODOO_PIVOT_DOMAIN": {
        // @ts-ignore This is bad :snif:
        this.history.update("pivots", cmd.pivotId, "domain", cmd.domain);
        break;
      }
      case "UPDATE_PIVOT": {
        this.history.update("pivots", cmd.pivotId, cmd.pivot);
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  getPivotDisplayName(id: UID) {
    const formulaId = this.getPivotFormulaId(id);
    return `(#${formulaId}) ${this.getPivotName(id)}`;
  }

  getPivotName(id: UID) {
    return _t(this.pivots[id].name);
  }

  getPivotDefinition(id: UID) {
    return this.pivots[id];
  }

  getPivotId(formulaId: string) {
    return this.formulaIds[formulaId];
  }

  getPivotFormulaId(pivotId: UID) {
    return this.pivots[pivotId]?.formulaId;
  }

  getPivotIds(): UID[] {
    return Object.keys(this.pivots);
  }

  isExistingPivot(pivotId: UID) {
    return pivotId in this.pivots;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private addPivot(id: UID, pivot: PivotDefinition, formulaId = this.nextFormulaId.toString()) {
    const pivots = { ...this.pivots };
    pivots[id] = {
      ...pivot,
      formulaId,
    };
    this.history.update("pivots", pivots);
    this.history.update("formulaIds", formulaId, id);
    this.history.update("nextFormulaId", this.nextFormulaId + 1);
  }

  private insertPivot(sheetId: UID, position: Position, id: UID, table: SpreadsheetPivotTable) {
    this.resizeSheet(sheetId, position, table);
    const pivotCells = table.getPivotCells();
    for (let col = 0; col < pivotCells.length; col++) {
      for (let row = 0; row < pivotCells[col].length; row++) {
        const pivotCell = pivotCells[col][row];
        const functionCol = position.col + col;
        const functionRow = position.row + row;
        this.addPivotFormula(sheetId, id, { col: functionCol, row: functionRow }, pivotCell);
      }
    }

    this.addBorders(sheetId, position, table);
  }

  private resizeSheet(sheetId: UID, { col, row }: Position, table: SpreadsheetPivotTable) {
    const colLimit = table.getNumberOfDataColumns() + 1; // +1 for the Top-Left
    const numberCols = this.getters.getNumberCols(sheetId);
    const deltaCol = numberCols - col;
    if (deltaCol < colLimit) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: numberCols - 1,
        sheetId: sheetId,
        quantity: colLimit - deltaCol,
        position: "after",
      });
    }
    const rowLimit = table.columns.length + table.rows.length;
    const numberRows = this.getters.getNumberRows(sheetId);
    const deltaRow = numberRows - row;
    if (deltaRow < rowLimit) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: numberRows - 1,
        sheetId: sheetId,
        quantity: rowLimit - deltaRow,
        position: "after",
      });
    }
  }

  private addBorders(sheetId: UID, { col, row }: Position, table: SpreadsheetPivotTable) {
    const colHeight = table.columns.length;
    const colWidth = table.getNumberOfDataColumns();
    const totalRow = row + colHeight + table.rows.length - 1;
    const headerAndMeasureZone = {
      top: row,
      bottom: row + colHeight - 1,
      left: col,
      right: col + colWidth,
    };
    this.dispatch("SET_ZONE_BORDERS", {
      sheetId,
      target: [
        headerAndMeasureZone,
        {
          left: col,
          right: col + colWidth,
          top: totalRow,
          bottom: totalRow,
        },
        {
          left: col,
          right: col + colWidth,
          top: row,
          bottom: totalRow,
        },
      ],
      border: {
        position: "external",
        color: "#2D7E84",
      },
    });
  }

  private addPivotFormula(
    sheetId: UID,
    pivotId: UID,
    { col, row }: Position,
    pivotCell: SPTableCell
  ) {
    const formula = pivotCell.isHeader ? "PIVOT.HEADER" : "PIVOT.VALUE";
    const args = pivotCell.domain
      ? [pivotId, pivotCell.measure, ...pivotCell.domain].filter(isDefined)
      : undefined;

    this.dispatch("UPDATE_CELL", {
      sheetId,
      col,
      row,
      content: pivotCell.content || (args ? makePivotFormula(formula, args) : undefined),
      style: pivotCell.style,
    });
  }

  // ---------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------

  /**
   * Import the pivots
   */
  import(data: WorkbookData) {
    if (data.pivots) {
      for (const [id, pivot] of Object.entries(data.pivots)) {
        this.addPivot(id, deepCopy(pivot), pivot.formulaId);
      }
    }
    this.nextFormulaId = data.pivotNextId || getMaxObjectId(this.pivots) + 1;
  }
  /**
   * Export the pivots
   */
  export(data: WorkbookData) {
    data.pivots = {};
    for (const id in this.pivots) {
      data.pivots[id] = deepCopy(this.pivots[id]);
    }
    data.pivotNextId = this.nextFormulaId;
  }
}
