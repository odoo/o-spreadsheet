import { _lt } from "../../translation";
import {
  Cell,
  CellPosition,
  CellValue,
  CellValueType,
  EvaluatedCell,
  Format,
  FormulaCell,
  FormulaReturn,
  Getters,
  isMatrix,
  Matrix,
  MatrixArgFormat,
  MatrixFunctionReturn,
  PrimitiveFormat,
  UID,
} from "../../types";
import {
  CellErrorLevel,
  CellErrorType,
  CircularDependencyError,
  EvaluationError,
} from "../../types/errors";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../cells";
import { toXC } from "../coordinates";
import { mapToPositionsInZone } from "../zones";
import { FormulaDependencyGraph } from "./formula_dependency_graph";
import { cellPositionToRc, rcToCellPosition } from "./misc";
import { SpreadingRelation } from "./spreading_relation";

type PositionDict<T> = { [rc: string]: T };

const MAX_CYCLE_ITERATION = 100;

export class EvaluationProcess {
  getters: Getters;

  constructor(getters: Getters) {
    this.getters = getters;
  }

  evaluatedCells: PositionDict<EvaluatedCell> = {};

  private formulaDependencies = new FormulaDependencyGraph();
  private spreadingFormulas = new Set<string>();
  private spreadingRelations = new SpreadingRelation();

  // ----------------------------------------------------------
  //        METHOD RELATING TO SPECIFIC CELL EVALUATION
  // ----------------------------------------------------------

  updateDependencies(rc: string) {
    this.formulaDependencies.removeAllDependencies(rc);
    const dependencies = this.getDirectDependencies(rc);
    this.formulaDependencies.addDependencies(rc, dependencies);
  }

  evaluateCells(cells: Set<string>) {
    this.evaluate(this.withOrderedDependencies(cells));
  }

  private withOrderedDependencies(rcs: Iterable<string>): Set<string> {
    const cells = new Set<string>();

    for (const rc of rcs) {
      extendSet(cells, this.findCellsToCompute(rc));

      const content = this.rcToCell(rc)?.content;
      // if the content of a cell changes, we need to check:
      if (content) {
        for (const arrayFormula of this.spreadingRelations.getArrayFormulasRc(rc)) {
          if (this.spreadingFormulas.has(arrayFormula)) {
            // 1) if we write in an empty cell containing the spread of a formula.
            //    In this case, it is necessary to indicate to recalculate the concerned
            //    formula to take into account the new collisions.
            extendSet(cells, this.findCellsToCompute(arrayFormula));
            break; // there can be only one formula spreading on a cell
          }
        }
      } else if (this.spreadingRelations.hasResult(rc)) {
        // 2) if we put an empty content on a cell which blocks the spread
        //    of another formula.
        //    In this case, it is necessary to indicate to recalculate formulas
        //    that was blocked by the old content.
        for (const arrayFormula of this.spreadingRelations.getArrayFormulasRc(rc)) {
          extendSet(cells, this.findCellsToCompute(arrayFormula));
        }
      }
    }
    return cells;
  }

  // ----------------------------------------------------------
  //      METHOD RELATING TO THE REVALUATION OF ALL CELLS
  // ----------------------------------------------------------

  buildDependencyGraph() {
    this.formulaDependencies = new FormulaDependencyGraph();
    this.spreadingFormulas = new Set<string>();
    this.spreadingRelations = new SpreadingRelation();
    for (const rc of this.getSetOfAllCells()) {
      const dependencies = this.getDirectDependencies(rc);
      this.formulaDependencies.addDependencies(rc, dependencies);
    }
  }

  evaluateAllCells() {
    this.evaluatedCells = {};
    this.evaluate(this.getSetOfAllCells());
  }

