import { ApplyRangeChangeSheet, Range, UID } from "..";
import { rangeTokenize } from "../formulas";
import { concat } from "./misc";
import { RangeImpl } from "./range";
import { rangeReference, splitReference } from "./references";
import { toUnboundedZone } from "./zones";

export function adaptFormulaStringRanges(
  defaultSheetId: string,
  formula: string,
  applyChange: ApplyRangeChangeSheet
): string {
  if (!formula.startsWith("=")) {
    return formula;
  }
  const tokens = rangeTokenize(formula);
  const getSheetName = (sheetId: UID) => {
    return sheetId === applyChange.sheetId ? applyChange.sheetName ?? sheetId : sheetId;
  };
  for (let tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
    if (tokens[tokenIdx].type != "REFERENCE") {
      continue;
    }
    const range = getRange(
      tokens[tokenIdx].value,
      defaultSheetId,
      applyChange.sheetId,
      applyChange.sheetName
    );
    if (!range.sheetId) {
      continue;
    }
    const change = applyChange.applyChange(range);
    if (change.changeType != "NONE" && change.changeType != "REMOVE") {
      tokens[tokenIdx] = {
        value: change.range.getRangeString(defaultSheetId, getSheetName),
        type: "REFERENCE",
      };
    }
  }
  return concat(tokens.map((token) => token.value));
}

function getRange(
  sheetXC: string,
  defaultSheetId: UID,
  changeId?: UID,
  changeName?: string
): Range {
  if (!rangeReference.test(sheetXC)) {
    return invalidRange(sheetXC);
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

  if (sheetName && sheetName != changeName) {
    return invalidRange(sheetXC);
  }

  const unboundedZone = toUnboundedZone(xc);
  const parts = RangeImpl.getRangeParts(xc, unboundedZone);
  const invalidSheetName = sheetName;
  const sheetId = sheetName === changeName ? changeId ?? defaultSheetId : defaultSheetId;

  const rangeInterface = { prefixSheet, unboundedZone, sheetId, invalidSheetName, parts };

  return new RangeImpl(rangeInterface).orderZone();
}

function invalidRange(sheetXC: string): Range {
  return new RangeImpl({
    sheetId: "",
    unboundedZone: { left: -1, top: -1, right: -1, bottom: -1 },
    parts: [],
    invalidXc: sheetXC,
    prefixSheet: false,
  });
}
