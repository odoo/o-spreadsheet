import {
  copyRangeWithNewSheetId,
  deepCopy,
  getCellPositionsInRanges,
  isInside,
  recomputeZones,
  toXC,
} from "../../helpers";
import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import {
  AddDataValidationCommand,
  ApplyRangeChange,
  CellPosition,
  Command,
  CommandResult,
  CoreCommand,
  DataValidationRule,
  Range,
  Style,
  UID,
  WorkbookData,
} from "../../types";
import { CorePlugin } from "../core_plugin";

interface DataValidationState {
  readonly rules: { [sheet: string]: DataValidationRule[] };
}

export class DataValidationPlugin
  extends CorePlugin<DataValidationState>
  implements DataValidationState
{
  static getters = [
    "cellHasListDataValidationIcon",
    "getDataValidationRule",
    "getDataValidationRules",
    "getValidationRuleForCell",
  ] as const;

  readonly rules: { [sheet: string]: DataValidationRule[] } = {};

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
              this.removeDataValidationRule(sheetId, rule.id);
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

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "ADD_DATA_VALIDATION_RULE":
        return this.checkValidations(
          cmd,
          this.chainValidations(
            this.checkCriterionTypeIsValid,
            this.checkCriterionHasValidNumberOfValues,
            this.checkCriterionValuesAreValid
          )
        );
      case "REMOVE_DATA_VALIDATION_RULE":
        if (!this.rules[cmd.sheetId].find((rule) => rule.id === cmd.id)) {
          return CommandResult.UnknownDataValidationRule;
        }
        break;
    }
    return CommandResult.Success;
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
      case "REMOVE_DATA_VALIDATION_RULE": {
        this.removeDataValidationRule(cmd.sheetId, cmd.id);
        break;
      }
      case "ADD_DATA_VALIDATION_RULE": {
        const ranges = cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range));
        this.addDataValidationRule(cmd.sheetId, { ...cmd.rule, ranges });
        break;
      }
      case "DELETE_CONTENT": {
        const zones = cmd.target;
        const sheetId = cmd.sheetId;
        for (const zone of zones) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            for (let col = zone.left; col <= zone.right; col++) {
              const dataValidation = this.getValidationRuleForCell({ sheetId, col, row });
              if (!dataValidation) {
                continue;
              }
              if (
                dataValidation.criterion.type === "isBoolean" ||
                (dataValidation.criterion.type === "isValueInList" &&
                  !this.getters.getCell({ sheetId, col, row })?.content)
              ) {
                const rules = this.rules[sheetId];
                const ranges = [this.getters.getRangeFromSheetXC(sheetId, toXC(col, row))];
                const adaptedRules = this.removeRangesFromRules(sheetId, ranges, rules);
                this.history.update("rules", sheetId, adaptedRules);
              }
            }
          }
        }
      }
    }
  }

  getDataValidationRules(sheetId: UID): DataValidationRule[] {
    return this.rules[sheetId];
  }

  getDataValidationRule(sheetId: UID, id: UID): DataValidationRule | undefined {
    return this.rules[sheetId].find((rule) => rule.id === id);
  }

  getValidationRuleForCell({ sheetId, col, row }: CellPosition): DataValidationRule | undefined {
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

  cellHasListDataValidationIcon(cellPosition: CellPosition): boolean {
    const rule = this.getValidationRuleForCell(cellPosition);
    if (!rule) return false;

    return (
      (rule.criterion.type === "isValueInList" || rule.criterion.type === "isValueInRange") &&
      rule.criterion.displayStyle === "arrow"
    );
  }

  private addDataValidationRule(sheetId: UID, newRule: DataValidationRule) {
    const rules = this.rules[sheetId];

    if (newRule.criterion.type === "isBoolean") {
      this.setCenterStyleToBooleanCells(newRule);
    }
    const adaptedRules = this.removeRangesFromRules(sheetId, newRule.ranges, rules);
    const ruleIndex = adaptedRules.findIndex((rule) => rule.id === newRule.id);

    if (ruleIndex !== -1) {
      adaptedRules[ruleIndex] = newRule;
      this.history.update("rules", sheetId, adaptedRules);
    } else {
      this.history.update("rules", sheetId, [...adaptedRules, newRule]);
    }
  }

  private removeRangesFromRules(sheetId: UID, ranges: Range[], rules: DataValidationRule[]) {
    rules = deepCopy(rules);
    const rangesXcs = ranges.map((range) => this.getters.getRangeString(range, sheetId));
    for (const rule of rules) {
      const ruleRanges = rule.ranges.map((range) => this.getters.getRangeString(range, sheetId));
      rule.ranges = recomputeZones(ruleRanges, rangesXcs).map((xc) =>
        this.getters.getRangeFromSheetXC(sheetId, xc)
      );
    }
    return rules.filter((rule) => rule.ranges.length > 0);
  }

  private removeDataValidationRule(sheetId: UID, ruleId: UID) {
    const rules = this.rules[sheetId];
    const newRules = rules.filter((rule) => rule.id !== ruleId);
    this.history.update("rules", sheetId, newRules);
  }

  private setCenterStyleToBooleanCells(rule: DataValidationRule) {
    for (const position of getCellPositionsInRanges(rule.ranges)) {
      const cell = this.getters.getCell(position);
      const style: Style = {
        ...cell?.style,
        align: cell?.style?.align ?? "center",
        verticalAlign: cell?.style?.verticalAlign ?? "middle",
      };
      this.dispatch("UPDATE_CELL", { ...position, style });
    }
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.rules[sheet.id] = [];
      if (!sheet.dataValidationRules) {
        continue;
      }
      for (const rule of sheet.dataValidationRules) {
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
      sheet.dataValidationRules = [];
      for (const rule of this.rules[sheet.id]) {
        sheet.dataValidationRules.push({
          ...rule,
          ranges: rule.ranges.map((range) => this.getters.getRangeString(range, sheet.id)),
        });
      }
    }
  }

  private checkCriterionTypeIsValid(cmd: AddDataValidationCommand): CommandResult {
    return dataValidationEvaluatorRegistry.contains(cmd.rule.criterion.type)
      ? CommandResult.Success
      : CommandResult.UnknownDataValidationCriterionType;
  }

  private checkCriterionHasValidNumberOfValues(cmd: AddDataValidationCommand): CommandResult {
    const criterion = cmd.rule.criterion;
    const evaluator = dataValidationEvaluatorRegistry.get(criterion.type);
    const expectedNumberOfValues = evaluator.numberOfValues(criterion);
    if (
      expectedNumberOfValues !== undefined &&
      criterion.values.length !== expectedNumberOfValues
    ) {
      return CommandResult.InvalidNumberOfCriterionValues;
    }
    return CommandResult.Success;
  }

  private checkCriterionValuesAreValid(cmd: AddDataValidationCommand): CommandResult {
    const criterion = cmd.rule.criterion;
    const evaluator = dataValidationEvaluatorRegistry.get(criterion.type);
    if (
      criterion.values.some((value) => {
        if (value.startsWith("=")) {
          return evaluator.allowedValues === "onlyLiterals";
        } else if (evaluator.allowedValues === "onlyFormulas") {
          return true;
        } else {
          return !evaluator.isCriterionValueValid(value);
        }
      })
    ) {
      return CommandResult.InvalidDataValidationCriterionValue;
    }
    return CommandResult.Success;
  }
}
