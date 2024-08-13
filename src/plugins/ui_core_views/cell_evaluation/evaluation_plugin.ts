import { isExportableToExcel } from "../../../formulas/index";
import { matrixMap } from "../../../functions/helpers";
import { getItemId, positions, toXC } from "../../../helpers/index";
import {
  CellPosition,
  CellValue,
  CellValueType,
  Command,
  EvaluatedCell,
  ExcelCellData,
  ExcelWorkbookData,
  Format,
  FormattedValue,
  FormulaCell,
  FunctionResultObject,
  GetSymbolValue,
  Matrix,
  Range,
  RangeCompiledFormula,
  UID,
  Zone,
  invalidateDependenciesCommands,
  isMatrix,
} from "../../../types/index";
import { FormulaCellWithDependencies } from "../../core";
import { UIPlugin, UIPluginConfig } from "../../ui_plugin";
import { CoreViewCommand, invalidateEvaluationCommands } from "./../../../types/commands";
import { Evaluator } from "./evaluator";

//#region

// ---------------------------------------------------------------------------
// INTRODUCTION
// ---------------------------------------------------------------------------

// The evaluation plugin is in charge of computing the values of the cells.
// This is a fairly complex task for several reasons:

// Reason n°1: Cells can contain formulas that must be interpreted to know
// the final value of the cell. And these formulas can depend on other cells.
// ex A1:"=SUM(B1:B2)" we have to evaluate B1:B2 first to be able to evaluate A1.
// We say here that we have a 'formula dependency' between A1 and B1:B2.

// Reason n°2: A cell can assign value to other cells that haven't content.
// This concerns cells containing a formula that returns an array of values.
// ex A1:"=SPLIT('Odoo','d')" Evaluating A1 must assign the value "O" to A1 and
// "oo" to B1. We say here that we have a 'spread relation' between A1 and B1.
// B1 have a spread value from A1.

// Note that a cell can contain a formula which depends on other cells which
// themselves can:
// - contain formulas which depends on other cells (and so on).
// - contain a spread value from other formulas which depends on other cells
//   (and so on).

// I - How to build the evaluation ?

//    If we had only formulas dependencies to treat, the evaluation would be
//    simple: the formulas dependencies are directly deduced from the content
//    of the formulas. With the dependencies we are able to calculate which
//    formula must be evaluated before another.

//    Cycles
//    ------
//    We can also easily detect if the cells are included in reference cycles
//    and return an error in this case. ex: A1:"=B1" B1:"=C1" C1:"=A1"
//    The "#CYCLE" error must be returned for
//    all three cells.

//    But there's more! There are formulas referring to other cells but never
//    use them. This is the case for example
//    with the "IF" formula. ex:

//    A1:"=IF(D1,A2,B1)"
//    A2:"=A1"
//    In this case it is obvious that we have a cyclic dependency. But in practice
//    this will only exist if D1 is true.

//    For this reason, we believe that the evaluation should be **partly recursive**:
//    The function computing a formula cell starts by marking them as 'being evaluated'
//    and then call itself on the dependencies of the concerned cell. This allows
//    to evaluate the dependencies before the cell itself and to detect
//    if the cell that is being evaluated isn't part of a cycle.

// II - The spread relation anticipation problem

//    The biggest difficulty to solve with the evaluation lies in the fact that
//    we cannot anticipate the spread relations: cells impacted by the result array
//    of a formula are only determined after the array formula has been
//    evaluated. In the case where the impacted cells are used in other formulas,
//    this will require to re-evaluation other formulas (and so on...). ex:
//    A1:"=B2"
//    A2:"=SPLIT('Odoo','d')"

//    in the example above, A2 spreads on B2, but we will know it only after
//    the evaluation of A2. To be able to evaluate A1 correctly, we must therefore
//    reevaluate A1 after the evaluation of A2.

//    We could evaluate which formula spreads first. Except that the array formulas
//    can themselves depend on the spreads of other formulas. ex:

//    A1:"=SPLIT(B3,'d')"
//    A2:="odoo odoo"
//    A3:"=SPLIT(A2,' ')"

//    In the example above, A3 must be evaluated before A1 because A1 needs B3 which
//    can be modified by A3.

//    Therefore, there would be a spatial evaluation order to be respected between
//    the array formulas. We could imagine that, when an array formula depends
//    on a cell, then we evaluate the first formula that spreads located in the upper
//    left corner of this cell.
//    Although this possibility has been explored, it remains complicated to spatially
//    predict which formula should be evaluated before another, especially when
//    the array formulas are located in different sheets or when the array formulas
//    depends on the spreads of each other. ex:
//
//    A1:"=ARRAY_FORMULA_ALPHA(B2)"
//    A2:"=ARRAY_FORMULA_BETA(B1)"

