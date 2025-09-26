import { rangeTokenize } from "../formulas";
import { Range, RangeAdapter, UID } from "../types";
import { CellErrorType } from "../types/errors";
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
    if (tokens[tokenIdx].type != "REFERENCE") {
      continue;
    }
    const sheetXC = tokens[tokenIdx].value;
    const newSheetXC = adaptStringRange(defaultSheetId, sheetXC, applyChange);

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
  applyChange: RangeAdapter
): string {
  const sheetName = splitReference(sheetXC).sheetName;
  if (
    sheetName
      ? !isSheetNameEqual(sheetName, applyChange.sheetName.old)
      : defaultSheetId !== applyChange.sheetId
  ) {
    return sheetXC;
  }
  const sheetId = sheetName ? applyChange.sheetId : defaultSheetId;

  const range = getRange(sheetXC, sheetId);
  if (range.invalidXc) {
    return sheetXC;
  }

  const change = applyChange.applyChange(range);
  if (change.changeType === "NONE") {
    return sheetXC;
  }
  if (change.changeType === "REMOVE") {
    return CellErrorType.InvalidReference;
  }

  return getRangeString(change.range, defaultSheetId, getSheetNameGetter(applyChange));
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
