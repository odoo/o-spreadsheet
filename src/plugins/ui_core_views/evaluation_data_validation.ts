import { DVTerms } from "../../components/translations_terms";
import { CHIP_DEFAULT_COLOR } from "../../constants";
import { compile } from "../../formulas";
import { chipTextColor, getCellPositionsInRanges, isInside, lazy } from "../../helpers";
import { parseLiteral } from "../../helpers/cells";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import {
  CellPosition,
  CellValue,
  CellValueType,
  Color,
  DEFAULT_LOCALE,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  HeaderIndex,
  Lazy,
  Matrix,
  Offset,
  Style,
  UID,
  isMatrix,
} from "../../types";
import { CoreViewCommand, invalidateEvaluationCommands } from "../../types/commands";
import { CoreViewPlugin } from "../core_view_plugin";
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

export class EvaluationDataValidationPlugin extends CoreViewPlugin {
  static getters = [
    "getDataValidationInvalidCriterionValueMessage",
    "getInvalidDataValidationMessage",
    "getValidationResultForCellValue",
    "isCellValidCheckbox",
    "getDataValidationCellStyle",
    "getDataValidationChipColor",
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
      case "REMOVE_DATA_VALIDATION_RULE":
        delete this.validationResults[cmd.sheetId];
        break;
    }
  }

  isDataValidationInvalid(cellPosition: CellPosition): boolean {
    return !this.getValidationResultForCell(cellPosition).isValid;
  }

  getDataValidationCellStyle(
    position: CellPosition
  ): Pick<Style, "fillColor" | "textColor"> | undefined {
    const style = this.getDataValidationStyle(position);
    if (!style) {
      return undefined;
    }
    if (this.hasChip(position)) {
      // the fill color is for the chip, not the cell background
      delete style.fillColor;
    }
    return style;
  }

  getDataValidationChipColor(position: CellPosition): Color | undefined {
    const style = this.getDataValidationStyle(position);
    return this.hasChip(position) ? style?.fillColor ?? CHIP_DEFAULT_COLOR : undefined;
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
    if (!rule) {
      return false;
    }
    return rule.criterion.type === "isValueInList" && rule.criterion.displayStyle === "chip";
  }

  private getDataValidationStyle(
    position: CellPosition
  ): Pick<Style, "fillColor" | "textColor"> | undefined {
    const rule = this.getters.getValidationRuleForCell(position);
    if (rule?.criterion.type !== "isValueInList") {
      return undefined;
    }
    if (this.isDataValidationInvalid(position)) {
      return undefined;
    }
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    const index = rule.criterion.values.findIndex((value) => value === evaluatedCell.value);
    const color = rule.criterion.colors?.[index];
    if (!color) {
      return undefined;
    }
    const style: Style = {
      fillColor: color,
      textColor: chipTextColor(color),
    };
    return style;
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
    if (evaluatedCriterionValues.some(isMatrix)) {
      return undefined;
    }
    const evaluatedCriterion = { ...criterion, values: evaluatedCriterionValues as CellValue[] };

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
