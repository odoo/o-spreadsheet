import { colorNumberString, isInside, recomputeZones, toXC, toZone } from "../../helpers/index";
import { clip } from "../../helpers/misc";
import { _lt } from "../../translation";
import { Command } from "../../types/commands";
import { EvaluationConditionalFormatPluginGetters } from "../../types/getters";
import {
  Cell,
  CellIsRule,
  CellPosition,
  CellType,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  IconSetRule,
  IconThreshold,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { Mode } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export class EvaluationConditionalFormatPlugin
  extends UIPlugin
  implements EvaluationConditionalFormatPluginGetters
{
  static getters = ["getConditionalStyle", "getConditionalIcon"];
  static modes: Mode[] = ["normal", "readonly"];
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName[col][row] = Style
  private computedStyles: { [sheet: string]: { [col: number]: (Style | undefined)[] } } = {};
  private computedIcons: { [sheet: string]: { [col: number]: (string | undefined)[] } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        const activeSheet = cmd.sheetIdTo;
        this.computedStyles[activeSheet] = this.computedStyles[activeSheet] || {};
        this.computedIcons[activeSheet] = this.computedIcons[activeSheet] || {};
        this.isStale = true;
        break;

      case "AUTOFILL_CELL":
        const sheetId = this.getters.getActiveSheetId();
        const cfOrigin = this.getters.getRulesByCell(sheetId, cmd.originCol, cmd.originRow);
        for (const cf of cfOrigin) {
          this.adaptRules(sheetId, cf, [toXC(cmd.col, cmd.row)], []);
        }
        break;
      case "PASTE_CONDITIONAL_FORMAT":
        this.pasteCf(cmd.origin, cmd.target, cmd.operation);
        break;
      case "DUPLICATE_SHEET":
      case "CREATE_SHEET":
      case "DELETE_SHEET":
      case "ADD_CONDITIONAL_FORMAT":
      case "REMOVE_CONDITIONAL_FORMAT":
      case "REMOVE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
      case "EVALUATE_CELLS":
      case "UPDATE_CELL":
      case "UNDO":
      case "REDO":
      case "DELETE_CELL":
      case "INSERT_CELL":
        this.isStale = true;
        break;
    }
  }

  finalize() {
    if (this.isStale) {
      this.computeStyles();
      this.isStale = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the conditional style property for a given cell reference in the active sheet or
   * undefined if this cell doesn't have a conditional style set.
   */
  getConditionalStyle(col: number, row: number): Style | undefined {
    const activeSheet = this.getters.getActiveSheetId();
    const styles = this.computedStyles[activeSheet];
    return styles && styles[col]?.[row];
  }

  getConditionalIcon(col: number, row: number): string | undefined {
    const activeSheet = this.getters.getActiveSheetId();
    const icon = this.computedIcons[activeSheet];
    return icon && icon[col]?.[row];
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
  private computeStyles() {
    const activeSheetId = this.getters.getActiveSheetId();
    this.computedStyles[activeSheetId] = {};
    this.computedIcons[activeSheetId] = {};
    const computedStyle = this.computedStyles[activeSheetId];
    for (let cf of this.getters.getConditionalFormats(activeSheetId)) {
      try {
        switch (cf.rule.type) {
          case "ColorScaleRule":
            for (let range of cf.ranges) {
              this.applyColorScale(range, cf.rule);
            }
            break;
          case "IconSetRule":
            for (let range of cf.ranges) {
              this.applyIcon(range, cf.rule);
            }
            break;
          default:
            for (let ref of cf.ranges) {
              const zone: Zone = toZone(ref);
              for (let row = zone.top; row <= zone.bottom; row++) {
                for (let col = zone.left; col <= zone.right; col++) {
                  const pr = this.rulePredicate[cf.rule.type];
                  let cell = this.getters.getCell(activeSheetId, col, row);
                  if (pr && pr(cell, cf.rule)) {
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
      } catch (_) {
        // we don't care about the errors within the evaluation of a rule
      }
    }
  }

  private parsePoint(
    range: string,
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold | IconThreshold,
    functionName?: "min" | "max"
  ): null | number {
    switch (threshold.type) {
      case "value":
        return this.getters.evaluateFormula(`=${functionName}(${range})`);
      case "number":
        return Number(threshold.value);
      case "percentage":
        const min = this.getters.evaluateFormula(`=min(${range})`);
        const max = this.getters.evaluateFormula(`=max(${range})`);
        const delta = max - min;
        return min + (delta * Number(threshold.value)) / 100;
      case "percentile":
        return this.getters.evaluateFormula(
          `=PERCENTILE(${range},${Number(threshold.value) / 100})`
        );
      case "formula":
        const value = threshold.value && this.getters.evaluateFormula(threshold.value);
        return !(value instanceof Promise) ? value : null;
      default:
        return null;
    }
  }

  private applyIcon(range: string, rule: IconSetRule): void {
    const lowerInflectionPoint: number | null = this.parsePoint(range, rule.lowerInflectionPoint);
    const upperInflectionPoint: number | null = this.parsePoint(range, rule.upperInflectionPoint);
    if (
      lowerInflectionPoint === null ||
      upperInflectionPoint === null ||
      lowerInflectionPoint > upperInflectionPoint
    ) {
      return;
    }
    const zone: Zone = toZone(range);
    const activeSheetId = this.getters.getActiveSheetId();
    const computedIcons = this.computedIcons[activeSheetId];
    const iconSet: string[] = [rule.icons.upper, rule.icons.middle, rule.icons.lower];
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.getters.getCell(activeSheetId, col, row);
        let value;
        if (cell) {
          switch (cell.type) {
            case CellType.formula:
            case CellType.number:
              value = cell.value;
              break;
            case CellType.text:
            case CellType.empty:
            case CellType.invalidFormula:
              continue;
          }
        }
        const icon = this.computeIcon(
          value,
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
    value: number | undefined,
    upperInflectionPoint: number,
    upperOperator: string,
    lowerInflectionPoint: number,
    lowerOperator: string,
    icons: string[]
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }
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
  private applyColorScale(range: string, rule: ColorScaleRule): void {
    const minValue: number | null = this.parsePoint(range, rule.minimum, "min");
    const midValue: number | null = rule.midpoint ? this.parsePoint(range, rule.midpoint) : null;
    const maxValue: number | null = this.parsePoint(range, rule.maximum, "max");
    if (
      minValue === null ||
      maxValue === null ||
      minValue >= maxValue ||
      (midValue && (minValue >= midValue || midValue >= maxValue))
    ) {
      return;
    }
    const zone: Zone = toZone(range);
    const activeSheetId = this.getters.getActiveSheetId();
    const computedStyle = this.computedStyles[activeSheetId];
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
        const cell = this.getters.getCell(activeSheetId, col, row);
        let value;
        if (cell) {
          switch (cell.type) {
            case CellType.formula:
            case CellType.number:
            case CellType.text:
              value = cell.value;
              break;
            case CellType.empty:
            case CellType.invalidFormula:
              continue;
          }
          if (!Number.isNaN(Number.parseFloat(value))) {
            value = clip(value, minValue, maxValue);
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
            computedStyle[col][row]!.fillColor = "#" + colorNumberString(color);
          }
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
  private rulePredicate: { CellIsRule: (cell: Cell, rule: CellIsRule) => boolean } = {
    CellIsRule: (cell: Cell, rule: CellIsRule): boolean => {
      let value;
      if (cell) {
        switch (cell.type) {
          case CellType.formula:
          case CellType.number:
          case CellType.text:
            value = cell.value;
            break;
          case CellType.empty:
          case CellType.invalidFormula:
            value = "";
        }
      }

      switch (rule.operator) {
        case "IsEmpty":
          return !cell || value.toString().trim() === "";
        case "IsNotEmpty":
          return cell && value.toString().trim() !== "";
        case "BeginsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value.startsWith(rule.values[0]);
        case "EndsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value && value.toString().endsWith(rule.values[0]);
        case "Between":
          return cell && value >= rule.values[0] && value <= rule.values[1];
        case "NotBetween":
          return !(cell && value >= rule.values[0] && value <= rule.values[1]);
        case "ContainsText":
          return cell && value && value.toString().indexOf(rule.values[0]) > -1;
        case "NotContains":
          return !cell || !value || value.toString().indexOf(rule.values[0]) == -1;
        case "GreaterThan":
          return cell && value > rule.values[0];
        case "GreaterThanOrEqual":
          return cell && value >= rule.values[0];
        case "LessThan":
          return cell && value < rule.values[0];
        case "LessThanOrEqual":
          return cell && value <= rule.values[0];
        case "NotEqual":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value !== rule.values[0];
        case "Equal":
          if (!cell && rule.values[0] === "") {
            return true;
          }
          return cell && value.toString() === rule.values[0];
        default:
          console.warn(
            _lt(
              "Not implemented operator %s for kind of conditional formatting:  %s",
              rule.operator,
              rule.type
            )
          );
      }
      return false;
    },
  };

  /**
   * Add or remove cells to a given conditional formatting rule.
   */
  private adaptRules(sheetId: UID, cf: ConditionalFormat, toAdd: string[], toRemove: string[]) {
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }
    const rules = this.getters.getConditionalFormats(sheetId);
    const replaceIndex = rules.findIndex((c) => c.id === cf.id);
    let currentRanges: string[] = [];
    if (replaceIndex > -1) {
      currentRanges = rules[replaceIndex].ranges;
    }

    currentRanges = currentRanges.concat(toAdd);
    const newRange: string[] = recomputeZones(currentRanges, toRemove);
    this.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: cf.id,
        rule: cf.rule,
        stopIfTrue: cf.stopIfTrue,
      },
      target: newRange.map(toZone),
      sheetId,
    });
  }

  private pasteCf(origin: CellPosition, target: CellPosition, operation: "CUT" | "COPY") {
    const xc = toXC(target.col, target.row);
    for (let rule of this.getters.getConditionalFormats(origin.sheetId)) {
      for (let range of rule.ranges) {
        if (isInside(origin.col, origin.row, toZone(range))) {
          const cf = rule;
          const toRemoveRange: string[] = [];
          if (operation === "CUT") {
            //remove from current rule
            toRemoveRange.push(toXC(origin.col, origin.row));
          }
          if (origin.sheetId === target.sheetId) {
            this.adaptRules(origin.sheetId, cf, [xc], toRemoveRange);
          } else {
            this.adaptRules(target.sheetId, cf, [xc], []);
            this.adaptRules(origin.sheetId, cf, [], toRemoveRange);
          }
        }
      }
    }
  }
}
