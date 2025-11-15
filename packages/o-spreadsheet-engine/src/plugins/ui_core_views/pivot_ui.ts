import { astToFormula } from "../../formulas/formula_formatter";
import { Token } from "../../formulas/tokenizer";
import { PositionMap } from "../../helpers/cells/position_map";
import { deepEquals, getUniqueText } from "../../helpers/misc";
import {
  evaluationListenerRegistry,
  EvaluationMessage,
} from "../../helpers/pivot/evaluation_listener_registry";
import { getFirstPivotFunction } from "../../helpers/pivot/pivot_composer_helpers";
import { domainToColRowDomain } from "../../helpers/pivot/pivot_domain_helpers";
import withPivotPresentationLayer from "../../helpers/pivot/pivot_presentation";
import { pivotRegistry } from "../../helpers/pivot/pivot_registry";
import { resetMapValueDimensionDate } from "../../helpers/pivot/spreadsheet_pivot/date_spreadsheet_pivot";
import { EMPTY_PIVOT_CELL } from "../../helpers/pivot/table_spreadsheet_pivot";
import { _t } from "../../translation";
import {
  AddPivotCommand,
  Command,
  CoreCommand,
  invalidateEvaluationCommands,
  UpdatePivotCommand,
} from "../../types/commands";
import { CellPosition, PivotCacheItem, SortDirection, UID } from "../../types/misc";
import { PivotCoreMeasure, PivotTableCell } from "../../types/pivot";
import { Pivot } from "../../types/pivot_runtime";
import { CoreViewPlugin, CoreViewPluginConfig } from "../core_view_plugin";
import { UIPluginConfig } from "../ui_plugin";

export const UNDO_REDO_PIVOT_COMMANDS = ["ADD_PIVOT", "UPDATE_PIVOT", "REMOVE_PIVOT"];

function isPivotCommand(cmd: CoreCommand): cmd is AddPivotCommand | UpdatePivotCommand {
  return UNDO_REDO_PIVOT_COMMANDS.includes(cmd.type);
}

export class PivotUIPlugin extends CoreViewPlugin {
  static getters = [
    "getPivot",
    "getFirstPivotFunction",
    "getPivotCellSortDirection",
    "getPivotIdFromPosition",
    "getPivotCellFromPosition",
    "generateNewCalculatedMeasureName",
    "isPivotUnused",
    "isSpillPivotFormula",
    "getPivotInfoAtPosition",
  ] as const;

  private pivots: Record<UID, Pivot> = {};
  private unusedPivotsInFormulas?: UID[];
  private custom: UIPluginConfig["custom"];

  private pivotCellsCache = new PositionMap<PivotCacheItem>();

