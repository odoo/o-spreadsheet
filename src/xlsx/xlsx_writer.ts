import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { ExcelWorkbookData } from "../types";
import {
  XLSXExport,
  XLSXExportFile,
  XLSXRelFile,
  XLSXStructure,
  XMLAttributes,
  XMLString,
} from "../types/xlsx";
import { CONTENT_TYPES, NAMESPACE, RELATIONSHIP_NSR } from "./constants";
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
import { addColumns, addHyperlinks, addMerges, addRows } from "./functions/worksheet";
import {
  addRelsToFile,
  convertChartId,
  convertHeight,
  convertWidth,
} from "./helpers/content_helpers";
import {
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
  const construct = getDefaultXLSXStructure(data);
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
      ["name", sheet.name],
      ["sheetId", parseInt(index) + 1],
      ["r:id", `rId${parseInt(index) + 1}`],
    ];
    sheetNodes.push(escapeXml/*xml*/ `
      <sheet ${formatAttributes(attributes)} />
    `);

    addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
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
  for (const [sheetIndex, sheet] of Object.entries(data.sheets)) {
    const namespaces: XMLAttributes = [
      ["xmlns", NAMESPACE["worksheet"]],
      ["xmlns:r", RELATIONSHIP_NSR],
    ];
    const sheetFormatAttributes: XMLAttributes = [
      ["defaultRowHeight", convertHeight(DEFAULT_CELL_HEIGHT)],
      ["defaultColWidth", convertWidth(DEFAULT_CELL_WIDTH)],
    ];

    // Figures and Charts
    let drawingNode = escapeXml``;
    const charts = sheet.charts;
    if (charts.length) {
      const chartRelIds: string[] = [];
      for (const chart of charts) {
        const xlsxChartId = convertChartId(chart.id);
        const chartRelId = addRelsToFile(
          construct.relsFiles,
          `xl/drawings/_rels/drawing${sheetIndex}.xml.rels`,
          {
            target: `../charts/chart${xlsxChartId}.xml`,
            type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
          }
        );
        chartRelIds.push(chartRelId);
        files.push(createXMLFile(createChart(chart), `xl/charts/chart${xlsxChartId}.xml`, "chart"));
      }

      const drawingRelId = addRelsToFile(
        construct.relsFiles,
        `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`,
        {
          target: `../drawings/drawing${sheetIndex}.xml`,
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
        }
      );
      files.push(
        createXMLFile(
          createDrawing(chartRelIds, sheet, charts),
          `xl/drawings/drawing${sheetIndex}.xml`,
          "drawing"
        )
      );
      drawingNode = escapeXml/*xml*/ `<drawing r:id="${drawingRelId}" />`;
    }
    const sheetXml = escapeXml/*xml*/ `
      <worksheet ${formatAttributes(namespaces)}>
        <sheetFormatPr ${formatAttributes(sheetFormatAttributes)} />
        ${addColumns(sheet.cols)}
        ${addRows(construct, data, sheet)}
        ${addMerges(sheet.merges)}
        ${joinXmlNodes(addConditionalFormatting(construct.dxfs, sheet.conditionalFormats))}
        ${addHyperlinks(construct, data, sheetIndex)}
        ${drawingNode}
      </worksheet>
    `;
    files.push(createXMLFile(parseXML(sheetXml), `xl/worksheets/sheet${sheetIndex}.xml`, "sheet"));
  }
  addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
    target: "sharedStrings.xml",
  });
  addRelsToFile(construct.relsFiles, "xl/_rels/workbook.xml.rels", {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    target: "styles.xml",
  });
  return files;
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

function createContentTypes(files: XLSXExportFile[]): XLSXExportFile {
  const overrideNodes: XMLString[] = [];
  for (const file of files) {
    if (file.contentType) {
      overrideNodes.push(createOverride("/" + file.path, CONTENT_TYPES[file.contentType]));
    }
  }
  const xml = escapeXml/*xml*/ `
    <Types xmlns="${NAMESPACE["Types"]}">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
      <Default Extension="xml" ContentType="application/xml" />
      ${joinXmlNodes(overrideNodes)}
    </Types>
  `;
  return createXMLFile(parseXML(xml), "[Content_Types].xml");
}

function createRelRoot(): XLSXExportFile {
  const attributes: XMLAttributes = [
    ["Id", "rId1"],
    ["Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"],
    ["Target", "xl/workbook.xml"],
  ];

  const xml = escapeXml/*xml*/ `
    <Relationships xmlns="${NAMESPACE["Relationships"]}">
      <Relationship ${formatAttributes(attributes)} />
    </Relationships>
  `;
  return createXMLFile(parseXML(xml), "_rels/.rels");
}
