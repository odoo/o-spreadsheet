import { ovtRegistry } from "../../registries/ovt_registry";
import {
  AddConditionalFormatCommand,
  AddDataValidationCommand,
  AddPivotCommand,
  UpdateCellCommand,
} from "../../types/commands";
import { CoreGetters } from "../../types/getters";
import { ApplyRangeChangeSheet } from "../../types/misc";

function updateCellCommandAdaptRange(
  cmd: UpdateCellCommand,
  getters: CoreGetters,
  applyChange: ApplyRangeChangeSheet
): UpdateCellCommand {
  cmd.content =
    cmd.content &&
    getters.adaptFormulaStringDependencies(cmd.sheetId, cmd.content, applyChange.applyChange);
  return cmd;
}
ovtRegistry.addValue("UPDATE_CELL", updateCellCommandAdaptRange);

function addConditionalFormatCommandAdaptRange(
  cmd: AddConditionalFormatCommand,
  getters: CoreGetters,
  applyChange: ApplyRangeChangeSheet
): AddConditionalFormatCommand {
  if (cmd.cf.rule.type == "CellIsRule") {
    cmd.cf.rule.values = cmd.cf.rule.values.map((val) =>
      getters.adaptFormulaStringDependencies(cmd.sheetId, val, applyChange.applyChange)
    );
  }
  return cmd;
}
ovtRegistry.addValue("ADD_CONDITIONAL_FORMAT", addConditionalFormatCommandAdaptRange);

function addDataValidationCommandAdaptRange(
  cmd: AddDataValidationCommand,
  getters: CoreGetters,
  applyChange: ApplyRangeChangeSheet
): AddDataValidationCommand {
  cmd.rule.criterion.values = cmd.rule.criterion.values.map((val) =>
    getters.adaptFormulaStringDependencies(cmd.sheetId, val, applyChange.applyChange)
  );
  return cmd;
}
ovtRegistry.addValue("ADD_DATA_VALIDATION_RULE", addDataValidationCommandAdaptRange);

function addPivotCommandAdaptRange(
  cmd: AddPivotCommand,
  getters: CoreGetters,
  applyChange: ApplyRangeChangeSheet
): AddPivotCommand {
  cmd.pivot.measures.map((msr) => {
    if (msr.computedBy) {
      msr.computedBy.formula = getters.adaptFormulaStringDependencies(
        msr.computedBy.sheetId,
        msr.computedBy.formula,
        applyChange.applyChange
      );
    }
  });
  return cmd;
}
ovtRegistry.addValue("ADD_PIVOT", addPivotCommandAdaptRange);
