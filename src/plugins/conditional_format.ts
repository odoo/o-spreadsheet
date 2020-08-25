import { BasePlugin } from "../base_plugin";
import {
  colorNumberString,
  toXC,
  toZone,
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
  isInside,
  recomputeZones,
} from "../helpers/index";
import {
  Cell,
  CellIsRule,
  ColorScaleRule,
  Command,
  ConditionalFormat,
  Style,
  WorkbookData,
  Zone,
} from "../types/index";
import { _lt } from "../translation";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export class ConditionalFormatPlugin extends BasePlugin {
  static getters = ["getConditionalFormats", "getConditionalStyle", "getRulesSelection"];

  private isStale: boolean = true;
  private cfRules: { [sheet: string]: ConditionalFormat[] } = {};

  // stores the computed styles in the format of computedStyles.sheetName.cellXC = Style
  private computedStyles: { [sheet: string]: { [cellXc: string]: Style } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        const activeSheet = cmd.to;
        this.computedStyles[activeSheet] = this.computedStyles[activeSheet] || {};
        this.isStale = true;
        break;
      case "CREATE_SHEET":
        this.cfRules[cmd.id] = [];
        this.isStale = true;
        break;
      case "ADD_CONDITIONAL_FORMAT":
        this.addConditionalFormatting(cmd.cf, cmd.sheet);
        this.isStale = true;
        break;
      case "REMOVE_CONDITIONAL_FORMAT":
        this.removeConditionalFormatting(cmd.id, cmd.sheet);
        this.isStale = true;
        break;
      case "REMOVE_COLUMNS":
        this.adaptcfRules(cmd.sheet, (range: string) => updateRemoveColumns(range, cmd.columns));
        this.isStale = true;
        break;
      case "REMOVE_ROWS":
        this.adaptcfRules(cmd.sheet, (range: string) => updateRemoveRows(range, cmd.rows));
        this.isStale = true;
        break;
      case "ADD_COLUMNS":
        const column = cmd.position === "before" ? cmd.column : cmd.column + 1;
        this.adaptcfRules(cmd.sheet, (range: string) =>
          updateAddColumns(range, column, cmd.quantity)
        );
        this.isStale = true;
        break;
      case "AUTOFILL_CELL":
        const sheet = this.getters.getActiveSheet();
        const cfOrigin = this.getRulesByCell(toXC(cmd.originCol, cmd.originRow));
        for (const cf of cfOrigin) {
          this.adaptRules(sheet, cf, [toXC(cmd.col, cmd.row)], []);
        }
        break;
      case "ADD_ROWS":
        const row = cmd.position === "before" ? cmd.row : cmd.row + 1;
        this.adaptcfRules(cmd.sheet, (range: string) => updateAddRows(range, row, cmd.quantity));
        this.isStale = true;
        break;
      case "PASTE_CELL":
        if (!cmd.onlyValue) {
          this.pasteCf(cmd.originCol, cmd.originRow, cmd.col, cmd.row, cmd.sheet, cmd.cut);
        }
        break;
      case "EVALUATE_CELLS":
      case "UPDATE_CELL":
      case "UNDO":
      case "REDO":
        this.isStale = true;
        break;
    }
  }

  finalize() {
    if (this.isStale && this.currentMode !== "headless") {
      this.computeStyles();
      this.isStale = false;
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
  getConditionalFormats(): ConditionalFormat[] {
    return this.cfRules[this.workbook.activeSheet.id];
  }

  /**
   * Returns the conditional style property for a given cell reference in the active sheet or
   * undefined if this cell doesn't have a conditional style set.
   */
  getConditionalStyle(xc: string): Style | undefined {
    return (
      this.computedStyles[this.workbook.activeSheet.id] &&
      this.computedStyles[this.workbook.activeSheet.id][xc]
    );
  }

  getRulesSelection(selection: [Zone]): string[] {
    const ruleIds: Set<string> = new Set();
    selection.forEach((zone) => {
      const zoneRuleId = this.getRulesByZone(zone);
      zoneRuleId.forEach((ruleId) => {
        ruleIds.add(ruleId);
      });
    });
    return Array.from(ruleIds);
  }
  getRulesByZone(zone: Zone): Set<string> {
    const ruleIds: Set<string> = new Set();
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cellRules = this.getRulesByCell(toXC(col, row));
        cellRules.forEach((rule) => {
          ruleIds.add(rule.id);
        });
      }
    }
    return ruleIds;
  }
  getRulesByCell(cellXc: string): Set<ConditionalFormat> {
    const currentSheet = this.workbook.activeSheet.id;
    const rulesId: Set<ConditionalFormat> = new Set();
    for (let cf of this.cfRules[currentSheet]) {
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
    this.history.updateLocalState(["cfRules", sheet], currentCF);
  }

  /**
   * Execute the complete color scale for the range of the conditional format for a 2 colors rule
   */
  private applyColorScale(range: string, rule: ColorScaleRule): void {
    const minValue = Number(this.getters.evaluateFormula(`=min(${range})`));
    const maxValue = Number(this.getters.evaluateFormula(`=max(${range})`));
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
      return;
    }
    const deltaValue = maxValue - minValue;
    if (!deltaValue) {
      return;
    }
    const deltaColorR = ((rule.minimum.color >> 16) % 256) - ((rule.maximum.color >> 16) % 256);
    const deltaColorG = ((rule.minimum.color >> 8) % 256) - ((rule.maximum.color >> 8) % 256);
    const deltaColorB = (rule.minimum.color % 256) - (rule.maximum.color % 256);

    const colorDiffUnitR = deltaColorR / deltaValue;
    const colorDiffUnitG = deltaColorG / deltaValue;
    const colorDiffUnitB = deltaColorB / deltaValue;
    const zone: Zone = toZone(range);
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.workbook.activeSheet.rows[row].cells[col];
        if (cell && cell.value && !Number.isNaN(Number.parseFloat(cell.value))) {
          const r = Math.round(
            ((rule.minimum.color >> 16) % 256) - colorDiffUnitR * (cell.value - minValue)
          );
          const g = Math.round(
            ((rule.minimum.color >> 8) % 256) - colorDiffUnitG * (cell.value - minValue)
          );
          const b = Math.round(
            (rule.minimum.color % 256) - colorDiffUnitB * (cell.value - minValue)
          );
          const color = (r << 16) | (g << 8) | b;
          this.computedStyles[this.workbook.activeSheet.id][cell.xc] =
            this.computedStyles[this.workbook.activeSheet.id][cell.xc] || {};
          this.computedStyles[this.workbook.activeSheet.id][cell.xc].fillColor =
            "#" + colorNumberString(color);
        }
      }
    }
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
    const currentSheet = this.workbook.activeSheet.id;
    this.computedStyles[currentSheet] = {};
    for (let cf of this.cfRules[currentSheet]) {
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
                  let cell = this.workbook.activeSheet.rows[row].cells[col];
                  let xc = toXC(col, row);
                  if (pr && pr(cell, cf.rule)) {
                    // we must combine all the properties of all the CF rules applied to the given cell
                    this.computedStyles[currentSheet][xc] = Object.assign(
                      this.computedStyles[currentSheet][xc] || {},
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
      cf.ranges = updatedRanges;
      newCfs.push(cf);
    }
    this.history.updateLocalState(["cfRules", sheet], newCfs);
  }

  private removeConditionalFormatting(id: string, sheet: string) {
    const cfIndex = this.cfRules[sheet].findIndex((s) => s.id === id);
    if (cfIndex !== -1) {
      const currentCF = this.cfRules[sheet].slice();
      currentCF.splice(cfIndex, 1);
      this.history.updateLocalState(["cfRules", sheet], currentCF);
    }
  }

  // ---------------------------------------------------------------------------
  // Copy/Cut/Paste and Merge
  // ---------------------------------------------------------------------------
  private pasteCf(
    originCol: number,
    originRow: number,
    col: number,
    row: number,
    originSheet: string,
    cut?: boolean
  ) {
    const xc = toXC(col, row);
    for (let rule of this.cfRules[originSheet]) {
      for (let range of rule.ranges) {
        if (isInside(originCol, originRow, toZone(range))) {
          const cf = rule;
          const toRemoveRange: string[] = [];
          if (cut) {
            //remove from current rule
            toRemoveRange.push(toXC(originCol, originRow));
          }
          if (originSheet === this.workbook.activeSheet.id) {
            this.adaptRules(originSheet, cf, [xc], toRemoveRange);
          } else {
            this.adaptRules(this.workbook.activeSheet.id, cf, [xc], []);
            this.adaptRules(originSheet, cf, [], toRemoveRange);
          }
        }
      }
    }
  }

  private adaptRules(sheet: string, cf: ConditionalFormat, toAdd: string[], toRemove: string[]) {
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }
    const replaceIndex = this.cfRules[sheet].findIndex((c) => c.id === cf.id);
    let currentRanges: string[] = [];
    if (replaceIndex > -1) {
      currentRanges = this.cfRules[sheet][replaceIndex].ranges;
    }

    currentRanges = currentRanges.concat(toAdd);
    const newRange: string[] = recomputeZones(currentRanges, toRemove);
    this.addConditionalFormatting(
      {
        id: cf.id,
        rule: cf.rule,
        stopIfTrue: cf.stopIfTrue,
        ranges: newRange,
      },
      sheet
    );
  }
}
