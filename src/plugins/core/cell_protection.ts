import { isZoneValid, recomputeZones } from "../../helpers";
import {
  AddCellProtectionCommand,
  AddRangeCellProtectionCommand,
  CellProtectionRule,
  CommandResult,
  CoreCommand,
  SheetCellProtectionRule,
  UID,
  WorkbookData,
  Zone,
} from "../../types";
import { CorePlugin } from "../core_plugin";

interface CellProtectionState {
  readonly rules: { [sheet: string]: CellProtectionRule | undefined };
}

export class CellProtectionPlugin
  extends CorePlugin<CellProtectionState>
  implements CellProtectionState
{
  static getters = [
    "getCellProtectionRule",
    "getCellProtectionRuleById",
    "getCellProtectionRules",
    "getSheetRuleProtectedZones",
    "getProtectedZones",
    "getProtectedSheetIds",
    "getFullyProtectedSheetIds",
  ] as const;

  readonly rules: { [sheet: string]: CellProtectionRule | undefined } = {};

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_RANGE_CELL_PROTECTION_RULE":
        if (!this.getters.tryGetSheet(cmd.rule.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        return this.checkValidations(
          cmd,
          this.chainValidations(this.checkEmptyRange, this.checkValidRange)
        );
      case "ADD_SHEET_CELL_PROTECTION_RULE":
        if (!this.getters.tryGetSheet(cmd.rule.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        return this.checkValidations(cmd, this.checkValidRange);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("rules", cmd.sheetId, undefined);
        break;
      case "DUPLICATE_SHEET":
        this.history.update("rules", cmd.sheetIdTo, undefined);
        break;
      case "REMOVE_CELL_PROTECTION_RULE": {
        this.removeCellProtectionRule(cmd.sheetId);
        break;
      }
      case "ADD_RANGE_CELL_PROTECTION_RULE": {
        const ranges = cmd.rule.ranges.map((range) => this.getters.getRangeFromRangeData(range));
        this.addCellProtectionRule({ ...cmd.rule, ranges });
        break;
      }
      case "ADD_SHEET_CELL_PROTECTION_RULE": {
        const excludeRanges = cmd.rule.excludeRanges.map((range) =>
          this.getters.getRangeFromRangeData(range)
        );
        this.addCellProtectionRule({ ...cmd.rule, excludeRanges });
        break;
      }
    }
  }

  private checkEmptyRange(cmd: AddRangeCellProtectionCommand) {
    return cmd.rule.ranges.length ? CommandResult.Success : CommandResult.EmptyRange;
  }

  private checkValidRange(cmd: AddCellProtectionCommand): CommandResult {
    const rangesToCheck = cmd.rule.type === "range" ? cmd.rule.ranges : cmd.rule.excludeRanges;
    const zones = rangesToCheck.map((range) => range._zone);
    if (!zones.every(isZoneValid)) return CommandResult.InvalidRange;
    return CommandResult.Success;
  }

  getCellProtectionRules(): CellProtectionRule[] {
    const rules: CellProtectionRule[] = [];
    for (const rule of Object.keys(this.rules).flatMap((sheetId) => this.rules[sheetId])) {
      if (rule) {
        rules.push(rule);
      }
    }
    return rules;
  }

  getSheetRuleProtectedZones(rule: SheetCellProtectionRule): Zone[] {
    return recomputeZones(
      [this.getters.getSheetZone(rule.sheetId)],
      rule.excludeRanges.map((range) => range.zone)
    );
  }

  getProtectedZones(sheetId: UID): Zone[] {
    const rule = this.getCellProtectionRule(sheetId);
    if (!rule) {
      return [];
    }
    let protectedZones: Zone[] = [];
    if (rule.type === "range") {
      protectedZones = rule.ranges.map((range) => range.zone as Zone);
    } else {
      for (const zone of this.getSheetRuleProtectedZones(rule)) {
        protectedZones.push(zone);
      }
    }
    return protectedZones;
  }

  getCellProtectionRule(sheetId: UID): CellProtectionRule | undefined {
    return this.rules[sheetId];
  }

  getCellProtectionRuleById(id: UID): CellProtectionRule | undefined {
    let _rule: CellProtectionRule | undefined = undefined;
    for (const rule of Object.keys(this.rules).flatMap((sheetId) => this.rules[sheetId])) {
      if (rule?.id === id) {
        _rule = rule;
      }
    }
    return _rule;
  }

  getProtectedSheetIds(): string[] {
    const protectedSheets: string[] = [];
    const sheets = Object.keys(this.rules);
    for (const rule of sheets.flatMap((sheetId) => this.rules[sheetId])) {
      if (rule) {
        protectedSheets.push(rule.sheetId);
      }
    }
    return protectedSheets;
  }

  getFullyProtectedSheetIds(): string[] {
    const protectedSheets: string[] = [];
    const sheets = Object.keys(this.rules);
    for (const rule of sheets.flatMap((sheetId) => this.rules[sheetId])) {
      if (rule?.type === "sheet" && !rule.excludeRanges.length) {
        protectedSheets.push(rule.sheetId);
      }
    }
    return protectedSheets;
  }

  private addCellProtectionRule(newRule: CellProtectionRule) {
    const sheetId = newRule.sheetId;
    const rule = this.rules[sheetId];
    if (!rule) {
      this.history.update("rules", sheetId, newRule);
    } else {
      this.history.update("rules", sheetId, { ...newRule, id: rule.id });
    }
  }

  private removeCellProtectionRule(sheetId: UID) {
    this.history.update("rules", sheetId, undefined);
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const rule = sheet.cellProtectionRule;
      if (!rule) {
        continue;
      }
      if (rule.type === "range") {
        this.rules[sheet.id] = {
          ...rule,
          ranges: rule.ranges.map((range) => this.getters.getRangeFromSheetXC(sheet.id, range)),
        };
      } else {
        this.rules[sheet.id] = {
          ...rule,
          excludeRanges: rule.excludeRanges.map((range) =>
            this.getters.getRangeFromSheetXC(sheet.id, range)
          ),
        };
      }
    }
  }

  export(data: Partial<WorkbookData>) {
    if (!data.sheets) {
      return;
    }
    for (const sheet of data.sheets) {
      const rule = this.rules[sheet.id];
      if (!rule) {
        continue;
      }
      if (rule.type === "range") {
        sheet.cellProtectionRule = {
          ...rule,
          ranges: rule.ranges.map((range) => this.getters.getRangeString(range, sheet.id)),
        };
      } else {
        sheet.cellProtectionRule = {
          ...rule,
          excludeRanges: rule.excludeRanges.map((range) =>
            this.getters.getRangeString(range, sheet.id)
          ),
        };
      }
    }
  }
}
