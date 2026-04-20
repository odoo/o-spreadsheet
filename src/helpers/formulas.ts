import { rangeTokenize } from "../formulas";
import { Range, RangeAdapter, UID } from "../types";
import { CellErrorType } from "../types/errors";
import { ApplyRangeChangeResult } from "../types/misc";
import { concat } from "./misc";
import { createInvalidRange, createRangeFromXc, getRangeString } from "./range";
import { rangeReference, splitReference } from "./references";
import { isSheetNameEqual } from "./sheet";

export function adaptFormulaStringRanges(
  defaultSheetId: string,
  formula: string,
  applyChange: RangeAdapter
): string {
  if (!formula.startsWith("=")) {
    return formula;
  }
  const tokens = rangeTokenize(formula);
  for (let tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
    if (tokens[tokenIdx].type !== "REFERENCE") {
      continue;
    }
    const sheetXC = tokens[tokenIdx].value;
    const newSheetXC = adaptStringRange(defaultSheetId, sheetXC, applyChange).range;

    if (sheetXC !== newSheetXC) {
      tokens[tokenIdx] = {
        value: newSheetXC,
        type: "REFERENCE",
      };
    }
  }
  return concat(tokens.map((token) => token.value));
}

export function adaptStringRange(
  defaultSheetId: UID,
  sheetXC: string,
  rangeAdapter: RangeAdapter
): ApplyRangeChangeResult<string> {
  const sheetName = splitReference(sheetXC).sheetName;
  if (
    sheetName
      ? !isSheetNameEqual(sheetName, rangeAdapter.sheetName.old)
      : defaultSheetId !== rangeAdapter.sheetId
  ) {
    return { changeType: "NONE", range: sheetXC };
  }
  const sheetId = sheetName ? rangeAdapter.sheetId : defaultSheetId;

  const range = getRange(sheetXC, sheetId);
  if (range.invalidXc) {
    return { changeType: "NONE", range: sheetXC };
  }

  const change = rangeAdapter.applyChange(range);
  if (change.changeType === "NONE" || change.changeType === "REMOVE") {
    return { changeType: change.changeType, range: sheetXC };
  }
  const rangeStr = getRangeString(change.range, defaultSheetId, getSheetNameGetter(rangeAdapter));
  if (rangeStr === CellErrorType.InvalidReference) {
    return { changeType: "REMOVE", range: rangeStr };
  }
  return {
    changeType: change.changeType,
    range: rangeStr,
  };
}

function getSheetNameGetter(applyChange: RangeAdapter) {
  return (sheetId: UID): string => {
    return sheetId === applyChange.sheetId ? applyChange.sheetName.current : "";
  };
}

function defaultGetSheetSize(sheetId: UID) {
  return { numberOfRows: Number.MAX_SAFE_INTEGER, numberOfCols: Number.MAX_SAFE_INTEGER };
}

function getRange(sheetXC: string, sheetId: UID): Range {
  if (!rangeReference.test(sheetXC)) {
    return createInvalidRange(sheetXC);
  }
  return createRangeFromXc({ xc: sheetXC, sheetId }, defaultGetSheetSize);
}
