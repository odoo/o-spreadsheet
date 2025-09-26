import { compile } from "../../formulas";
import { deepCopy, deepEquals } from "../../helpers";
import { adaptFormulaStringRanges } from "../../helpers/formulas";
import { createPivotFormula, getMaxObjectId } from "../../helpers/pivot/pivot_helpers";
import { SpreadsheetPivotTable } from "../../helpers/pivot/table_spreadsheet_pivot";
import {
  AdaptSheetName,
  ApplyRangeChange,
  CellPosition,
  CommandResult,
  CoreCommand,
  Position,
  Range,
  RangeCompiledFormula,
  UID,
  WorkbookData,
} from "../../types";
import { PivotCoreDefinition, PivotCoreMeasure } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";

interface Pivot {
  definition: PivotCoreDefinition;
  formulaId: string;
}

interface CoreState {
  nextFormulaId: number;
  pivots: Record<UID, Pivot | undefined>;
  formulaIds: Record<UID, string | undefined>;
  compiledMeasureFormulas: Record<UID, Record<string, RangeCompiledFormula | undefined>>;
}

export class PivotCorePlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "getPivotCoreDefinition",
    "getPivotDisplayName",
    "getPivotId",
    "getPivotFormulaId",
    "getPivotIds",
    "getMeasureCompiledFormula",
    "getPivotName",
    "isExistingPivot",
  ] as const;

  readonly nextFormulaId: number = 1;
  public readonly pivots: {
    [pivotId: UID]: Pivot | undefined;
  } = {};
  public readonly formulaIds: { [formulaId: UID]: UID | undefined } = {};
  public readonly compiledMeasureFormulas: Record<UID, Record<string, RangeCompiledFormula>> = {};

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_PIVOT": {
        return this.checkValidations(
          cmd.pivot,
          this.checkDuplicatedMeasureIds,
          this.checkSortedColumnInMeasures
        );
      }
      case "UPDATE_PIVOT": {
        if (!(cmd.pivotId in this.pivots)) {
          return CommandResult.PivotIdNotFound;
        }
        if (deepEquals(cmd.pivot, this.pivots[cmd.pivotId]?.definition)) {
          return CommandResult.NoChanges;
        }
        if (cmd.pivot.name === "") {
          return CommandResult.EmptyName;
        }
        return this.checkValidations(
          cmd.pivot,
          this.checkDuplicatedMeasureIds,
          this.checkSortedColumnInMeasures
        );
      }
      case "RENAME_PIVOT":
        if (!(cmd.pivotId in this.pivots)) {
          return CommandResult.PivotIdNotFound;
        }
        if (cmd.name === "") {
          return CommandResult.EmptyName;
        }
        break;
      case "REMOVE_PIVOT":
      case "DUPLICATE_PIVOT":
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
        pivot.name = cmd.duplicatedPivotName ?? pivot.name + " (copy)";
        this.addPivot(newPivotId, pivot);
        break;
      }
      case "UPDATE_PIVOT": {
        this.history.update(
          "pivots",
          cmd.pivotId,
          "definition",
          this.repairSortedColumn(deepCopy(cmd.pivot))
        );
        this.compileCalculatedMeasures(cmd.pivot.measures);
        break;
      }
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID, adaptSheetName: AdaptSheetName) {
    for (const formulaSheetId in this.compiledMeasureFormulas) {
      for (const formulaString in this.compiledMeasureFormulas[formulaSheetId]) {
        const compiledFormula = this.compiledMeasureFormulas[formulaSheetId][formulaString];
        const newDependencies: Range[] = [];
        for (const range of compiledFormula.dependencies) {
          const change = applyChange(range);
          if (change.changeType === "NONE") {
            newDependencies.push(range);
          } else {
            newDependencies.push(change.range);
          }
        }
        const newFormulaString = adaptFormulaStringRanges(formulaSheetId, formulaString, {
          sheetId,
          sheetName: adaptSheetName,
          applyChange,
        });
        if (newFormulaString !== formulaString) {
          this.replaceMeasureFormula(formulaSheetId, formulaString, newFormulaString);
        }
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
    return this.getPivotCore(pivotId).definition.name;
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

  getMeasureCompiledFormula(measure: PivotCoreMeasure): RangeCompiledFormula {
    if (!measure.computedBy) {
      throw new Error(`Measure ${measure.fieldName} is not computed by formula`);
    }
    const sheetId = measure.computedBy.sheetId;
    return this.compiledMeasureFormulas[sheetId][measure.computedBy.formula];
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private addPivot(
    pivotId: UID,
    pivot: PivotCoreDefinition,
    formulaId = this.nextFormulaId.toString()
  ) {
    this.history.update("pivots", pivotId, {
      definition: this.repairSortedColumn(deepCopy(pivot)),
      formulaId,
    });
    this.compileCalculatedMeasures(pivot.measures);
    this.history.update("formulaIds", formulaId, pivotId);
    this.history.update("nextFormulaId", this.nextFormulaId + 1);
  }

  private compileCalculatedMeasures(measures: PivotCoreMeasure[]) {
    for (const measure of measures) {
      if (measure.computedBy) {
        const sheetId = measure.computedBy.sheetId;
        const compiledFormula = this.compileMeasureFormula(
          measure.computedBy.sheetId,
          measure.computedBy.formula
        );
        this.history.update(
          "compiledMeasureFormulas",
          sheetId,
          measure.computedBy.formula,
          compiledFormula
        );
      }
    }
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
        sheetName: this.getters.getSheetName(sheetId),
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
        sheetName: this.getters.getSheetName(sheetId),
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

  private compileMeasureFormula(sheetId: UID, formulaString: string) {
    const compiledFormula = compile(formulaString);
    const rangeDependencies = compiledFormula.dependencies.map((xc) =>
      this.getters.getRangeFromSheetXC(sheetId, xc)
    );
    return {
      ...compiledFormula,
      dependencies: rangeDependencies,
    };
  }

  private replaceMeasureFormula(sheetId: UID, formulaString: string, newFormulaString: string) {
    this.history.update("compiledMeasureFormulas", sheetId, formulaString, undefined);
    this.history.update(
      "compiledMeasureFormulas",
      sheetId,
      newFormulaString,
      this.compileMeasureFormula(sheetId, newFormulaString)
    );
    for (const pivotId in this.pivots) {
      const pivot = this.pivots[pivotId];
      if (!pivot) {
        continue;
      }
      for (const measure of pivot.definition.measures) {
        if (measure.computedBy?.formula === formulaString) {
          const measureIndex = pivot.definition.measures.indexOf(measure);
          this.history.update(
            "pivots",
            pivotId,
            "definition",
            "measures",
            measureIndex,
            "computedBy",
            { formula: newFormulaString, sheetId }
          );
        }
      }
    }
  }

  private checkSortedColumnInMeasures(definition: PivotCoreDefinition) {
    definition = this.repairSortedColumn(definition);
    const measures = definition.measures.map((measure) => measure.id);
    if (definition.sortedColumn && !measures.includes(definition.sortedColumn.measure)) {
      return CommandResult.InvalidDefinition;
    }
    return CommandResult.Success;
  }

  private checkDuplicatedMeasureIds(definition: PivotCoreDefinition) {
    const uniqueIds = new Set(definition.measures.map((m) => m.id));
    if (definition.measures.length !== uniqueIds.size) {
      return CommandResult.InvalidDefinition;
    }
    return CommandResult.Success;
  }

  private repairSortedColumn(definition: PivotCoreDefinition) {
    if (definition.sortedColumn) {
      // Fix for an upgrade issue: the sortedColumn measure was not updated
      // from using fieldName to using id. If the sortedColumn measure matches
      // a measure fieldName in the definition, update it to use the measure's id instead
      // of its fieldName.
      // TODO: add an upgrade step to fix this in master and remove this code
      const sortedMeasure = definition.measures.find(
        (measure) => measure.fieldName === definition.sortedColumn?.measure
      );
      if (sortedMeasure) {
        return {
          ...definition,
          sortedColumn: {
            ...definition.sortedColumn,
            measure: sortedMeasure.id,
          },
        };
      }
    }
    return definition;
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
