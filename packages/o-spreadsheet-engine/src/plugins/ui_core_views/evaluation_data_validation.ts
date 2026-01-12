import { DVTerms } from "../../components/translations_terms";
import { GRAY_200 } from "../../constants";
import { compile } from "../../formulas/compiler";
import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { chipTextColor } from "../../helpers/color";
import { lazy } from "../../helpers/misc";
import { getCellPositionsInRanges } from "../../helpers/range";
import { isInside, positions } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { _t } from "../../translation";
import { CellValue, CellValueType } from "../../types/cells";
import {
  CoreViewCommand,
  invalidateEvaluationCommands,
  UpdateCellCommand,
} from "../../types/commands";
import {
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
} from "../../types/data_validation";
import { GenericCriterion } from "../../types/generic_criterion";
import { DEFAULT_LOCALE } from "../../types/locale";
import { CellPosition, HeaderIndex, Lazy, Matrix, Offset, Style, UID } from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

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

export class EvaluationDataValidationPlugin extends CoreViewPlugin {
  static getters = [
    "getDataValidationInvalidCriterionValueMessage",
    "getInvalidDataValidationMessage",
    "getValidationResultForCellValue",
    "getDataValidationRangeValues",
    "isCellValidCheckbox",
    "getDataValidationCellStyle",
    "getDataValidationChipStyle",
    "isDataValidationInvalid",
  ] as const;

  validationResults: Record<UID, SheetValidationResult> = {};
  criterionPreComputeResult: Record<UID, { [dvRuleId: UID]: unknown }> = {};

  handleUpdate(cmd: UpdateCellCommand) {
    if ("content" in cmd || "format" in cmd) {
      this.validationResults = {};
      this.criterionPreComputeResult = {};
      return;
    }
  }

  handle(cmd: CoreViewCommand) {
    if (invalidateEvaluationCommands.has(cmd.type) || cmd.type === "EVALUATE_CELLS") {
      this.validationResults = {};
      this.criterionPreComputeResult = {};
      return;
    }
    switch (cmd.type) {
      case "ADD_DATA_VALIDATION_RULE":
      case "REMOVE_DATA_VALIDATION_RULE":
        delete this.validationResults[cmd.sheetId];
        delete this.criterionPreComputeResult[cmd.sheetId];
        break;
    }
  }

  isDataValidationInvalid(cellPosition: CellPosition): boolean {
    return !this.getValidationResultForCell(cellPosition).isValid;
  }

  getDataValidationCellStyle(position: CellPosition): Style | undefined {
    if (this.hasChip(position)) {
      return undefined; // The style is not applied on the cell if it's a chip
    }
    return this.getDataValidationStyle(position);
  }

  getDataValidationChipStyle(position: CellPosition): Style | undefined {
    if (this.hasChip(position)) {
      return this.getDataValidationStyle(position) ?? { fillColor: GRAY_200 };
    }
    return undefined;
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
    const evaluator = criterionEvaluatorRegistry.get(criterionType);
    if (value.startsWith("=")) {
      if (evaluator.allowedValues === "onlyLiterals") {
        return _t("The value must not be a formula");
      }
      return this.isValidFormula(value) ? undefined : DVTerms.CriterionError.validFormula;
    } else if (evaluator.allowedValues === "onlyFormulas") {
      return _t("The value must be a formula");
    }

    return evaluator.isCriterionValueValid(value) ? undefined : evaluator.criterionValueErrorString;
  }

  getDataValidationRangeValues(
    sheetId: UID,
    criterion: GenericCriterion
  ): { value: string; label: string }[] {
    const range = this.getters.getRangeFromSheetXC(sheetId, String(criterion.values[0]));
    const values: { label: string; value: string }[] = [];
    const labelsSet = new Set<string>();
    for (const p of positions(range.zone)) {
      const cell = this.getters.getEvaluatedCell({ ...p, sheetId: range.sheetId });
      if (cell.formattedValue && !labelsSet.has(cell.formattedValue)) {
        labelsSet.add(cell.formattedValue);
        values.push({ label: cell.formattedValue, value: cell.value?.toString() || "" });
      }
    }
    return values;
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

  private hasChip(position: CellPosition) {
    const rule = this.getters.getValidationRuleForCell(position);
    return (
      (rule?.criterion.type === "isValueInList" || rule?.criterion.type === "isValueInRange") &&
      rule.criterion.displayStyle === "chip"
    );
  }

  private getDataValidationStyle(
    position: CellPosition
  ): Pick<Style, "fillColor" | "textColor"> | undefined {
    const rule = this.getters.getValidationRuleForCell(position);
    if (!rule || this.isDataValidationInvalid(position)) {
      return undefined;
    }
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    const color = this.getValueColor(rule, evaluatedCell.value);
    if (!color) {
      return undefined;
    }
    const style: Style = {
      fillColor: color,
      textColor: chipTextColor(color),
    };
    return style;
  }

  private getValueColor(rule: DataValidationRule, value: CellValue): string | undefined {
    if (rule.criterion.type !== "isValueInList" && rule.criterion.type !== "isValueInRange") {
      return undefined;
    }
    for (const criterionValue in rule.criterion.colors) {
      if (criterionValue.toLowerCase() === String(value).toLowerCase()) {
        return rule.criterion.colors[criterionValue];
      }
    }
    return undefined;
  }

  private isValidFormula(value: string): boolean {
    return !compile(value).isBadExpression;
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
    const evaluator = criterionEvaluatorRegistry.get(criterion.type);

    const offset = this.getCellOffsetInRule(cellPosition, rule);
    const evaluatedCriterionValues = this.getEvaluatedCriterionValues(sheetId, offset, criterion);
    if (evaluatedCriterionValues.some(isMultipleElementMatrix)) {
      return undefined;
    }
    const evaluatedCriterion = { ...criterion, values: evaluatedCriterionValues.map(toScalar) };

    if (!this.criterionPreComputeResult[sheetId]) {
      this.criterionPreComputeResult[sheetId] = {};
    }
    let preComputedCriterion = this.criterionPreComputeResult[sheetId][rule.id];
    if (preComputedCriterion === undefined) {
      preComputedCriterion = evaluator.preComputeCriterion?.(
        rule.criterion,
        rule.ranges,
        this.getters
      );
      this.criterionPreComputeResult[sheetId][rule.id] = preComputedCriterion;
    }

    if (evaluator.isValueValid(cellValue, evaluatedCriterion, preComputedCriterion)) {
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
  ): (CellValue | Matrix<CellValue>)[] {
    return criterion.values.map((value) => {
      if (!value.startsWith("=")) {
        return parseLiteral(value, DEFAULT_LOCALE);
      }

      const formula = compile(value);
      const translatedFormula = this.getters.getTranslatedCellFormula(
        sheetId,
        offset.col,
        offset.row,
        formula.tokens
      );

      return this.getters.evaluateFormula(sheetId, translatedFormula);
    });
  }
}
