import { Token } from "../../formulas";
import { astToFormula } from "../../formulas/parser";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "../../helpers/pivot/pivot_composer_helpers";
import { pivotRegistry } from "../../helpers/pivot/pivot_registry";
import { EMPTY_PIVOT_CELL } from "../../helpers/pivot/table_spreadsheet_pivot";
import {
  AddPivotCommand,
  CellPosition,
  Command,
  CoreCommand,
  FunctionResultObject,
  PivotTableCell,
  UID,
  UpdatePivotCommand,
  invalidateEvaluationCommands,
} from "../../types";
import { Pivot } from "../../types/pivot_runtime";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export const UNDO_REDO_PIVOT_COMMANDS = ["ADD_PIVOT", "UPDATE_PIVOT"];

function isPivotCommand(cmd: CoreCommand): cmd is AddPivotCommand | UpdatePivotCommand {
  return UNDO_REDO_PIVOT_COMMANDS.includes(cmd.type);
}

export class PivotUIPlugin extends UIPlugin {
  static getters = [
    "getPivot",
    "getFirstPivotFunction",
    "getPivotIdFromPosition",
    "getPivotCellFromPosition",
    "isPivotUnused",
    "isSpillPivotFormula",
  ] as const;

  private pivots: Record<UID, Pivot> = {};
  private unusedPivots?: UID[];
  private custom: UIPluginConfig["custom"];

