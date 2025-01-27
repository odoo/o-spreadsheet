import {
  AddConditionalFormatCommand,
  AddDataValidationCommand,
  AddPivotCommand,
  CoreCommand,
  UID,
  UpdateCellCommand,
} from "../../../src";
import { deepCopy } from "../../../src/helpers";
import { TEST_COMMANDS } from "../../test_helpers/constants";

export function getFormulaStringCommands(
  sheetId: UID,
  formulaBefore: string,
  formulaAfter: string
): CoreCommand[][] {
  return [
    [getUpdateCellCommand(sheetId, formulaBefore), getUpdateCellCommand(sheetId, formulaAfter)],
    [getCFCommand(sheetId, formulaBefore), getCFCommand(sheetId, formulaAfter)],
    [getDVCommand(sheetId, formulaBefore), getDVCommand(sheetId, formulaAfter)],
    [getPivotCommand(sheetId, formulaBefore), getPivotCommand(sheetId, formulaAfter)],
  ];
}

function getUpdateCellCommand(sheetId: UID, formula: string): UpdateCellCommand {
  return { ...TEST_COMMANDS.UPDATE_CELL, sheetId, content: formula };
}

function getCFCommand(sheetId: UID, formula: string): AddConditionalFormatCommand {
  const cmd = deepCopy(TEST_COMMANDS.ADD_CONDITIONAL_FORMAT);
  cmd.cf.rule = {
    values: [formula],
    operator: "Equal",
    type: "CellIsRule",
    style: { fillColor: "#FF0000" },
  };
  cmd.sheetId = sheetId;
  return cmd;
}

function getDVCommand(sheetId: UID, formula: string): AddDataValidationCommand {
  const cmd = deepCopy(TEST_COMMANDS.ADD_DATA_VALIDATION_RULE);
  cmd.rule.criterion = {
    type: "isEqual",
    values: [formula],
  };
  cmd.sheetId = sheetId;
  return cmd;
}

function getPivotCommand(sheetId: UID, formula: string): AddPivotCommand {
  const cmd = deepCopy(TEST_COMMANDS.ADD_PIVOT);
  cmd.pivot.measures = [
    {
      id: "",
      fieldName: "",
      aggregator: "",
      computedBy: { sheetId, formula },
    },
  ];
  return cmd;
}
