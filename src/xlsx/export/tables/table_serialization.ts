import {
  XLSXAutoFilter,
  XLSXExportFile,
  XLSXFilterColumn,
  XLSXTable,
  XLSXTableStyleInfo,
  XMLAttributes,
  XMLString,
} from "../../../types/xlsx";
import { NAMESPACE, XLSX_RELATION_TYPE } from "../../constants";
import { XLSXRelsBuilder } from "../xlsx_rels";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../xlsx_xml";

/**
 * Phase-2: build each `xl/tables/tableN.xml` file and the `<tableParts>`
 * fragment that belongs inside the owning `sheetN.xml`.
 *
 * @returns  the `<tableParts>` XML to splice into `sheetN.xml`, the list of
 *           table files to add to the output, and the next table id (so
 *           neighbouring sheets continue the workbook-wide sequence).
 */
export function serializeTables(
  tables: XLSXTable[],
  sheetIndex: number,
  startingTableId: number,
  rels: XLSXRelsBuilder
): { tablesNode: XMLString; tableFiles: XLSXExportFile[]; nextTableId: number } {
  if (!tables.length) {
    return {
      tablesNode: new XMLString(""),
      tableFiles: [],
      nextTableId: startingTableId,
    };
  }

  const sheetRelPath = `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`;
  const tableParts: XMLString[] = [];
  const tableFiles: XLSXExportFile[] = [];
  let currentTableId = startingTableId;
  for (const table of tables) {
    const tableRelId = rels.add(sheetRelPath, {
      target: `../tables/table${currentTableId}.xml`,
      type: XLSX_RELATION_TYPE.table,
    });
    const numberedTable: XLSXTable = {
      ...table,
      id: String(currentTableId),
      displayName: `Table${currentTableId}`,
      name: `Table${currentTableId}`,
    };
    tableFiles.push(
      createXMLFile(buildTableXml(numberedTable), `xl/tables/table${currentTableId}.xml`, "table")
    );
    tableParts.push(escapeXml/*xml*/ `<tablePart r:id="${tableRelId}" />`);
    currentTableId++;
  }

  const tablesNode = escapeXml/*xml*/ `
    <tableParts count="${tables.length}">
      ${joinXmlNodes(tableParts)}
    </tableParts>
  `;
  return { tablesNode, tableFiles, nextTableId: currentTableId };
}

function buildTableXml(table: XLSXTable): XMLDocument {
  const attributes: XMLAttributes = [
    ["id", table.id],
    ["name", table.name ?? table.displayName],
    ["displayName", table.displayName],
    ["ref", table.ref],
    ["headerRowCount", table.headerRowCount],
    ["totalsRowCount", table.totalsRowCount],
    ["xmlns", NAMESPACE.table],
    ["xmlns:xr", NAMESPACE.revision],
    ["xmlns:xr3", NAMESPACE.revision3],
    ["xmlns:mc", NAMESPACE.markupCompatibility],
  ];

  const xml = escapeXml/*xml*/ `
    <table ${formatAttributes(attributes)}>
      ${table.autoFilter ? renderAutoFilter(table.autoFilter) : ""}
      ${renderTableColumns(table)}
      ${renderTableStyle(table.style)}
    </table>
  `;
  return parseXML(xml);
}

function renderAutoFilter(autoFilter: XLSXAutoFilter): XMLString {
  return escapeXml/*xml*/ `
    <autoFilter ${formatAttributes([["ref", autoFilter.zone]])}>
      ${joinXmlNodes(autoFilter.columns.map(renderFilterColumn))}
    </autoFilter>
  `;
}

function renderFilterColumn(column: XLSXFilterColumn): XMLString {
  const values = column.filters.map(
    (f) => escapeXml/*xml*/ `<filter ${formatAttributes([["val", f.val]])}/>`
  );
  const filterAttrs: XMLAttributes = column.displayBlanks ? [["blank", 1]] : [];
  return escapeXml/*xml*/ `
    <filterColumn ${formatAttributes([["colId", column.colId]])}>
      <filters ${formatAttributes(filterAttrs)}>
        ${joinXmlNodes(values)}
      </filters>
    </filterColumn>
  `;
}

function renderTableColumns(table: XLSXTable): XMLString {
  const columns = table.cols.map((col) => {
    const colAttrs: XMLAttributes = [
      ["id", col.id],
      ["name", col.name],
    ];
    if (col.colFormula) {
      colAttrs.push(["totalsRowFunction", col.colFormula]);
    }
    return escapeXml/*xml*/ `<tableColumn ${formatAttributes(colAttrs)}/>`;
  });
  return escapeXml/*xml*/ `
    <tableColumns ${formatAttributes([["count", table.cols.length]])}>
      ${joinXmlNodes(columns)}
    </tableColumns>
  `;
}

function renderTableStyle(style: XLSXTableStyleInfo | undefined): XMLString {
  if (!style) {
    return escapeXml``;
  }
  const attrs: XMLAttributes = [
    ["name", style.name ?? ""],
    ["showFirstColumn", style.showFirstColumn ? 1 : 0],
    ["showLastColumn", style.showLastColumn ? 1 : 0],
    ["showRowStripes", style.showRowStripes ? 1 : 0],
    ["showColumnStripes", style.showColumnStripes ? 1 : 0],
  ];
  return escapeXml/*xml*/ `<tableStyleInfo ${formatAttributes(attrs)}/>`;
}
