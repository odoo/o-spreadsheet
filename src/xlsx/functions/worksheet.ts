import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { toXC } from "../../helpers";
import { ExcelSheetData, ExcelWorkbookData, HeaderData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import {
  convertHeight,
  convertWidth,
  extractStyle,
  normalizeStyle,
} from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes } from "../helpers/xml_helpers";
import { addContent, addFormula } from "./cells";

export function addColumns(cols: { [key: number]: HeaderData }): XMLString {
  if (!Object.values(cols).length) {
    return escapeXml``;
  }
  const colNodes: XMLString[] = [];
  for (let [id, col] of Object.entries(cols)) {
    // Always force our own col width
    const attributes: XMLAttributes = [
      ["min", parseInt(id) + 1],
      ["max", parseInt(id) + 1],
      ["width", convertWidth(col.size || DEFAULT_CELL_WIDTH)],
      ["customWidth", 1],
      ["hidden", col.isHidden ? 1 : 0],
    ];
    colNodes.push(escapeXml/*xml*/ `
      <col ${formatAttributes(attributes)}/>
    `);
  }
  return escapeXml/*xml*/ `
    <cols>
      ${joinXmlNodes(colNodes)}
    </cols>
  `;
}

export function addRows(construct, data: ExcelWorkbookData, sheet: ExcelSheetData): XMLString {
  const rowNodes: XMLString[] = [];
  for (let r = 0; r < sheet.rowNumber; r++) {
    const rowAttrs: XMLAttributes = [["r", r + 1]];
    const row = sheet.rows[r] || {};
    // Always force our own row height
    rowAttrs.push(
      ["ht", convertHeight(row.size || DEFAULT_CELL_HEIGHT)],
      ["customHeight", 1],
      ["hidden", row.isHidden ? 1 : 0]
    );
    const cellNodes: XMLString[] = [];
    for (let c = 0; c < sheet.colNumber; c++) {
      const xc = toXC(c, r);
      const cell = sheet.cells[xc];
      if (cell) {
        const attributes: XMLAttributes = [["r", xc]];

        // style
        const id = normalizeStyle(construct, extractStyle(cell, data));
        attributes.push(["s", id]);

        let additionalAttrs: XMLAttributes = [];
        let cellNode = escapeXml``;
        // Either formula or static value inside the cell
        if (cell.formula) {
          ({ attrs: additionalAttrs, node: cellNode } = addFormula(cell.formula));
        } else if (cell.content && cell.content !== "") {
          ({ attrs: additionalAttrs, node: cellNode } = addContent(
            cell.content,
            construct.sharedStrings
          ));
        }
        attributes.push(...additionalAttrs);
        cellNodes.push(escapeXml/*xml*/ `
          <c ${formatAttributes(attributes)}>
            ${cellNode}
          </c>
        `);
      }
    }
    if (cellNodes.length) {
      rowNodes.push(escapeXml/*xml*/ `
        <row ${formatAttributes(rowAttrs)}>
          ${joinXmlNodes(cellNodes)}
        </row>
      `);
    }
  }
  return escapeXml/*xml*/ `
    <sheetData>
      ${joinXmlNodes(rowNodes)}
    </sheetData>
  `;
}

export function addMerges(merges: string[]): XMLString {
  if (merges.length) {
    const mergeNodes = merges.map((merge) => escapeXml/*xml*/ `<mergeCell ref="${merge}" />`);
    return escapeXml/*xml*/ `
      <mergeCells count="${merges.length}">
        ${joinXmlNodes(mergeNodes)}
      </mergeCells>
    `;
  } else return escapeXml``;
}
