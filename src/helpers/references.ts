/** Reference of a cell (eg. A1, $B$5) */
export const cellReference = new RegExp(/\$?([A-Z]{1,3})\$?([0-9]{1,7})/, "i");

/** Reference of a column (eg. A, CA) */
export const colReference = new RegExp(/^\$?([A-Z]{1,3})$/, "i");

/** Reference of a row (eg. 1, 59) */
export const rowReference = new RegExp(/^\$?([0-9]{1,7})$/, "i");

/** Reference of a bound range, ie. a range that doesn't contain a full row/column (eg. A1:B1, $A3:$B$2) */
export const boundRangeXc = /\$?[A-Z]{1,3}\$?[0-9]{1,7}\s*(\s*:\s*\$?[A-Z]{1,3}\$?[0-9]{1,7}\s*)?/i;

/** Reference of a normal range or a full row range (eg. A1:B1, 1:$5, $A2:5) */
const fullRowXc = /(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*:\s*(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*/i;

/** Reference of a normal range or a column row range (eg. A1:B1, A:$B, $A1:C) */
const fullColXc = /\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*:\s*\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*/i;

/** Reference of a cell or a range, it can be a bound range, a full row or a full column */
export const rangeReference = new RegExp(
  /^\s*(.*!)?/.source +
    "(" +
    [cellReference.source, fullRowXc.source, fullColXc.source].join("|") +
    ")" +
    /$/.source,
  "i"
);

// Return true if the given xc is the reference of a column (eg. A or AC)
export function isColumnReference(xc: string) {
  return colReference.test(xc);
}
