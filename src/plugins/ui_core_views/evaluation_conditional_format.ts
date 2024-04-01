import { compile } from "../../formulas";
import { parseLiteral } from "../../helpers/cells";
import { colorNumberString, percentile } from "../../helpers/index";
import { clip, largeMax, largeMin, lazy } from "../../helpers/misc";
import { _t } from "../../translation";
import {
  CellIsRule,
  CellPosition,
  CellValueType,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  DEFAULT_LOCALE,
  EvaluatedCell,
  HeaderIndex,
  IconSetRule,
  IconThreshold,
  Lazy,
  NumberCell,
  Style,
  UID,
  Zone,
  invalidateCFEvaluationCommands,
  isMatrix,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { CoreViewCommand, invalidateEvaluationCommands } from "./../../types/commands";

type ComputedStyles = { [col: HeaderIndex]: (Style | undefined)[] };
type ComputedIcons = { [col: HeaderIndex]: (string | undefined)[] };

export class EvaluationConditionalFormatPlugin extends UIPlugin {
  static getters = ["getConditionalIcon", "getCellConditionalFormatStyle"] as const;
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName[col][row] = Style
  private computedStyles: { [sheet: string]: Lazy<ComputedStyles> } = {};
  private computedIcons: { [sheet: string]: Lazy<ComputedIcons> } = {};

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
        this.computedStyles[sheetId] = lazy(() => this.getComputedStyles(sheetId));
        this.computedIcons[sheetId] = lazy(() => this.getComputedIcons(sheetId));
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
    for (let cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      switch (cf.rule.type) {
        case "ColorScaleRule":
          for (let range of cf.ranges) {
            this.applyColorScale(sheetId, range, cf.rule, computedStyle);
          }
          break;
        case "CellIsRule":
          const formulas = cf.rule.values.map((value) =>
            value.startsWith("=") ? compile(value) : undefined
          );
          for (let ref of cf.ranges) {
            const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, ref).zone;
            for (let row = zone.top; row <= zone.bottom; row++) {
              for (let col = zone.left; col <= zone.right; col++) {
                const predicate = this.rulePredicate[cf.rule.type];
                const target = { sheetId, col, row };
                const values = cf.rule.values.map((value, i) => {
                  const compiledFormula = formulas[i];
                  if (compiledFormula) {
                    return this.getters.getTranslatedCellFormula(
                      sheetId,
                      col - zone.left,
                      row - zone.top,
                      {
                        ...compiledFormula,
                        dependencies: compiledFormula.dependencies.map((d) =>
                          this.getters.getRangeFromSheetXC(sheetId, d)
                        ),
                      }
                    );
                  }
                  return value;
                });
                if (predicate && predicate(target, { ...cf.rule, values })) {
                  if (!computedStyle[col]) computedStyle[col] = [];
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
    for (let cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      if (cf.rule.type !== "IconSetRule") continue;

      for (let range of cf.ranges) {
        this.applyIcon(sheetId, range, cf.rule, computedIcons);
      }
    }
    return computedIcons;
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
        const result = functionName === "max" ? largeMax(rangeValues) : largeMin(rangeValues);
        return result;
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
    const colorCellArgs: {
      minValue: number;
      minColor: number;
      colorDiffUnit: [number, number, number];
    }[] = [];
    if (rule.midpoint && midValue) {
      colorCellArgs.push({
        minValue,
        minColor: rule.minimum.color,
        colorDiffUnit: this.computeColorDiffUnits(
          minValue,
          midValue,
          rule.minimum.color,
          rule.midpoint.color
        ),
      });
      colorCellArgs.push({
        minValue: midValue,
        minColor: rule.midpoint.color,
        colorDiffUnit: this.computeColorDiffUnits(
          midValue,
          maxValue,
          rule.midpoint.color,
          rule.maximum.color
        ),
      });
    } else {
      colorCellArgs.push({
        minValue,
        minColor: rule.minimum.color,
        colorDiffUnit: this.computeColorDiffUnits(
          minValue,
          maxValue,
          rule.minimum.color,
          rule.maximum.color
        ),
      });
    }
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
        if (cell.type === CellValueType.number) {
          const value = clip(cell.value, minValue, maxValue);
          let color;
          if (colorCellArgs.length === 2 && midValue) {
            color =
              value <= midValue
                ? this.colorCell(
                    value,
                    colorCellArgs[0].minValue,
                    colorCellArgs[0].minColor,
                    colorCellArgs[0].colorDiffUnit
                  )
                : this.colorCell(
                    value,
                    colorCellArgs[1].minValue,
                    colorCellArgs[1].minColor,
                    colorCellArgs[1].colorDiffUnit
                  );
          } else {
            color = this.colorCell(
              value,
              colorCellArgs[0].minValue,
              colorCellArgs[0].minColor,
              colorCellArgs[0].colorDiffUnit
            );
          }
          if (!computedStyle[col]) computedStyle[col] = [];
          computedStyle[col][row] = computedStyle[col]?.[row] || {};
          computedStyle[col][row]!.fillColor = colorNumberString(color);
        }
      }
    }
  }

  private computeColorDiffUnits(
    minValue: number,
    maxValue: number,
    minColor: number,
    maxColor: number
  ): [number, number, number] {
    const deltaValue = maxValue - minValue;

    const deltaColorR = ((minColor >> 16) % 256) - ((maxColor >> 16) % 256);
    const deltaColorG = ((minColor >> 8) % 256) - ((maxColor >> 8) % 256);
    const deltaColorB = (minColor % 256) - (maxColor % 256);

    const colorDiffUnitR = deltaColorR / deltaValue;
    const colorDiffUnitG = deltaColorG / deltaValue;
    const colorDiffUnitB = deltaColorB / deltaValue;
    return [colorDiffUnitR, colorDiffUnitG, colorDiffUnitB];
  }

  private colorCell(
    value: number,
    minValue: number,
    minColor: number,
    colorDiffUnit: [number, number, number]
  ) {
    const [colorDiffUnitR, colorDiffUnitG, colorDiffUnitB] = colorDiffUnit;
    const r = Math.round(((minColor >> 16) % 256) - colorDiffUnitR * (value - minValue));
    const g = Math.round(((minColor >> 8) % 256) - colorDiffUnitG * (value - minValue));
    const b = Math.round((minColor % 256) - colorDiffUnitB * (value - minValue));
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Execute the predicate to know if a conditional formatting rule should be applied to a cell
   */
  private rulePredicate: {
    CellIsRule: (target: CellPosition, rule: CellIsRule) => boolean;
  } = {
    CellIsRule: (target: CellPosition, rule: CellIsRule): boolean => {
      const cell: EvaluatedCell = this.getters.getEvaluatedCell(target);
      if (cell.type === CellValueType.error) {
        return false;
      }
      let [value0, value1] = rule.values.map((val) => {
        if (val.startsWith("=")) {
          return this.getters.evaluateFormula(target.sheetId, val) ?? "";
        }
        return parseLiteral(val, DEFAULT_LOCALE);
      });
      if (isMatrix(value0) || isMatrix(value1)) {
        return false;
      }

      const cellValue = cell.value ?? "";
      value0 = value0 ?? "";
      value1 = value1 ?? "";
      switch (rule.operator) {
        case "IsEmpty":
          return cellValue.toString().trim() === "";
        case "IsNotEmpty":
          return cellValue.toString().trim() !== "";
        case "BeginsWith":
          if (value0 === "") {
            return false;
          }
          return cellValue.toString().startsWith(value0.toString());
        case "EndsWith":
          if (value0 === "") {
            return false;
          }
          return cellValue.toString().endsWith(value0.toString());
        case "Between":
          return cellValue >= value0 && cellValue <= value1;
        case "NotBetween":
          return !(cellValue >= value0 && cellValue <= value1);
        case "ContainsText":
          return cellValue.toString().indexOf(value0.toString()) > -1;
        case "NotContains":
          return !cellValue || cellValue.toString().indexOf(value0.toString()) === -1;
        case "GreaterThan":
          return cellValue > value0;
        case "GreaterThanOrEqual":
          return cellValue >= value0;
        case "LessThan":
          return cellValue < value0;
        case "LessThanOrEqual":
          return cellValue <= value0;
        case "NotEqual":
          if (value0 === "") {
            return false;
          }
          return cellValue !== value0;
        case "Equal":
          if (value0 === "") {
            return true;
          }
          return cellValue === value0;
        default:
          console.warn(
            _t(
              "Not implemented operator %s for kind of conditional formatting:  %s",
              rule.operator,
              rule.type
            )
          );
      }
      return false;
    },
  };
}
