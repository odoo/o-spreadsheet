import { LINK_COLOR } from "../../constants";
import { parseLiteral } from "../../helpers/cells";
import { colorNumberString, isInside, percentile, recomputeZones, toXC } from "../../helpers/index";
import { clip } from "../../helpers/misc";
import { _lt } from "../../translation";
import {
  CellIsRule,
  CellPosition,
  CellValueType,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  Command,
  ConditionalFormat,
  EvaluatedCell,
  HeaderIndex,
  IconSetRule,
  IconThreshold,
  invalidateCFEvaluationCommands,
  NumberCell,
  Position,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export class EvaluationConditionalFormatPlugin extends UIPlugin {
  static getters = ["getConditionalIcon", "getCellComputedStyle"] as const;
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName[col][row] = Style
  private computedStyles: { [sheet: string]: { [col: HeaderIndex]: (Style | undefined)[] } } = {};
  private computedIcons: { [sheet: string]: { [col: HeaderIndex]: (string | undefined)[] } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (
      invalidateCFEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && "content" in cmd)
    ) {
      this.isStale = true;
    }

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
        this.pasteCf(cmd.originPosition, cmd.targetPosition, cmd.operation);
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

  getCellComputedStyle(position: CellPosition): Style {
    // TODO move this getter out of CF: it also depends on filters and link
    const { sheetId, col, row } = position;
    const cell = this.getters.getCell(position);
    const styles = this.computedStyles[sheetId];
    const cfStyle = styles && styles[col]?.[row];
    const computedStyle = {
      ...cell?.style,
      ...cfStyle,
    };
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (evaluatedCell.link && !computedStyle.textColor) {
      computedStyle.textColor = LINK_COLOR;
    }

    if (this.getters.isFilterHeader(position)) {
      computedStyle.bold = true;
    }
    return computedStyle;
  }

  getConditionalIcon({ col, row }: Position): string | undefined {
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
    const sheetId = this.getters.getActiveSheetId();
    this.computedStyles[sheetId] = {};
    this.computedIcons[sheetId] = {};
    const computedStyle = this.computedStyles[sheetId];
    for (let cf of this.getters.getConditionalFormats(sheetId).reverse()) {
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
              const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, ref).zone;
              for (let row = zone.top; row <= zone.bottom; row++) {
                for (let col = zone.left; col <= zone.right; col++) {
                  const pr: (cell: EvaluatedCell, rule: CellIsRule) => boolean =
                    this.rulePredicate[cf.rule.type];
                  let cell = this.getters.getEvaluatedCell({ sheetId, col, row });
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
    const sheetId = this.getters.getActiveSheetId();
    const rangeValues = this.getters
      .getEvaluatedCellsInZone(sheetId, this.getters.getRangeFromSheetXC(sheetId, range).zone)
      .filter((cell): cell is NumberCell => cell.type === CellValueType.number)
      .map((cell) => cell.value);
    switch (threshold.type) {
      case "value":
        const result = functionName === "max" ? Math.max(...rangeValues) : Math.min(...rangeValues);
        return result;
      case "number":
        return Number(threshold.value);
      case "percentage":
        const min = Math.min(...rangeValues);
        const max = Math.max(...rangeValues);
        const delta = max - min;
        return min + (delta * Number(threshold.value)) / 100;
      case "percentile":
        return percentile(rangeValues, Number(threshold.value) / 100, true);
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
    const sheetId = this.getters.getActiveSheetId();
    const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, range).zone;
    const computedIcons = this.computedIcons[sheetId];
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
    const sheetId = this.getters.getActiveSheetId();
    const zone: Zone = this.getters.getRangeFromSheetXC(sheetId, range).zone;
    const computedStyle = this.computedStyles[sheetId];
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
    CellIsRule: (cell: EvaluatedCell, rule: CellIsRule) => boolean;
  } = {
    CellIsRule: (cell: EvaluatedCell, rule: CellIsRule): boolean => {
      if (cell.type === CellValueType.error) {
        return false;
      }
      const values = rule.values.map(parseLiteral);
      switch (rule.operator) {
        case "IsEmpty":
          return cell.value.toString().trim() === "";
        case "IsNotEmpty":
          return cell.value.toString().trim() !== "";
        case "BeginsWith":
          if (values[0] === "") {
            return false;
          }
          return cell.value.toString().startsWith(values[0].toString());
        case "EndsWith":
          if (values[0] === "") {
            return false;
          }
          return cell.value.toString().endsWith(values[0].toString());
        case "Between":
          return cell.value >= values[0] && cell.value <= values[1];
        case "NotBetween":
          return !(cell.value >= values[0] && cell.value <= values[1]);
        case "ContainsText":
          return cell.value.toString().indexOf(values[0].toString()) > -1;
        case "NotContains":
          return !cell.value || cell.value.toString().indexOf(values[0].toString()) == -1;
        case "GreaterThan":
          return cell.value > values[0];
        case "GreaterThanOrEqual":
          return cell.value >= values[0];
        case "LessThan":
          return cell.value < values[0];
        case "LessThanOrEqual":
          return cell.value <= values[0];
        case "NotEqual":
          if (values[0] === "") {
            return false;
          }
          return cell.value !== values[0];
        case "Equal":
          if (values[0] === "") {
            return true;
          }
          return cell.value === values[0];
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
    const newRangesXC: string[] = recomputeZones(currentRanges, toRemove);
    this.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: cf.id,
        rule: cf.rule,
        stopIfTrue: cf.stopIfTrue,
      },
      ranges: newRangesXC.map((xc) => this.getters.getRangeDataFromXc(sheetId, xc)),
      sheetId,
    });
  }

  private pasteCf(origin: CellPosition, target: CellPosition, operation: "CUT" | "COPY") {
    const xc = toXC(target.col, target.row);
    for (let rule of this.getters.getConditionalFormats(origin.sheetId)) {
      for (let range of rule.ranges) {
        if (
          isInside(
            origin.col,
            origin.row,
            this.getters.getRangeFromSheetXC(origin.sheetId, range).zone
          )
        ) {
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
