import { compile } from "../../formulas";
import { getCellPositionsInRanges, isInside, lazy } from "../../helpers";
import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import {
  CellPosition,
  CellValue,
  CellValueType,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  HeaderIndex,
  Lazy,
  Offset,
  UID,
  isMatrix,
} from "../../types";
import { CoreViewCommand, invalidateEvaluationCommands } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";
import { _t } from "./../../translation";

interface InvalidValidationResult {
  readonly isValid: false;
  readonly rule: DataValidationRule;
  readonly error: string;
}

interface ValidValidationResult {
  readonly isValid: true;
}

const VALID_RESULT: ValidValidationResult = { isValid: true };

type ValidationResult = ValidValidationResult | InvalidValidationResult;

type SheetValidationResult = { [col: HeaderIndex]: Array<Lazy<ValidationResult>> };

export class EvaluationDataValidationPlugin extends UIPlugin {
  static getters = [
    "getDataValidationInvalidCriterionValueMessage",
    "getDataValidationCheckBoxCellPositions",
    "getDataValidationListCellsPositions",
    "getInvalidDataValidationMessage",
    "getValidationResultForCellValue",
    "isCellValidCheckbox",
    "isDataValidationInvalid",
  ] as const;

  validationResults: Record<UID, SheetValidationResult> = {};

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this.validationResults = {};
      return;
    }
    switch (cmd.type) {
      case "ADD_DATA_VALIDATION_RULE":
        const ranges = cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range));
        if (cmd.rule.criterion.type === "isBoolean") {
          this.setContentToBooleanCells({ ...cmd.rule, ranges });
        }
        delete this.validationResults[cmd.sheetId];
        break;
      case "REMOVE_DATA_VALIDATION_RULE":
        delete this.validationResults[cmd.sheetId];
        break;
    }
  }

  private setContentToBooleanCells(rule: DataValidationRule) {
    for (const position of getCellPositionsInRanges(rule.ranges)) {
      const evaluatedCell = this.getters.getEvaluatedCell(position);
      if (evaluatedCell.type !== CellValueType.boolean) {
        this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
      }
    }
  }

  isDataValidationInvalid(cellPosition: CellPosition): boolean {
    return !this.getValidationResultForCell(cellPosition).isValid;
  }

  getInvalidDataValidationMessage(cellPosition: CellPosition): string | undefined {
    const validationResult = this.getValidationResultForCell(cellPosition);
    return validationResult.isValid ? undefined : validationResult.error;
  }

  /**
   * Check if the value is valid for the given criterion, and return an error message if not.
   *
   * The value must be canonicalized.
   */
  getDataValidationInvalidCriterionValueMessage(
    criterionType: DataValidationCriterionType,
    value: string
  ): string | undefined {
    const evaluator = dataValidationEvaluatorRegistry.get(criterionType);
    if (value.startsWith("=")) {
      return evaluator.allowedValues === "onlyLiterals"
        ? _t("The value must not be a formula")
        : undefined;
    } else if (evaluator.allowedValues === "onlyFormulas") {
      return _t("The value must be a formula");
    }

    return evaluator.isCriterionValueValid(value) ? undefined : evaluator.criterionValueErrorString;
  }

  isCellValidCheckbox(cellPosition: CellPosition): boolean {
    if (!this.getters.isMainCellPosition(cellPosition)) {
      return false;
    }

    const rule = this.getters.getValidationRuleForCell(cellPosition);
    if (!rule || rule.criterion.type !== "isBoolean") {
      return false;
    }

    return this.getValidationResultForCell(cellPosition).isValid;
  }

  /** Get the validation result if the cell on the given position had the given value */
  getValidationResultForCellValue(
    cellValue: CellValue,
    cellPosition: CellPosition
  ): ValidationResult {
    const rule = this.getters.getValidationRuleForCell(cellPosition);
    if (!rule) {
      return VALID_RESULT;
    }
    const error = this.getRuleErrorForCellValue(cellValue, cellPosition, rule);

    return error ? { error, rule, isValid: false } : VALID_RESULT;
  }

  getDataValidationCheckBoxCellPositions(): CellPosition[] {
    const rules = this.getters
      .getDataValidationRules(this.getters.getActiveSheetId())
      .filter((rule) => rule.criterion.type === "isBoolean");
    return getCellPositionsInRanges(rules.map((rule) => rule.ranges).flat()).filter((position) =>
      this.isCellValidCheckbox(position)
    );
  }

  getDataValidationListCellsPositions(): CellPosition[] {
    const rules = this.getters
      .getDataValidationRules(this.getters.getActiveSheetId())
      .filter(
        (rule) =>
          (rule.criterion.type === "isValueInList" || rule.criterion.type === "isValueInRange") &&
          rule.criterion.displayStyle === "arrow"
      );
    return getCellPositionsInRanges(rules.map((rule) => rule.ranges).flat());
  }

  private getValidationResultForCell(cellPosition: CellPosition): ValidationResult {
    const { col, row, sheetId } = cellPosition;
    if (!this.validationResults[sheetId]) {
      this.validationResults[sheetId] = this.computeSheetValidationResults(sheetId);
    }
    return this.validationResults[sheetId][col]?.[row]?.() || VALID_RESULT;
  }

  private computeSheetValidationResults(sheetId: UID): SheetValidationResult {
    const validationResults: SheetValidationResult = {};
    const ranges = this.getters.getDataValidationRules(sheetId).map((rule) => rule.ranges);

    for (const cellPosition of getCellPositionsInRanges(ranges.flat())) {
      const { col, row } = cellPosition;
      if (!validationResults[col]) {
        validationResults[col] = [];
      }
      validationResults[col][row] = lazy(() => {
        const evaluatedCell = this.getters.getEvaluatedCell(cellPosition);
        if (evaluatedCell.type === CellValueType.empty) {
          return VALID_RESULT;
        }
        return this.getValidationResultForCellValue(evaluatedCell.value, cellPosition);
      });
    }
    return validationResults;
  }

  private getRuleErrorForCellValue(
    cellValue: CellValue,
    cellPosition: CellPosition,
    rule: DataValidationRule
  ): string | undefined {
    const { sheetId } = cellPosition;
    const criterion = rule.criterion;
    const evaluator = dataValidationEvaluatorRegistry.get(criterion.type);

    const offset = this.getCellOffsetInRule(cellPosition, rule);
    const evaluatedCriterionValues = this.getEvaluatedCriterionValues(sheetId, offset, criterion);
    const evaluatedCriterion = { ...criterion, values: evaluatedCriterionValues };

    if (evaluator.isValueValid(cellValue, evaluatedCriterion, this.getters, sheetId)) {
      return undefined;
    }
    return evaluator.getErrorString(evaluatedCriterion, this.getters, sheetId);
  }

  /** Get the offset of the cell inside the ranges of the rule. Throws an error if the cell isn't inside the rule. */
  private getCellOffsetInRule(cellPosition: CellPosition, rule: DataValidationRule): Offset {
    const range = rule.ranges.find((range) =>
      isInside(cellPosition.col, cellPosition.row, range.zone)
    );
    if (!range) {
      throw new Error("The cell is not in any range of the rule");
    }
    return {
      col: cellPosition.col - range.zone.left,
      row: cellPosition.row - range.zone.top,
    };
  }

  private getEvaluatedCriterionValues(
    sheetId: UID,
    offset: Offset,
    criterion: DataValidationCriterion
  ): string[] {
    return criterion.values.map((value) => {
      if (!value.startsWith("=")) {
        return value;
      }

      const formula = compile(value);
      const translatedFormula = this.getters.getTranslatedCellFormula(
        sheetId,
        offset.col,
        offset.row,
        {
          ...formula,
          dependencies: formula.dependencies.map((d) =>
            this.getters.getRangeFromSheetXC(sheetId, d)
          ),
        }
      );

      const evaluated = this.getters.evaluateFormula(sheetId, translatedFormula);
      return evaluated && !isMatrix(evaluated) ? evaluated.toString() : "";
    });
  }
}
