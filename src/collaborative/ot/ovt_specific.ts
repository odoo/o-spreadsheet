import { ApplyRangeChangeSheet } from "../..";
import { adaptFormulaStringRanges } from "../../helpers/formulas";
import { ovtRegistry } from "../../registries/ovt_registry";
import {
  AddConditionalFormatCommand,
  AddDataValidationCommand,
  AddPivotCommand,
  UpdateCellCommand,
  UpdatePivotCommand,
} from "../../types/commands";

function updateCellCommandAdaptRange(
  cmd: UpdateCellCommand,
  applyChange: ApplyRangeChangeSheet
): UpdateCellCommand {
  cmd.content = cmd.content && adaptFormulaStringRanges(cmd.sheetId, cmd.content, applyChange);
  return cmd;
}
ovtRegistry.addValue("UPDATE_CELL", updateCellCommandAdaptRange);

function addConditionalFormatCommandAdaptRange(
  cmd: AddConditionalFormatCommand,
  applyChange: ApplyRangeChangeSheet
): AddConditionalFormatCommand {
  if (cmd.cf.rule.type == "CellIsRule") {
    cmd.cf.rule.values = cmd.cf.rule.values.map((val) =>
      adaptFormulaStringRanges(cmd.sheetId, val, applyChange)
    );
  }
  return cmd;
}
ovtRegistry.addValue("ADD_CONDITIONAL_FORMAT", addConditionalFormatCommandAdaptRange);

function addDataValidationCommandAdaptRange(
  cmd: AddDataValidationCommand,
  applyChange: ApplyRangeChangeSheet
): AddDataValidationCommand {
  cmd.rule.criterion.values = cmd.rule.criterion.values.map((val) =>
    adaptFormulaStringRanges(cmd.sheetId, val, applyChange)
  );
  return cmd;
}
ovtRegistry.addValue("ADD_DATA_VALIDATION_RULE", addDataValidationCommandAdaptRange);

function addPivotCommandAdaptRange<Cmd extends AddPivotCommand | UpdatePivotCommand>(
  cmd: Cmd,
  applyChange: ApplyRangeChangeSheet
): Cmd {
  cmd.pivot.measures.map((msr) => {
    if (msr.computedBy) {
      msr.computedBy.formula = adaptFormulaStringRanges(
        msr.computedBy.sheetId,
        msr.computedBy.formula,
        applyChange
      );
    }
  });
  return cmd;
}
ovtRegistry.addValue("ADD_PIVOT", addPivotCommandAdaptRange);
ovtRegistry.addValue("UPDATE_PIVOT", addPivotCommandAdaptRange);
