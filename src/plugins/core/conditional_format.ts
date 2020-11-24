import { CorePlugin } from "../core_plugin";
import {
  toXC,
  toZone,
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../../helpers/index";
import {
  Command,
  ConditionalFormat,
  WorkbookData,
  Zone,
  UID,
  CancelledReason,
  ColorScaleRule,
  SingleColorRules,
  CommandResult,
} from "../../types/index";
import { _lt } from "../../translation";

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

  handle(cmd: Command) {
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
        const cellRules = this.getRulesByCell(sheetId, toXC(col, row));
        cellRules.forEach((rule) => {
          ruleIds.add(rule.id);
        });
      }
    }
    return ruleIds;
  }
  getRulesByCell(sheetId: UID, cellXc: string): Set<ConditionalFormat> {
    const rulesId: Set<ConditionalFormat> = new Set();
    for (let cf of this.cfRules[sheetId]) {
      for (let ref of cf.ranges) {
        const zone: Zone = toZone(ref);
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            let xc = toXC(col, row);
            if (cellXc == xc) {
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
          if (rule.values.length !== 2) {
            return CancelledReason.InvalidNumberOfArgs;
          }
        } else {
          if (rule.values.length !== 1) {
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

  private checkColorScaleRule(rule: ColorScaleRule): CancelledReason | null {
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
