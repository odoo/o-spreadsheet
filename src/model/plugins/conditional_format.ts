import { BasePlugin } from "../base_plugin";
import {
  GridCommand,
  Cell,
  CellIsRule,
  Zone,
  AddConditionalFormatCommand,
  ConditionalFormat
} from "../../types/index";
import { toZone } from "../../helpers/index";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

let ruleExecutor = {
  CellIsRule: (cell: Cell, rule: CellIsRule): boolean => {
    switch (rule.operator) {
      case "Equal":
        return cell && cell.value == rule.values[0];

      default:
        console.warn(
          `Not implemented operator ${rule.operator} for kind of conditional formatting:  ${rule.kind}`
        );
    }
    return false;
  }
};

/**
 * ConditionalFormatPlugin
 *
 * The functional scope of this plugin is everything related to conditional
 * formatting.
 */
export class ConditionalFormatPlugin extends BasePlugin {
  static getters = ["getConditionalFormats"];

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "ADD_CONDITIONAL_FORMAT":
        this.addConditionalFormatting(cmd);
        break;
      case "EVALUATE_CELLS":
      case "UNDO":
      case "REDO":
        this.computeStyles();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getConditionalFormats(): ConditionalFormat[] {
    return this.workbook.activeSheet.conditionalFormats;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private addConditionalFormatting(cmd: AddConditionalFormatCommand) {
    const currentCF = this.workbook.activeSheet.conditionalFormats.slice();
    if (cmd.replace) {
      const replaceIndex = currentCF.indexOf(cmd.replace);
      currentCF.splice(replaceIndex, 1, cmd.cf);
    } else {
      currentCF.push(cmd.cf);
    }
    this.history.updateState(["activeSheet", "conditionalFormats"], currentCF);
    this.computeStyles();
  }

  /**
   * Compute the styles according to the conditional formatting.
   * This computation must happen after the cell values are computed if they change
   *
   * This result of the computation will be in the state.cell[XC].conditionalStyle and will be the union of all the style
   * properties applied (in order).
   * So if a cell has multiple conditional formatting applied to it, and each affect a different value of the style,
   * the resulting style will have the combination of all those values.
   * If multiple conditional formatting use the same style value, they will be applied in order so that the last applied wins
   */
  // TODO: VSC: we might need to create the cells if they are not yet created ?
  private computeStyles() {
    for (let c of Object.values(this.workbook.cells)) {
      c.conditionalStyle = undefined;
    }
    for (let cf of this.workbook.activeSheet.conditionalFormats) {
      for (let ref of cf.ranges) {
        const zone: Zone = toZone(ref);
        for (let row = zone.top; row <= zone.bottom; row++) {
          for (let col = zone.left; col <= zone.right; col++) {
            const rulePredicate = ruleExecutor[cf.formatRule.type.kind];
            const cell = this.workbook.rows[row].cells[col];
            if (rulePredicate && rulePredicate(cell, cf.formatRule.type)) {
              cell.conditionalStyle = Object.assign(cell.conditionalStyle || {}, cf.style);
            }
          }
        }
      }
    }
  }
}
