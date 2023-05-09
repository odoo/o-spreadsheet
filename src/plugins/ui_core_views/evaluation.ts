import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { createEvaluatedCell } from "../../helpers/cells";
import { EvaluationProcess } from "../../helpers/evaluation/evaluation_process";
import { cellPositionToRc, rcToCellPosition } from "../../helpers/evaluation/misc";
import {
  getItemId,
  intersection,
  isZoneValid,
  positions,
  toXC,
  zoneToXc,
} from "../../helpers/index";
import { _lt } from "../../translation";
import { InvalidReferenceError } from "../../types/errors";
import {
  CellPosition,
  CellValue,
  CellValueType,
  Command,
  EnsureRange,
  EvalContext,
  EvaluatedCell,
  ExcelCellData,
  ExcelWorkbookData,
  Format,
  FormattedValue,
  FormulaCell,
  HeaderIndex,
  invalidateDependenciesCommands,
  MatrixArg,
  PrimitiveArg,
  Range,
  ReferenceDenormalizer,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

const functionMap = functionRegistry.mapping;
const functions = functionRegistry.content;

type CompilationParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

type PositionDict<T> = { [rc: string]: T };

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

//     If we had only formulas dependencies to treat, the evaluation would be
//     simple: the formulas dependencies are directly deduced from the content
//     of the formulas. With the dependencies we are able to calculate which
//     formula must be evaluated before another.

//     We can also easily detect if the cells are included in reference cycles
//     and return an error in this case. ex: A1:"=B1" B1:"=C1" C1:"=A1" This three
//     cells are in a reference cycle. The "#CYCLE" error must be returned for
//     all three cells.

//     Actually it's a bit more complex than expected because there are formulas
//     that refer to other cells but never use them. This is the case for example
//     with the "IF" formula. ex:

//     A1:"=IF(D1,A2,B1)"
//     A2:"=A1"

//     In this case it is obvious that we have a cyclic dependency. But in practice
//     this will only exist if D1 is true.

//     For this reason, we believe that the evaluation should be partly recursive:
//     The function that compute a formula cell start by marking them as 'being evaluated'
//     and then call itself on the dependencies of the concerned cell. This will
//     allows us to evaluate the dependencies before the cell itself and to detect
//     if the cell that is being evaluated isn't already in the evaluation process.

// II - The spread relation anticipation problem

//     The biggest difficulty to solve with the evaluation lies in the fact that
//     we cannot anticipate the spread relations: The cells that will be impacted
//     by the result array of a formula are only determined after the formula has been
//     evaluated. In the case where the impacted cells are used in other formulas,
//     this will require the reevaluation of those other formulas (and so on...). ex:

//     A1:"=B2"
//     A2:"=SPLIT('Odoo','d')"

//     in the example above, A2 will spread on B2, but we will know it only after
//     the evaluation of A2. To be able to evaluate A1 correctly, we must therefore
//     reevaluate A1 after the evaluation of A2.

//     We could evaluate which formula spreads first. Except that the formulas that
//     spread can themselves depend on the spreads of other formulas. ex:

//     A1:"=SPLIT(B3,'d')"
//     A2:="odoo odoo"
//     A3:"=SPLIT(A2,' ')"

//     In the example above, A3 must be evaluated before A1 because A1 needs B3 who
//     can be modified by A3.

//     Therefore, there would be a spatial evaluation order to be respected between
//     the array formulas. We could imagine that, when a formula that spreads depends
//     on a cell, then we evaluate the first formula that spreads located in the upper
//     left corner of this cell.
//     Although this possibility has been explored, it remains complicated to spatially
//     predict which formula should be evaluated before another, especially when
//     the formulas that spread are located in different sheets or when the formulas
//     that spread depends on the spreads of each other. ex:
//
//     A1:"=ARRAY_FORMULA_ALPHA(B2)"
//     A2:"=ARRAY_FORMULA_BETA(B1)"

//     In the example above, ARRAY_FORMULA_ALPHA and ARRAY_FORMULA_BETA are some
//     formulas that could spread depending on the value of B2 and B1. This could be a
//     cyclic dependency that we cannot anticipate.
//     And as with the "IF" formula, arrays formulas may not use their dependency.
//     It then becomes very difficult to manage...

//     Also, if we have a cycle, that doesn't mean it's bad. The cycle can converge to
//     a stable state at the scale of the sheets. Functionally, we don't want to forbid
//     convergent cycles. It is an interesting feature but which requires to re-evaluate
//     the cycle as many times as convergence is not reached.

// Thus, in order to respect the relations between the cells (formula dependencies and
// spread relations), the evaluation of the cells must:
// - respect a precise order (cells values used by another must be evaluated first) : As
//   we cannot anticipate which dependencies are really used by the formulas, we must
//   evaluate the cells in a recursive way;
// - be done as many times as necessary to ensure that all the cells have been correctly
//   evaluated in the correct order (in case of, for example, spreads relations cycles).

// So, The solution we have chosen to solve this problem is to reevaluate the formulas
// impacted by spreads as many times as necessary in separated cycles, where evaluated
// cell can relaunch the evaluation of other cells depending on it. Each cycle will then
// be associated to a list of cells that have been invalidate by the evaluations of other
// cells during the previous cycle. This list will be used to reevaluate the formulas
// impacted by the spreads of these cells :

// In each cycle:
// - we evaluate the cells for which :
//   - we don't have a value yet or the content has been modified (eg target of an
//     UPDATE_CELL command)
//   - we have a value but the value has been invalidated during the previous cycle
// - we evaluate these cells and the cell's formula dependencies in an iterative way.
// - Each time one of the cells spreads a value to another, we mark this other cell
//   as 'has been modified'
// - once all the cells have been evaluated, we start a new cycle and reevaluate all the
//   formulas impacted by the cells that have been modified during the previous cycle.

// Note that, as the spreads relations cycle can diverge, we must limit the number of
// cycles arbitrarily to avoid infinite evaluation loops. This could be a user-defined
// parameter in the future.

// ---------------------------------------------------------------------------
// OVERVIEW OF THE MAIN GLOBAL STATES
// ---------------------------------------------------------------------------

// As evaluation can be an expensive process, we avoid recomputing all cells every
// time the sheet is modified. Instead, the evaluation plugin works with different
// states that are maintained by the plugin itself. These states are:

// 1 - The 'evaluatedCells' dictionary. This dictionary contains the evaluated cells.
//     The dictionary is recomputed entirely only in the following instances:

//     - when the structure of the sheets is modified
//     - when we export the spreadsheets

// 2 - The relational structures. These structures contains the dependencies/relations
//     between cells. This structures are recomputed entirely only in the following
//     instances:
//     - when the structure of the sheets is modified

// For the moment, we are using 3 different relational structures:

// 1 - The 'formulaDependencies' graph. This contains the dependencies between
//     cells that are used in the formulas, represented by a graph where the nodes
//     are the cells and the edges are the dependencies. For example, if we have
//     something like
//          A1 = B1 + SQRT(B2); C1 := B1; C2 := C1
//     we will have something like
//         (B1) -> (A1, C1)
//         (B2) -> (A1)
//         (C1) -> (C2)
//     meaning that every update of a node will require the reevaluation of its edges.
//     This graph can have multiple levels and cycles (e.g. A1 depends on B1, B1
//     depends on C1, ..., which finally depends on A1), giving us something like
//         (A1) -> (B1) -> (C1) -> (...) -> (A1)
//     The formula dependencies graph is used to evaluate the cells in the correct
//     order, and should be updated each time a cell's content is modified. Of course,
//     with this kind of multilevel and potentially cyclic graph, we had to find a
//     way to evaluate the cells in the correct order. This is done by using a
//     topological sort algorithm, which can be resumed as follows:
//       - For a given cell, we would like to find the list of the related cells that
//         need to be evaluated :
//         - we start with an empty list in which we add the base cell
//         - we then explore the cells that have dependencies on the base cell. For each
//           of these cells, we do the following:
//           - if this cell hasn't been explored yet :
//             - we add it to the list
//             - we explore the cells that have dependencies on this cell
//         - we go the the following dependency, and repeat this process for all related
//           cells until we have explored all the (sub-)edges related to the base cell.

// 2 - The 'spreadingArraysFormulas' set. This contains the position of array formula
//     that spread. This state is used to clear the cells that have been filled by a
//     spread of when modifying this cell. This state should be updated each time an
//     array formula is evaluated and correctly spread on other cells.

// 3 - The 'spreadingRelations' structure. This contains, for each cell, the array
//     formulas that could potentially spread on it. This structure is represented by two
//     sub-dictionary, allowing to easily know which array formulas could potentially
//     spread on a given cell as well as which cells a given array formulas could
//     potentially spread on.
//     As we don't allow two array formulas to spread on the same cell, this structure
//     is used to force the reevaluation of the potential spreaders of a cell when the
//     content of this cell is modified. This structure should be updated each time
//     an array formula is evaluated and try to spread on another cell.

// ---------------------------------------------------------------------------
// HOW THE EVALUATION WORKS
// ---------------------------------------------------------------------------

// I - First, the handle method of the evaluation plugin catches:

//   A - Commands that modify the structure of the sheets:
//       This will cause the main global states to be recomputed entirely.

//   B - Commands that modify the content of the cells:
//       This is the where we check if the content of the cells has changed.
//       If this case, we update the formula dependencies graph.

//       Next, we indicate that the cell needs to be recomputed. We do that by adding
//       the cell to the 'rcsToUpdate' set.

// II - Once all commands have been handled, we pass through the finalize method of the
//      Evaluation plugin. This is where we list the cells that need to be updated.

//   For each cell C targeted by a command, we :
//     1 - List all the cells that depend on this cell (using the formula dependencies
//         graph) and add them to the 'rcsToUpdate' set.
//     2 - Depending on the type of changes, we can indicate to recompute other cells:

//       1 - If we add content to a cell that didn't have any content before:
//           No content doesn't mean that the cell is empty. The cell can contain
//           a spread value. In this case, we indicate to recompute array formula
//           linked to the spread (ie we use the 'spreadingRelations' structure to list
//           all the array formula that could potentially spread on the cell C)
//           As this formula array won't be able to spread on C anymore, we need to
//           recompute it and all the cells depending on it.
//
//       2 - If we remove content from a cell that had content before:
//           The previous content could have blocked the spread of an array formula. As
//           we don't know which array formula could have been blocked, we need to
//           recompute all the array formula that could potentially spread on the cell
//           using the 'spreadingRelations' structure, as well as the cells that
//           depend on these array formula.
//
//   Once we have listed all the cells that need to be updated, we launch the evaluation.

// III - the evaluate method

//   The evaluate method is called during the 'finalize' phase of the evaluation plugin.
//   This is the moment when we recompute all the cells that need to be updated due to
//   handled commands.

//   The evaluate method works with two sets of cell positions:

//     1 - The 'currentRcsToUpdate' set:
//         This set contains the positions of the cells that need to be updated.
//         Most of the time, the cell positions present in the 'currentRcsToUpdate' set are the
//         cell positions resulting from a series of formula dependencies. We update the cells
//         by calling the 'computeCell' method on each cell position.

//     2 - The 'nextRcsToUpdate' set:
//         While we evaluate cell positions present in the 'currentRcsToUpdate' set, sometimes
//         evaluating some cells will spread values. As spreading values modifies the state of
//         the sheet, we need to reevaluate the cells depending on the new spread values.

//   We start by copying the rcsToUpdate set into the nextRcsToUpdate set. Then we enter our
//   iterative logic. This logic is as follows:

//     1 - We copy the nextRcsToUpdate set in place of the currentRcsToUpdate set.
//     2 - We clear the nextRcsToUpdate set.
//     3 - We iterate over the cell positions present in the currentRcsToUpdate set.
//         1 - For each cell position RC, we call the 'computeCell' method. This will
//             compute the value of the cell and return it, but also update the
//             'nextRcsToUpdate' set if the cell has spread values as well as compute (and
//             set) the values of the cells needed by the cell RC, removing them from the
//             'currentRcsToUpdate' set at the same time.
//         2 - We set the returned value as the evaluatedValue of the cell and we remove
//             the cell position from the 'currentRcsToUpdate' set.
//
//   We could update the 'currentRcsToUpdate' set with the cells affected by the spread.
//   But this would be problematic as it could lead to an infinite loop of evaluation.
//   To avoid this problem, we indicate to recompute cells by adding them to the
//   'nextRcsToUpdate' set.
//
//   At the end of the evaluation cycle (ie once all the cells in currentRcsToUpdate have
//   been recomputed), 'currentRcsToUpdate' should be empty and we can start another cycle.
//   We will stop the cycle when 'currentRcsToUpdate' is empty and 'nextRcsToUpdate' is empty
//   as well or when we reach a maximum number of cycles, ignoring then the cells present in
//   'nextRcsToUpdate'.

// IV - the computeCell function

//    While the evaluate function will handle the whole evaluation process, the computeCell
//    function will handle the evaluation of a single cell. This function will return the
//    evaluated value of the cell as en EvaluatedCell. To get this results, we will proceed
//    as follows, supposing the cell position is RC:

//      1 - We check if the cell need to be reevaluated. This will be the case if
//        1 - The cell is in "currentRcsToUpdate" set.
//        2 - The cell don't have a value yet.
//      If any of these two conditions is false, the cell won't need to be reevaluated and
//      we return the current value of the cell (saved in the 'evaluatedCells' map).

//      After being sure that the cell need to be reevaluated, we proceed as follows:

//        1 - We delete the spread values of RC (if any) and we put all the cells that
//            depend on these values in the 'currentRcsToUpdate' set, as well as all the
//            potential spreaders of these cells, and all cells depending on these spreaders.
//            This is needed because we don't know, when starting the evaluation, if it will
//            spread again and, even in this case, e don't know which cells will be affected
//            by the spread before the evaluation.

//        2 - We then evaluate the formula according to its content:

//          1 - If the cell is empty, we return an empty value.
//          2 - If the cell contains a constant value (number, string, ...), we return this
//              value (using the evaluateLiteral function).
//          3 - If the cell contains a formula (ie something like "= ... "), we evaluate it
//              (using the computeFormulaCell function).
//          4 - If any of these cases trigger an error, we set the cell as en ErrorCell and
//              we return the error (using the handleError method).

// V - the computeFormulaCell function

//    The computeFormulaCell function will handle the evaluation of a cell containing a
//    formula. This function will return the evaluated value of the cell as an EvaluatedCell.
//    To get this results, we will proceed as follows, supposing the cell position is RC:

//      1 - We start by computing the value and the format the same way we would do for a
//          cell containing a classical (not array) formula. We will then check if the
//          formula is an array formula. If it is not, we return the value and the format
//          as an EvaluatedCell.

//      2 - If the formula is an array formula, we proceed as follows:
//        1 - We assert that the value and the format have acceptable dimensions. For the
//            moment, we only accept 2 cases :
//            1 - The value is an array and the format is an array of the same dimensions.
//            2 - The value is an array and the format is a scalar value.
//            If any of these cases is not true, we return an error.

//       2 - We check that the sheet containing the formula has enough rows and columns to
//           contain the array. If it doesn't, we return an error.

//       3 - We update the potentialSpreaders graph by adding the cell position RC as a
//           potential spreader to all the cells it try to spread values to. This is done
//           with the 'updatePotentialSpreaders' function.

//       4 - We then iterate over the array of values (and formats if it's also an array)
//           and we check if every spread value can be written in the corresponding cell,
//           ie we check if the cell is empty or if it already contains a value. If it
//           contains a value, we returns an error. This check must be done after having
//           updated the potentialSpreaders graph to make sure that, if an already filled
//           is cleared in the future, we will keep in memory that RC tried to spread on it
//           and that it should be reevaluated.

//       5 - We then iterate over the array of values (and formats if it's also an array)
//           and we set the value and the format of the corresponding cell.

export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "getRangeFormattedValues",
    "getRangeValues",
    "getRangeFormats",
    "getEvaluatedCell",
    "getEvaluatedCells",
    "getColEvaluatedCells",
    "getEvaluatedCellsInZone",
  ] as const;

  private shouldRebuildDependenciesGraph = true;
  private readonly evalContext: EvalContext;

  private evalProcess = new EvaluationProcess(this.getters);
  private rcsToUpdate = new Set<string>();

  constructor(config: UIPluginConfig) {
    super(config);
    this.evalContext = config.custom;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  beforeHandle(cmd: Command) {
    if (invalidateDependenciesCommands.has(cmd.type)) {
      this.shouldRebuildDependenciesGraph = true;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        if (!("content" in cmd || "format" in cmd) || this.shouldRebuildDependenciesGraph) {
          return;
        }
        const rc = cellPositionToRc(cmd);
        this.rcsToUpdate.add(rc);

        if ("content" in cmd) {
          this.evalProcess.updateDependencies(rc);
        }
        break;
      case "EVALUATE_CELLS":
        this.evalProcess.evaluateAllCells();
        break;
    }
  }

  finalize() {
    if (this.shouldRebuildDependenciesGraph) {
      this.evalProcess.buildDependencyGraph();
      this.evalProcess.evaluateAllCells();
      this.shouldRebuildDependenciesGraph = false;
    } else if (this.rcsToUpdate.size) {
      this.evalProcess.evaluateCells(this.rcsToUpdate);
    }
    this.rcsToUpdate.clear();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formulaString: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    const compiledFormula = compile(formulaString);
    const params = this.getCompilationParameters((cell) => this.getEvaluatedCellFromRc(cell));

    const ranges: Range[] = [];
    for (let xc of compiledFormula.dependencies) {
      ranges.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }
    return compiledFormula.execute(ranges, ...params).value;
  }

  /**
   * Return the value of each cell in the range as they are displayed in the grid.
   */
  getRangeFormattedValues(range: Range): FormattedValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters
      .getEvaluatedCellsInZone(sheet.id, range.zone)
      .map((cell) => cell.formattedValue);
  }

  /**
   * Return the value of each cell in the range.
   */
  getRangeValues(range: Range): CellValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getEvaluatedCellsInZone(sheet.id, range.zone).map((cell) => cell.value);
  }

  /**
   * Return the format of each cell in the range.
   */
  getRangeFormats(range: Range): (Format | undefined)[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getEvaluatedCellsInZone(sheet.id, range.zone).map((cell) => cell.format);
  }

  getEvaluatedCell(cellPosition: CellPosition): EvaluatedCell {
    return this.getEvaluatedCellFromRc(cellPositionToRc(cellPosition));
  }

  getEvaluatedCellFromRc(rc: string): EvaluatedCell {
    return this.evalProcess.evaluatedCells[rc] || createEvaluatedCell("");
  }

  getEvaluatedCells(sheetId: UID): Record<UID, EvaluatedCell> {
    const rawCells = this.getters.getCells(sheetId) || {};
    const record: Record<UID, EvaluatedCell> = {};
    for (let cellId of Object.keys(rawCells)) {
      const position = this.getters.getCellPosition(cellId);
      record[cellId] = this.getEvaluatedCell(position);
    }
    return record;
  }

  /**
   * Returns all the evaluated cells of a col
   */
  getColEvaluatedCells(sheetId: UID, col: HeaderIndex): EvaluatedCell[] {
    return Object.keys(this.evalProcess.evaluatedCells)
      .filter((rc) => {
        const position = rcToCellPosition(rc);
        return position.sheetId === sheetId && position.col === col;
      })
      .map((rc) => this.evalProcess.evaluatedCells[rc]);
  }

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCell: (rc: string) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
      const evaluatedCell = getEvaluatedCellIfNotEmpty(position);
      if (evaluatedCell === undefined) {
        return { value: null };
      }
      return evaluatedCell;
    }

    const getEvaluatedCellIfNotEmpty = (position: CellPosition): EvaluatedCell | undefined => {
      const rc = cellPositionToRc(position);
      const evaluatedCell = getEvaluatedCell(rc);
      if (evaluatedCell.type === CellValueType.empty) {
        const cell = getters.getCell(position);
        if (!cell || cell.content === "") {
          return undefined;
        }
      }
      return evaluatedCell;
    };

    const getEvaluatedCell = (rc: string): EvaluatedCell => {
      const evaluatedCell = computeCell(rc);
      if (evaluatedCell.type === CellValueType.error) {
        throw evaluatedCell.error;
      }
      return evaluatedCell;
    };

    /**
     * Return the values of the cell(s) used in reference, but always in the format of a range even
     * if a single cell is referenced. It is a list of col values. This is useful for the formulas that describe parameters as
     * range<number> etc.
     *
     * Note that each col is possibly sparse: it only contain the values of cells
     * that are actually present in the grid.
     */
    function range({ sheetId, zone }: Range): MatrixArg {
      if (!isZoneValid(zone)) {
        throw new InvalidReferenceError();
      }

      // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
      // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
      const sheetZone = getters.getSheetZone(sheetId);
      const _zone = intersection(zone, sheetZone);
      if (!_zone) {
        return { value: [[]], format: [[]] };
      }

      const height = _zone.bottom - _zone.top + 1;
      const width = _zone.right - _zone.left + 1;
      const value: CellValue[][] = Array.from({ length: width }, () =>
        Array.from({ length: height })
      );
      const format: Format[][] = Array.from({ length: width }, () =>
        Array.from({ length: height })
      );

      // Performance issue: nested loop is faster than a map here
      for (let col = _zone.left; col <= _zone.right; col++) {
        for (let row = _zone.top; row <= _zone.bottom; row++) {
          const evaluatedCell = getEvaluatedCellIfNotEmpty({ sheetId: sheetId, col, row });
          if (evaluatedCell) {
            const colIndex = col - _zone.left;
            const rowIndex = row - _zone.top;
            value[colIndex][rowIndex] = evaluatedCell.value;
            if (evaluatedCell.format !== undefined) {
              format[colIndex][rowIndex] = evaluatedCell.format;
            }
          }
        }
      }
      return { value, format };
    }

    /**
     * Returns the value of the cell(s) used in reference
     *
     * @param range the references used
     * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
     *        function for which this parameter is used, we just return the string of the parameter.
     *        The `compute` of the formula's function must process it completely
     */
    function refFn(
      range: Range,
      isMeta: boolean,
      functionName: string,
      paramNumber?: number
    ): PrimitiveArg {
      if (isMeta) {
        // Use zoneToXc of zone instead of getRangeString to avoid sending unbounded ranges
        return { value: zoneToXc(range.zone) };
      }

      if (!isZoneValid(range.zone)) {
        throw new InvalidReferenceError();
      }

      // if the formula definition could have accepted a range, we would pass through the _range function and not here
      if (range.zone.bottom !== range.zone.top || range.zone.left !== range.zone.right) {
        throw new Error(
          paramNumber
            ? _lt(
                "Function %s expects the parameter %s to be a single value or a single cell reference, not a range.",
                functionName.toString(),
                paramNumber.toString()
              )
            : _lt(
                "Function %s expects its parameters to be single values or single cell references, not ranges.",
                functionName.toString()
              )
        );
      }

      if (range.invalidSheetName) {
        throw new Error(_lt("Invalid sheet name: %s", range.invalidSheetName));
      }

      return readCell(range);
    }
    return [refFn, range, evalContext];
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Returns the corresponding formula cell of a given cell
   * It could be the formula present in the cell itself or the
   * formula of the array formula that spreads to the cell
   */
  private getCorrespondingFormulaCell(rc): FormulaCell | undefined {
    const position = rcToCellPosition(rc);
    const cell = this.getters.getCell(position);

    if (cell && cell.content) {
      if (cell.isFormula && !isBadExpression(cell.content)) {
        return cell;
      }
      return undefined;
    }

    const arrayFormulasRc = this.spreadingRelations.getArrayFormulasRc(rc);
    const spreadingFormulaRc = Array.from(arrayFormulasRc).find((rc) =>
      this.spreadingFormulas.has(rc)
    );

    if (!spreadingFormulaRc) {
      return undefined;
    }

    const spreadingFormulaPosition = rcToCellPosition(spreadingFormulaRc);
    const spreadingFormulaCell = this.getters.getCell(spreadingFormulaPosition)!;

    if (spreadingFormulaCell.isFormula) {
      return spreadingFormulaCell;
    }

    return undefined;
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const rc in this.evalProcess.evaluatedCells) {
      const evaluatedCell = this.evalProcess.evaluatedCells[rc];

      const position = rcToCellPosition(rc);
      const xc = toXC(position.col, position.row);

      const value = evaluatedCell.value;
      let isFormula = false;
      let newContent: string | undefined = undefined;
      let newFormat: string | undefined = undefined;
      let isExported: boolean = true;

      const formulaCell = this.getCorrespondingFormulaCell(rc);
      if (formulaCell) {
        isExported = formulaCell.compiledFormula.tokens
          .filter((tk) => tk.type === "FUNCTION")
          .every((tk) => functions[tk.value.toUpperCase()].isExported);

        isFormula = isExported;

        if (!isExported) {
          newContent = value.toString();
          newFormat = evaluatedCell.format;
        }
      }

      const exportedSheetData = data.sheets.find((sheet) => sheet.id === position.sheetId)!;
      const exportedCellData: ExcelCellData = exportedSheetData.cells[xc] || ({} as ExcelCellData);

      const format = newFormat
        ? getItemId<Format>(newFormat, data.formats)
        : exportedCellData.format;
      const content = !isExported ? newContent : exportedCellData.content;
      exportedSheetData.cells[xc] = { ...exportedCellData, value, isFormula, content, format };
    }
  }
}

function isBadExpression(formula: string): boolean {
  try {
    compile(formula);
    return false;
  } catch (error) {
    return true;
  }
}
