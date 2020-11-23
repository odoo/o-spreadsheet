import { UIPlugin } from "../ui_plugin";
import {
  Command,
  Cell,
  CellIsRule,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  Style,
  Zone,
  ColorScaleMidPointThreshold,
} from "../../types/index";
import { _lt } from "../../translation";
import { clip } from "../../helpers/misc";
import { toXC, toZone, colorNumberString, recomputeZones, isInside } from "../../helpers/index";
import { UID } from "../../types/index";
import { Mode } from "../../model";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export class EvaluationConditionalFormatPlugin extends UIPlugin {
  static getters = ["getConditionalStyle"];
  static modes: Mode[] = ["normal", "readonly"];
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName.cellXC = Style
  private computedStyles: { [sheet: string]: { [cellXc: string]: Style } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        const activeSheet = cmd.sheetIdTo;
        this.computedStyles[activeSheet] = this.computedStyles[activeSheet] || {}; // ?
        this.isStale = true;
        break;

      case "AUTOFILL_CELL":
        const sheetId = this.getters.getActiveSheetId();
        const cfOrigin = this.getters.getRulesByCell(sheetId, toXC(cmd.originCol, cmd.originRow));
        for (const cf of cfOrigin) {
          this.adaptRules(sheetId, cf, [toXC(cmd.col, cmd.row)], []);
        }
        break;
      case "PASTE_CELL":
        if (!cmd.onlyValue) {
          this.pasteCf(cmd.originCol, cmd.originRow, cmd.col, cmd.row, cmd.sheetId, cmd.cut);
        }
        break;
      case "DUPLICATE_SHEET":
      case "CREATE_SHEET":
      case "DELETE_SHEET":
      case "ADD_CONDITIONAL_FORMAT":
      case "REMOVE_CONDITIONAL_FORMAT":
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
      case "ADD_COLUMNS":
      case "ADD_ROWS":
      case "EVALUATE_CELLS":
      case "UPDATE_CELL":
      case "UNDO":
      case "REDO":
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
  getConditionalStyle(xc: string): Style | undefined {
    const activeSheet = this.getters.getActiveSheetId();
    const styles = this.computedStyles[activeSheet];
    return styles && styles[xc];
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
    for (let cf of this.getters.getConditionalFormats(activeSheetId)) {
      try {
        switch (cf.rule.type) {
          case "ColorScaleRule":
            for (let range of cf.ranges) {
              this.applyColorScale(range, cf.rule);
            }
            break;
          default:
            for (let ref of cf.ranges) {
              const zone: Zone = toZone(ref);
              for (let row = zone.top; row <= zone.bottom; row++) {
                for (let col = zone.left; col <= zone.right; col++) {
                  const pr = this.rulePredicate[cf.rule.type];
                  let cell = this.getters.getCell(activeSheetId, col, row);
                  let xc = toXC(col, row);
                  if (pr && pr(cell, cf.rule)) {
                    // we must combine all the properties of all the CF rules applied to the given cell
                    this.computedStyles[activeSheetId][xc] = Object.assign(
                      this.computedStyles[activeSheetId][xc] || {},
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
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
    functionName: "min" | "max" | "none"
  ): null | number {
    switch (threshold.type) {
      case "value":
        if (functionName === "none") {
          return null;
        }
        return this.getters.evaluateFormula(`=${functionName}(${range})`);
      case "number":
        return Number(threshold.value);
      default:
        return null;
    }
  }

  private applyColorScale(range: string, rule: ColorScaleRule): void {
    const minValue: number | null = this.parsePoint(range, rule.minimum, "min");
    const midValue: number | null = rule.midpoint
      ? this.parsePoint(range, rule.midpoint, "none")
      : null;
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
        if (cell && !Number.isNaN(Number.parseFloat(cell.value))) {
          let value = clip(cell.value, minValue, maxValue);
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
          const xc = toXC(col, row);
          computedStyle[xc] = computedStyle[xc] || {};
          computedStyle[xc].fillColor = "#" + colorNumberString(color);
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
      switch (rule.operator) {
        case "BeginsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && cell.value.startsWith(rule.values[0]);
        case "EndsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && cell.value.endsWith(rule.values[0]);
        case "Between":
          return cell && cell.value >= rule.values[0] && cell.value <= rule.values[1];
        case "NotBetween":
          return !(cell && cell.value >= rule.values[0] && cell.value <= rule.values[1]);
        case "ContainsText":
          return cell && cell.value && cell.value.toString().indexOf(rule.values[0]) > -1;
        case "NotContains":
          return cell && cell.value && cell.value.toString().indexOf(rule.values[0]) == -1;
        case "GreaterThan":
          return cell && cell.value > rule.values[0];
        case "GreaterThanOrEqual":
          return cell && cell.value >= rule.values[0];
        case "LessThan":
          return cell && cell.value < rule.values[0];
        case "LessThanOrEqual":
          return cell && cell.value <= rule.values[0];
        case "NotEqual":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && cell.value != rule.values[0];
        case "Equal":
          if (!cell && rule.values[0] === "") {
            return true;
          }
          return cell && cell.value == rule.values[0];
        default:
          console.warn(
            _lt(
              `Not implemented operator ${rule.operator} for kind of conditional formatting:  ${rule.type}`
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
        ranges: newRange,
      },
      sheetId,
    });
  }

  private pasteCf(
    originCol: number,
    originRow: number,
    col: number,
    row: number,
    originSheet: UID,
    cut?: boolean
  ) {
    const xc = toXC(col, row);
    const activeSheetId = this.getters.getActiveSheetId();
    for (let rule of this.getters.getConditionalFormats(originSheet)) {
      for (let range of rule.ranges) {
        if (isInside(originCol, originRow, toZone(range))) {
          const cf = rule;
          const toRemoveRange: string[] = [];
          if (cut) {
            //remove from current rule
            toRemoveRange.push(toXC(originCol, originRow));
          }
          if (originSheet === activeSheetId) {
            this.adaptRules(originSheet, cf, [xc], toRemoveRange);
          } else {
            this.adaptRules(activeSheetId, cf, [xc], []);
            this.adaptRules(originSheet, cf, [], toRemoveRange);
          }
        }
      }
    }
  }
}
