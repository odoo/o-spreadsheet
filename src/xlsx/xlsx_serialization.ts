import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { UID } from "../types/misc";
import { ExcelSheetData, ExcelWorkbookData } from "../types/workbook_data";
import {
  XLSXExport,
  XLSXExportFile,
  XLSXStructure,
  XLSXWorksheet,
  XMLAttributes,
  XMLString,
} from "../types/xlsx";
import { NAMESPACE, RELATIONSHIP_NSR, XLSX_RELATION_TYPE } from "./constants";
import { serializeConditionalFormats } from "./export/conditional_formats/cf_serialization";
import { serializeContentTypes } from "./export/content_types/content_types_serialization";
import { serializeDataValidations } from "./export/data_validations/dv_serialization";
import { serializeSheetDrawings } from "./export/drawings/drawing_serialization";
import { serializeHyperlinks } from "./export/hyperlinks/hyperlink_serialization";
import { serializeMerges } from "./export/merges/merge_serialization";
import { serializeMetadata } from "./export/metadata/metadata_serialization";
import { serializeCols } from "./export/rows_and_cols/col_serialization";
import { serializeRows } from "./export/rows_and_cols/row_serialization";
import { serializeSharedStrings } from "./export/shared_strings/shared_strings_serialization";
import { serializeSheetProperties } from "./export/sheet_properties/sheet_properties_serialization";
import { serializeSheetProtection } from "./export/sheet_protection/sheet_protection_serialization";
import { serializeSheetViews } from "./export/sheet_views/sheet_view_serialization";
import { serializeStyles } from "./export/styles/style_serialization";
import { serializeTables } from "./export/tables/table_serialization";
import { serializeWorkbook } from "./export/workbook/workbook_serialization";
import { XLSXInterned } from "./export/xlsx_interned";
import { serializeRootRel, XLSXRelsBuilder } from "./export/xlsx_rels";
import { convertHeightToExcel, convertWidthToExcel } from "./export/xlsx_units";
import {
  createXMLFile,
  escapeXml,
  formatAttributes,
  joinXmlNodes,
  parseXML,
} from "./export/xlsx_xml";

/**
 * Phase 2 of the XLSX export pipeline: `XLSXStructure` → `XLSXExport`.
 *
 * Owns all packaging concerns: XML emission, file paths, relationships.
 * Workbook-wide state lives here:
 *   - `rels`: every cross-file pointer (sheet→drawing, drawing→chart,
 *     workbook→sheets, etc.).
 *   - `chartIds` / `imageIds`: stable workbook-wide numeric handles for
 *     chart and image files (`xl/charts/chartN.xml`, `xl/media/imageN.png`).
 *
 * File order in the output preserves the pre-refactor sequence so the zip
 * directory matches Excel's expectations: workbook.xml → sheets →
 * metadata.xml → styles.xml → sharedStrings.xml → side files → rels →
 * Content_Types → root rels.
 */
export function serializeXLSX(structure: XLSXStructure, data: ExcelWorkbookData): XLSXExport {
  const rels = new XLSXRelsBuilder();
  const chartIds = new XLSXInterned<UID>((id) => id);
  const imageIds = new XLSXInterned<UID>((id) => id);

  const files: XLSXExportFile[] = [];
  files.push(
    serializeWorkbook(
      structure.sheets.map((s) => s.sheetName),
      structure.sheets.map((s) => s.isVisible),
      rels
    )
  );

  let nextTableId = 1;
  for (let sheetIndex = 0; sheetIndex < structure.sheets.length; sheetIndex++) {
    const sheetXLSX = structure.sheets[sheetIndex];
    const sheetData = data.sheets[sheetIndex];

    const tableResult = serializeTables(sheetXLSX.tables, sheetIndex, nextTableId, rels);
    nextTableId = tableResult.nextTableId;
    files.push(...tableResult.tableFiles);

    const drawingResult = serializeSheetDrawings(
      sheetData,
      sheetIndex,
      data,
      rels,
      chartIds,
      imageIds
    );
    files.push(...drawingResult.files);

    files.push(
      buildSheetFile(
        sheetXLSX,
        sheetData,
        sheetIndex,
        structure,
        rels,
        tableResult.tablesNode,
        drawingResult.drawingNode
      )
    );
  }

  files.push(serializeMetadata());
  files.push(serializeStyles(structure));
  files.push(serializeSharedStrings(structure.sharedStrings));

  rels.add("xl/_rels/workbook.xml.rels", {
    type: XLSX_RELATION_TYPE.sharedStrings,
    target: "sharedStrings.xml",
  });
  rels.add("xl/_rels/workbook.xml.rels", {
    type: XLSX_RELATION_TYPE.styles,
    target: "styles.xml",
  });
  rels.add("xl/_rels/workbook.xml.rels", {
    type: XLSX_RELATION_TYPE.metadata,
    target: "metadata.xml",
  });

  files.push(...rels.toFiles());
  files.push(serializeContentTypes(files));
  files.push(serializeRootRel());
  return { name: "my_spreadsheet.xlsx", files };
}

function buildSheetFile(
  sheetXLSX: XLSXWorksheet,
  sheetData: ExcelSheetData,
  sheetIndex: number,
  structure: XLSXStructure,
  rels: XLSXRelsBuilder,
  tablesNode: XMLString,
  drawingNode: XMLString
): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["worksheet"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ];
  const sheetFormatAttributes: XMLAttributes = [
    ["defaultRowHeight", convertHeightToExcel(DEFAULT_CELL_HEIGHT)],
    ["defaultColWidth", convertWidthToExcel(DEFAULT_CELL_WIDTH)],
  ];

  const sheetXml = escapeXml/*xml*/ `
    <worksheet ${formatAttributes(namespaces)}>
      ${serializeSheetProperties(sheetXLSX.sheetProperties)}
      ${serializeSheetViews(sheetXLSX.sheetViews)}
      <sheetFormatPr ${formatAttributes(sheetFormatAttributes)} />
      ${serializeCols(sheetXLSX.cols)}
      ${serializeRows(sheetXLSX.rows)}
      ${serializeMerges(sheetXLSX.merges)}
      ${serializeSheetProtection(sheetXLSX)}
      ${joinXmlNodes(serializeConditionalFormats(structure.dxfs, sheetData.conditionalFormats))}
      ${joinXmlNodes(serializeDataValidations(sheetData.dataValidationRules))}
      ${serializeHyperlinks(sheetXLSX.hyperlinks, sheetIndex, rels)}
      ${drawingNode}
      ${tablesNode}
    </worksheet>
  `;
  return createXMLFile(parseXML(sheetXml), `xl/worksheets/sheet${sheetIndex}.xml`, "sheet");
}
