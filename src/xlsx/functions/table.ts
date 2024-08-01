import { range, toXC, toZone, zoneToDimension } from "../../helpers";
import type { ExcelFilterData, ExcelFilterTableData, ExcelSheetData } from "../../types";
import type { XMLAttributes, XMLString } from "../../types/xlsx";
import { NAMESPACE } from "../constants";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";

const TABLE_DEFAULT_ATTRS: XMLAttributes = [
  ["name", "TableStyleLight8"],
  ["showFirstColumn", "0"],
  ["showLastColumn", "0"],
  ["showRowStripes", "0"],
  ["showColumnStripes", "0"],
];
const TABLE_DEFAULT_STYLE = escapeXml/*xml*/ `<tableStyleInfo ${formatAttributes(
  TABLE_DEFAULT_ATTRS
)}/>`;

export function createTable(
  table: ExcelFilterTableData,
  tableId: number,
  sheetData: ExcelSheetData
): XMLDocument {
  const tableAttributes: XMLAttributes = [
    ["id", tableId],
    ["name", `Table${tableId}`],
    ["displayName", `Table${tableId}`],
    ["ref", table.range],
    ["xmlns", NAMESPACE.table],
    ["xmlns:xr", NAMESPACE.revision],
    ["xmlns:xr3", NAMESPACE.revision3],
    ["xmlns:mc", NAMESPACE.markupCompatibility],
  ];

  const xml = escapeXml/*xml*/ `
    <table ${formatAttributes(tableAttributes)}>
      ${addAutoFilter(table)}
      ${addTableColumns(table, sheetData)}
      ${TABLE_DEFAULT_STYLE}
    </table>
    `;
  return parseXML(xml);
}

function addAutoFilter(table: ExcelFilterTableData): XMLString {
  const autoFilterAttributes: XMLAttributes = [["ref", table.range]];
  return escapeXml/*xml*/ `
  <autoFilter ${formatAttributes(autoFilterAttributes)}>
    ${joinXmlNodes(addFilterColumns(table))}
  </autoFilter>
  `;
}

function addFilterColumns(table: ExcelFilterTableData): XMLString[] {
  const columns: XMLString[] = [];
  for (const filter of table.filters) {
    const colXml = escapeXml/*xml*/ `
      <filterColumn ${formatAttributes([["colId", filter.colId]])}>
        ${addFilter(filter)}
      </filterColumn>
      `;
    columns.push(colXml);
  }
  return columns;
}

function addFilter(filter: ExcelFilterData): XMLString {
  const filterValues = filter.displayedValues.map(
    (val) => escapeXml/*xml*/ `<filter ${formatAttributes([["val", val]])}/>`
  );
  const filterAttributes: XMLAttributes = filter.displayBlanks ? [["blank", 1]] : [];
  return escapeXml/*xml*/ `
  <filters ${formatAttributes(filterAttributes)}>
      ${joinXmlNodes(filterValues)}
  </filters>
`;
}

function addTableColumns(table: ExcelFilterTableData, sheetData: ExcelSheetData): XMLString {
  const tableZone = toZone(table.range);
  const columns: XMLString[] = [];
  for (const i of range(0, zoneToDimension(tableZone).numberOfCols)) {
    const colHeaderXc = toXC(tableZone.left + i, tableZone.top);
    const colName = sheetData.cells[colHeaderXc]?.content || `col${i}`;
    const colAttributes: XMLAttributes = [
      ["id", i + 1], // id cannot be 0
      ["name", colName],
    ];
    columns.push(escapeXml/*xml*/ `<tableColumn ${formatAttributes(colAttributes)}/>`);
  }

  return escapeXml/*xml*/ `
        <tableColumns ${formatAttributes([["count", columns.length]])}>
            ${joinXmlNodes(columns)}
        </tableColumns>
    `;
}
