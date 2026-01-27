import { compile } from "../../formulas/compiler";
import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { percentile } from "../../helpers";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { colorNumberToHex, getColorScale } from "../../helpers/color";
import { clip, isDefined, largeMax, largeMin, lazy } from "../../helpers/misc";
import { isInside } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { CellValueType, EvaluatedCell, NumberCell } from "../../types/cells";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import {
  CellIsRule,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  DataBarRule,
  IconSetRule,
  IconThreshold,
} from "../../types/conditional_formatting";
import { EvaluatedCriterion, EvaluatedDateCriterion } from "../../types/generic_criterion";
import { DEFAULT_LOCALE } from "../../types/locale";
import { CellPosition, DataBarFill, HeaderIndex, Lazy, Style, UID, Zone } from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

type Brol<T> = { [col: HeaderIndex]: Record<UID, T | undefined>[] };

type ComputedStyles = Brol<Style>;
type ComputedIcons = Brol<string>;
type ComputedDataBars = Brol<DataBarFill>;

export class EvaluationConditionalFormatPlugin extends CoreViewPlugin {
  static getters = [
    "getConditionalIcon",
    "getCellConditionalFormatStyle",
    "getConditionalDataBar",
  ] as const;
  private isStale: boolean = true;
  private computedBrols: {
    [sheet: UID]: Lazy<{
      styles: ComputedStyles;
      icons: ComputedIcons;
      dataBars: ComputedDataBars;
    }>;
  } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this.isStale = true;
    }
  }

  finalize() {
    if (this.isStale) {
      for (const sheetId of this.getters.getSheetIds()) {
        this.computedBrols[sheetId] = lazy(() => this.getComputedStyles(sheetId));
      }
      this.isStale = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellConditionalFormatStyle(position: CellPosition): Style | undefined {
    const { sheetId, col, row } = position;
    const styles = this.computedBrols[sheetId]().styles;
    const allStyles = styles && styles[col]?.[row];
    if (!allStyles) {
      return undefined;
    }
    const cfIds = this.getters
      .getConditionalFormats(sheetId)
      .map((cf) => cf.id)
      .reverse();
    const values = cfIds
      .filter((cfId) => cfId in allStyles)
      .map((cfId) => allStyles[cfId])
      .filter(isDefined);
    return Object.assign({}, ...values);
  }

  getConditionalIcon({ sheetId, col, row }: CellPosition): string | undefined {
    const icons = this.computedBrols[sheetId]().icons;
    const allIcons = icons && icons[col]?.[row];
    if (!allIcons) {
      return undefined;
    }
    const cfIds = this.getters
      .getConditionalFormats(sheetId)
      .map((cf) => cf.id)
      .reverse();
    const values = cfIds
      .filter((cfId) => cfId in allIcons)
      .map((cfId) => allIcons[cfId])
      .filter(isDefined);
    return values.at(-1);
  }

  getConditionalDataBar({ sheetId, col, row }: CellPosition): DataBarFill | undefined {
    const dataBars = this.computedBrols[sheetId]().dataBars;
    const allDataBars = dataBars && dataBars[col]?.[row];
    if (!allDataBars) {
      return undefined;
    }
    const cfIds = this.getters
      .getConditionalFormats(sheetId)
      .map((cf) => cf.id)
      .reverse();
    const values = cfIds
      .filter((cfId) => cfId in allDataBars)
      .map((cfId) => allDataBars[cfId])
      .filter(isDefined);
    return Object.assign({}, ...values);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Compute the styles according to the conditional formatting.
   * This computation must happen after the cell values are computed if they change
   *
   * This result of the computation will be in the state.cell[XC].conditionalStyle and will be the union of all the style
   * properties of the rules applied (in order).
   * So if a cell has multiple conditional formatting applied to it, and each affect a different value of the style,
   * the resulting style will have the combination of all those values.
   * If multiple conditional formatting use the same style value, they will be applied in order so that the last applied wins
   */
  private getComputedStyles(sheetId: UID) {
    const computedStyle: ComputedStyles = {};
    const computedIcons: ComputedIcons = {};
    const computedDataBars: ComputedDataBars = {};
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      switch (cf.rule.type) {
        case "ColorScaleRule":
          for (const range of cf.ranges) {
            this.applyColorScale(sheetId, range, cf.rule, computedStyle, cf.id);
          }
          break;
        case "CellIsRule":
          const formulas = cf.rule.values.map((value) =>
            value.startsWith("=") ? compile(value) : undefined
          );
          const evaluator = criterionEvaluatorRegistry.get(cf.rule.operator);
          const criterion = { ...cf.rule, type: cf.rule.operator };
          const ranges = cf.ranges.map((xc) => this.getters.getRangeFromSheetXC(sheetId, xc));
          const preComputedCriterion = evaluator.preComputeCriterion?.(
            criterion,
            ranges,
            this.getters
          );
          for (const ref of cf.ranges) {
            const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, ref).zone;
            for (let row = zone.top; row <= zone.bottom; row++) {
              for (let col = zone.left; col <= zone.right; col++) {
                const target = { sheetId, col, row };
                const values = cf.rule.values.map((value, i) => {
                  const compiledFormula = formulas[i];
                  if (compiledFormula) {
                    return this.getters.getTranslatedCellFormula(
                      sheetId,
                      col - zone.left,
                      row - zone.top,
                      compiledFormula.tokens
                    );
                  }
                  return value;
                });
                if (
                  this.getRuleResultForTarget(target, { ...cf.rule, values }, preComputedCriterion)
                ) {
                  if (!computedStyle[col]) {
                    computedStyle[col] = [];
                  }
                  if (!computedStyle[col][row]) {
                    computedStyle[col][row] = {};
                  }
                  computedStyle[col][row][cf.id] = cf.rule.style;
                }
              }
            }
          }
          break;
        case "IconSetRule":
          for (const range of cf.ranges) {
            this.applyIcon(sheetId, range, cf.rule, computedIcons, cf.id);
          }
          break;
        case "DataBarRule":
          for (const range of cf.ranges) {
            this.applyDataBar(sheetId, range, cf.rule, computedDataBars, cf.id);
          }
          break;
      }
    }
    return {
      styles: computedStyle,
      icons: computedIcons,
      dataBars: computedDataBars,
    };
  }

  private parsePoint(
    sheetId: UID,
    range: string,
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold | IconThreshold,
    functionName?: "min" | "max"
  ): null | number {
    const rangeValues = this.getters
      .getEvaluatedCellsInZone(sheetId, this.getters.getRangeFromSheetXC(sheetId, range).zone)
      .filter((cell): cell is NumberCell => cell.type === CellValueType.number)
      .map((cell) => cell.value);
    switch (threshold.type) {
      case "value":
        return functionName === "max" ? largeMax(rangeValues) : largeMin(rangeValues);
      case "number":
        return Number(threshold.value);
      case "percentage":
        const min = largeMin(rangeValues);
        const max = largeMax(rangeValues);
        const delta = max - min;
        return min + (delta * Number(threshold.value)) / 100;
      case "percentile":
        return percentile(rangeValues, Number(threshold.value) / 100, true);
      case "formula":
        const value = threshold.value && this.getters.evaluateFormula(sheetId, threshold.value);
        return typeof value === "number" ? value : null;
      default:
        return null;
    }
  }

  /** Compute the CF icons for the given range and CF rule, and apply in in the given computedIcons object */
  private applyIcon(
    sheetId: UID,
    range: string,
    rule: IconSetRule,
    computedIcons: ComputedIcons,
    cfId: UID
  ): void {
    const lowerInflectionPoint: number | null = this.parsePoint(
      sheetId,
      range,
      rule.lowerInflectionPoint
    );
    const upperInflectionPoint: number | null = this.parsePoint(
      sheetId,
      range,
      rule.upperInflectionPoint
    );
    if (
      lowerInflectionPoint === null ||
      upperInflectionPoint === null ||
      lowerInflectionPoint > upperInflectionPoint
    ) {
      return;
    }
    const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, range).zone;
    const iconSet: string[] = [rule.icons.upper, rule.icons.middle, rule.icons.lower];
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
        if (cell.type !== CellValueType.number) {
          continue;
        }
        const icon = this.computeIcon(
          cell.value,
          upperInflectionPoint,
          rule.upperInflectionPoint.operator,
          lowerInflectionPoint,
          rule.lowerInflectionPoint.operator,
          iconSet
        );
        if (!computedIcons[col]) {
          computedIcons[col] = [];
        }
        if (!computedIcons[col][row]) {
          computedIcons[col][row] = {};
        }
        computedIcons[col][row][cfId] = icon;
      }
    }
  }
  private computeIcon(
    value: number,
    upperInflectionPoint: number,
    upperOperator: string,
    lowerInflectionPoint: number,
    lowerOperator: string,
    icons: string[]
  ): string {
    if (
      (upperOperator === "ge" && value >= upperInflectionPoint) ||
      (upperOperator === "gt" && value > upperInflectionPoint)
    ) {
      return icons[0];
    } else if (
      (lowerOperator === "ge" && value >= lowerInflectionPoint) ||
      (lowerOperator === "gt" && value > lowerInflectionPoint)
    ) {
      return icons[1];
    }

    return icons[2];
  }

  private applyDataBar(
    sheetId: UID,
    range: string,
    rule: DataBarRule,
    computedDataBars: ComputedDataBars,
    cfId: UID
  ): void {
    const rangeValues = this.getters.getRangeFromSheetXC(sheetId, rule.rangeValues || range);
    const allValues = this.getters
      .getEvaluatedCellsInZone(sheetId, rangeValues.zone)
      .filter((cell): cell is NumberCell => cell.type === CellValueType.number)
      .map((cell) => cell.value);
    const max = largeMax(allValues);
    if (max <= 0) {
      // no need to apply the data bar if all values are negative or 0
      return;
    }
    const color = rule.color;
    const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, range).zone;
    const zoneOfValues: Zone = rangeValues.zone;

    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const targetCol = col - zone.left + zoneOfValues.left;
        const targetRow = row - zone.top + zoneOfValues.top;
        const cell = this.getters.getEvaluatedCell({ sheetId, col: targetCol, row: targetRow });
        if (
          !isInside(targetCol, targetRow, zoneOfValues) ||
          cell.type !== CellValueType.number ||
          cell.value <= 0
        ) {
          // values negatives or 0 are ignored
          continue;
        }
        if (!computedDataBars[col]) {
          computedDataBars[col] = [];
        }
        if (!computedDataBars[col][row]) {
          computedDataBars[col][row] = {};
        }
        computedDataBars[col][row][cfId] = {
          color: colorNumberToHex(color),
          percentage: (cell.value * 100) / max,
        };
      }
    }
  }

  /** Compute the color scale for the given range and CF rule, and apply in in the given computedStyle object */
  private applyColorScale(
    sheetId: UID,
    range: string,
    rule: ColorScaleRule,
    computedStyle: ComputedStyles,
    cfId: UID
  ): void {
    const minValue: number | null = this.parsePoint(sheetId, range, rule.minimum, "min");
    const midValue: number | null = rule.midpoint
      ? this.parsePoint(sheetId, range, rule.midpoint)
      : null;
    const maxValue: number | null = this.parsePoint(sheetId, range, rule.maximum, "max");
    if (
      minValue === null ||
      maxValue === null ||
      minValue >= maxValue ||
      (midValue && (minValue >= midValue || midValue >= maxValue))
    ) {
      return;
    }
    const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, range).zone;
    const colorThresholds = [{ value: minValue, color: rule.minimum.color }];
    if (rule.midpoint && midValue) {
      colorThresholds.push({ value: midValue, color: rule.midpoint.color });
    }
    colorThresholds.push({ value: maxValue, color: rule.maximum.color });
    const colorScale = getColorScale(colorThresholds);
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
        if (cell.type === CellValueType.number) {
          const value = clip(cell.value, minValue, maxValue);
          if (!computedStyle[col]) {
            computedStyle[col] = [];
          }
          if (!computedStyle[col][row]) {
            computedStyle[col][row] = {};
          }
          computedStyle[col][row][cfId] = { fillColor: colorScale(value) };
        }
      }
    }
  }

  private getRuleResultForTarget(
    target: CellPosition,
    rule: CellIsRule,
    preComputedCriterion: unknown
  ): boolean {
    const cell: EvaluatedCell = this.getters.getEvaluatedCell(target);
    if (cell.type === CellValueType.error) {
      return false;
    }

    const { sheetId } = target;
    const evaluator = criterionEvaluatorRegistry.get(rule.operator);

    const evaluatedCriterionValues = rule.values.map((value) => {
      if (!value.startsWith("=")) {
        return parseLiteral(value, DEFAULT_LOCALE);
      }
      return this.getters.evaluateFormula(sheetId, value) ?? "";
    });

    if (evaluatedCriterionValues.some(isMultipleElementMatrix)) {
      return false;
    }

    const evaluatedCriterion: EvaluatedCriterion | EvaluatedDateCriterion = {
      ...rule,
      type: rule.operator,
      values: evaluatedCriterionValues.map(toScalar),
      dateValue: rule.dateValue || "exactDate",
    };
    return evaluator.isValueValid(cell.value ?? "", evaluatedCriterion, preComputedCriterion);
  }
}
