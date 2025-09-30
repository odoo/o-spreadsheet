import { getCanonicalSymbolName, getUnquotedSheetName } from "./misc";

export const cellReference = new RegExp(/\$?([A-Z]{1,3})\$?([0-9]{1,7})/, "i");
const singleCellReference = new RegExp(/^\$?([A-Z]{1,3})\$?([0-9]{1,7})$/, "i");
const colHeader = new RegExp(/^\$?([A-Z]{1,3})+$/, "i");
const rowHeader = new RegExp(/^\$?([0-9]{1,7})+$/, "i");
const colReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([A-Z]{1,3})$/, "i");
const rowReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([0-9]{1,7})$/, "i");
const fullRowXc = /(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*:\s*(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*/i;
const fullColXc = /\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*:\s*\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*/i;

export const rangeReference = new RegExp(
  /^\s*('.+'!|[^']+!)?/.source +
    "(" +
    [cellReference.source, fullRowXc.source, fullColXc.source].join("|") +
    ")" +
    /$/.source,
  "i"
);

export function isColReference(xc: string): boolean {
  return colReference.test(xc);
}

export function isRowReference(xc: string): boolean {
  return rowReference.test(xc);
}

export function isColHeader(str: string): boolean {
  return colHeader.test(str);
}

export function isRowHeader(str: string): boolean {
  return rowHeader.test(str);
}

export function isSingleCellReference(xc: string): boolean {
  return singleCellReference.test(xc);
}

export function splitReference(ref: string): { sheetName?: string; xc: string } {
  if (!ref.includes("!")) {
    return { xc: ref };
  }
  const parts = ref.split("!");
  const xc = parts.pop()!;
  const sheetName = getUnquotedSheetName(parts.join("!")) || undefined;
  return { sheetName, xc };
}

export function getFullReference(sheetName: string | undefined, xc: string): string {
  return sheetName !== undefined ? `${getCanonicalSymbolName(sheetName)}!${xc}` : xc;
}
