import { range, toXC, toZone, zoneToDimension } from "../../helpers";
import { ExcelFilterData, ExcelSheetData, ExcelTableData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { NAMESPACE } from "../constants";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";

export function createTable(
  table: ExcelTableData,
  tableId: number,
  sheetData: ExcelSheetData
): XMLDocument {
  const tableAttributes: XMLAttributes = [
    ["id", tableId],
    ["name", `Table${tableId}`],
    ["displayName", `Table${tableId}`],
    ["ref", table.range],
    ["headerRowCount", table.config.numberOfHeaders],
    ["totalsRowCount", table.config.totalRow ? 1 : 0],
    ["xmlns", NAMESPACE.table],
    ["xmlns:xr", NAMESPACE.revision],
    ["xmlns:xr3", NAMESPACE.revision3],
    ["xmlns:mc", NAMESPACE.markupCompatibility],
  ];

  const xml = escapeXml/*xml*/ `
    <table ${formatAttributes(tableAttributes)}>
      ${table.config.hasFilters ? addAutoFilter(table) : ""}
      ${addTableColumns(table, sheetData)}
      ${addTableStyle(table)}
    </table>
    `;
  return parseXML(xml);
}

function addAutoFilter(table: ExcelTableData): XMLString {
  const autoFilterAttributes: XMLAttributes = [["ref", table.range]];
  return escapeXml/*xml*/ `
  <autoFilter ${formatAttributes(autoFilterAttributes)}>
    ${joinXmlNodes(addFilterColumns(table))}
  </autoFilter>
  `;
}

function addFilterColumns(table: ExcelTableData): XMLString[] {
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

function addTableColumns(table: ExcelTableData, sheetData: ExcelSheetData): XMLString {
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

function addTableStyle(table: ExcelTableData): XMLString {
  const tableStyleAttrs: XMLAttributes = [
    ["name", table.config.styleId],
    ["showFirstColumn", table.config.firstColumn ? 1 : 0],
    ["showLastColumn", table.config.lastColumn ? 1 : 0],
    ["showRowStripes", table.config.bandedRows ? 1 : 0],
    ["showColumnStripes", table.config.bandedColumns ? 1 : 0],
  ];
  return escapeXml/*xml*/ `<tableStyleInfo ${formatAttributes(tableStyleAttrs)}/>`;
}
