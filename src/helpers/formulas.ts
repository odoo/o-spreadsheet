import { ApplyRangeChangeSheet, CellErrorType, SheetXC } from "..";
import { rangeTokenize } from "../formulas";
import { RangeStringOptions } from "../plugins/core";
import { HeaderIndex } from "../types/misc";
import { numberToLetters } from "./coordinates";
import { concat } from "./misc";
import { isRowReference, rangeReference, splitReference } from "./references";
import { toUnboundedZone } from "./zones";

export function adaptFormulaStringRanges(
  formula: string,
  applyChange: ApplyRangeChangeSheet
): string {
  if (!formula.startsWith("=")) {
    return formula;
  }
  const tokens = rangeTokenize(formula);
  for (let tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
    if (tokens[tokenIdx].type != "REFERENCE") {
      continue;
    }
    const sheetXC = stringToSheetXC(formula);
    if (!sheetXC) {
      continue;
    }
    const change = applyChange.applyChange(sheetXC);
    if (change.changeType != "NONE" && change.changeType != "REMOVE") {
      const newValue = sheetXCToString(change.sheetXC);
      if (newValue != CellErrorType.InvalidReference) {
        tokens[tokenIdx] = {
          value: newValue,
          type: "REFERENCE",
        };
      }
    }
  }
  return concat(tokens.map((token) => token.value));
}

export function stringToSheetXC(sheetXC: string): SheetXC | undefined {
  if (!rangeReference.test(sheetXC)) {
    return;
  }

  let sheetName: string | undefined;
  let xc = sheetXC;
  if (sheetXC.includes("!")) {
    ({ xc, sheetName } = splitReference(sheetXC));
  }

  const zone = toUnboundedZone(xc);
  const parts = xc.split(":").map((p) => {
    const isFullRow = isRowReference(p);
    return {
      colFixed: isFullRow ? false : p.startsWith("$"),
      rowFixed: isFullRow ? p.startsWith("$") : p.includes("$", 1),
    };
  });

  if (zone.bottom === undefined) {
    parts[0].rowFixed = parts[0].rowFixed || parts[1].rowFixed;
    parts[1].rowFixed = parts[0].rowFixed;
  }
  if (zone.right === undefined) {
    parts[0].colFixed = parts[0].colFixed || parts[1].colFixed;
    parts[1].colFixed = parts[0].colFixed;
  }

  return {
    sheetName,
    zone,
    parts,
  };
}

export function sheetXCToString(
  sheetXC: SheetXC,
  options: RangeStringOptions = { useBoundedReference: false, useFixedReference: false },
  sheetSize: { row: HeaderIndex; col: HeaderIndex } | undefined = undefined
): string {
  let invalid = sheetXC.zone.left < 0 || sheetXC.zone.top < 0;
  invalid = invalid || sheetXC.zone.bottom ? sheetXC.zone.bottom! < sheetXC.zone.top : false;
  invalid = invalid || sheetXC.zone.right ? sheetXC.zone.right! < sheetXC.zone.left : false;

  if (invalid) {
    return CellErrorType.InvalidReference;
  }
  const colFixed0 = sheetXC.parts[0].colFixed || options.useFixedReference ? "$" : "";
  const col0 = numberToLetters(sheetXC.zone.left);
  const rowFixed0 = sheetXC.parts[0].rowFixed || options.useFixedReference ? "$" : "";
  const row0 = String(sheetXC.zone.top + 1);

  let rangeString = "";
  if (
    sheetXC.zone.bottom === undefined &&
    !options.useBoundedReference &&
    !sheetXC.zone.hasHeader
  ) {
    rangeString = colFixed0 + col0;
  } else if (
    sheetXC.zone.right === undefined &&
    !options.useBoundedReference &&
    !sheetXC.zone.hasHeader
  ) {
    rangeString = rowFixed0 + row0;
  } else {
    rangeString = colFixed0 + col0 + rowFixed0 + row0;
  }

  if (
    sheetXC.zone.top !== sheetXC.zone.bottom ||
    sheetXC.zone.left !== sheetXC.zone.right ||
    sheetXC.parts[0].rowFixed !== sheetXC.parts[1].rowFixed ||
    sheetXC.parts[0].colFixed !== sheetXC.parts[1].colFixed
  ) {
    rangeString += ":";

    const colFixed1 = sheetXC.parts[1].colFixed || options.useBoundedReference ? "$" : "";
    const col1 = (sheetXC.zone.right && numberToLetters(sheetXC.zone.right)) || sheetSize?.col;
    const rowFixed1 = sheetXC.parts[1].rowFixed || options.useFixedReference ? "$" : "";
    const row1 = (sheetXC.zone.bottom && String(sheetXC.zone.bottom + 1)) || sheetSize?.row;

    if (options.useBoundedReference && col1 && row1) {
      rangeString += colFixed1 + col1 + rowFixed1 + row1;
    } else if (sheetXC.zone.right === undefined) {
      rangeString += colFixed1 + col1;
    } else if (sheetXC.zone.bottom === undefined) {
      rangeString += rowFixed1 + row1;
    } else {
      rangeString += colFixed1 + col1 + rowFixed1 + row1;
    }
  }

  return `${sheetXC.sheetName ? sheetXC.sheetName + "!" : ""}${rangeString}`;
}
