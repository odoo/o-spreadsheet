import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { ExcelSheetData, ExcelWorkbookData } from "../types";
import {
  XLSXExport,
  XLSXExportFile,
  XLSXRelFile,
  XLSXStructure,
  XMLAttributes,
  XMLString,
} from "../types/xlsx";
import { XLSXExportXMLFile } from "./../types/xlsx";
import { CONTENT_TYPES, NAMESPACE, RELATIONSHIP_NSR, XLSX_RELATION_TYPE } from "./constants";
import { IMAGE_MIMETYPE_TO_EXTENSION_MAPPING } from "./conversion";
import { createChart } from "./functions/charts";
import { addConditionalFormatting } from "./functions/conditional_formatting";
import { createDrawing } from "./functions/drawings";
import {
  addBorders,
  addCellWiseConditionalFormatting,
  addFills,
  addFonts,
  addNumberFormats,
  addStyles,
} from "./functions/styles";
import { createTable } from "./functions/table";
import {
  addColumns,
  addHyperlinks,
  addMerges,
  addRows,
  addSheetViews,
} from "./functions/worksheet";
import {
  addRelsToFile,
  convertChartId,
  convertHeightToExcel,
  convertImageId,
  convertWidthToExcel,
} from "./helpers/content_helpers";
import {
  createDefaultXMLElement,
  createOverride,
  createXMLFile,
  escapeXml,
  formatAttributes,
  getDefaultXLSXStructure,
  joinXmlNodes,
  parseXML,
} from "./helpers/xml_helpers";

/**
 * Return the spreadsheet data in the Office Open XML file format.
 * See ECMA-376 standard.
 * https://www.ecma-international.org/publications-and-standards/standards/ecma-376/
 */
export function getXLSX(data: ExcelWorkbookData): XLSXExport {
  const files: XLSXExportFile[] = [];
  const construct = getDefaultXLSXStructure();
  files.push(createWorkbook(data, construct));

  files.push(...createWorksheets(data, construct));
  files.push(createStylesSheet(construct));
  files.push(createSharedStrings(construct.sharedStrings));
  files.push(...createRelsFiles(construct.relsFiles));
  files.push(createContentTypes(files));
  files.push(createRelRoot());
  return {
    name: `my_spreadsheet.xlsx`,
    files,
  };
}

function createWorkbook(data: ExcelWorkbookData, construct: XLSXStructure): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["workbook"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ];
  const sheetNodes: XMLString[] = [];
  for (const [index, sheet] of Object.entries(data.sheets)) {
    const attributes: XMLAttributes = [
      ["state", sheet.isVisible ? "visible" : "hidden"],
      ["name", sheet.name],
      ["sheetId", parseInt(index) + 1],
      ["r:id", `rId${parseInt(index) + 1}`],
    ];
    sheetNodes.push(escapeXml/*xml*/ `
      <sheet ${formatAttributes(attributes)} />
    `);

    addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
      type: XLSX_RELATION_TYPE.sheet,
      target: `worksheets/sheet${index}.xml`,
    });
  }
  const xml = escapeXml/*xml*/ `
    <workbook ${formatAttributes(namespaces)}>
      <sheets>
        ${joinXmlNodes(sheetNodes)}
      </sheets>
    </workbook>
  `;
  return createXMLFile(parseXML(xml), "xl/workbook.xml", "workbook");
}

