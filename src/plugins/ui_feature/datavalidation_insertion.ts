import { isBoolean } from "../../helpers/misc";
import { getCellPositionsInRanges } from "../../helpers/range";
import { CellValueType } from "../../types/cells";
import {
  AddDataValidationCommand,
  AddDataValidationsCommand,
  CommandResult,
  DispatchResult,
} from "../../types/commands";
import { isMatrix } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class DataValidationInsertionPlugin extends UIPlugin {
  validators = {
    ADD_DATA_VALIDATION_RULES: this.checkAddDataValidationRules,
  };

  handlers = {
    ADD_DATA_VALIDATION_RULE: this.onAddDataValidationRule,
    ADD_DATA_VALIDATION_RULES: this.onAddDataValidationRules,
  };

  private checkAddDataValidationRules(cmd: AddDataValidationsCommand) {
    const results: DispatchResult[] = [];
    for (const sheetId in cmd.rulesBySheetId) {
      results.push(
        this.canDispatch("ADD_DATA_VALIDATION_RULE", {
          sheetId,
          rule: cmd.rulesBySheetId[sheetId].rule,
          ranges: cmd.rulesBySheetId[sheetId].ranges,
        })
      );
    }
    const reasons = results
      .map((result) => result.reasons)
      .flat()
      .filter((r) => r !== CommandResult.NoChanges);
    if (reasons.length) {
      return reasons;
    }
    return CommandResult.Success;
  }

  private onAddDataValidationRule(cmd: AddDataValidationCommand) {
    if (cmd.rule.criterion.type !== "isBoolean") {
      return;
    }
    const ranges = cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range));
    for (const position of getCellPositionsInRanges(ranges)) {
      const cell = this.getters.getCell(position);
      const evaluatedCell = this.getters.getEvaluatedCell(position);

      if (!cell?.isFormula && !cell?.content) {
        this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
        // In this case, a cell has been updated in the core plugin but
        // not yet evaluated. This can occur after a paste operation.
      } else if ((cell?.isFormula || cell?.content) && evaluatedCell.type === CellValueType.empty) {
        let value: string | undefined;
        if (cell.isFormula) {
          const result = this.getters.evaluateCompiledFormula(
            position.sheetId,
            cell.compiledFormula
          );
          value = (isMatrix(result) ? result[0][0] : result)?.toString();
        } else {
          value = cell.content;
        }
        if (!value || !isBoolean(value)) {
          this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
        }
      } else if (evaluatedCell.type !== CellValueType.boolean) {
        this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
      }
    }
  }

  private onAddDataValidationRules(cmd: AddDataValidationsCommand) {
    for (const sheetId in cmd.rulesBySheetId) {
      this.dispatch("ADD_DATA_VALIDATION_RULE", {
        sheetId,
        ranges: cmd.rulesBySheetId[sheetId].ranges,
        rule: cmd.rulesBySheetId[sheetId].rule,
      });
    }
  }
}
