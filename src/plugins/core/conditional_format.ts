import { compile } from "../../formulas/index";
import { isInside, recomputeZones, toUnboundedZone } from "../../helpers/index";
import {
  AddConditionalFormatCommand,
  ApplyRangeChange,
  CancelledReason,
  CellIsRule,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  Command,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatInternal,
  ConditionalFormattingOperatorValues,
  CoreCommand,
  ExcelWorkbookData,
  IconSetRule,
  IconThreshold,
  RangeData,
  UID,
  UnboundedZone,
  Validation,
  WorkbookData,
  Zone,
} from "../../types";
import { CorePlugin } from "../core_plugin";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

function stringToNumber(value: string | undefined): number {
  return value === "" ? NaN : Number(value);
}

type ThresholdValidation = (
  threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
  thresholdName: string
) => CommandResult;

type InflectionPointValidation = (threshold: IconThreshold, thresholdName: string) => CommandResult;

interface ConditionalFormatState {
  readonly cfRules: { [sheet: string]: ConditionalFormatInternal[] };
}

export class ConditionalFormatPlugin
  extends CorePlugin<ConditionalFormatState>
  implements ConditionalFormatState
{
  static getters = [
    "getConditionalFormats",
    "getRulesSelection",
    "getRulesByCell",
    "getAdaptedCfRanges",
  ] as const;

  readonly cfRules: { [sheet: string]: ConditionalFormatInternal[] } = {};

  loopThroughRangesOfSheet(sheetId: UID, applyChange: ApplyRangeChange) {
    for (const rule of this.cfRules[sheetId]) {
      if (rule.rule.type === "DataBarRule" && rule.rule.rangeValues) {
        const change = applyChange(rule.rule.rangeValues);
        switch (change.changeType) {
          case "REMOVE":
            this.history.update(
              "cfRules",
              sheetId,
              this.cfRules[sheetId].indexOf(rule),
              "rule",
              //@ts-expect-error
              "rangeValues",
              undefined
            );
            break;
          case "RESIZE":
          case "MOVE":
          case "CHANGE":
            this.history.update(
              "cfRules",
              sheetId,
              this.cfRules[sheetId].indexOf(rule),
              "rule",
              //@ts-expect-error
              "rangeValues",
              change.range
            );
            break;
        }
      }
      for (const range of rule.ranges) {
        const change = applyChange(range);
        switch (change.changeType) {
          case "REMOVE":
            let copy = rule.ranges.slice();
            copy.splice(rule.ranges.indexOf(range), 1);
            if (copy.length >= 1) {
              this.history.update(
                "cfRules",
                sheetId,
                this.cfRules[sheetId].indexOf(rule),
                "ranges",
                copy
              );
            } else {
              this.removeConditionalFormatting(rule.id, sheetId);
            }

            break;
          case "RESIZE":
          case "MOVE":
          case "CHANGE":
            this.history.update(
              "cfRules",
              sheetId,
              this.cfRules[sheetId].indexOf(rule),
              "ranges",
              rule.ranges.indexOf(range),
              change.range
            );
            break;
        }
      }
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    if (sheetId) {
      this.loopThroughRangesOfSheet(sheetId, applyChange);
    } else {
      for (const sheetId of Object.keys(this.cfRules)) {
        this.loopThroughRangesOfSheet(sheetId, applyChange);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "ADD_CONDITIONAL_FORMAT":
        return this.checkValidations(cmd, this.checkCFRule, this.checkEmptyRange);
      case "CHANGE_CONDITIONAL_FORMAT_PRIORITY":
        return this.checkValidPriorityChange(cmd.cfId, cmd.delta, cmd.sheetId);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.cfRules[cmd.sheetId] = [];
        break;
      case "DUPLICATE_SHEET":
        this.history.update("cfRules", cmd.sheetIdTo, []);
        for (const cf of this.getConditionalFormats(cmd.sheetId)) {
          this.addConditionalFormatting(cf, cmd.sheetIdTo);
        }
        break;
      case "DELETE_SHEET":
        const cfRules = Object.assign({}, this.cfRules);
        delete cfRules[cmd.sheetId];
        this.history.update("cfRules", cfRules);
        break;
      case "ADD_CONDITIONAL_FORMAT":
        const cf = {
          ...cmd.cf,
          ranges: cmd.ranges.map((rangeData) =>
            this.getters.getRangeString(this.getters.getRangeFromRangeData(rangeData), cmd.sheetId)
          ),
        };
        this.addConditionalFormatting(cf, cmd.sheetId);
        break;
      case "REMOVE_CONDITIONAL_FORMAT":
        this.removeConditionalFormatting(cmd.id, cmd.sheetId);
        break;
      case "CHANGE_CONDITIONAL_FORMAT_PRIORITY":
        this.changeCFPriority(cmd.cfId, cmd.delta, cmd.sheetId);
        break;
    }
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.cfRules[sheet.id] = sheet.conditionalFormats.map((rule) =>
        this.mapToConditionalFormatInternal(sheet.id, rule)
      );
    }
  }

  export(data: Partial<WorkbookData>) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        if (this.cfRules[sheet.id]) {
          sheet.conditionalFormats = this.cfRules[sheet.id].map((rule) =>
            this.mapToConditionalFormat(sheet.id, rule)
          );
        }
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        if (this.cfRules[sheet.id]) {
          sheet.conditionalFormats = this.cfRules[sheet.id].map((rule) =>
            this.mapToConditionalFormat(sheet.id, rule, { useBoundedReference: true })
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns all the conditional format rules defined for the current sheet to display the user
   */
  getConditionalFormats(sheetId: UID): ConditionalFormat[] {
    return this.cfRules[sheetId]?.map((cf) => this.mapToConditionalFormat(sheetId, cf)) || [];
  }

  getRulesSelection(sheetId: UID, selection: Zone[]): UID[] {
    const ruleIds: Set<UID> = new Set();
    selection.forEach((zone) => {
      const zoneRuleId = this.getRulesByZone(sheetId, zone);
      zoneRuleId.forEach((ruleId) => {
        ruleIds.add(ruleId);
      });
    });
    return Array.from(ruleIds);
  }

  getRulesByZone(sheetId: UID, zone: Zone): Set<UID> {
    const ruleIds: Set<UID> = new Set();
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cellRules = this.getRulesByCell(sheetId, col, row);
        cellRules.forEach((rule) => {
          ruleIds.add(rule.id);
        });
      }
    }
    return ruleIds;
  }

  getRulesByCell(sheetId: UID, cellCol: number, cellRow: number): Set<ConditionalFormat> {
    const rules: ConditionalFormatInternal[] = [];
    for (let cf of this.cfRules[sheetId]) {
      for (let range of cf.ranges) {
        if (isInside(cellCol, cellRow, range.zone)) {
          rules.push(cf);
        }
      }
    }

    return new Set<ConditionalFormat>(
      rules.map((rule) => {
        return this.mapToConditionalFormat(sheetId, rule);
      })
    );
  }

  /**
   * Add or remove cells to a given conditional formatting rule and return the adapted CF's XCs.
   */
  getAdaptedCfRanges(
    sheetId: UID,
    cf: ConditionalFormat,
    toAdd: Zone[],
    toRemove: Zone[]
  ): RangeData[] | undefined {
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }
    const rules = this.getters.getConditionalFormats(sheetId);
    const replaceIndex = rules.findIndex((c) => c.id === cf.id);
    let currentRanges: UnboundedZone[] = [];
    if (replaceIndex > -1) {
      currentRanges = rules[replaceIndex].ranges.map(toUnboundedZone);
    }

    // Remove the zones first in case the same position is in toAdd and toRemove
    const withRemovedZones = recomputeZones(currentRanges, toRemove);
    return recomputeZones([...toAdd, ...withRemovedZones], []).map((zone) =>
      this.getters.getRangeDataFromZone(sheetId, zone)
    );
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private mapToConditionalFormat(
    sheetId: UID,
    cf: ConditionalFormatInternal,
    { useBoundedReference } = { useBoundedReference: false }
  ): ConditionalFormat {
    const ranges = cf.ranges.map((range) => {
      return this.getters.getRangeString(range, sheetId, { useBoundedReference });
    });
    if (cf.rule.type !== "DataBarRule") {
      return {
        ...cf,
        rule: { ...cf.rule },
        ranges,
      };
    }
    return {
      ...cf,
      rule: {
        ...cf.rule,
        rangeValues:
          cf.rule.rangeValues &&
          this.getters.getRangeString(cf.rule.rangeValues!, sheetId, {
            useBoundedReference,
          }),
      },
      ranges,
    };
  }

  private mapToConditionalFormatInternal(
    sheet: UID,
    cf: ConditionalFormat
  ): ConditionalFormatInternal {
    const ranges = cf.ranges.map((range) => {
      return this.getters.getRangeFromSheetXC(sheet, range);
    });
    if (cf.rule.type !== "DataBarRule") {
      return {
        ...cf,
        rule: { ...cf.rule },
        ranges,
      };
    }
    return {
      ...cf,
      rule: {
        ...cf.rule,
        rangeValues: cf.rule.rangeValues
          ? this.getters.getRangeFromSheetXC(sheet, cf.rule.rangeValues)
          : undefined,
      },
      ranges,
    };
  }

  /**
   * Add or replace a conditional format rule
   */
  private addConditionalFormatting(cf: ConditionalFormat, sheet: string) {
    const currentCF = this.cfRules[sheet].slice();
    const replaceIndex = currentCF.findIndex((c) => c.id === cf.id);
    const newCF = this.mapToConditionalFormatInternal(sheet, cf);
    if (replaceIndex > -1) {
      currentCF.splice(replaceIndex, 1, newCF);
    } else {
      currentCF.push(newCF);
    }
    this.history.update("cfRules", sheet, currentCF);
  }

  private checkValidPriorityChange(cfId: string, delta: number, sheetId: string) {
    if (!this.cfRules[sheetId]) return CommandResult.InvalidSheetId;
    const ruleIndex = this.cfRules[sheetId].findIndex((cf) => cf.id === cfId);
    if (ruleIndex === -1) return CommandResult.InvalidConditionalFormatId;

    const cfIndex2 = ruleIndex - delta;
    if (cfIndex2 < 0 || cfIndex2 >= this.cfRules[sheetId].length) {
      return CommandResult.InvalidConditionalFormatId;
    }

    return CommandResult.Success;
  }

  private checkEmptyRange(cmd: AddConditionalFormatCommand) {
    return cmd.ranges.length ? CommandResult.Success : CommandResult.EmptyRange;
  }

  private checkCFRule(cmd: AddConditionalFormatCommand) {
    const rule = cmd.cf.rule;
    switch (rule.type) {
      case "CellIsRule":
        return this.checkValidations(
          rule,
          this.checkOperatorArgsNumber(2, ["Between", "NotBetween"]),
          this.checkOperatorArgsNumber(1, [
            "BeginsWith",
            "ContainsText",
            "EndsWith",
            "GreaterThan",
            "GreaterThanOrEqual",
            "LessThan",
            "LessThanOrEqual",
            "NotContains",
            "Equal",
            "NotEqual",
          ]),
          this.checkOperatorArgsNumber(0, ["IsEmpty", "IsNotEmpty"]),
          this.checkCFValues
        );
      case "ColorScaleRule": {
        return this.checkValidations(
          rule,
          this.chainValidations(this.checkThresholds(this.checkFormulaCompilation)),
          this.chainValidations(
            this.checkThresholds(this.checkNaN),
            this.batchValidations(
              this.checkMinBiggerThanMax,
              this.checkMinBiggerThanMid,
              this.checkMidBiggerThanMax
              // Those three validations can be factorized further
            )
          )
        );
      }
      case "IconSetRule": {
        return this.checkValidations(
          rule,
          this.chainValidations(
            this.checkInflectionPoints(this.checkNaN),
            this.checkLowerBiggerThanUpper
          ),
          this.chainValidations(this.checkInflectionPoints(this.checkFormulaCompilation))
        );
      }
    }
    return CommandResult.Success;
  }

  private checkOperatorArgsNumber(
    expectedNumber: number,
    operators: ConditionalFormattingOperatorValues[]
  ) {
    if (expectedNumber > 2) {
      throw new Error(
        "Checking more than 2 arguments is currently not supported. Add the appropriate CommandResult if you want to."
      );
    }
    return (rule: CellIsRule) => {
      if (operators.includes(rule.operator)) {
        const errors: CancelledReason[] = [];
        const isEmpty = (value) => value === undefined || value === "";
        if (expectedNumber >= 1 && isEmpty(rule.values[0])) {
          errors.push(CommandResult.FirstArgMissing);
        }
        if (expectedNumber >= 2 && isEmpty(rule.values[1])) {
          errors.push(CommandResult.SecondArgMissing);
        }
        return errors.length ? errors : CommandResult.Success;
      }
      return CommandResult.Success;
    };
  }

  private checkNaN(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold | IconThreshold,
    thresholdName: string
  ) {
    if (
      ["number", "percentage", "percentile"].includes(threshold.type) &&
      (threshold.value === "" || isNaN(threshold.value as any))
    ) {
      switch (thresholdName) {
        case "min":
          return CommandResult.MinNaN;
        case "max":
          return CommandResult.MaxNaN;
        case "mid":
          return CommandResult.MidNaN;
        case "upperInflectionPoint":
          return CommandResult.ValueUpperInflectionNaN;
        case "lowerInflectionPoint":
          return CommandResult.ValueLowerInflectionNaN;
      }
    }
    return CommandResult.Success;
  }

  private checkFormulaCompilation(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold | IconThreshold,
    thresholdName: string
  ) {
    if (threshold.type !== "formula") return CommandResult.Success;
    const compiledFormula = compile(threshold.value || "");
    if (compiledFormula.isBadExpression) {
      switch (thresholdName) {
        case "min":
          return CommandResult.MinInvalidFormula;
        case "max":
          return CommandResult.MaxInvalidFormula;
        case "mid":
          return CommandResult.MidInvalidFormula;
        case "upperInflectionPoint":
          return CommandResult.ValueUpperInvalidFormula;
        case "lowerInflectionPoint":
          return CommandResult.ValueLowerInvalidFormula;
      }
    }
    return CommandResult.Success;
  }

  private checkThresholds(check: ThresholdValidation): Validation<ColorScaleRule> {
    return this.batchValidations(
      (rule) => check(rule.minimum, "min"),
      (rule) => check(rule.maximum, "max"),
      (rule) => (rule.midpoint ? check(rule.midpoint, "mid") : CommandResult.Success)
    );
  }

  private checkInflectionPoints(check: InflectionPointValidation): Validation<IconSetRule> {
    return this.batchValidations(
      (rule) => check(rule.lowerInflectionPoint, "lowerInflectionPoint"),
      (rule) => check(rule.upperInflectionPoint, "upperInflectionPoint")
    );
  }

  private checkLowerBiggerThanUpper(rule: IconSetRule): CommandResult {
    const minValue = rule.lowerInflectionPoint.value;
    const maxValue = rule.upperInflectionPoint.value;
    if (
      ["number", "percentage", "percentile"].includes(rule.lowerInflectionPoint.type) &&
      rule.lowerInflectionPoint.type === rule.upperInflectionPoint.type &&
      Number(minValue) > Number(maxValue)
    ) {
      return CommandResult.LowerBiggerThanUpper;
    }
    return CommandResult.Success;
  }

  private checkMinBiggerThanMax(rule: ColorScaleRule): CommandResult {
    const minValue = rule.minimum.value;
    const maxValue = rule.maximum.value;
    if (
      ["number", "percentage", "percentile"].includes(rule.minimum.type) &&
      rule.minimum.type === rule.maximum.type &&
      stringToNumber(minValue) >= stringToNumber(maxValue)
    ) {
      return CommandResult.MinBiggerThanMax;
    }
    return CommandResult.Success;
  }

  private checkMidBiggerThanMax(rule: ColorScaleRule): CommandResult {
    const midValue = rule.midpoint?.value;
    const maxValue = rule.maximum.value;
    if (
      rule.midpoint &&
      ["number", "percentage", "percentile"].includes(rule.midpoint.type) &&
      rule.midpoint.type === rule.maximum.type &&
      stringToNumber(midValue) >= stringToNumber(maxValue)
    ) {
      return CommandResult.MidBiggerThanMax;
    }
    return CommandResult.Success;
  }

  private checkMinBiggerThanMid(rule: ColorScaleRule): CommandResult {
    const minValue = rule.minimum.value;
    const midValue = rule.midpoint?.value;
    if (
      rule.midpoint &&
      ["number", "percentage", "percentile"].includes(rule.midpoint.type) &&
      rule.minimum.type === rule.midpoint.type &&
      stringToNumber(minValue) >= stringToNumber(midValue)
    ) {
      return CommandResult.MinBiggerThanMid;
    }
    return CommandResult.Success;
  }

  private checkCFValues(rule: CellIsRule) {
    for (const value of rule.values) {
      if (!value.startsWith("=")) continue;
      const compiledFormula = compile(value || "");
      if (compiledFormula.isBadExpression) {
        return CommandResult.ValueCellIsInvalidFormula;
      }
    }
    return CommandResult.Success;
  }

  private removeConditionalFormatting(id: string, sheet: string) {
    const cfIndex = this.cfRules[sheet].findIndex((s) => s.id === id);
    if (cfIndex !== -1) {
      const currentCF = this.cfRules[sheet].slice();
      currentCF.splice(cfIndex, 1);
      this.history.update("cfRules", sheet, currentCF);
    }
  }

  private changeCFPriority(cfId: UID, delta: number, sheetId: UID) {
    const currentIndex = this.cfRules[sheetId].findIndex((s) => s.id === cfId);
    const cf = this.cfRules[sheetId][currentIndex];
    const targetIndex = currentIndex - delta; // priority goes up when index goes down

    const cfRules = [...this.cfRules[sheetId]];
    cfRules.splice(currentIndex, 1);
    cfRules.splice(targetIndex, 0, cf);
    this.history.update("cfRules", sheetId, cfRules);
  }
}
