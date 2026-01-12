import { compile } from "../../formulas/compiler";
import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { percentile } from "../../helpers";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { colorNumberToHex, getColorScale } from "../../helpers/color";
import { clip, largeMax, largeMin, lazy } from "../../helpers/misc";
import { isInside } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { CellValueType, EvaluatedCell, NumberCell } from "../../types/cells";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
  UpdateCellCommand,
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

type ComputedStyles = { [col: HeaderIndex]: (Style | undefined)[] };
type ComputedIcons = { [col: HeaderIndex]: (string | undefined)[] };
type ComputedDataBars = { [col: HeaderIndex]: (DataBarFill | undefined)[] };

export class EvaluationConditionalFormatPlugin extends CoreViewPlugin {
  static getters = [
    "getConditionalIcon",
    "getCellConditionalFormatStyle",
    "getConditionalDataBar",
  ] as const;
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName[col][row] = Style
  private computedStyles: { [sheet: string]: Lazy<ComputedStyles> } = {};
  private computedIcons: { [sheet: string]: Lazy<ComputedIcons> } = {};
  private computedDataBars: { [sheet: string]: Lazy<ComputedDataBars> } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handleUpdate(cmd: UpdateCellCommand) {
    if ("content" in cmd || "format" in cmd) {
      this.isStale = true;
    }
  }

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type)
    ) {
      this.isStale = true;
    }
  }

  finalize() {
    if (this.isStale) {
      for (const sheetId of this.getters.getSheetIds()) {
        this.computedStyles[sheetId] = lazy(() => this.getComputedStyles(sheetId));
        this.computedIcons[sheetId] = lazy(() => this.getComputedIcons(sheetId));
        this.computedDataBars[sheetId] = lazy(() => this.getComputedDataBars(sheetId));
      }
      this.isStale = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellConditionalFormatStyle(position: CellPosition): Style | undefined {
    const { sheetId, col, row } = position;
    const styles = this.computedStyles[sheetId]();
    return styles && styles[col]?.[row];
  }

  getConditionalIcon({ sheetId, col, row }: CellPosition): string | undefined {
    const icons = this.computedIcons[sheetId]();
    return icons && icons[col]?.[row];
  }

  getConditionalDataBar({ sheetId, col, row }: CellPosition): DataBarFill | undefined {
    const dataBars = this.computedDataBars[sheetId]();
    return dataBars && dataBars[col]?.[row];
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
  private getComputedStyles(sheetId: UID): ComputedStyles {
    const computedStyle: ComputedStyles = {};
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      switch (cf.rule.type) {
        case "ColorScaleRule":
          for (const range of cf.ranges) {
            this.applyColorScale(sheetId, range, cf.rule, computedStyle);
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
                  // we must combine all the properties of all the CF rules applied to the given cell
                  computedStyle[col][row] = Object.assign(
                    computedStyle[col]?.[row] || {},
                    cf.rule.style
                  );
                }
              }
            }
          }
          break;
      }
    }
    return computedStyle;
  }

  private getComputedIcons(sheetId: UID): ComputedIcons {
    const computedIcons = {};
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      if (cf.rule.type !== "IconSetRule") {
        continue;
      }

      for (const range of cf.ranges) {
        this.applyIcon(sheetId, range, cf.rule, computedIcons);
      }
    }
    return computedIcons;
  }

  private getComputedDataBars(sheetId: UID): ComputedDataBars {
    const computedDataBars: ComputedDataBars = {};
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      if (cf.rule.type !== "DataBarRule") {
        continue;
      }

      for (const range of cf.ranges) {
        this.applyDataBar(sheetId, range, cf.rule, computedDataBars);
      }
    }
    return computedDataBars;
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
    computedIcons: ComputedIcons
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
        computedIcons[col][row] = icon;
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
    computedDataBars: ComputedDataBars
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
        computedDataBars[col][row] = {
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
    computedStyle: ComputedStyles
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
          computedStyle[col][row] = computedStyle[col]?.[row] || {};
          computedStyle[col][row]!.fillColor = colorScale(value);
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
