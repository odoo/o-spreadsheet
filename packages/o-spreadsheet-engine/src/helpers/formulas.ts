import { isFuncallToken } from "../formulas/parser";
import { rangeTokenize } from "../formulas/range_tokenizer";
import { Token } from "../formulas/tokenizer";
import { CellErrorType } from "../types/errors";
import { ApplyRangeChangeResult, ApplyRenameNamedRange, RangeAdapter, UID } from "../types/misc";
import { Range } from "../types/range";
import { concat } from "./misc";
import { createInvalidRange, createRangeFromXc, getRangeString } from "./range";
import { rangeReference, splitReference } from "./references";
import { isSheetNameEqual } from "./sheet";

export function adaptFormulaString(
  defaultSheetId: string,
  formula: string,
  applyChange: RangeAdapter,
  namedRangeAdapter: ApplyRenameNamedRange
): string {
  const adaptedFormulaStringRanges = adaptFormulaStringRanges(defaultSheetId, formula, applyChange);
  return adaptFormulaStringNamedRanges(adaptedFormulaStringRanges, namedRangeAdapter);
}

function adaptFormulaStringRanges(
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

export function canBeNamedRangeToken(tokens: Token[], tokenIndex: number): boolean {
  const token = tokens[tokenIndex];

  let nextNonSpaceToken: Token | undefined = undefined;
  for (let i = tokenIndex + 1; i < tokens.length; i++) {
    if (tokens[i].type !== "SPACE") {
      nextNonSpaceToken = tokens[i];
      break;
    }
  }

  return token.type === "SYMBOL" && !isFuncallToken(token, nextNonSpaceToken);
}

function adaptFormulaStringNamedRanges(
  formula: string,
  namedRangeAdapter: ApplyRenameNamedRange
): string {
  if (!formula.startsWith("=")) {
    return formula;
  }
  const tokens = rangeTokenize(formula);

  const newTokens: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let newToken = tokens[i];
    if (canBeNamedRangeToken(tokens, i)) {
      const newName = namedRangeAdapter(tokens[i].value);
      if (newName !== tokens[i].value) {
        newToken = { ...tokens[i], value: newName };
      }
    }
    newTokens.push(newToken);
  }

  return concat(newTokens.map((token) => token.value));
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
