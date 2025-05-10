import { deepCopy } from "../../helpers";
import { adaptFormulaStringRanges, adaptStringRange } from "../../helpers/formulas";
import { specificRangeTransformRegistry } from "../../registries/srt_registry";
import { CustomizedDataSet } from "../../types";
import {
  AddConditionalFormatCommand,
  AddDataValidationCommand,
  AddPivotCommand,
  CreateChartCommand,
  UpdateCellCommand,
  UpdateChartCommand,
  UpdatePivotCommand,
} from "../../types/commands";
import { CellErrorType } from "../../types/errors";
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
  if (rule.type == "CellIsRule") {
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
        ? adaptStringRange(cmd.sheetId, rule.rangeValues, applyChange)
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

function adaptChartRange<Cmd extends CreateChartCommand | UpdateChartCommand>(
  cmd: Cmd,
  applyChange: RangeAdapter
): Cmd {
  cmd = deepCopy(cmd);
  const definition = cmd.definition;
  const type = definition.type;
  switch (type) {
    case "bar":
    case "line":
    case "combo":
    case "funnel":
    case "pie":
    case "waterfall":
    case "pyramid":
    case "radar":
    case "sunburst":
    case "treemap":
    case "geo":
      let labelRange: string | undefined;
      if (definition.labelRange) {
        const adaptedRange = adaptStringRange(cmd.sheetId, definition.labelRange, applyChange);
        if (adaptedRange !== CellErrorType.InvalidReference) {
          labelRange = adaptedRange;
        }
      }

      const dataSets: CustomizedDataSet[] = [];
      for (const dataSet of definition.dataSets) {
        const newDataSet = { ...dataSet };
        const adaptedRange = adaptStringRange(cmd.sheetId, dataSet.dataRange, applyChange);

        if (adaptedRange !== CellErrorType.InvalidReference) {
          newDataSet.dataRange = adaptedRange;
          dataSets.push(newDataSet);
        }
      }

      cmd.definition = {
        ...definition,
        dataSets,
        labelRange,
      };
      break;

    case "scorecard":
      {
        let baseline: string | undefined;
        let keyValue: string | undefined;
        if (definition.baseline) {
          const adaptedRange = adaptStringRange(cmd.sheetId, definition.baseline, applyChange);
          if (adaptedRange !== CellErrorType.InvalidReference) {
            baseline = adaptedRange;
          }
        }
        if (definition.keyValue) {
          const adaptedRange = adaptStringRange(cmd.sheetId, definition.keyValue, applyChange);
          if (adaptedRange !== CellErrorType.InvalidReference) {
            keyValue = adaptedRange;
          }
        }
        cmd.definition = {
          ...definition,
          baseline,
          keyValue,
        };
      }
      break;
    case "gauge":
      let dataRange: string | undefined;
      if (definition.dataRange) {
        const adaptedRange = adaptStringRange(cmd.sheetId, definition.dataRange, applyChange);
        if (adaptedRange !== CellErrorType.InvalidReference) {
          dataRange = adaptedRange;
        }
      }
      cmd.definition = {
        ...definition,
        dataRange,
      };

      break;
  }
  return cmd;
}

specificRangeTransformRegistry.add("CREATE_CHART", adaptChartRange);
specificRangeTransformRegistry.add("UPDATE_CHART", adaptChartRange);
