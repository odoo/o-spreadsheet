import { XLSXCell, XLSXCellType, XMLAttributes, XMLString } from "../../../types/xlsx";
import { escapeXml, formatAttributes } from "../xlsx_xml";

/**
 * Phase-2: `XLSXCell` → `<c>...</c>` XML.
 * The cell's type, value, formula, shared-string index and style have
 * already been resolved by phase-1 construction.
 */
export function serializeCell(cell: XLSXCell): XMLString {
  const attributes: XMLAttributes = [["r", cell.xc]];
  if (cell.styleIndex !== undefined && cell.styleIndex !== 0) {
    attributes.push(["s", cell.styleIndex]);
  }

  const typeCode = cellTypeToCode(cell.type);

  if (cell.formula) {
    attributes.push(["cm", "1"]);
    // Formula cells get an explicit `t` — including `t="n"` — to match the
    // pre-refactor output.
    attributes.push(["t", typeCode ?? "n"]);
    const ref = cell.formula.ref ?? cell.xc;
    return escapeXml/*xml*/ `<c ${formatAttributes(attributes)}>
  <f t="array" ref="${ref}">${cell.formula.content ?? ""}</f><v>${cell.value ?? ""}</v>
</c>`;
  }

  if (typeCode) {
    attributes.push(["t", typeCode]);
  }
  const valueNode =
    cell.value !== undefined ? escapeXml/*xml*/ `<v>${cell.value}</v>` : escapeXml``;
  return escapeXml/*xml*/ `<c ${formatAttributes(attributes)}>
  ${valueNode}
</c>`;
}

/**
 * Map the long-form XLSXCellType to the short `t` attribute code. "number"
 * has no `t` attribute (it is the default in the OpenXML spec).
 */
function cellTypeToCode(type: XLSXCellType): string | undefined {
  switch (type) {
    case "number":
      return undefined;
    case "boolean":
      return "b";
    case "sharedString":
      return "s";
    case "str":
      return "str";
    case "inlineStr":
      return "inlineStr";
    case "date":
      return "d";
    case "error":
      return "e";
  }
}