//    In the example above, ARRAY_FORMULA_ALPHA and ARRAY_FORMULA_BETA are some
//    formulas that could spread depending on the value of B2 and B1. This could be a
//    cyclic dependency that we cannot anticipate.
//    And as with the "IF" formula, array formulas may not use their dependency.
//    It then becomes very difficult to manage...

//    Also, if we have a cycle, that doesn't mean it's bad. The cycle can converge to
//    a stable state at the scale of the sheets. Functionally, we don't want to forbid
//    convergent cycles. It is an interesting feature but which requires to re-evaluate
//    the cycle as many times as convergence is not reached.

// Thus, in order to respect the relations between the cells (formula dependencies and
// spread relations), the evaluation of the cells must:
// - respect a precise order (cells values used by another must be evaluated first) : As
//   we cannot anticipate which dependencies are really used by the formulas, we must
//   evaluate the cells in a recursive way;
// - be done as many times as necessary to ensure that all the cells have been correctly
//   evaluated in the correct order (in case of, for example, spreading relation cycles).

// The chosen solution is to reevaluate the formulas impacted by spreads as many times
// as necessary in several iterations, where evaluated cells can trigger the evaluation
// of other cells depending on it, at the next iteration.

//#endregion
export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "evaluateFormulaResult",
    "evaluateCompiledFormula",
    "getCorrespondingFormulaCell",
    "getRangeFormattedValues",
    "getRangeValues",
    "getRangeFormats",
    "getEvaluatedCell",
    "getEvaluatedCells",
    "getEvaluatedCellsInZone",
    "getEvaluatedCellsPositions",
    "getSpreadZone",
    "getArrayFormulaSpreadingOn",
    "isEmpty",
  ] as const;

  private shouldRebuildDependenciesGraph = true;

  private evaluator: Evaluator;
  private positionsToUpdate: CellPosition[] = [];

  constructor(config: UIPluginConfig) {
    super(config);
    this.evaluator = new Evaluator(config.custom, this.getters);
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  beforeHandle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateDependenciesCommands.has(cmd.type)
    ) {
      this.shouldRebuildDependenciesGraph = true;
    }
  }

  handle(cmd: CoreViewCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        if (!("content" in cmd || "format" in cmd) || this.shouldRebuildDependenciesGraph) {
          return;
        }
        const position = { sheetId: cmd.sheetId, row: cmd.row, col: cmd.col };
        this.positionsToUpdate.push(position);

        if ("content" in cmd) {
          this.evaluator.updateDependencies(position);
        }
        break;
      case "EVALUATE_CELLS":
        this.evaluator.evaluateAllCells();
        break;
    }
  }

  finalize() {
    if (this.shouldRebuildDependenciesGraph) {
      this.evaluator.buildDependencyGraph();
      this.evaluator.evaluateAllCells();
      this.shouldRebuildDependenciesGraph = false;
    } else if (this.positionsToUpdate.length) {
      this.evaluator.evaluateCells(this.positionsToUpdate);
    }
    this.positionsToUpdate = [];
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(sheetId: UID, formulaString: string): CellValue | Matrix<CellValue> {
    const result = this.evaluateFormulaResult(sheetId, formulaString);
    if (isMatrix(result)) {
      return matrixMap(result, (cell) => cell.value);
    }
    return result.value;
  }

  evaluateFormulaResult(
    sheetId: UID,
    formulaString: string
  ): Matrix<FunctionResultObject> | FunctionResultObject {
    return this.evaluator.evaluateFormulaResult(sheetId, formulaString);
  }

  evaluateCompiledFormula(
    sheetId: UID,
    compiledFormula: RangeCompiledFormula,
    getSymbolValue: GetSymbolValue
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    return this.evaluator.evaluateCompiledFormula(sheetId, compiledFormula, getSymbolValue);
  }

  /**
   * Return the value of each cell in the range as they are displayed in the grid.
   */
  getRangeFormattedValues(range: Range): FormattedValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.mapVisiblePositions(range, (p) => this.getters.getEvaluatedCell(p).formattedValue);
  }

  /**
   * Return the value of each cell in the range.
   */
  getRangeValues(range: Range): CellValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.mapVisiblePositions(range, (p) => this.getters.getEvaluatedCell(p).value);
  }

  /**
   * Return the format of each cell in the range.
   */
  getRangeFormats(range: Range): (Format | undefined)[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getEvaluatedCellsInZone(sheet.id, range.zone).map((cell) => cell.format);
  }

  getEvaluatedCell(position: CellPosition): EvaluatedCell {
    return this.evaluator.getEvaluatedCell(position);
  }

  getEvaluatedCells(sheetId: UID): EvaluatedCell[] {
    return this.evaluator
      .getEvaluatedPositionsInSheet(sheetId)
      .map((position) => this.getEvaluatedCell(position));
  }

  getEvaluatedCellsPositions(sheetId: UID): CellPosition[] {
    return this.evaluator.getEvaluatedPositionsInSheet(sheetId);
  }

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  /**
   * Return the spread zone the position is part of, if any
   */
  getSpreadZone(position: CellPosition, options = { ignoreSpillError: false }): Zone | undefined {
    return this.evaluator.getSpreadZone(position, options);
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    return this.evaluator.getArrayFormulaSpreadingOn(position);
  }

  /**
   * Check if a zone only contains empty cells
   */
  isEmpty(sheetId: UID, zone: Zone): boolean {
    return positions(zone)
      .map(({ col, row }) => this.getEvaluatedCell({ sheetId, col, row }))
      .every((cell) => cell.type === CellValueType.empty);
  }

  /**
   * Maps the visible positions of a range  according to a provided callback
   * @param range - the range we filter out
   * @param evaluationCallback - the callback applied to the filtered positions
   * @returns the values filtered (ie we keep only the not hidden values)
   */
  private mapVisiblePositions<T>(range: Range, evaluationCallback: (p: CellPosition) => T): T[] {
    const { sheetId, zone } = range;
    const xcPositions = positions(zone);
    return xcPositions.reduce((acc, position) => {
      const { col, row } = position;
      if (!this.getters.isColHidden(sheetId, col) && !this.getters.isRowHidden(sheetId, row)) {
        acc.push(evaluationCallback({ sheetId, ...position }));
      }
      return acc;
    }, [] as T[]);
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportForExcel(data: ExcelWorkbookData) {
    for (const position of this.evaluator.getEvaluatedPositions()) {
      const evaluatedCell = this.evaluator.getEvaluatedCell(position);

      const xc = toXC(position.col, position.row);
      const value = evaluatedCell.value;
      let isFormula = false;
      let newContent: string | undefined = undefined;
      let newFormat: string | undefined = undefined;
      let isExported: boolean = true;

      const exportedSheetData = data.sheets.find((sheet) => sheet.id === position.sheetId)!;

      const formulaCell = this.getCorrespondingFormulaCell(position);
      if (formulaCell) {
        isExported = isExportableToExcel(formulaCell.compiledFormula.tokens);
        isFormula = isExported;

        if (!isExported) {
          // If the cell contains a non-exported formula and that is evaluates to
          // nothing* ,we don't export it.
          // * non-falsy value are relevant and so are 0 and FALSE, which only leaves
          // the empty string.
          if (value !== "") {
            newContent = (value ?? "").toString();
            newFormat = evaluatedCell.format;
          }
        }
      }

      const exportedCellData: ExcelCellData = exportedSheetData.cells[xc] || ({} as ExcelCellData);

      const format = newFormat
        ? getItemId<Format>(newFormat, data.formats)
        : exportedCellData.format;
      let content: string | undefined;
      if (isExported && isFormula && formulaCell instanceof FormulaCellWithDependencies) {
        content = formulaCell.contentWithFixedReferences;
      } else {
        content = !isExported ? newContent : exportedCellData.content;
      }
      exportedSheetData.cells[xc] = { ...exportedCellData, value, isFormula, content, format };
    }
  }

  /**
   * Returns the corresponding formula cell of a given cell
   * It could be the formula present in the cell itself or the
   * formula of the array formula that spreads to the cell
   */
  getCorrespondingFormulaCell(position: CellPosition): FormulaCell | undefined {
    const cell = this.getters.getCell(position);

    if (cell && cell.isFormula) {
      return cell.compiledFormula.isBadExpression ? undefined : cell;
    } else if (cell && cell.content) {
      return undefined;
    }

    const spreadingFormulaPosition = this.getArrayFormulaSpreadingOn(position);

    if (spreadingFormulaPosition === undefined) {
      return undefined;
    }

    const spreadingFormulaCell = this.getters.getCell(spreadingFormulaPosition);

    if (spreadingFormulaCell?.isFormula) {
      return spreadingFormulaCell;
    }
    return undefined;
  }
}
