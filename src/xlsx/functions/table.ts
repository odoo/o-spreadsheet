import { range, toXC, toZone, zoneToDimension } from "../../helpers";
import { ExcelFilterData, ExcelFilterTableData, ExcelSheetData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { NAMESPACE } from "../constants";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";

const TABLE_DEFAULT_STYLE = escapeXml/*xml*/ `<tableStyleInfo name="TableStyleLight8" showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/>`;

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
  const tableZone = toZone(table.range);
  const columns: XMLString[] = [];
  for (const i of range(0, zoneToDimension(tableZone).numberOfCols)) {
    const filter = table.filters[i];
    if (!filter || !filter.filteredValues.length) {
      continue;
    }
    const colXml = escapeXml/*xml*/ `
      <filterColumn ${formatAttributes([["colId", i]])}>
        ${addFilter(filter)}
      </filterColumn>
      `;
    columns.push(colXml);
  }
  return columns;
}

function addFilter(filter: ExcelFilterData): XMLString {
  const filterValues = filter.filteredValues.map(
    (val) => escapeXml/*xml*/ `<filter ${formatAttributes([["val", val]])}/>`
  );
  return escapeXml/*xml*/ `
  <filters>
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
