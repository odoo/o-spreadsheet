import { compile } from "../../formulas/compiler";
import { isMultipleElementMatrix, toScalar } from "../../functions/helper_matrices";
import { percentile } from "../../helpers";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { colorNumberToHex, getColorScale } from "../../helpers/color";
import { clip, largeMax, largeMin, lazy } from "../../helpers/misc";
import { isInside } from "../../helpers/zones";
import { criterionEvaluatorRegistry } from "../../registries/criterion_registry";
import { CellValueType, EvaluatedCell, NumberCell } from "../../types/cells";
import { Command } from "../../types/commands";
import {
  CellIsRule,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  DataBarRule,
  IconSetRule,
  IconThreshold,
} from "../../types/conditional_formatting";
import { EvaluatedCriterion, EvaluatedDateCriterion } from "../../types/generic_criterion";
import { DEFAULT_LOCALE } from "../../types/locale";
import { CellPosition, DataBarFill, HeaderIndex, Lazy, Style, UID, Zone } from "../../types/misc";
import { BoundedRange } from "../../types/range";
import { CoreViewPlugin } from "../core_view_plugin";

type CFResult<T> = { [col: HeaderIndex]: Record<UID, T | undefined>[] };

type ComputedStyles = CFResult<Style>;
type ComputedIcons = CFResult<string>;
type ComputedDataBars = CFResult<DataBarFill>;

interface ComputedCF {
  styles: ComputedStyles;
  icons: ComputedIcons;
  dataBars: ComputedDataBars;
}

const SEPARATOR = "||||||";

function computeId(cfId: UID, sheetId: UID) {
  //TODOPRO Replace by a real UID on cf
  return cfId + SEPARATOR + sheetId;
}

export class EvaluationConditionalFormatPlugin extends CoreViewPlugin {
  static getters = [
    "getConditionalIcon",
    "getCellConditionalFormatStyle",
    "getConditionalDataBar",
  ] as const;

  /**
   * Lazy computed CF results per sheet, per CF id.
   * The lazy ensures computation only happens when the CF result is accessed.
   */
  private computedCFs: Record<UID, Record<UID, Lazy<ComputedCF>>> = {};

