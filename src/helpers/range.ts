import { CoreGetters, Range, UID } from "../types";

/**
 * Copy a range. If the range is on the sheetIdFrom, the range will target
 * sheetIdTo.
 */
export function copyRangeWithNewSheetId(sheetIdFrom: UID, sheetIdTo: UID, range: Range): Range {
  return {
    ...range,
    sheetId: range.sheetId === sheetIdFrom ? sheetIdTo : range.sheetId,
  };
}

/**
 * Create a range from a xc. If the xc is empty, this function returns undefined.
 */
export function createRange(getters: CoreGetters, sheetId: UID, range?: string): Range | undefined {
  return range ? getters.getRangeFromSheetXC(sheetId, range) : undefined;
}