  constructor(config: CoreViewPluginConfig) {
    super(config);
    this.custom = config.custom;
    evaluationListenerRegistry.replace("PivotUIPlugin", {
      handleEvaluationMessage: this.handleEvaluationMessage.bind(this),
    });
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
        this.unusedPivotsInFormulas = undefined;
        break;
      }
      case "UNDO":
      case "REDO": {
        this.unusedPivotsInFormulas = undefined;

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
      case "UPDATE_LOCALE":
        /**
         * Reset the cache of the date/datetime pivot values, as it depends on
         * the locale. (e.g. the first day of the week)
         */
        resetMapValueDimensionDate();
        break;
    }
  }

  handleEvaluationMessage(message: EvaluationMessage) {
    if (message.type === "invalidateAllCells") {
      this.pivotCellsCache = new PositionMap<PivotCacheItem>();
    } else if (message.type === "invalidateCell") {
      this.pivotCellsCache.delete(message.position);
    } else if (message.type === "addPivotToPosition") {
      this.pivotCellsCache.set(message.position, message.item);
    }
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  getPivotInfoAtPosition(position: CellPosition): PivotCacheItem | undefined {
    const cachedAtPosition = this.pivotCellsCache.get(position);
    if (cachedAtPosition) {
      return cachedAtPosition;
    }
    const mainPosition = this.getters.getArrayFormulaSpreadingOn(position);
    return mainPosition ? this.pivotCellsCache.get(mainPosition) : undefined;
  }

  /**
   * Get the id of the pivot at the given position. Returns undefined if there
   * is no pivot at this position
   */
  getPivotIdFromPosition(position: CellPosition) {
    return this.getPivotInfoAtPosition(position)?.pivotId;
  }

  isSpillPivotFormula(position: CellPosition) {
    return this.getPivotInfoAtPosition(position)?.type === "dynamic";
  }

  getFirstPivotFunction(sheetId: UID, tokens: Token[]) {
    const pivotFunction = getFirstPivotFunction(tokens);
    if (!pivotFunction) {
      return undefined;
    }
    const { functionName, args } = pivotFunction;
    const evaluatedArgs = args.map((argAst) => {
      if (argAst.type === "EMPTY") {
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
    if (!cell || !cell.isFormula) {
      return EMPTY_PIVOT_CELL;
    }
    const pivotInfo = this.getPivotInfoAtPosition(position);
    if (!pivotInfo || pivotInfo.type === "error") {
      return EMPTY_PIVOT_CELL;
    }
    if (pivotInfo.type === "static") {
      return pivotInfo.pivotCell;
    }

    const mainPosition = this.getters.getArrayFormulaSpreadingOn(position) || position;
    if (!this.checkIfCellStartsWithPivotFunction(mainPosition)) {
      return EMPTY_PIVOT_CELL;
    }

    const offsetRow = position.row - mainPosition.row;
    const offsetCol = position.col - mainPosition.col;
    const pivot = this.getPivot(pivotInfo.pivotId);
    const pivotCells = pivot.getCollapsedTableStructure().getPivotCells(pivotInfo.pivotStyle);
    return pivotCells[offsetCol][offsetRow];
  }

  private checkIfCellStartsWithPivotFunction(position: CellPosition): boolean {
    const cell = this.getters.getCell(position);
    if (!cell || !cell.isFormula) {
      return false;
    }
    const tokens = cell.compiledFormula.tokens;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].type === "SPACE") continue;
      return tokens[i].type === "SYMBOL" && tokens[i].value.toUpperCase().startsWith("PIVOT");
    }
    return false;
  }

  generateNewCalculatedMeasureName(measures: PivotCoreMeasure[]) {
    const existingMeasures = measures.map((m) => m.fieldName);
    return getUniqueText(_t("Calculated measure 1"), existingMeasures, {
      compute: (name, i) => _t("Calculated measure %s", i),
    });
  }

  getPivot(pivotId: UID) {
    if (!this.getters.isExistingPivot(pivotId)) {
      throw new Error(`pivot ${pivotId} not found`);
    }
    return this.pivots[pivotId];
  }

  isPivotUnused(pivotId: UID) {
    const { type } = this.getters.getPivot(pivotId);
    return (
      this._getUnusedPivotsInFormulas().includes(pivotId) &&
      pivotRegistry.get(type).isPivotUnused(this.getters, pivotId)
    );
  }

  getPivotCellSortDirection(position: CellPosition): SortDirection | "none" | undefined {
    const pivotId = this.getters.getPivotIdFromPosition(position);
    const pivotCell = this.getters.getPivotCellFromPosition(position);
    if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
      return undefined;
    }
    const pivot = this.getters.getPivot(pivotId);
    const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
    const sortedColumn = pivot.definition.sortedColumn;
    if (sortedColumn?.measure === pivotCell.measure && deepEquals(sortedColumn.domain, colDomain)) {
      return sortedColumn.order;
    }
    return "none";
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
    if (!(pivotId in this.pivots)) {
      const Pivot = withPivotPresentationLayer(pivotRegistry.get(definition.type).ui);
      this.pivots[pivotId] = new Pivot(this.custom, { definition, getters: this.getters });
    } else if (recreate) {
      this.pivots[pivotId].onDefinitionChange(definition);
    }
  }

  private _getUnusedPivotsInFormulas(): UID[] {
    if (this.unusedPivotsInFormulas !== undefined) {
      return this.unusedPivotsInFormulas;
    }
    const unusedPivots = new Set(this.getters.getPivotIds());
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cellId in this.getters.getCells(sheetId)) {
        const position = this.getters.getCellPosition(cellId);
        const pivotId = this.getPivotIdFromPosition(position);
        if (pivotId) {
          unusedPivots.delete(pivotId);
          if (!unusedPivots.size) {
            this.unusedPivotsInFormulas = [];
            return [];
          }
        }
      }
    }
    this.unusedPivotsInFormulas = [...unusedPivots];
    return this.unusedPivotsInFormulas;
  }
}
