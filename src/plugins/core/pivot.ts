import { PIVOT_TABLE_CONFIG } from "../../constants";
import { deepCopy, deepEquals, isDefined } from "../../helpers";
import { getMaxObjectId, makePivotFormula } from "../../helpers/pivot/pivot_helpers";
import { SpreadsheetPivotTable } from "../../helpers/pivot/spreadsheet_pivot_table";
import { _t } from "../../translation";
import {
  CellPosition,
  CommandResult,
  CoreCommand,
  CreateTableCommand,
  Position,
  UID,
  WorkbookData,
} from "../../types";
import { PivotCoreDefinition, SPTableCell } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";

interface LocalPivot extends PivotCoreDefinition {
  /**
   * The formula id is the id that is used in the formula to identify the pivot.
   * It's different from the pivot id, which is the id of the pivot in the state.
   * The formula id is a readable id, auto-incremented. The pivotId is a UID.
   * We need this distinction to be assured that the pivotId is unique in a
   * context of collaboration.
   */
  formulaId: string;
}

interface CoreState {
  nextFormulaId: number;
  pivots: Record<UID, LocalPivot | undefined>;
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
  public readonly pivots: { [key: UID]: LocalPivot } = {};
  public readonly formulaIds: { [key: UID]: string } = {};

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
        const position = { sheetId, col, row };
        const { cols, rows, measures, rowTitle } = table;
        const spTable = new SpreadsheetPivotTable(cols, rows, measures, rowTitle);
        const formulaId = this.getPivotFormulaId(pivotId);
        this.insertPivot(position, formulaId, spTable);
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
      case "UPDATE_PIVOT": {
        this.history.update("pivots", cmd.pivotId, {
          ...cmd.pivot,
          formulaId: this.pivots[cmd.pivotId].formulaId,
        });
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
    return _t(this.pivots[pivotId].name);
  }

  /**
   * Returns the pivot core definition of the pivot with the given id.
   * Be careful, this is the core definition, this should be used only in a
   * context where the pivot is not loaded yet.
   */
  getPivotCoreDefinition(pivotId: UID): PivotCoreDefinition {
    return this.pivots[pivotId];
  }

  /**
   * Get the pivot ID (UID) from the formula ID (the one used in the formula)
   */
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

  private addPivot(
    pivotId: UID,
    pivot: PivotCoreDefinition,
    formulaId = this.nextFormulaId.toString()
  ) {
    const pivots = { ...this.pivots };
    pivots[pivotId] = {
      ...pivot,
      formulaId,
    };
    this.history.update("pivots", pivots);
    this.history.update("formulaIds", formulaId, pivotId);
    this.history.update("nextFormulaId", this.nextFormulaId + 1);
  }

  private insertPivot(position: CellPosition, formulaId: UID, table: SpreadsheetPivotTable) {
    this.resizeSheet(position.sheetId, position, table);
    const pivotCells = table.getPivotCells();
    for (let col = 0; col < pivotCells.length; col++) {
      for (let row = 0; row < pivotCells[col].length; row++) {
        const pivotCell = pivotCells[col][row];
        const cellPosition = {
          sheetId: position.sheetId,
          col: position.col + col,
          row: position.row + row,
        };
        this.addPivotFormula(cellPosition, formulaId, pivotCell);
      }
    }
    const pivotZone = {
      top: position.row,
      bottom: position.row + pivotCells[0].length - 1,
      left: position.col,
      right: position.col + pivotCells.length - 1,
    };
    const numberOfHeaders = table.columns.length - 1;
    const cmdContent: Omit<CreateTableCommand, "type"> = {
      sheetId: position.sheetId,
      ranges: [this.getters.getRangeDataFromZone(position.sheetId, pivotZone)],
      config: { ...PIVOT_TABLE_CONFIG, numberOfHeaders },
      tableType: "static",
    };
    if (this.canDispatch("CREATE_TABLE", cmdContent).isSuccessful) {
      this.dispatch("CREATE_TABLE", cmdContent);
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

  private addPivotFormula(position: CellPosition, formulaId: UID, pivotCell: SPTableCell) {
    const formula = pivotCell.isHeader ? "PIVOT.HEADER" : "PIVOT.VALUE";
    const args = pivotCell.domain
      ? [formulaId, pivotCell.measure, ...pivotCell.domain].filter(isDefined)
      : undefined;

    this.dispatch("UPDATE_CELL", {
      ...position,
      content: pivotCell.content || (args ? makePivotFormula(formula, args) : undefined),
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
    this.history.update("nextFormulaId", data.pivotNextId || getMaxObjectId(this.pivots) + 1);
  }
  /**
   * Export the pivots
   */
  export(data: WorkbookData) {
    data.pivots = {};
    for (const pivotId in this.pivots) {
      data.pivots[pivotId] = deepCopy(this.pivots[pivotId]);
    }
    data.pivotNextId = this.nextFormulaId;
  }
}
