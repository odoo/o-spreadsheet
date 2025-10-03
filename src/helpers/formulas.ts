import { concat } from "@odoo/o-spreadsheet-engine/helpers/misc2";
import {
  createInvalidRange,
  createRangeFromXc,
  getRangeString,
} from "@odoo/o-spreadsheet-engine/helpers/range";
import { isSheetNameEqual } from "@odoo/o-spreadsheet-engine/helpers/sheet";
import { rangeTokenize } from "../formulas";
import { Range, RangeAdapter, UID } from "../types";
import { rangeReference, splitReference } from "./references";

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
  if (change.changeType === "NONE" || change.changeType === "REMOVE") {
    return sheetXC;
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