  private getSetOfAllCells(): Set<string> {
    const cellsSet = new Set<string>();
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        cellsSet.add(cellPositionToRc(this.getters.getCellPosition(cellId)));
      }
    }
    return cellsSet;
  }

  // ----------------------------------------------------------
  //                 EVALUATION MAIN PROCESS
  // ----------------------------------------------------------

  private nextRcsToUpdate = new Set<string>();
  private cellsBeingComputed = new Set<UID>();

  /**
   * @param cells ordered topologically! TODO explain this better
   */
  private evaluate(cells: Set<string>) {
    this.cellsBeingComputed = new Set<UID>();
    this.nextRcsToUpdate = cells;

    const compilationParameters = this.getCompilationParameters(computeCell);

    let currentCycle = 0;
    while (this.nextRcsToUpdate.size && currentCycle < MAX_CYCLE_ITERATION) {
      const arr = Array.from(this.nextRcsToUpdate);
      this.nextRcsToUpdate.clear();
      for (let i = 0; i < arr.length; ++i) {
        const cell = arr[i];
        delete this.evaluatedCells[cell];
      }
      for (let i = 0; i < arr.length; ++i) {
        const cell = arr[i];
        this.setEvaluatedCell(cell, this.computeCell(cell));
      }

      ++currentCycle;
    }
  }

  private setEvaluatedCell = (rc: string, evaluatedCell: EvaluatedCell) => {
    if (this.nextRcsToUpdate.has(rc)) {
      this.nextRcsToUpdate.delete(rc);
    }
    this.evaluatedCells[rc] = evaluatedCell;
  };

  private computeCell = (rc: string): EvaluatedCell => {
    const evaluation = this.evaluatedCells[rc];
    if (evaluation) {
      return evaluation; // already computed
    }

    if (this.spreadingFormulas.has(rc)) {
      for (const child of this.spreadingRelations.getArrayResultsRc(rc)) {
        const content = this.rcToCell(child)?.content;
        if (!content) {
          delete this.evaluatedCells[child];
          extendSet(this.nextRcsToUpdate, this.findChildrenToCompute(child));
          for (const candidate of this.spreadingRelations.getArrayFormulasRc(child)) {
            extendSet(this.nextRcsToUpdate, this.findCellsToCompute(candidate));
          }
        }
      }
      this.spreadingFormulas.delete(rc);
    }
    this.spreadingRelations.removeNode(rc);

    const cell = this.rcToCell(rc);
    if (cell === undefined) {
      return createEvaluatedCell("");
    }

    const cellId = cell.id;

    try {
      if (this.cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      this.cellsBeingComputed.add(cellId);
      return cell.isFormula
        ? this.computeFormulaCell(cell)
        : evaluateLiteral(cell.content, cell.format);
    } catch (e) {
      return this.handleError(e, cell);
    } finally {
      this.cellsBeingComputed.delete(cellId);
    }
  };

  private handleError = (e: Error | any, cell: Cell): EvaluatedCell => {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const msg = e?.errorType || CellErrorType.GenericError;
    // apply function name
    const __lastFnCalled = compilationParameters[2].__lastFnCalled || "";
    const error = new EvaluationError(
      msg,
      e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled),
      e.logLevel !== undefined ? e.logLevel : CellErrorLevel.error
    );
    return errorCell(cell.content, error);
  };

  private computeFormulaCell = (cellData: FormulaCell): EvaluatedCell => {
    const cellId = cellData.id;
    compilationParameters[2].__originCellXC = () => {
      // compute the value lazily for performance reasons
      const position = compilationParameters[2].getters.getCellPosition(cellId);
      return toXC(position.col, position.row);
    };
    const formulaReturn = cellData.compiledFormula.execute(
      cellData.dependencies,
      ...compilationParameters
    );

    assertFormulaReturnHasConsistentDimensions(formulaReturn);

    const { value: computedValue, format: computedFormat } = formulaReturn;

    if (!isMatrix(computedValue)) {
      return createEvaluatedCell(
        computedValue,
        cellData.format || (computedFormat as string | undefined)
      ); // the case computedFormat as Matrix is handled by the assertFormulaReturnHasCoincidentDimensions
    }

    const formulaPosition = this.getters.getCellPosition(cellId);

    this.assertSheetHasEnoughSpaceToSpreadFormulaResult(formulaPosition, computedValue);

    forEachSpreadPositionInMatrix(computedValue, this.updateSpreadRelation(formulaPosition));
    forEachSpreadPositionInMatrix(computedValue, this.checkCollision(formulaPosition));
    forEachSpreadPositionInMatrix(computedValue, this.spreadValues(formulaPosition, formulaReturn));

    const formatFromPosition = formatFromPositionAccess(computedFormat);
    return createEvaluatedCell(computedValue[0][0], cellData.format || formatFromPosition(0, 0));
  };

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<CellValue>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new Error(_lt("Result couldn't be automatically expanded. Please insert more rows."));
    }

    if (enoughRows) {
      throw new Error(
        _lt("Result couldn't be automatically expanded. Please insert more columns.")
      );
    }

    throw new Error(
      _lt("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private updateSpreadRelation({
    sheetId,
    col,
    row,
  }: CellPosition): (i: number, j: number) => void {
    const formulaRc = cellPositionToRc({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const rc = cellPositionToRc(position);
      this.spreadingRelations.addRelation({ resultRc: rc, arrayFormulaRc: formulaRc });
    };
  }

  private checkCollision({ sheetId, col, row }: CellPosition): (i: number, j: number) => void {
    return (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (rawCell?.content || this.getEvaluatedCell(position).type !== CellValueType.empty) {
        throw new Error(
          _lt(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
    };
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: MatrixFunctionReturn
  ): (i: number, j: number) => void {
    const formulaRc = cellPositionToRc({ sheetId, col, row });
    const formatFromPosition = formatFromPositionAccess(matrixResult.format);
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const format = cell?.format;
      const evaluatedCell = createEvaluatedCell(
        matrixResult.value[i][j],
        format || formatFromPosition(i, j)
      );

      const rc = cellPositionToRc(position);

      // update evaluatedCells
      this.setEvaluatedCell(rc, evaluatedCell);
      this.spreadingFormulas.add(formulaRc);

      // check if formula dependencies present in the spread zone
      // if so, they need to be recomputed
      extendSet(this.nextRcsToUpdate, this.findChildrenToCompute(rc));
    };
  }

  // ----------------------------------------------------------
  //                 COMMON FUNCTIONALITY
  // ----------------------------------------------------------

  private getDirectDependencies(thisRc: string): string[] {
    const cell = this.rcToCell(thisRc);
    if (!cell?.isFormula) {
      return [];
    }
    const dependencies: string[] = [];
    for (const range of cell.dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const sheetId = range.sheetId;
      mapToPositionsInZone(range.zone, (col, row) => {
        dependencies.push(cellPositionToRc({ sheetId, col, row }));
      });
    }
    return dependencies;
  }

  private findChildrenToCompute(mainRc: string): Iterable<string> {
    const cellsToCompute = this.formulaDependencies.getEvaluationOrder(mainRc);
    cellsToCompute.delete(mainRc);
    return cellsToCompute;
  }

  private findCellsToCompute(mainRc: string): Iterable<string> {
    return this.formulaDependencies.getEvaluationOrder(mainRc);
  }

  private rcToCell(rc: string): Cell | undefined {
    return this.getters.getCell(rcToCellPosition(rc));
  }
}

function extendSet<T>(destination: Set<T>, source: Iterable<T>) {
  for (const element of source) {
    destination.add(element);
  }
}

function forEachSpreadPositionInMatrix(
  matrix: Matrix<CellValue>,
  callback: (i: number, j: number) => void
) {
  for (let i = 0; i < matrix.length; ++i) {
    for (let j = 0; j < matrix[i].length; ++j) {
      if (i === 0 && j === 0) {
        continue;
      }
      callback(i, j);
    }
  }
}

function formatFromPositionAccess(
  format: Format | MatrixArgFormat | undefined
): (i: number, j: number) => PrimitiveFormat {
  return isMatrix(format) ? (i: number, j: number) => format[i][j] : () => format;
}

function assertFormulaReturnHasConsistentDimensions(formulaReturn: FormulaReturn) {
  const { value: computedValue, format: computedFormat } = formulaReturn;
  if (!isMatrix(computedValue)) {
    if (isMatrix(computedFormat)) {
      throw new Error("A format matrix should never be associated with a scalar value");
    }
    return;
  }
  if (isMatrix(computedFormat)) {
    const sameDimensions =
      computedValue.length === computedFormat.length &&
      computedValue[0].length === computedFormat[0].length;
    if (!sameDimensions) {
      throw new Error("Formats and values should have the same dimensions!");
    }
  }
}
