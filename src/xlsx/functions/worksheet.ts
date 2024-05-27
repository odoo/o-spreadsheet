import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, INCORRECT_RANGE_STRING } from "../../constants";
import {
  isMarkdownLink,
  isMarkdownSheetLink,
  parseMarkdownLink,
  parseSheetLink,
  toXC,
} from "../../helpers";
import { ExcelSheetData, ExcelWorkbookData, HeaderData } from "../../types";
import { XLSXStructure, XMLAttributes, XMLString } from "../../types/xlsx";
import {
  addRelsToFile,
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

export function addRows(
  construct: XLSXStructure,
  data: ExcelWorkbookData,
  sheet: ExcelSheetData
): XMLString {
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
        if (cell.isFormula) {
          const res = addFormula(cell);
          if (!res) {
            continue;
          }
          ({ attrs: additionalAttrs, node: cellNode } = res);
        } else if (cell.content && isMarkdownLink(cell.content)) {
          const { label } = parseMarkdownLink(cell.content);
          ({ attrs: additionalAttrs, node: cellNode } = addContent(label, construct.sharedStrings));
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

export function addHyperlinks(
  construct: XLSXStructure,
  data: ExcelWorkbookData,
  sheetIndex: string
): XMLString {
  const sheet = data.sheets[sheetIndex];
  const cells = sheet.cells;
  const linkNodes: XMLString[] = [];
  for (const xc in cells) {
    const content = cells[xc]?.content;
    if (content && isMarkdownLink(content)) {
      const { label, url } = parseMarkdownLink(content);
      if (isMarkdownSheetLink(content)) {
        const sheetId = parseSheetLink(url);
        const sheet = data.sheets.find((sheet) => sheet.id === sheetId);
        const location = sheet ? `${sheet.name}!A1` : INCORRECT_RANGE_STRING;
        linkNodes.push(escapeXml/*xml*/ `
          <hyperlink display="${label}" location="${location}" ref="${xc}"/>
        `);
      } else {
        const linkRelId = addRelsToFile(
          construct.relsFiles,
          `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`,
          {
            target: url,
            type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
            targetMode: "External",
          }
        );
        linkNodes.push(escapeXml/*xml*/ `
          <hyperlink r:id="${linkRelId}" ref="${xc}"/>
        `);
      }
    }
  }
  if (!linkNodes.length) {
    return escapeXml``;
  }
  return escapeXml/*xml*/ `
    <hyperlinks>
      ${joinXmlNodes(linkNodes)}
    </hyperlinks>
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
