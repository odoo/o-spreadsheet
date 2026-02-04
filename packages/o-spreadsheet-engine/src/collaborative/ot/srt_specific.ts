import { MyChart } from "../../helpers/figures/chart";
import { deepCopy } from "../../helpers/misc";
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
import { RangeAdapterFunctions } from "../../types/misc";

function updateCellCommandAdaptRange(
  cmd: UpdateCellCommand,
  { adaptFormulaString }: RangeAdapterFunctions
): UpdateCellCommand {
  const content = cmd.content && adaptFormulaString(cmd.sheetId, cmd.content);
  return { ...cmd, content };
}
specificRangeTransformRegistry.add("UPDATE_CELL", updateCellCommandAdaptRange);

function addConditionalFormatCommandAdaptRange(
  cmd: AddConditionalFormatCommand,
  { adaptRangeString, adaptFormulaString }: RangeAdapterFunctions
): AddConditionalFormatCommand {
  const rule = cmd.cf.rule;
  cmd = { ...cmd, cf: { ...cmd.cf } };
  if (rule.type === "CellIsRule") {
    cmd.cf.rule = {
      ...rule,
      values: rule.values.map((val) => adaptFormulaString(cmd.sheetId, val)),
    };
  } else if (rule.type === "ColorScaleRule") {
    const { minimum: min, maximum: max, midpoint: mid } = rule;
    cmd.cf.rule = {
      ...rule,
      minimum: {
        ...min,
        value: min.value && adaptFormulaString(cmd.sheetId, min.value),
      },
      maximum: {
        ...max,
        value: max.value && adaptFormulaString(cmd.sheetId, max.value),
      },
      midpoint: mid ? { ...mid, value: adaptFormulaString(cmd.sheetId, mid.value) } : undefined,
    };
  } else if (rule.type === "IconSetRule") {
    const { upperInflectionPoint: uip, lowerInflectionPoint: lip } = rule;
    cmd.cf.rule = {
      ...rule,
      upperInflectionPoint: {
        ...uip,
        value: adaptFormulaString(cmd.sheetId, uip.value),
      },
      lowerInflectionPoint: {
        ...lip,
        value: adaptFormulaString(cmd.sheetId, lip.value),
      },
    };
  } else if (rule.type === "DataBarRule") {
    cmd.cf.rule = {
      ...rule,
      rangeValues: rule.rangeValues
        ? adaptRangeString(cmd.sheetId, rule.rangeValues).range
        : undefined,
    };
  }
  return cmd;
}
specificRangeTransformRegistry.add("ADD_CONDITIONAL_FORMAT", addConditionalFormatCommandAdaptRange);

function addDataValidationCommandAdaptRange(
  cmd: AddDataValidationCommand,
  { adaptFormulaString }: RangeAdapterFunctions
): AddDataValidationCommand {
  cmd = { ...cmd, rule: { ...cmd.rule, criterion: { ...cmd.rule.criterion } } };
  cmd.rule.criterion.values = cmd.rule.criterion.values.map((val) =>
    adaptFormulaString(cmd.sheetId, val)
  );
  return cmd;
}
specificRangeTransformRegistry.add("ADD_DATA_VALIDATION_RULE", addDataValidationCommandAdaptRange);

function addPivotCommandAdaptRange<Cmd extends AddPivotCommand | UpdatePivotCommand>(
  cmd: Cmd,
  { adaptFormulaString }: RangeAdapterFunctions
): Cmd {
  cmd = deepCopy(cmd);
  cmd.pivot.measures.map((measure) => {
    if (measure.computedBy) {
      measure.computedBy.formula = adaptFormulaString(
        measure.computedBy.sheetId,
        measure.computedBy.formula
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
  rangeAdapters: RangeAdapterFunctions
): Cmd {
  return {
    ...cmd,
    definition: MyChart.transformDefinition(cmd.sheetId, cmd.definition, rangeAdapters),
  };
}