  constructor(config: UIPluginConfig) {
    super(config);
    this.custom = config.custom;
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        for (const pivotId of this.getters.getPivotIds()) {
          this.setupPivot(pivotId);
        }
    }
  }

  handle(cmd: Command) {
    if (invalidateEvaluationCommands.has(cmd.type)) {
      for (const pivotId of this.getters.getPivotIds()) {
        if (!pivotRegistry.get(this.getters.getPivotCoreDefinition(pivotId).type).externalData) {
          this.setupPivot(pivotId, { recreate: true });
        }
      }
    }
    switch (cmd.type) {
      case "REFRESH_PIVOT":
        this.refreshPivot(cmd.id);
        break;
      case "ADD_PIVOT": {
        this.setupPivot(cmd.pivotId);
        break;
      }
      case "DUPLICATE_PIVOT": {
        this.setupPivot(cmd.newPivotId);
        break;
      }
      case "UPDATE_PIVOT": {
        this.setupPivot(cmd.pivotId, { recreate: true });
        break;
      }
      case "DELETE_SHEET":
      case "UPDATE_CELL": {
        this.unusedPivots = undefined;
        break;
      }
      case "UNDO":
      case "REDO": {
        this.unusedPivots = undefined;

        const pivotCommands = cmd.commands.filter(isPivotCommand);

        for (const cmd of pivotCommands) {
          const pivotId = cmd.pivotId;
          if (!this.getters.isExistingPivot(pivotId)) {
            continue;
          }
          this.setupPivot(pivotId, { recreate: true });
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  /**
   * Get the id of the pivot at the given position. Returns undefined if there
   * is no pivot at this position
   */
  getPivotIdFromPosition(position: CellPosition) {
    const cell = this.getters.getCorrespondingFormulaCell(position);
    if (cell && cell.isFormula) {
      const pivotFunction = this.getFirstPivotFunction(
        position.sheetId,
        cell.compiledFormula.tokens
      );
      if (pivotFunction) {
        const pivotId = pivotFunction.args[0]?.toString();
        return pivotId && this.getters.getPivotId(pivotId);
      }
    }
    return undefined;
  }

  isSpillPivotFormula(position: CellPosition) {
    const cell = this.getters.getCorrespondingFormulaCell(position);
    if (cell && cell.isFormula) {
      const pivotFunction = this.getFirstPivotFunction(
        position.sheetId,
        cell.compiledFormula.tokens
      );
      return pivotFunction?.functionName === "PIVOT";
    }
    return false;
  }

  getFirstPivotFunction(sheetId: UID, tokens: Token[]) {
    const pivotFunction = getFirstPivotFunction(tokens);
    if (!pivotFunction) {
      return undefined;
    }
    const { functionName, args } = pivotFunction;
    const evaluatedArgs = args.map((argAst) => {
      if (argAst.type == "EMPTY") {
        return undefined;
      } else if (
        argAst.type === "STRING" ||
        argAst.type === "BOOLEAN" ||
        argAst.type === "NUMBER"
      ) {
        return argAst.value;
      }
      const argsString = astToFormula(argAst);
      return this.getters.evaluateFormula(sheetId, argsString);
    });
    return { functionName, args: evaluatedArgs };
  }

  /**
   * Returns the domain args of a pivot formula from a position.
   * For all those formulas:
   *
   * =PIVOT.VALUE(1,"expected_revenue","stage_id",2,"city","Brussels")
   * =PIVOT.HEADER(1,"stage_id",2,"city","Brussels")
   * =PIVOT.HEADER(1,"stage_id",2,"city","Brussels","measure","expected_revenue")
   *
   * the result is the same: ["stage_id", 2, "city", "Brussels"]
   *
   * If the cell is the result of PIVOT, the result is the domain of the cell
   * as if it was the individual pivot formula
   */
  getPivotCellFromPosition(position: CellPosition): PivotTableCell {
    const cell = this.getters.getCorrespondingFormulaCell(position);
    if (!cell || !cell.isFormula || getNumberOfPivotFunctions(cell.compiledFormula.tokens) === 0) {
      return EMPTY_PIVOT_CELL;
    }
    const mainPosition = this.getters.getCellPosition(cell.id);
    const result = this.getters.getFirstPivotFunction(
      position.sheetId,
      cell.compiledFormula.tokens
    );
    if (!result) {
      return EMPTY_PIVOT_CELL;
    }
    const { functionName, args } = result;
    const formulaId = args[0];
    if (!formulaId) {
      return EMPTY_PIVOT_CELL;
    }
    const pivotId = this.getters.getPivotId(formulaId.toString());
    if (!pivotId) {
      return EMPTY_PIVOT_CELL;
    }
    const pivot = this.getPivot(pivotId);
    if (!pivot.isValid()) {
      return EMPTY_PIVOT_CELL;
    }
    if (functionName === "PIVOT") {
      const includeTotal = args[2] === false ? false : undefined;
      const includeColumnHeaders = args[3] === false ? false : undefined;
      const pivotCells = pivot
        .getTableStructure()
        .getPivotCells(includeTotal, includeColumnHeaders);
      const pivotCol = position.col - mainPosition.col;
      const pivotRow = position.row - mainPosition.row;
      return pivotCells[pivotCol][pivotRow];
    }
    if (functionName === "PIVOT.HEADER" && args.at(-2) === "measure") {
      const domain = pivot.parseArgsToPivotDomain(
        args.slice(1, -2).map((value) => ({ value } as FunctionResultObject))
      );
      return {
        type: "MEASURE_HEADER",
        domain,
        measure: args.at(-1)?.toString() || "",
      };
    } else if (functionName === "PIVOT.HEADER") {
      const domain = pivot.parseArgsToPivotDomain(
        args.slice(1).map((value) => ({ value } as FunctionResultObject))
      );
      return {
        type: "HEADER",
        domain,
      };
    }
    const [measure, ...domainArgs] = args.slice(1);
    const domain = pivot.parseArgsToPivotDomain(
      domainArgs.map((value) => ({ value } as FunctionResultObject))
    );
    return {
      type: "VALUE",
      domain,
      measure: measure?.toString() || "",
    };
  }

  getPivot(pivotId: UID) {
    return this.pivots[pivotId];
  }

  isPivotUnused(pivotId: UID) {
    return this._getUnusedPivots().includes(pivotId);
  }

  // ---------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------

  /**
   * Refresh the cache of a pivot
   */
  private refreshPivot(pivotId: UID) {
    const pivot = this.getters.getPivot(pivotId);
    pivot.init({ reload: true });
  }

  setupPivot(pivotId: UID, { recreate } = { recreate: false }) {
    const definition = this.getters.getPivotCoreDefinition(pivotId);
    if (recreate || !(pivotId in this.pivots)) {
      const Pivot = pivotRegistry.get(definition.type).ui;
      this.pivots[pivotId] = new Pivot(this.custom, { definition, getters: this.getters });
    }
  }

  _getUnusedPivots() {
    if (this.unusedPivots !== undefined) {
      return this.unusedPivots;
    }
    const unusedPivots = new Set(this.getters.getPivotIds());
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cellId in this.getters.getCells(sheetId)) {
        const position = this.getters.getCellPosition(cellId);
        const pivotId = this.getPivotIdFromPosition(position);
        if (pivotId) {
          unusedPivots.delete(pivotId);
          if (!unusedPivots.size) {
            this.unusedPivots = [];
            return [];
          }
        }
      }
    }
    this.unusedPivots = [...unusedPivots];
    return this.unusedPivots;
  }
}
