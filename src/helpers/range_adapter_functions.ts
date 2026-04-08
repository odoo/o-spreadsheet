import {
  ApplyRangeChange,
  ApplyRenameNamedRange,
  CoreCommand,
  Range,
  RangeAdapter,
  RangeAdapterFunctions,
  UID,
} from "..";
import { adaptFormulaString, adaptStringRange } from "./formulas";
import { rangeAdapterRegistry } from "./range";
import { isZoneValid } from "./zones";

export function getRangeAdapterFunctions(
  executedCommand: CoreCommand
): RangeAdapterFunctions | undefined {
  const rangeAdapterMaybe = rangeAdapterRegistry.get(executedCommand.type)?.(executedCommand);
  const namedRangeAdapterMaybe = getNamedRangeAdapter(executedCommand);
  if (!rangeAdapterMaybe && !namedRangeAdapterMaybe) {
    return undefined;
  }
  const rangeAdapter = rangeAdapterMaybe || getIdentityRangeAdapter();
  const namedRangeAdapter = namedRangeAdapterMaybe || ((name) => name);
  const applyChange = verifyRangeRemoved(rangeAdapter.applyChange);
  return {
    applyChange,
    adaptRangeString: (defaultSheetId: UID, sheetXC: string) =>
      adaptStringRange(defaultSheetId, sheetXC, rangeAdapter),
    adaptFormulaString: (defaultSheetId: UID, formula: string) =>
      adaptFormulaString(defaultSheetId, formula, rangeAdapter, namedRangeAdapter),
    adaptCompiledFormula: (compiledFormula) =>
      compiledFormula.adaptCompiledFormula(applyChange, namedRangeAdapter),
  };
}

/**
 * Return a modified adapting function that verifies that after adapting a range, the range is still valid.
 * Any range that gets adapted by the function adaptRange in parameter does so
 * without caring if the start and end of the range in both row and column
 * direction can be incorrect. This function ensure that an incorrect range gets removed.
 */
function verifyRangeRemoved(adaptRange: ApplyRangeChange): ApplyRangeChange {
  return (range: Range) => {
    const result = adaptRange(range);
    if (result.changeType !== "NONE" && !isZoneValid(result.range.zone)) {
      return { range: result.range, changeType: "REMOVE" };
    }
    return result;
  };
}

function getIdentityRangeAdapter(): RangeAdapter {
  return {
    applyChange: (range) => ({ changeType: "NONE", range }),
    sheetId: "ignoredSheetId",
    sheetName: { old: "ignoredSheetName", current: "ignoredSheetName" },
  };
}

function getNamedRangeAdapter(cmd: CoreCommand): ApplyRenameNamedRange | undefined {
  if (cmd.type !== "UPDATE_NAMED_RANGE") {
    return;
  }
  const lowerCaseOldName = cmd.oldRangeName.toLowerCase();
  return (currentRangeName: string) => {
    return currentRangeName.toLowerCase() === lowerCaseOldName
      ? cmd.newRangeName
      : currentRangeName;
  };
}
