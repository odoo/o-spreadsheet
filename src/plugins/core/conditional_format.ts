import { compile, normalize } from "../../formulas/index";
import {
  toZone,
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../../helpers/index";
import {
  CancelledReason,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  Command,
  CommandResult,
  ConditionalFormat,
  CoreCommand,
  SingleColorRules,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

interface ConditionalFormatState {
  readonly cfRules: { [sheet: string]: ConditionalFormat[] };
}
export class ConditionalFormatPlugin
  extends CorePlugin<ConditionalFormatState>
  implements ConditionalFormatState {
  static getters = ["getConditionalFormats", "getRulesSelection", "getRulesByCell"];

  readonly cfRules: { [sheet: string]: ConditionalFormat[] } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "ADD_CONDITIONAL_FORMAT") {
      const error = this.checkCFRule(cmd.cf.rule);
      return error
        ? { status: "CANCELLED", reason: error }
        : {
            status: "SUCCESS",
          };
    }
    return {
      status: "SUCCESS",
    };
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.cfRules[cmd.sheetId] = [];
        break;
      case "DUPLICATE_SHEET":
        this.history.update("cfRules", cmd.sheetIdTo, this.cfRules[cmd.sheetIdFrom].slice());
        break;
      case "DELETE_SHEET":
        const cfRules = Object.assign({}, this.cfRules);
        delete cfRules[cmd.sheetId];
        this.history.update("cfRules", cfRules);
        break;
      case "ADD_CONDITIONAL_FORMAT":
        this.addConditionalFormatting(cmd.cf, cmd.sheetId);
        break;
      case "REMOVE_CONDITIONAL_FORMAT":
        this.removeConditionalFormatting(cmd.id, cmd.sheetId);
        break;
      case "REMOVE_COLUMNS":
        this.adaptcfRules(cmd.sheetId, (range: string) => updateRemoveColumns(range, cmd.columns));
        break;
      case "REMOVE_ROWS":
        this.adaptcfRules(cmd.sheetId, (range: string) => updateRemoveRows(range, cmd.rows));
        break;
      case "ADD_COLUMNS":
        const column = cmd.position === "before" ? cmd.column : cmd.column + 1;
        this.adaptcfRules(cmd.sheetId, (range: string) =>
          updateAddColumns(range, column, cmd.quantity)
        );
        break;
      case "ADD_ROWS":
        const row = cmd.position === "before" ? cmd.row : cmd.row + 1;
        this.adaptcfRules(cmd.sheetId, (range: string) => updateAddRows(range, row, cmd.quantity));
        break;
    }
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.cfRules[sheet.id] = sheet.conditionalFormats;
    }
  }

  export(data: Partial<WorkbookData>) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        if (this.cfRules[sheet.id]) {
          sheet.conditionalFormats = this.cfRules[sheet.id];
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns all the conditional format rules defined for the current sheet
   */
  getConditionalFormats(sheetId: UID): ConditionalFormat[] {
    return this.cfRules[sheetId] || [];
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
    const rulesId: Set<ConditionalFormat> = new Set();
    for (let cf of this.cfRules[sheetId]) {
      for (let ref of cf.ranges) {
        const zone: Zone = toZone(ref);
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            if (cellCol === col && cellRow === row) {
              rulesId.add(cf);
            }
          }
        }
      }
    }
    return rulesId;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Add or replace a conditional format rule
   */
  private addConditionalFormatting(cf: ConditionalFormat, sheet: string) {
    const currentCF = this.cfRules[sheet].slice();
    const replaceIndex = currentCF.findIndex((c) => c.id === cf.id);
    if (replaceIndex > -1) {
      currentCF.splice(replaceIndex, 1, cf);
    } else {
      currentCF.push(cf);
    }
    this.history.update("cfRules", sheet, currentCF);
  }

  private checkCFRule(rule: ColorScaleRule | SingleColorRules): CancelledReason | null {
    switch (rule.type) {
      case "CellIsRule":
        if (rule.operator === "Between" || rule.operator === "NotBetween") {
          if (rule.values.length !== 2 || rule.values.some((x) => x === "")) {
            return CancelledReason.InvalidNumberOfArgs;
          }
        } else {
          if (
            [
              "BeginsWith",
              "ContainsText",
              "EndsWith",
              "GreaterThan",
              "GreaterThanOrEqual",
              "LessThan",
              "LessThanOrEqual",
              "NotContains",
            ].includes(rule.operator) &&
            (rule.values[0] === "" || rule.values[0] === undefined)
          ) {
            return CancelledReason.InvalidNumberOfArgs;
          }
        }
        break;
      case "ColorScaleRule": {
        return this.checkColorScaleRule(rule);
      }
    }
    return null;
  }

  private checkPoint(
    threshold: ColorScaleThreshold | ColorScaleMidPointThreshold,
    thresholdName: string
  ): CancelledReason | undefined {
    if (
      ["number", "percentage", "percentile"].includes(threshold.type) &&
      (threshold.value === "" || isNaN(threshold.value as any))
    ) {
      switch (thresholdName) {
        case "min":
          return CancelledReason.MinNaN;
        case "max":
          return CancelledReason.MaxNaN;
        case "mid":
          return CancelledReason.MidNaN;
      }
    }
    try {
      if (threshold.type === "formula") {
        const compiledFormula = compile(normalize(threshold.value || ""));
        if (compiledFormula.async) {
          switch (thresholdName) {
            case "min":
              return CancelledReason.MinAsyncFormulaNotSupported;
            case "max":
              return CancelledReason.MaxAsyncFormulaNotSupported;
            case "mid":
              return CancelledReason.MidAsyncFormulaNotSupported;
          }
        }
      }
    } catch (error) {
      switch (thresholdName) {
        case "min":
          return CancelledReason.MinInvalidFormula;
        case "max":
          return CancelledReason.MaxInvalidFormula;
        case "mid":
          return CancelledReason.MidInvalidFormula;
      }
    }
    return;
  }
  private checkColorScaleRule(rule: ColorScaleRule): CancelledReason | null {
    const error =
      this.checkPoint(rule.minimum, "min") ||
      this.checkPoint(rule.maximum, "max") ||
      (rule.midpoint && this.checkPoint(rule.midpoint, "mid"));
    if (error) {
      return error;
    }
    const minValue = rule.minimum.value;
    const midValue = rule.midpoint?.value;
    const maxValue = rule.maximum.value;
    if (
      ["number", "percentage", "percentile"].includes(rule.minimum.type) &&
      rule.minimum.type === rule.maximum.type &&
      Number(minValue) >= Number(maxValue)
    ) {
      return CancelledReason.MinBiggerThanMax;
    }
    if (
      rule.midpoint &&
      ["number", "percentage", "percentile"].includes(rule.midpoint.type) &&
      rule.minimum.type === rule.midpoint.type &&
      Number(minValue) >= Number(midValue)
    ) {
      return CancelledReason.MinBiggerThanMid;
    }
    if (
      rule.midpoint &&
      ["number", "percentage", "percentile"].includes(rule.midpoint.type) &&
      rule.midpoint.type === rule.maximum.type &&
      Number(midValue) >= Number(maxValue)
    ) {
      return CancelledReason.MidBiggerThanMax;
    }
    return null;
  }
  private adaptcfRules(sheet: string, updateCb: (range: string) => string | null) {
    const currentCfs = this.cfRules[sheet];
    const newCfs: ConditionalFormat[] = [];
    for (let cf of currentCfs) {
      const updatedRanges: string[] = [];
      for (let range of cf.ranges) {
        const updatedRange = updateCb(range);
        if (updatedRange) {
          updatedRanges.push(updatedRange);
        }
      }
      if (updatedRanges.length === 0) {
        continue;
      }
      newCfs.push({ ...cf, ranges: updatedRanges });
    }
    this.history.update("cfRules", sheet, newCfs);
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
