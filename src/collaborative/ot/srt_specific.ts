import { deepCopy } from "../../helpers";
import { transformDefinition } from "../../helpers/figures/charts";
import { adaptFormulaStringRanges, adaptStringRange } from "../../helpers/formulas";
import { specificRangeTransformRegistry } from "../../registries/srt_registry";
import {
  AddConditionalFormatCommand,
  AddDataValidationCommand,
  AddPivotCommand,
  CreateChartCommand,
  UpdateCellCommand,
  UpdateChartCommand,
  UpdatePivotCommand,
} from "../../types/commands";
import { RangeAdapter } from "../../types/misc";

function updateCellCommandAdaptRange(
  cmd: UpdateCellCommand,
  applyChange: RangeAdapter
): UpdateCellCommand {
  const content = cmd.content && adaptFormulaStringRanges(cmd.sheetId, cmd.content, applyChange);
  return { ...cmd, content };
}
specificRangeTransformRegistry.add("UPDATE_CELL", updateCellCommandAdaptRange);

function addConditionalFormatCommandAdaptRange(
  cmd: AddConditionalFormatCommand,
  applyChange: RangeAdapter
): AddConditionalFormatCommand {
  const rule = cmd.cf.rule;
  cmd = { ...cmd, cf: { ...cmd.cf } };
  if (rule.type === "CellIsRule") {
    cmd.cf.rule = {
      ...rule,
      values: rule.values.map((val) => adaptFormulaStringRanges(cmd.sheetId, val, applyChange)),
    };
  } else if (rule.type === "ColorScaleRule") {
    const { minimum: min, maximum: max, midpoint: mid } = rule;
    cmd.cf.rule = {
      ...rule,
      minimum: {
        ...min,
        value: min.value && adaptFormulaStringRanges(cmd.sheetId, min.value, applyChange),
      },
      maximum: {
        ...max,
        value: max.value && adaptFormulaStringRanges(cmd.sheetId, max.value, applyChange),
      },
      midpoint: mid
        ? { ...mid, value: adaptFormulaStringRanges(cmd.sheetId, mid.value, applyChange) }
        : undefined,
    };
  } else if (rule.type === "IconSetRule") {
    const { upperInflectionPoint: uip, lowerInflectionPoint: lip } = rule;
    cmd.cf.rule = {
      ...rule,
      upperInflectionPoint: {
        ...uip,
        value: adaptFormulaStringRanges(cmd.sheetId, uip.value, applyChange),
      },
      lowerInflectionPoint: {
        ...lip,
        value: adaptFormulaStringRanges(cmd.sheetId, lip.value, applyChange),
      },
    };
  } else if (rule.type === "DataBarRule") {
    cmd.cf.rule = {
      ...rule,
      rangeValues: rule.rangeValues
        ? adaptStringRange(cmd.sheetId, rule.rangeValues, applyChange).range
        : undefined,
    };
  }
  return cmd;
}
specificRangeTransformRegistry.add("ADD_CONDITIONAL_FORMAT", addConditionalFormatCommandAdaptRange);

function addDataValidationCommandAdaptRange(
  cmd: AddDataValidationCommand,
  applyChange: RangeAdapter
): AddDataValidationCommand {
  cmd = { ...cmd, rule: { ...cmd.rule, criterion: { ...cmd.rule.criterion } } };
  cmd.rule.criterion.values = cmd.rule.criterion.values.map((val) =>
    adaptFormulaStringRanges(cmd.sheetId, val, applyChange)
  );
  return cmd;
}
specificRangeTransformRegistry.add("ADD_DATA_VALIDATION_RULE", addDataValidationCommandAdaptRange);

function addPivotCommandAdaptRange<Cmd extends AddPivotCommand | UpdatePivotCommand>(
  cmd: Cmd,
  applyChange: RangeAdapter
): Cmd {
  cmd = deepCopy(cmd);
  cmd.pivot.measures.map((measure) => {
    if (measure.computedBy) {
      measure.computedBy.formula = adaptFormulaStringRanges(
        measure.computedBy.sheetId,
        measure.computedBy.formula,
        applyChange
      );
    }
  });
  return cmd;
}
specificRangeTransformRegistry.add("ADD_PIVOT", addPivotCommandAdaptRange);
specificRangeTransformRegistry.add("UPDATE_PIVOT", addPivotCommandAdaptRange);

specificRangeTransformRegistry.add("CREATE_CHART", updateChartRangesTransformation);
specificRangeTransformRegistry.add("UPDATE_CHART", updateChartRangesTransformation);

function updateChartRangesTransformation<Cmd extends UpdateChartCommand | CreateChartCommand>(
  cmd: Cmd,
  applyChange: RangeAdapter
): Cmd {
  return {
    ...cmd,
    definition: transformDefinition(cmd.sheetId, cmd.definition, applyChange),
  };
}
