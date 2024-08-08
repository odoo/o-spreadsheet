import { copyRangeWithNewSheetId, deepCopy, isInside, recomputeZones } from "../../helpers";
import {
  ApplyRangeChange,
  CellPosition,
  CellProtectionRule,
  CoreCommand,
  Range,
  UID,
  WorkbookData,
} from "../../types";
import { CorePlugin } from "../core_plugin";

interface CellProtectionState {
  readonly rules: { [sheet: string]: CellProtectionRule[] };
}

export class CellProtectionPlugin
  extends CorePlugin<CellProtectionState>
  implements CellProtectionState
{
  static getters = [
    "cellHasListCellProtectionIcon",
    "getCellProtectionRule",
    "getCellProtectionRules",
    "getProtectionRuleForCell",
  ] as const;

  readonly rules: { [sheet: string]: CellProtectionRule[] } = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.rules);
    for (const sheetId of sheetIds) {
      this.loopThroughRangesOfSheet(sheetId, applyChange);
    }
  }

  private loopThroughRangesOfSheet(sheetId: UID, applyChange: ApplyRangeChange) {
    const rules = this.rules[sheetId];
    for (let ruleIndex = rules.length - 1; ruleIndex >= 0; ruleIndex--) {
      const rule = this.rules[sheetId][ruleIndex];
      for (let rangeIndex = rule.ranges.length - 1; rangeIndex >= 0; rangeIndex--) {
        const range = rule.ranges[rangeIndex];
        const change = applyChange(range);
        switch (change.changeType) {
          case "REMOVE":
            if (rule.ranges.length === 1) {
              this.removeCellProtectionRule(sheetId, rule.id);
            } else {
              const copy = rule.ranges.slice();
              copy.splice(rangeIndex, 1);
              this.history.update("rules", sheetId, ruleIndex, "ranges", copy);
            }
            break;
          case "RESIZE":
          case "MOVE":
          case "CHANGE":
            this.history.update("rules", sheetId, ruleIndex, "ranges", rangeIndex, change.range);
            break;
        }
      }
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("rules", cmd.sheetId, []);
        break;
      case "DUPLICATE_SHEET": {
        const rules = deepCopy(this.rules[cmd.sheetId]).map((rule) => ({
          ...rule,
          ranges: rule.ranges.map((range) =>
            copyRangeWithNewSheetId(cmd.sheetId, cmd.sheetIdTo, range)
          ),
        }));
        this.history.update("rules", cmd.sheetIdTo, rules);
        break;
      }
      case "DELETE_SHEET": {
        const rules = { ...this.rules };
        delete rules[cmd.sheetId];
        this.history.update("rules", rules);
        break;
      }
      case "REMOVE_CELL_PROTECTION_RULE": {
        this.removeCellProtectionRule(cmd.sheetId, cmd.id);
        break;
      }
      case "ADD_CELL_PROTECTION_RULE": {
        const ranges = cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range));
        this.addCellProtectionRule(cmd.sheetId, { ...cmd.rule, ranges });
        break;
      }
      case "DELETE_CONTENT": {
        const zones = recomputeZones(cmd.target);
        const sheetId = cmd.sheetId;
        for (const zone of zones) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            for (let col = zone.left; col <= zone.right; col++) {
              const dataValidation = this.getProtectionRuleForCell({ sheetId, col, row });
              if (!dataValidation) {
                continue;
              }
            }
          }
        }
      }
    }
  }

  getCellProtectionRules(sheetId: UID): CellProtectionRule[] {
    return this.rules[sheetId];
  }

  getCellProtectionRule(sheetId: UID, id: UID): CellProtectionRule | undefined {
    return this.rules[sheetId].find((rule) => rule.id === id);
  }

  getProtectionRuleForCell({ sheetId, col, row }: CellPosition): CellProtectionRule | undefined {
    if (!this.rules[sheetId]) {
      return undefined;
    }
    for (const rule of this.rules[sheetId]) {
      for (const range of rule.ranges) {
        if (isInside(col, row, range.zone)) {
          return rule;
        }
      }
    }
    return undefined;
  }

  cellHasListCellProtectionIcon(cellPosition: CellPosition): boolean {
    const rule = this.getProtectionRuleForCell(cellPosition);
    if (!rule) return false;
    return true;
  }

  private addCellProtectionRule(sheetId: UID, newRule: CellProtectionRule) {
    const rules = this.rules[sheetId];

    const adaptedRules = this.removeRangesFromRules(sheetId, newRule.ranges, rules);
    const ruleIndex = adaptedRules.findIndex((rule) => rule.id === newRule.id);

    if (ruleIndex !== -1) {
      adaptedRules[ruleIndex] = newRule;
      this.history.update("rules", sheetId, adaptedRules);
    } else {
      this.history.update("rules", sheetId, [...adaptedRules, newRule]);
    }
  }

  private removeRangesFromRules(sheetId: UID, ranges: Range[], rules: CellProtectionRule[]) {
    rules = deepCopy(rules);
    for (const rule of rules) {
      rule.ranges = this.getters.recomputeRanges(rule.ranges, ranges);
    }
    return rules.filter((rule) => rule.ranges.length > 0);
  }

  private removeCellProtectionRule(sheetId: UID, ruleId: UID) {
    const rules = this.rules[sheetId];
    const newRules = rules.filter((rule) => rule.id !== ruleId);
    this.history.update("rules", sheetId, newRules);
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.rules[sheet.id] = [];
      if (!sheet.cellProtectionRules) {
        continue;
      }
      for (const rule of sheet.cellProtectionRules) {
        this.rules[sheet.id].push({
          ...rule,
          ranges: rule.ranges.map((range) => this.getters.getRangeFromSheetXC(sheet.id, range)),
        });
      }
    }
  }

  export(data: Partial<WorkbookData>) {
    if (!data.sheets) {
      return;
    }
    for (const sheet of data.sheets) {
      sheet.cellProtectionRules = [];
      for (const rule of this.rules[sheet.id]) {
        sheet.cellProtectionRules.push({
          ...rule,
          ranges: rule.ranges.map((range) => this.getters.getRangeString(range, sheet.id)),
        });
      }
    }
  }
}
