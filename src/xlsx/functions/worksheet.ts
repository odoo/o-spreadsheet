import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import {
  isInside,
  isMarkdownLink,
  isSheetUrl,
  isTextFormat,
  parseMarkdownLink,
  parseSheetUrl,
  toXC,
  toZone,
} from "../../helpers";
import { withHttps } from "../../helpers/links";
import { ExcelHeaderData, ExcelSheetData, ExcelWorkbookData } from "../../types";
import { CellErrorType } from "../../types/errors";
import { XLSXStructure, XMLAttributes, XMLString } from "../../types/xlsx";
import { XLSX_RELATION_TYPE } from "../constants";
import { toXlsxHexColor } from "../helpers/colors";
import {
  addRelsToFile,
  convertHeightToExcel,
  convertWidthToExcel,
  extractStyle,
  normalizeStyle,
} from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes } from "../helpers/xml_helpers";
import { HeaderIndex } from "./../../types/misc";
import { addContent, addFormula } from "./cells";

export function addColumns(cols: { [key: number]: ExcelHeaderData }): XMLString {
  if (!Object.values(cols).length) {
    return escapeXml``;
  }
  const colNodes: XMLString[] = [];
  for (let [id, col] of Object.entries(cols)) {
    // Always force our own col width
    const attributes: XMLAttributes = [
      ["min", parseInt(id) + 1],
      ["max", parseInt(id) + 1],
      ["width", convertWidthToExcel(col.size || DEFAULT_CELL_WIDTH)],
      ["customWidth", 1],
      ["hidden", col.isHidden ? 1 : 0],
    ];
    if (col.outlineLevel) {
      attributes.push(["outlineLevel", col.outlineLevel]);
    }
    if (col.collapsed) {
      attributes.push(["collapsed", 1]);
    }
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
    if (row.size && row.size !== DEFAULT_CELL_HEIGHT) {
      rowAttrs.push(["ht", convertHeightToExcel(row.size)], ["customHeight", 1]);
    }
    if (row.isHidden) {
      rowAttrs.push(["hidden", 1]);
    }
    if (row.outlineLevel) {
      rowAttrs.push(["outlineLevel", row.outlineLevel]);
    }
    if (row.collapsed) {
      rowAttrs.push(["collapsed", 1]);
    }

    const cellNodes: XMLString[] = [];
    for (let c = 0; c < sheet.colNumber; c++) {
      const xc = toXC(c, r);
      const cell = sheet.cells[xc];
      if (cell) {
        const attributes: XMLAttributes = [["r", xc]];

        // style
        const id = normalizeStyle(construct, extractStyle(cell, data));
        // don't add style if default
        if (id) {
          attributes.push(["s", id]);
        }

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
          const isTableHeader = isCellTableHeader(c, r, sheet);
          const isTableTotal = isCellTableTotal(c, r, sheet);
          const isPlainText = !!(cell.format && isTextFormat(data.formats[cell.format]));
          ({ attrs: additionalAttrs, node: cellNode } = addContent(
            cell.content,
            construct.sharedStrings,
            isTableHeader || isTableTotal || isPlainText
          ));
        }
        attributes.push(...additionalAttrs);
        // prettier-ignore
        cellNodes.push(escapeXml/*xml*/ `<c ${formatAttributes(attributes)}>
  ${cellNode}
</c>`);
      }
    }
    if (
      cellNodes.length ||
      row.size !== DEFAULT_CELL_HEIGHT ||
      row.isHidden ||
      row.outlineLevel ||
      row.collapsed
    ) {
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

function isCellTableHeader(col: HeaderIndex, row: HeaderIndex, sheet: ExcelSheetData): boolean {
  return sheet.tables.some((table) => {
    const zone = toZone(table.range);
    const headerZone = { ...zone, bottom: zone.top };
    return isInside(col, row, headerZone);
  });
}

function isCellTableTotal(col: HeaderIndex, row: HeaderIndex, sheet: ExcelSheetData): boolean {
  return sheet.tables.some((table) => {
    if (!table.config.totalRow) {
      return false;
    }
    const zone = toZone(table.range);
    const totalZone = { ...zone, top: zone.bottom };
    return isInside(col, row, totalZone);
  });
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
      if (isSheetUrl(url)) {
        const sheetId = parseSheetUrl(url);
        const sheet = data.sheets.find((sheet) => sheet.id === sheetId);
        const position = sheet ? `${sheet.name}!A1` : CellErrorType.InvalidReference;
        const hyperlinkAttributes: XMLAttributes = [
          ["display", label],
          ["location", position],
          ["ref", xc],
        ];
        linkNodes.push(escapeXml/*xml*/ `
          <hyperlink ${formatAttributes(hyperlinkAttributes)}/>
        `);
      } else {
        const linkRelId = addRelsToFile(
          construct.relsFiles,
          `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`,
          {
            target: withHttps(url),
            type: XLSX_RELATION_TYPE.hyperlink,
            targetMode: "External",
          }
        );
        const hyperlinkAttributes: XMLAttributes = [
          ["r:id", linkRelId],
          ["ref", xc],
        ];
        linkNodes.push(escapeXml/*xml*/ `
          <hyperlink ${formatAttributes(hyperlinkAttributes)}/>
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

export function addSheetViews(sheet: ExcelSheetData) {
  const panes = sheet.panes;
  let splitPanes: XMLString = escapeXml/*xml*/ ``;
  if (panes && (panes.xSplit || panes.ySplit)) {
    const xc = toXC(panes.xSplit, panes.ySplit);
    //workbookViewId should be defined in the workbook file but it seems like Excel has a default behaviour.
    const xSplit = panes.xSplit ? escapeXml`xSplit="${panes.xSplit}"` : "";
    const ySplit = panes.ySplit ? escapeXml`ySplit="${panes.ySplit}"` : "";
    const topRight = panes.xSplit ? escapeXml`<selection pane="topRight"/>` : "";
    const bottomLeft = panes.ySplit ? escapeXml`<selection pane="bottomLeft"/>` : "";
    const bottomRight =
      panes.xSplit && panes.ySplit ? escapeXml`<selection pane="bottomRight"/>` : "";

    splitPanes = escapeXml/*xml*/ `
    <pane
      ${xSplit}
      ${ySplit}
      topLeftCell="${xc}"
      activePane="${panes.xSplit ? (panes.ySplit ? "bottomRight" : "topRight") : "bottomLeft"}"
      state="frozen"/>
      ${topRight}
      ${bottomLeft}
      ${bottomRight}
    `;
  }

  const sheetViewAttrs: XMLAttributes = [
    ["showGridLines", sheet.areGridLinesVisible ? 1 : 0],
    ["workbookViewId", 0],
  ];

  return escapeXml/*xml*/ `
      <sheetViews>
        <sheetView ${formatAttributes(sheetViewAttrs)}>
          ${splitPanes}
        </sheetView>
      </sheetViews>
    `;
}

export function addSheetProperties(sheet: ExcelSheetData) {
  if (!sheet.color) {
    return "";
  }

  return escapeXml/*xml*/ `
      <sheetPr>
        <tabColor ${formatAttributes([["rgb", toXlsxHexColor(sheet.color)]])} />
      </sheetPr>
    `;
}
