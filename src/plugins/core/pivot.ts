import { deepCopy, deepEquals } from "../../helpers";
import { createPivotFormula, getMaxObjectId } from "../../helpers/pivot/pivot_helpers";
import { SpreadsheetPivotTable } from "../../helpers/pivot/table_spreadsheet_pivot";
import { _t } from "../../translation";
import { CellPosition, CommandResult, CoreCommand, Position, UID, WorkbookData } from "../../types";
import { PivotCoreDefinition } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";

interface Pivot {
  definition: PivotCoreDefinition;
  formulaId: string;
}

interface CoreState {
  nextFormulaId: number;
  pivots: Record<UID, Pivot | undefined>;
  formulaIds: Record<UID, string | undefined>;
}

export class PivotCorePlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "getPivotCoreDefinition",
    "getPivotDisplayName",
    "getPivotId",
    "getPivotFormulaId",
    "getPivotIds",
    "getPivotName",
    "isExistingPivot",
  ] as const;

  readonly nextFormulaId: number = 1;
  public readonly pivots: {
    [pivotId: UID]: Pivot | undefined;
  } = {};
  public readonly formulaIds: { [formulaId: UID]: UID | undefined } = {};

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_PIVOT": {
        if (deepEquals(cmd.pivot, this.pivots[cmd.pivotId]?.definition)) {
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
        const position = { sheetId, col, row };
        const { cols, rows, measures, fieldsType } = table;
        const spTable = new SpreadsheetPivotTable(cols, rows, measures, fieldsType || {});
        const formulaId = this.getPivotFormulaId(pivotId);
        this.insertPivot(position, formulaId, spTable);
        break;
      }
      case "RENAME_PIVOT": {
        this.history.update("pivots", cmd.pivotId, "definition", "name", cmd.name);
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
        const pivot = deepCopy(this.getPivotCore(pivotId).definition);
        pivot.name = _t("%s (copy)", pivot.name);
        this.addPivot(newPivotId, pivot);
        break;
      }
      case "UPDATE_PIVOT": {
        this.history.update("pivots", cmd.pivotId, "definition", cmd.pivot);
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  getPivotDisplayName(pivotId: UID) {
    const formulaId = this.getPivotFormulaId(pivotId);
    return `(#${formulaId}) ${this.getPivotName(pivotId)}`;
  }

  getPivotName(pivotId: UID) {
    return _t(this.getPivotCore(pivotId).definition.name);
  }

  /**
   * Returns the pivot core definition of the pivot with the given id.
   * Be careful, this is the core definition, this should be used only in a
   * context where the pivot is not loaded yet.
   */
  getPivotCoreDefinition(pivotId: UID): PivotCoreDefinition {
    return this.getPivotCore(pivotId).definition;
  }

  /**
   * Get the pivot ID (UID) from the formula ID (the one used in the formula)
   */
  getPivotId(formulaId: string) {
    return this.formulaIds[formulaId];
  }

  getPivotFormulaId(pivotId: UID) {
    return this.getPivotCore(pivotId).formulaId;
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

  private addPivot(
    pivotId: UID,
    pivot: PivotCoreDefinition,
    formulaId = this.nextFormulaId.toString()
  ) {
    this.history.update("pivots", pivotId, { definition: pivot, formulaId });
    this.history.update("formulaIds", formulaId, pivotId);
    this.history.update("nextFormulaId", this.nextFormulaId + 1);
  }

  private insertPivot(position: CellPosition, formulaId: UID, table: SpreadsheetPivotTable) {
    this.resizeSheet(position.sheetId, position, table);

    const pivotCells = table.getPivotCells();
    for (let col = 0; col < pivotCells.length; col++) {
      for (let row = 0; row < pivotCells[col].length; row++) {
        const pivotCell = pivotCells[col][row];
        this.dispatch("UPDATE_CELL", {
          sheetId: position.sheetId,
          col: position.col + col,
          row: position.row + row,
          content: createPivotFormula(formulaId, pivotCell),
        });
      }
    }
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

  private getPivotCore(pivotId: UID): Pivot {
    const pivot = this.pivots[pivotId];
    if (!pivot) {
      throw new Error(`Pivot with id ${pivotId} not found`);
    }
    return pivot;
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
        this.addPivot(id, pivot, pivot.formulaId);
      }
    }
    this.history.update("nextFormulaId", data.pivotNextId || getMaxObjectId(this.pivots) + 1);
  }
  /**
   * Export the pivots
   */
  export(data: WorkbookData) {
    data.pivots = {};
    for (const pivotId in this.pivots) {
      data.pivots[pivotId] = {
        ...this.getPivotCoreDefinition(pivotId),
        formulaId: this.getPivotFormulaId(pivotId),
      };
    }
    data.pivotNextId = this.nextFormulaId;
  }
}
