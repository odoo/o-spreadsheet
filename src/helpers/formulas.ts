import { rangeTokenize } from "../formulas";
import { Range, RangeAdapter, UID, ZoneDimension } from "../types";
import { CellErrorType } from "../types/errors";
import { concat } from "./misc";
import { RangeImpl } from "./range";
import { rangeReference, splitReference } from "./references";
import { toUnboundedZone } from "./zones";

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
  defaultSheetId: string,
  sheetXC: string,
  applyChange: RangeAdapter
): string {
  const sheetName = splitReference(sheetXC).sheetName;
  if (sheetName ? sheetName !== applyChange.sheetName : defaultSheetId !== applyChange.sheetId) {
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

  const newSheetXC = change.range.getRangeString(defaultSheetId, getSheetNameGetter(applyChange));
  return newSheetXC === CellErrorType.InvalidReference ? sheetXC : newSheetXC;
}

function getSheetNameGetter(applyChange: RangeAdapter) {
  return (sheetId: UID): string => {
    return sheetId === applyChange.sheetId ? applyChange.sheetName : "";
  };
}

function defaultGetSheetSize(sheetId: UID) {
  return { numberOfRows: Number.MAX_SAFE_INTEGER, numberOfCols: Number.MAX_SAFE_INTEGER };
}

function getRange(sheetXC: string, sheetId: UID): Range {
  if (!rangeReference.test(sheetXC)) {
    return invalidRange(sheetXC, defaultGetSheetSize);
  }

  let sheetName: string | undefined;
  let xc = sheetXC;
  let prefixSheet = false;
  if (sheetXC.includes("!")) {
    ({ xc, sheetName } = splitReference(sheetXC));
    if (sheetName) {
      prefixSheet = true;
    }
  }

  const unboundedZone = toUnboundedZone(xc);
  const parts = RangeImpl.getRangeParts(xc, unboundedZone);

  const rangeInterface = { prefixSheet, unboundedZone, sheetId, invalidSheetName: "", parts };

  return new RangeImpl(rangeInterface, defaultGetSheetSize).orderZone();
}

function invalidRange(sheetXC: string, getSheetSize: (sheetId: UID) => ZoneDimension): Range {
  return new RangeImpl(
    {
      sheetId: "",
      unboundedZone: { left: -1, top: -1, right: -1, bottom: -1 },
      parts: [],
      invalidXc: sheetXC,
      prefixSheet: false,
    },
    getSheetSize
  );
}
