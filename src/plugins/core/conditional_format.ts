import { compile, normalize } from "../../formulas/index";
import { isInside, zoneToXc } from "../../helpers/index";
import {
  ApplyRangeChange,
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
  SingleColorRules,
  UID,
  Validation,
  WorkbookData,
  Zone,
} from "../../types";
import { CorePlugin } from "../core_plugin";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

type ThresholdValidation = (
  threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
  thresholdName: string
) => CommandResult;

interface ConditionalFormatState {
  readonly cfRules: { [sheet: string]: ConditionalFormatInternal[] };
}

export class ConditionalFormatPlugin
  extends CorePlugin<ConditionalFormatState>
  implements ConditionalFormatState {
  static getters = ["getConditionalFormats", "getRulesSelection", "getRulesByCell"];

  readonly cfRules: { [sheet: string]: ConditionalFormatInternal[] } = {};

  loopThroughRangesOfSheet(sheetId: UID, applyChange: ApplyRangeChange) {
    for (const rule of this.cfRules[sheetId]) {
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

  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "ADD_CONDITIONAL_FORMAT") {
      return this.checkCFRule(cmd.cf.rule);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.cfRules[cmd.sheetId] = [];
        break;
      case "DUPLICATE_SHEET":
        this.history.update("cfRules", cmd.sheetIdTo, this.cfRules[cmd.sheetId].slice());
        break;
      case "DELETE_SHEET":
        const cfRules = Object.assign({}, this.cfRules);
        delete cfRules[cmd.sheetId];
        this.history.update("cfRules", cfRules);
        break;
      case "ADD_CONDITIONAL_FORMAT":
        const cf = {
          ...cmd.cf,
          ranges: cmd.target.map(zoneToXc),
        };
        this.addConditionalFormatting(cf, cmd.sheetId);
        break;
      case "REMOVE_CONDITIONAL_FORMAT":
        this.removeConditionalFormatting(cmd.id, cmd.sheetId);
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

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns all the conditional format rules defined for the current sheet to display the user
   */
  getConditionalFormats(sheetId: UID): ConditionalFormat[] {
    return this.cfRules[sheetId].map((cf) => this.mapToConditionalFormat(sheetId, cf)) || [];
  }

  getRulesSelection(sheetId: UID, selection: [Zone]): string[] {
    const ruleIds: Set<string> = new Set();
    selection.forEach((zone) => {
      const zoneRuleId = this.getRulesByZone(sheetId, zone);
      zoneRuleId.forEach((ruleId) => {
        ruleIds.add(ruleId);
      });
    });
    return Array.from(ruleIds);
  }

  getRulesByZone(sheetId: UID, zone: Zone): Set<string> {
    const ruleIds: Set<string> = new Set();
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

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private mapToConditionalFormat(sheetId: UID, cf: ConditionalFormatInternal): ConditionalFormat {
    return {
      ...cf,
      ranges: cf.ranges.map((range) => {
        return this.getters.getRangeString(range, sheetId);
      }),
    };
  }

  private mapToConditionalFormatInternal(
    sheet: UID,
    cf: ConditionalFormat
  ): ConditionalFormatInternal {
    const conditionalFormat = {
      ...cf,
      ranges: cf.ranges.map((range) => {
        return this.getters.getRangeFromSheetXC(sheet, range);
      }),
    };
    return conditionalFormat;
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

  private checkCFRule(rule: ColorScaleRule | SingleColorRules): CommandResult {
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
          ])
        );
      case "ColorScaleRule": {
        return this.checkValidations(
          rule,
          this.checkThresholds(this.checkNaN),
          this.checkThresholds(this.checkFormulaCompilation),
          this.checkThresholds(this.checkAsyncFormula),
          this.checkMinBiggerThanMax,
          this.checkMinBiggerThanMid,
          this.checkMidBiggerThanMax
          // ☝️ Those three validations can be factorized further
        );
      }
    }
    return CommandResult.Success;
  }

  private checkOperatorArgsNumber(
    expectedNumber: number,
    operators: ConditionalFormattingOperatorValues[]
  ) {
    return (rule: CellIsRule) => {
      if (operators.includes(rule.operator)) {
        for (let i = 0; i < expectedNumber; i++) {
          if (rule.values[i] === undefined || rule.values[i] === "") {
            return CommandResult.InvalidNumberOfArgs;
          }
        }
      }
      return CommandResult.Success;
    };
  }

  private checkNaN(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
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
      }
    }
    return CommandResult.Success;
  }

  private checkFormulaCompilation(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
    thresholdName: string
  ) {
    if (threshold.type !== "formula") return CommandResult.Success;
    try {
      compile(normalize(threshold.value || ""));
    } catch (error) {
      switch (thresholdName) {
        case "min":
          return CommandResult.MinInvalidFormula;
        case "max":
          return CommandResult.MaxInvalidFormula;
        case "mid":
          return CommandResult.MidInvalidFormula;
      }
    }
    return CommandResult.Success;
  }

  private checkAsyncFormula(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
    thresholdName: string
  ): CommandResult {
    if (threshold.type !== "formula") return CommandResult.Success;
    const compiledFormula = compile(normalize(threshold.value || ""));
    if (compiledFormula.async) {
      switch (thresholdName) {
        case "min":
          return CommandResult.MinAsyncFormulaNotSupported;
        case "max":
          return CommandResult.MaxAsyncFormulaNotSupported;
        case "mid":
          return CommandResult.MidAsyncFormulaNotSupported;
      }
    }
    return CommandResult.Success;
  }

  private checkThresholds(check: ThresholdValidation): Validation<ColorScaleRule> {
    return this.combineValidations(
      (rule) => check(rule.minimum, "min"),
      (rule) => check(rule.maximum, "max"),
      (rule) => (rule.midpoint ? check(rule.midpoint, "mid") : CommandResult.Success)
    );
  }

  private checkMinBiggerThanMax(rule: ColorScaleRule): CommandResult {
    const minValue = rule.minimum.value;
    const maxValue = rule.maximum.value;
    if (
      ["number", "percentage", "percentile"].includes(rule.minimum.type) &&
      rule.minimum.type === rule.maximum.type &&
      Number(minValue) >= Number(maxValue)
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
      Number(midValue) >= Number(maxValue)
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
      Number(minValue) >= Number(midValue)
    ) {
      return CommandResult.MinBiggerThanMid;
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
}
