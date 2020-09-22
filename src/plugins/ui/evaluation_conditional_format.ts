import { UIPlugin } from "../ui_plugin";
import {
  Cell,
  CellIsRule,
  CellType,
  ColorScaleRule,
  Command,
  ConditionalFormat,
  Style,
  UID,
  Zone,
} from "../../types/index";
import { colorNumberString, isInside, recomputeZones, toXC, toZone } from "../../helpers/index";
import { _lt } from "../../translation";
import { Mode } from "../../model";

export class EvaluationConditionalFormatPlugin extends UIPlugin {
  static getters = ["getConditionalStyle"];
  static modes: Mode[] = ["normal", "readonly"];
  private isStale: boolean = true;
  // stores the computed styles in the format of computedStyles.sheetName.cellXC = Style
  private computedStyles: { [sheet: string]: { [cellXc: string]: Style } } = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        const activeSheet = cmd.sheetIdTo;
        this.computedStyles[activeSheet] = this.computedStyles[activeSheet] || {}; // ?
        this.isStale = true;
        break;

      case "AUTOFILL_CELL":
        const sheetId = this.getters.getActiveSheetId();
        const cfOrigin = this.getters.getRulesByCell(sheetId, toXC(cmd.originCol, cmd.originRow));
        for (const cf of cfOrigin) {
          this.adaptRules(sheetId, cf, [toXC(cmd.col, cmd.row)], []);
        }
        break;
      case "PASTE_CELL":
        if (!cmd.onlyValue) {
          this.pasteCf(
            cmd.originCol,
            cmd.originRow,
            cmd.col,
            cmd.row,
            cmd.originSheet,
            cmd.sheetId,
            cmd.cut
          );
        }
        break;
      case "DUPLICATE_SHEET":
      case "CREATE_SHEET":
      case "DELETE_SHEET":
      case "ADD_CONDITIONAL_FORMAT":
      case "REMOVE_CONDITIONAL_FORMAT":
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
      case "ADD_COLUMNS":
      case "ADD_ROWS":
      case "EVALUATE_CELLS":
      case "UPDATE_CELL":
      case "UNDO":
      case "REDO":
        this.isStale = true;
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

  /**
   * Returns the conditional style property for a given cell reference in the active sheet or
   * undefined if this cell doesn't have a conditional style set.
   */
  getConditionalStyle(xc: string): Style | undefined {
    const activeSheet = this.getters.getActiveSheetId();
    const styles = this.computedStyles[activeSheet];
    return styles && styles[xc];
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
    const activeSheetId = this.getters.getActiveSheetId();
    this.computedStyles[activeSheetId] = {};
    for (let cf of this.getters.getConditionalFormats(activeSheetId)) {
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
                  let cell = this.getters.getCell(activeSheetId, col, row);
                  let xc = toXC(col, row);
                  if (pr && pr(cell, cf.rule)) {
                    // we must combine all the properties of all the CF rules applied to the given cell
                    this.computedStyles[activeSheetId][xc] = Object.assign(
                      this.computedStyles[activeSheetId][xc] || {},
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
    const activeSheetId = this.getters.getActiveSheetId();
    const computedStyle = this.computedStyles[activeSheetId];
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.getters.getCell(activeSheetId, col, row);
        let value;
        if (cell) {
          switch (cell.type) {
            case CellType.formula:
            case CellType.date:
            case CellType.number:
            case CellType.text:
              value = cell.value;
              break;
            case CellType.empty:
            case CellType.invalidFormula:
              continue;
          }
          if (cell && cell.type === CellType.number && !Number.isNaN(Number.parseFloat(value))) {
            const r = Math.round(
              ((rule.minimum.color >> 16) % 256) - colorDiffUnitR * (value - minValue)
            );
            const g = Math.round(
              ((rule.minimum.color >> 8) % 256) - colorDiffUnitG * (value - minValue)
            );
            const b = Math.round((rule.minimum.color % 256) - colorDiffUnitB * (value - minValue));
            const color = (r << 16) | (g << 8) | b;
            const xc = toXC(col, row);
            computedStyle[xc] = computedStyle[xc] || {};
            computedStyle[xc].fillColor = "#" + colorNumberString(color);
          }
        }
      }
    }
  }

  /**
   * Execute the predicate to know if a conditional formatting rule should be applied to a cell
   */
  private rulePredicate: { CellIsRule: (cell: Cell, rule: CellIsRule) => boolean } = {
    CellIsRule: (cell: Cell, rule: CellIsRule): boolean => {
      let value;
      if (cell) {
        switch (cell.type) {
          case CellType.formula:
          case CellType.date:
          case CellType.number:
          case CellType.text:
            value = cell.value;
            break;
          case CellType.empty:
          case CellType.invalidFormula:
            value = "";
        }
      }

      switch (rule.operator) {
        case "BeginsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value.startsWith(rule.values[0]);
        case "EndsWith":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value.endsWith(rule.values[0]);
        case "Between":
          return cell && value >= rule.values[0] && value <= rule.values[1];
        case "NotBetween":
          return !(cell && value >= rule.values[0] && value <= rule.values[1]);
        case "ContainsText":
          return cell && value && value.toString().indexOf(rule.values[0]) > -1;
        case "NotContains":
          return cell && value && value.toString().indexOf(rule.values[0]) == -1;
        case "GreaterThan":
          return cell && value > rule.values[0];
        case "GreaterThanOrEqual":
          return cell && value >= rule.values[0];
        case "LessThan":
          return cell && value < rule.values[0];
        case "LessThanOrEqual":
          return cell && value <= rule.values[0];
        case "NotEqual":
          if (!cell && rule.values[0] === "") {
            return false;
          }
          return cell && value != rule.values[0];
        case "Equal":
          if (!cell && rule.values[0] === "") {
            return true;
          }
          return cell && value == rule.values[0];
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
    const newRange: string[] = recomputeZones(currentRanges, toRemove);
    this.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: cf.id,
        rule: cf.rule,
        stopIfTrue: cf.stopIfTrue,
        ranges: newRange,
      },
      sheetId,
    });
  }

  private pasteCf(
    originCol: number,
    originRow: number,
    col: number,
    row: number,
    originSheet: UID,
    destinationSheetId: UID,
    cut?: boolean
  ) {
    const xc = toXC(col, row);
    for (let rule of this.getters.getConditionalFormats(originSheet)) {
      for (let range of rule.ranges) {
        if (isInside(originCol, originRow, toZone(range))) {
          const cf = rule;
          const toRemoveRange: string[] = [];
          if (cut) {
            //remove from current rule
            toRemoveRange.push(toXC(originCol, originRow));
          }
          if (originSheet === destinationSheetId) {
            this.adaptRules(originSheet, cf, [xc], toRemoveRange);
          } else {
            this.adaptRules(destinationSheetId, cf, [xc], []);
            this.adaptRules(originSheet, cf, [], toRemoveRange);
          }
        }
      }
    }
  }
}
