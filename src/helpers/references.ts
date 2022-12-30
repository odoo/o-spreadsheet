/**
 * Regex that detect cell reference and a range reference (without the sheetName)
 */
export const cellReference = new RegExp(/\$?([A-Z]{1,3})\$?([0-9]{1,7})/, "i");
export const rangeReference = new RegExp(
  /^\s*(.*!)?\$?[A-Z]{1,3}\$?[0-9]{1,7}\s*(\s*:\s*\$?[A-Z]{1,3}\$?[0-9]{1,7}\s*)?$/,
  "i"
);

export function splitReference(ref: string): { sheetName?: string; xc: string } {
  const parts = ref.split("!");
  const xc = parts.pop()!;
  const sheetName = parts.join("!") || undefined;
  return { sheetName, xc };
}