function createWorksheets(data: ExcelWorkbookData, construct: XLSXStructure): XLSXExportFile[] {
  const files: XLSXExportFile[] = [];
  let currentTableIndex = 1;
  for (const [sheetIndex, sheet] of Object.entries(data.sheets)) {
    const namespaces: XMLAttributes = [
      ["xmlns", NAMESPACE["worksheet"]],
      ["xmlns:r", RELATIONSHIP_NSR],
    ];
    const sheetFormatAttributes: XMLAttributes = [
      ["defaultRowHeight", convertHeightToExcel(DEFAULT_CELL_HEIGHT)],
      ["defaultColWidth", convertWidthToExcel(DEFAULT_CELL_WIDTH)],
    ];

    const tablesNode = createTablesForSheet(sheet, sheetIndex, currentTableIndex, construct, files);
    currentTableIndex += sheet.tables.length;

    // Figures and Charts
    let drawingNode = escapeXml``;
    const drawingRelIds: string[] = [];
    for (const chart of sheet.charts) {
      const xlsxChartId = convertChartId(chart.id);
      const chartRelId = addRelsToFile(
        construct.relsFiles,
        `xl/drawings/_rels/drawing${sheetIndex}.xml.rels`,
        {
          target: `../charts/chart${xlsxChartId}.xml`,
          type: XLSX_RELATION_TYPE.chart,
        }
      );
      drawingRelIds.push(chartRelId);
      files.push(
        createXMLFile(
          createChart(chart, sheetIndex, data),
          `xl/charts/chart${xlsxChartId}.xml`,
          "chart"
        )
      );
    }

    for (const image of sheet.images) {
      const mimeType = image.data.mimetype;
      if (mimeType === undefined) continue;
      const extension = IMAGE_MIMETYPE_TO_EXTENSION_MAPPING[mimeType];
      // only support exporting images with mimetypes specified in the mapping
      if (extension === undefined) continue;
      const xlsxImageId = convertImageId(image.id);
      let imageFileName = `image${xlsxImageId}.${extension}`;

      const imageRelId = addRelsToFile(
        construct.relsFiles,
        `xl/drawings/_rels/drawing${sheetIndex}.xml.rels`,
        {
          target: `../media/${imageFileName}`,
          type: XLSX_RELATION_TYPE.image,
        }
      );
      drawingRelIds.push(imageRelId);
      files.push({
        path: `xl/media/${imageFileName}`,
        imageSrc: image.data.path,
      });
    }

    const drawings = [...sheet.charts, ...sheet.images];
    if (drawings.length) {
      const drawingRelId = addRelsToFile(
        construct.relsFiles,
        `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`,
        {
          target: `../drawings/drawing${sheetIndex}.xml`,
          type: XLSX_RELATION_TYPE.drawing,
        }
      );
      files.push(
        createXMLFile(
          createDrawing(drawingRelIds, sheet, drawings),
          `xl/drawings/drawing${sheetIndex}.xml`,
          "drawing"
        )
      );
      drawingNode = escapeXml/*xml*/ `<drawing r:id="${drawingRelId}" />`;
    }

    const sheetXml = escapeXml/*xml*/ `
      <worksheet ${formatAttributes(namespaces)}>
        ${addSheetViews(sheet)}
        <sheetFormatPr ${formatAttributes(sheetFormatAttributes)} />
        ${addColumns(sheet.cols)}
        ${addRows(construct, data, sheet)}
        ${addMerges(sheet.merges)}
        ${joinXmlNodes(addConditionalFormatting(construct.dxfs, sheet.conditionalFormats))}
        ${addHyperlinks(construct, data, sheetIndex)}
        ${drawingNode}
        ${tablesNode}
      </worksheet>
    `;
    files.push(createXMLFile(parseXML(sheetXml), `xl/worksheets/sheet${sheetIndex}.xml`, "sheet"));
  }
  addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
    type: XLSX_RELATION_TYPE.sharedStrings,
    target: "sharedStrings.xml",
  });
  addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
    type: XLSX_RELATION_TYPE.styles,
    target: "styles.xml",
  });
  return files;
}

/**
 * Create xlsx files for each tables contained in the given sheet, and add them to the XLSXStructure ans XLSXExportFiles.
 *
 * Return an XML string that should be added in the sheet to link these table to the sheet.
 */
function createTablesForSheet(
  sheetData: ExcelSheetData,
  sheetId: string,
  startingTableId: number,
  construct: XLSXStructure,
  files: XLSXExportFile[]
): XMLString {
  let currentTableId = startingTableId;
  if (!sheetData.tables.length) return new XMLString("");

  const sheetRelFile = `xl/worksheets/_rels/sheet${sheetId}.xml.rels`;

  const tableParts: XMLString[] = [];
  for (const table of sheetData.tables) {
    const tableRelId = addRelsToFile(construct.relsFiles, sheetRelFile, {
      target: `../tables/table${currentTableId}.xml`,
      type: XLSX_RELATION_TYPE.table,
    });

    files.push(
      createXMLFile(
        createTable(table, currentTableId, sheetData),
        `xl/tables/table${currentTableId}.xml`,
        "table"
      )
    );

    tableParts.push(escapeXml/*xml*/ `<tablePart r:id="${tableRelId}" />`);
    currentTableId++;
  }
  return escapeXml/*xml*/ `
    <tableParts count="${sheetData.tables.length}">
      ${joinXmlNodes(tableParts)}
    </tableParts>
`;
}

