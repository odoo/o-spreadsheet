import { transformDefinition } from "../../helpers/figures/charts/chart_factory";
import { adaptFormulaString, adaptStringRange } from "../../helpers/formulas";
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
import { ApplyRenameNamedRange, RangeAdapter } from "../../types/misc";

function updateCellCommandAdaptRange(
  cmd: UpdateCellCommand,
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): UpdateCellCommand {
  const content =
    cmd.content && adaptFormulaString(cmd.sheetId, cmd.content, applyChange, namedRangeAdapter);
  return { ...cmd, content };
}
specificRangeTransformRegistry.add("UPDATE_CELL", updateCellCommandAdaptRange);

function addConditionalFormatCommandAdaptRange(
  cmd: AddConditionalFormatCommand,
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): AddConditionalFormatCommand {
  const rule = cmd.cf.rule;
  cmd = { ...cmd, cf: { ...cmd.cf } };
  if (rule.type === "CellIsRule") {
    cmd.cf.rule = {
      ...rule,
      values: rule.values.map((val) =>
        adaptFormulaString(cmd.sheetId, val, applyChange, namedRangeAdapter)
      ),
    };
  } else if (rule.type === "ColorScaleRule") {
    const { minimum: min, maximum: max, midpoint: mid } = rule;
    cmd.cf.rule = {
      ...rule,
      minimum: {
        ...min,
        value:
          min.value && adaptFormulaString(cmd.sheetId, min.value, applyChange, namedRangeAdapter),
      },
      maximum: {
        ...max,
        value:
          max.value && adaptFormulaString(cmd.sheetId, max.value, applyChange, namedRangeAdapter),
      },
      midpoint: mid
        ? {
            ...mid,
            value: adaptFormulaString(cmd.sheetId, mid.value, applyChange, namedRangeAdapter),
          }
        : undefined,
    };
  } else if (rule.type === "IconSetRule") {
    const { upperInflectionPoint: uip, lowerInflectionPoint: lip } = rule;
    cmd.cf.rule = {
      ...rule,
      upperInflectionPoint: {
        ...uip,
        value: adaptFormulaString(cmd.sheetId, uip.value, applyChange, namedRangeAdapter),
      },
      lowerInflectionPoint: {
        ...lip,
        value: adaptFormulaString(cmd.sheetId, lip.value, applyChange, namedRangeAdapter),
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
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): AddDataValidationCommand {
  cmd = { ...cmd, rule: { ...cmd.rule, criterion: { ...cmd.rule.criterion } } };
  cmd.rule.criterion.values = cmd.rule.criterion.values.map((val) =>
    adaptFormulaString(cmd.sheetId, val, applyChange, namedRangeAdapter)
  );
  return cmd;
}
specificRangeTransformRegistry.add("ADD_DATA_VALIDATION_RULE", addDataValidationCommandAdaptRange);

function addPivotCommandAdaptRange<Cmd extends AddPivotCommand | UpdatePivotCommand>(
  cmd: Cmd,
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): Cmd {
  cmd = deepCopy(cmd);
  cmd.pivot.measures.map((measure) => {
    if (measure.computedBy) {
      measure.computedBy.formula = adaptFormulaString(
        measure.computedBy.sheetId,
        measure.computedBy.formula,
        applyChange,
        namedRangeAdapter
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
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): Cmd {
  return {
    ...cmd,
    definition: transformDefinition(cmd.sheetId, cmd.definition, applyChange, namedRangeAdapter),
  };
}