  /**
   * Set of CF ids that need their lazy to be recreated
   */
  private dirtyCFs: Set<UID> = new Set();

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "DELETE_SHEET":
        //TODOPRO Add a test
        delete this.computedCFs[cmd.sheetId];
        for (const cf of this.getters.getConditionalFormats(cmd.sheetId)) {
          this.getters
            .getEntityDependencyRegistry()
            .unregisterEntity(computeId(cf.id, cmd.sheetId));
        }
        break;
    }
  }

  handle(cmd: Command) {
    //TODOPRO Add a test for undo/redo. And check how it works
    switch (cmd.type) {
      case "START":
        this.getters
          .getEntityDependencyRegistry()
          .registerInvalidationCallback("conditionalFormat", (fullId) => this.invalidateCF(fullId));
        this.registerAllCFs();
        break;
      // CHANGE_CONDITIONAL_FORMAT_PRIORITY doesn't require computation, //TODOPRO Add a test
      // reordering is done in getters
      case "ADD_CONDITIONAL_FORMAT":
        const cf = this.getters
          .getConditionalFormats(cmd.sheetId)
          .find((cf) => cf.id === cmd.cf.id);
        if (!cf) {
          throw new Error("Should be defined at this point");
        }
        this.registerCFDependencies(cmd.sheetId, cf);
        this.invalidateCF(computeId(cf.id, cmd.sheetId));
        break;
      case "REMOVE_CONDITIONAL_FORMAT":
        this.getters.getEntityDependencyRegistry().unregisterEntity(computeId(cmd.id, cmd.sheetId));
        for (const sheetId in this.computedCFs) {
          delete this.computedCFs[sheetId][cmd.id];
        }
        break;
      case "DUPLICATE_SHEET":
        //TODOPRO Add a test
        for (const cf of this.getters.getConditionalFormats(cmd.sheetIdTo)) {
          this.registerCFDependencies(cmd.sheetIdTo, cf);
          this.invalidateCF(computeId(cf.id, cmd.sheetIdTo));
        }
        break;
      case "UNDO":
      case "REDO":
        //TODOPRO We should be more restrictive, like checking the command in undo/redo ?
        this.getters.getEntityDependencyRegistry().unregisterAllEntitiesOfType("conditionalFormat");
        this.registerAllCFs();
    }
  }

  finalize() {
    if (this.dirtyCFs.size > 0) {
      // Recreate lazy only for stale CFs
      for (const sheetId of this.getters.getSheetIds()) {
        if (!this.computedCFs[sheetId]) {
          this.computedCFs[sheetId] = {};
        }
        for (const cf of this.getters.getConditionalFormats(sheetId)) {
          if (this.dirtyCFs.has(cf.id)) {
            this.computedCFs[sheetId][cf.id] = lazy(() => this.computeCF(sheetId, cf));
          }
        }
      }
      this.dirtyCFs.clear();
    }
  }

  private registerAllCFs() {
    // Register dependencies for all existing CFs
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cf of this.getters.getConditionalFormats(sheetId)) {
        this.registerCFDependencies(sheetId, cf);
        this.invalidateCF(computeId(cf.id, sheetId));
      }
    }
  }

  private invalidateCF(fullId: UID): void {
    const cfId = fullId.split(SEPARATOR)[0];
    this.dirtyCFs.add(cfId);
  }

  private registerCFDependencies(sheetId: UID, cf: ConditionalFormat): void {
    const dependencies: BoundedRange[] = [];

    // Add the CF's ranges as dependencies
    for (const rangeXc of cf.ranges) {
      const range = this.getters.getRangeFromSheetXC(sheetId, rangeXc);
      if (!range.invalidXc && !range.invalidSheetName) {
        dependencies.push({ sheetId: range.sheetId, zone: range.zone });
      }
    }

    // For CellIsRule, also add dependencies from formula values
    // The formula is translated for each cell in the CF range, so we need to expand
    // the dependency zone accordingly. E.g., if the CF range is B1:B3 and the formula
    // references A1, then A1, A2, A3 are all dependencies.
    if (cf.rule.type === "CellIsRule") {
      // Calculate the maximum expansion needed based on all CF ranges
      let maxRowExpansion = 0;
      let maxColExpansion = 0;
      for (const rangeXc of cf.ranges) {
        const range = this.getters.getRangeFromSheetXC(sheetId, rangeXc);
        if (!range.invalidXc && !range.invalidSheetName) {
          const height = range.zone.bottom - range.zone.top;
          const width = range.zone.right - range.zone.left;
          maxRowExpansion = Math.max(maxRowExpansion, height);
          maxColExpansion = Math.max(maxColExpansion, width);
        }
      }

      for (const value of cf.rule.values) {
        if (value.startsWith("=")) {
          const compiledFormula = compile(value);
          for (const depXc of compiledFormula.dependencies) {
            const range = this.getters.getRangeFromSheetXC(sheetId, depXc);
            if (!range.invalidXc && !range.invalidSheetName) {
              // Expand the dependency zone to account for formula translation
              const expandedZone: Zone = {
                top: range.zone.top,
                left: range.zone.left,
                bottom: range.zone.bottom + maxRowExpansion,
                right: range.zone.right + maxColExpansion,
              };
              dependencies.push({ sheetId: range.sheetId, zone: expandedZone });
            }
          }
        }
      }
    }

    if (dependencies.length === 0) {
      return;
    }

    this.getters.getEntityDependencyRegistry().registerEntity({
      id: computeId(cf.id, sheetId),
      type: "conditionalFormat",
      dependencies,
    });
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellConditionalFormatStyle(position: CellPosition): Style | undefined {
    const { sheetId, col, row } = position;
    const sheetCFs = this.computedCFs[sheetId];
    if (!sheetCFs) {
      return undefined;
    }

    const styles: Style[] = [];
    // Apply in reverse order (last CF has priority)
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      const cfLazy = sheetCFs[cf.id];
      const style = cfLazy?.().styles[col]?.[row]?.[cf.id];
      if (style) {
        styles.push(style);
      }
    }
    return styles.length > 0 ? Object.assign({}, ...styles) : undefined;
  }

  getConditionalIcon({ sheetId, col, row }: CellPosition): string | undefined {
    const sheetCFs = this.computedCFs[sheetId];
    if (!sheetCFs) {
      return undefined;
    }

    // Return the first matching icon (highest priority CF)
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      const cfLazy = sheetCFs[cf.id];
      const icon = cfLazy?.().icons[col]?.[row]?.[cf.id];
      if (icon) {
        return icon;
      }
    }
    return undefined;
  }

  getConditionalDataBar({ sheetId, col, row }: CellPosition): DataBarFill | undefined {
    const sheetCFs = this.computedCFs[sheetId];
    if (!sheetCFs) {
      return undefined;
    }

    // Return the first matching data bar (highest priority CF)
    for (const cf of this.getters.getConditionalFormats(sheetId).reverse()) {
      const cfLazy = sheetCFs[cf.id];
      const dataBar = cfLazy?.().dataBars[col]?.[row]?.[cf.id];
      if (dataBar) {
        return dataBar;
      }
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Compute the result for a single conditional format.
   */
  private computeCF(sheetId: UID, cf: ConditionalFormat): ComputedCF {
    console.log(`I'm currently compute CF for ${this.getters.getSheetName(sheetId)} - ${cf.id}`);
    const computedStyle: ComputedStyles = {};
    const computedIcons: ComputedIcons = {};
    const computedDataBars: ComputedDataBars = {};

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
