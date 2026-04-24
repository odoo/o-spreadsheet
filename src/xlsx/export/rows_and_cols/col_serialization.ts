import { XLSXColumn, XMLAttributes, XMLString } from "../../../types/xlsx";
import { escapeXml, formatAttributes, joinXmlNodes } from "../xlsx_xml";

export function serializeCols(cols: XLSXColumn[]): XMLString {
  if (!cols.length) {
    return escapeXml``;
  }
  const colNodes = cols.map((col) => {
    const attributes: XMLAttributes = [
      ["min", col.min],
      ["max", col.max],
      ["width", col.width ?? 0],
      ["customWidth", col.customWidth ? 1 : 0],
      ["hidden", col.hidden ? 1 : 0],
    ];
    if (col.outlineLevel) {
      attributes.push(["outlineLevel", col.outlineLevel]);
    }
    if (col.collapsed) {
      attributes.push(["collapsed", 1]);
    }
    return escapeXml/*xml*/ `<col ${formatAttributes(attributes)}/>`;
  });
  return escapeXml/*xml*/ `
    <cols>
      ${joinXmlNodes(colNodes)}
    </cols>
  `;
}