function createStylesSheet(construct: XLSXStructure): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["styleSheet"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ];
  const styleXml = escapeXml/*xml*/ `
    <styleSheet ${formatAttributes(namespaces)}>
      ${addNumberFormats(construct.numFmts)}
      ${addFonts(construct.fonts)}
      ${addFills(construct.fills)}
      ${addBorders(construct.borders)}
      ${addStyles(construct.styles)}
      ${addCellWiseConditionalFormatting(construct.dxfs)}
    </styleSheet>
  `;
  return createXMLFile(parseXML(styleXml), "xl/styles.xml", "styles");
}

function createSharedStrings(strings: string[]): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["sst"]],
    ["count", strings.length],
    ["uniqueCount", strings.length],
  ];

  const stringNodes = strings.map((string) => escapeXml/*xml*/ `<si><t>${string}</t></si>`);

  const xml = escapeXml/*xml*/ `
    <sst ${formatAttributes(namespaces)}>
      ${joinXmlNodes(stringNodes)}
    </sst>
  `;
  return createXMLFile(parseXML(xml), "xl/sharedStrings.xml", "sharedStrings");
}

function createRelsFiles(relsFiles: XLSXRelFile[]): XLSXExportFile[] {
  const XMLRelsFiles: XLSXExportFile[] = [];
  for (const relFile of relsFiles) {
    const relationNodes: XMLString[] = [];
    for (const rel of relFile.rels) {
      const attributes: XMLAttributes = [
        ["Id", rel.id],
        ["Target", rel.target],
        ["Type", rel.type],
      ];
      if (rel.targetMode) {
        attributes.push(["TargetMode", rel.targetMode]);
      }
      relationNodes.push(escapeXml/*xml*/ `
        <Relationship ${formatAttributes(attributes)} />
      `);
    }
    const xml = escapeXml/*xml*/ `
      <Relationships xmlns="${NAMESPACE["Relationships"]}">
        ${joinXmlNodes(relationNodes)}
      </Relationships>
    `;
    XMLRelsFiles.push(createXMLFile(parseXML(xml), relFile.path));
  }
  return XMLRelsFiles;
}

function createContentTypes(files: XLSXExportFile[]): XLSXExportXMLFile {
  const overrideNodes: XMLString[] = [];
  // hard-code supported image mimetypes
  const imageDefaultNodes = Object.entries(IMAGE_MIMETYPE_TO_EXTENSION_MAPPING).map(
    ([mimetype, extension]) => createDefaultXMLElement(extension, mimetype)
  );
  for (const file of files) {
    if ("contentType" in file && file.contentType) {
      overrideNodes.push(createOverride("/" + file.path, CONTENT_TYPES[file.contentType]));
    }
  }
  const relsAttributes: XMLAttributes = [
    ["Extension", "rels"],
    ["ContentType", "application/vnd.openxmlformats-package.relationships+xml"],
  ];

  const xmlAttributes: XMLAttributes = [
    ["Extension", "xml"],
    ["ContentType", "application/xml"],
  ];

  const xml = escapeXml/*xml*/ `
    <Types xmlns="${NAMESPACE["Types"]}">
      ${joinXmlNodes(Object.values(imageDefaultNodes))}
      <Default ${formatAttributes(relsAttributes)} />
      <Default ${formatAttributes(xmlAttributes)} />
      ${joinXmlNodes(overrideNodes)}
    </Types>
  `;
  return createXMLFile(parseXML(xml), "[Content_Types].xml");
}

function createRelRoot(): XLSXExportFile {
  const attributes: XMLAttributes = [
    ["Id", "rId1"],
    ["Type", XLSX_RELATION_TYPE.document],
    ["Target", "xl/workbook.xml"],
  ];

  const xml = escapeXml/*xml*/ `
    <Relationships xmlns="${NAMESPACE["Relationships"]}">
      <Relationship ${formatAttributes(attributes)} />
    </Relationships>
  `;
  return createXMLFile(parseXML(xml), "_rels/.rels");
}
