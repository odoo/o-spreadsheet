import { XLSXRow, XMLAttributes, XMLString } from "../../../types/xlsx";
import { serializeCell } from "../cells/cell_serialization";
import { escapeXml, formatAttributes, joinXmlNodes } from "../xlsx_xml";

export function serializeRows(rows: XLSXRow[]): XMLString {
  const rowNodes: XMLString[] = [];
  for (const row of rows) {
    const rowAttrs: XMLAttributes = [["r", row.index]];
    if (row.height !== undefined) {
      rowAttrs.push(["ht", row.height], ["customHeight", 1]);
    }
    if (row.hidden) {
      rowAttrs.push(["hidden", 1]);
    }
    if (row.outlineLevel) {
      rowAttrs.push(["outlineLevel", row.outlineLevel]);
    }
    if (row.collapsed) {
      rowAttrs.push(["collapsed", 1]);
    }

    const cellNodes = row.cells.map(serializeCell);
    rowNodes.push(escapeXml/*xml*/ `
      <row ${formatAttributes(rowAttrs)}>
        ${joinXmlNodes(cellNodes)}
      </row>
    `);
  }
  return escapeXml/*xml*/ `
    <sheetData>
      ${joinXmlNodes(rowNodes)}
    </sheetData>
  `;
}
