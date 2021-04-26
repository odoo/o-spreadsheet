import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { tokenize } from "../formulas/index";
import { functionRegistry } from "../functions";
import { colorNumberString, isNumber, toXC } from "../helpers";
import { WorkbookData } from "../types";
import {
  XLSXAttribute,
  XLSXDxf,
  XLSXExport,
  XLSXExportFile,
  XLSXRel,
  XLSXStructure,
} from "../types/xlsx";
import { CONTENT_TYPES, FIRST_NUMFMT_ID, NAMESPACE, RELATIONSHIP_NSR } from "./constants";
import {
  adaptFormulaToExcel,
  convertFormat,
  convertHeight,
  convertOperator,
  convertWidth,
  extractStyle,
  getCellType,
  pushElement,
  toHex6,
} from "./content_helpers";
import {
  createDefault,
  createOverride,
  createXMLFile,
  getDefaultXLSXStructure,
  getNewDoc,
  pushXMLNode,
} from "./xml_helpers";

export function getXLSX(data: WorkbookData): XLSXExport {
  const files: XLSXExportFile[] = [];
  const construct = getDefaultXLSXStructure();
  files.push(createWorkbook(data, construct));

  files.push(...createWorksheets(data, construct));
  files.push(createStylesSheet(construct));
  files.push(createSharedStrings(construct.sharedStrings));
  files.push(createWorkbookRels(construct.rels));
  files.push(createContentTypes(data));
  files.push(createRelRoot());
  return {
    name: "my_spreadsheet.xlsx",
    files,
  };
}

function createWorkbook(data: WorkbookData, construct: XLSXStructure): XLSXExportFile {
  const doc = getNewDoc();
  const workbook = pushXMLNode(doc, doc, "workbook", [
    ["xmlns", NAMESPACE["workbook"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ]);
  const sheets = pushXMLNode(doc, workbook, "sheets", []);
  for (const [index, sheet] of Object.entries(data.sheets)) {
    const attributes: XLSXAttribute[] = [
      ["name", sheet.name],
      ["sheetId", parseInt(index) + 1],
      ["r:id", `rId${parseInt(index) + 1}`],
    ];
    pushXMLNode(doc, sheets, "sheet", attributes);
    construct.rels.push({
      id: `${parseInt(index) + 1}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
      target: `worksheets/sheet${index}.xml`,
    });
  }
  return createXMLFile(doc, "xl/workbook.xml");
}

function createWorksheets(data: WorkbookData, construct: XLSXStructure): XLSXExportFile[] {
  const files: XLSXExportFile[] = [];
  for (const [index, sheet] of Object.entries(data.sheets)) {
    const doc = getNewDoc();
    const worksheet = pushXMLNode(doc, doc, "worksheet", [
      ["xmlns", NAMESPACE["worksheet"]],
      ["xmlns:r", RELATIONSHIP_NSR],
    ]);
    pushXMLNode(doc, worksheet, "sheetFormatPr", [
      ["defaultRowHeight", convertHeight(DEFAULT_CELL_HEIGHT)],
      ["defaultColWidth", convertWidth(DEFAULT_CELL_WIDTH)],
    ]);

    const customCols = Object.entries(sheet.cols).filter(
      ([_, col]) => (col.size && col.size !== DEFAULT_CELL_WIDTH) || col.isHidden
    );
    if (customCols.length !== 0) {
      const cols = pushXMLNode(doc, worksheet, "cols", []);
      for (let [id, col] of customCols) {
        pushXMLNode(doc, cols, "col", [
          ["min", parseInt(id) + 1],
          ["max", parseInt(id) + 1],
          ["width", convertWidth(col.size || DEFAULT_CELL_WIDTH)],
          ["customWidth", col.size && col.size !== DEFAULT_CELL_WIDTH ? 1 : 0],
          ["hidden", col.isHidden ? 1 : 0],
        ]);
      }
    }

    //sheetData (Rows & cells)
    const sheetDataElt = pushXMLNode(doc, worksheet, "sheetData", []);
    for (let r = 0; r < sheet.rowNumber; r++) {
      const rowAttrs: XLSXAttribute[] = [["r", r + 1]];
      const row = sheet.rows[r] || {};
      if ((row.size && row.size !== DEFAULT_CELL_HEIGHT) || row.isHidden) {
        rowAttrs.push(
          ["ht", convertHeight(row.size || DEFAULT_CELL_HEIGHT)],
          ["customHeight", row.size && row.size !== DEFAULT_CELL_WIDTH ? 1 : 0],
          ["hidden", row.isHidden ? 1 : 0]
        );
      }
      const rowElt = pushXMLNode(doc, sheetDataElt, "row", rowAttrs);
      for (let c = 0; c < sheet.colNumber; c++) {
        const xc = toXC(c, r);
        const cell = sheet.cells[xc];
        if (cell) {
          const attributes: XLSXAttribute[] = [["r", xc]];

          // style
          // if (cell.style || cell.border || cell.format) {
          const styles = extractStyle(cell, data);

          const { id: fontId } = pushElement(styles["font"], construct.fonts);
          const { id: fillId } = pushElement(styles["fill"], construct.fills);
          const { id: borderId } = pushElement(styles["border"], construct.borders);
          // Normalize this
          const numFmtId = convertFormat(styles["numFmt"], construct.numFmts);
          const style = {
            fontId,
            fillId,
            borderId,
            numFmtId,
            verticalAlignment: styles["verticalAlignment"] as string,
            horizontalAlignment: styles["horizontalAlignment"] as string,
          };

          const { id } = pushElement(style, construct.styles);
          attributes.push(["s", id]);
          // }
          const cellElt = pushXMLNode(doc, rowElt, "c", attributes);

          // formula
          if (cell.formula) {
            const functions = functionRegistry.content;
            const tokens = tokenize(cell.formula.text);

            const isExported = tokens
              .filter((tk) => tk.type === "FUNCTION")
              .every((tk) => functions[tk.value.toUpperCase()].isExported);

            if (isExported) {
              const formula = adaptFormulaToExcel(cell.formula);
              pushXMLNode(doc, cellElt, "f", [], formula);
              // hack for cycles : if wee don't set a value (be it 0 or #VALUE!), it will appear as invisible on excel,
              // Making it very hard for the client to find where the recursion is.
              if (cell.formula.value === "#CYCLE") {
                cellElt.setAttribute("t", "str");
                pushXMLNode(doc, cellElt, "v", [], cell.formula.value);
              }
            } else {
              // Shouldn't we always output the value then ?
              const value = cell.formula.value;
              if (value) {
                const type = getCellType(value);
                cellElt.setAttribute("t", type);
                pushXMLNode(doc, cellElt, "v", [], value);
              }
            }
          }
          // content
          if (cell.content) {
            let value: string = cell.content;
            if (["TRUE", "FALSE"].includes(value.trim())) {
              value = value === "TRUE" ? "1" : "0";
              cellElt.setAttribute("t", "b");
            } else if (!isNumber(value)) {
              const { id } = pushElement(cell.content, construct.sharedStrings);
              value = id.toString();
              cellElt.setAttribute("t", "s");
            }
            pushXMLNode(doc, cellElt, "v", [], value);
          }
        }
      }
      if (!rowElt.children.length) {
        sheetDataElt.removeChild(rowElt);
      }
    }

    // merges
    if (sheet.merges.length) {
      const mergeCells = pushXMLNode(doc, worksheet, "mergeCells", [
        ["count", sheet.merges.length],
      ]);
      for (const merge of sheet.merges) {
        pushXMLNode(doc, mergeCells, "mergeCell", [["ref", merge]]);
      }
    }

    // Conditional Formats
    for (const cf of sheet.conditionalFormats) {
      const ruleAttributes: XLSXAttribute[] = [
        ["priority", 1],
        ["stopIfTrue", cf.stopIfTrue ? 1 : 0],
      ];
      // Special case for each type of rule: might be better to extract that logic in dedicated functions
      switch (cf.rule.type) {
        case "CellIsRule":
          const cfElement = pushXMLNode(doc, worksheet, "conditionalFormatting", [
            ["sqref", cf.ranges.join(" ")],
          ]);
          ruleAttributes.push(["type", "cellIs"], ["operator", convertOperator(cf.rule.operator)]);
          const ruleElement = pushXMLNode(doc, cfElement, "cfRule", ruleAttributes);
          for (const value of cf.rule.values) {
            pushXMLNode(doc, ruleElement, "formula", [], value);
          }
          const dxf: XLSXDxf = {};
          if (cf.rule.style.textColor) {
            dxf.font = { color: cf.rule.style.textColor };
          }
          if (cf.rule.style.fillColor) {
            dxf.fill = { fgColor: cf.rule.style.fillColor };
          }
          const { id } = pushElement(dxf, construct.dxf);
          ruleElement.setAttribute("dxfId", id);
          break;
        case "ColorScaleRule":
          ruleAttributes.push(["type", "colorScale"]);
          /** mimic our flow:
           * for a given ColorScale CF, each range of the "ranges set" has its own behaviour.
           */
          for (const range of cf.ranges) {
            const cfElement = pushXMLNode(doc, worksheet, "conditionalFormatting", [
              ["sqref", range],
            ]);
            const ruleElement = pushXMLNode(doc, cfElement, "cfRule", ruleAttributes);
            const colorScaleElement = pushXMLNode(doc, ruleElement, "colorScale", []);
            const cfvos: XLSXAttribute[][] = []; // Stands for Conditional Format Value Object
            const colors: XLSXAttribute[][] = [];

            for (let position of ["minimum", "midpoint", "maximum"]) {
              const pos = cf.rule[position];
              if (!pos) {
                // pass midpoint if not defined
                continue;
              }
              /**
               * if "value" in type ,then we must replace it by min or max
               * if "number" in type, then it becomes num
               * rest of the time, the type is unchanged
               */
              if (pos.type === "value") {
                const type = position === "minimum" ? "min" : "max";
                cfvos.push([["type", type]]);
              } else {
                const type = pos.type === "number" ? "num" : pos.type;
                cfvos.push([
                  ["type", type],
                  ["val", pos.value],
                ]);
              }
              colors.push([["rgb", colorNumberString(pos.color)]]);
            }
            for (const cfvoAttr of cfvos) {
              pushXMLNode(doc, colorScaleElement, "cfvo", cfvoAttr);
            }
            for (const colorAttrs of colors) {
              pushXMLNode(doc, colorScaleElement, "color", colorAttrs);
            }
          }
          break;
        default:
          console.log("not implemented");
          break;
      }
    }
    files.push(createXMLFile(doc, `xl/worksheets/sheet${index}.xml`));
  }

  construct.rels.push({
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
    target: "sharedStrings.xml",
    id: (construct.rels.length + 1).toString(), // one-based int
  });
  construct.rels.push({
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    target: "styles.xml",
    id: (construct.rels.length + 1).toString(), // one-based int
  });
  return files;
}

function createStylesSheet(construct: XLSXStructure): XLSXExportFile {
  const doc = getNewDoc();

  const styleSheet = pushXMLNode(doc, doc, "styleSheet", [
    ["xmlns", NAMESPACE["styleSheet"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ]);

  //NUMBER FORMATS
  const numFmts = pushXMLNode(doc, styleSheet, "numFmts", [["count", construct.numFmts.length]]);

  for (let [index, numFmt] of Object.entries(construct.numFmts)) {
    const numFmtAttrs: XLSXAttribute[] = [
      ["numFmtId", parseInt(index) + FIRST_NUMFMT_ID],
      ["formatCode", numFmt],
    ];
    pushXMLNode(doc, numFmts, "numFmt", numFmtAttrs);
  }

  // FONTS
  const fonts = pushXMLNode(doc, styleSheet, "fonts", [["count", construct.fonts.length]]);
  for (let font of Object.values(construct.fonts)) {
    const fontNode = pushXMLNode(doc, fonts, "font", []);

    if (font.bold) {
      pushXMLNode(doc, fontNode, "b", []);
    }
    if (font.italic) {
      pushXMLNode(doc, fontNode, "i", []);
    }
    if (font.strike) {
      pushXMLNode(doc, fontNode, "strike", []);
    }

    pushXMLNode(doc, fontNode, "sz", [["val", font.size]]);
    pushXMLNode(doc, fontNode, "color", [["rgb", toHex6(font.color)]]);
    pushXMLNode(doc, fontNode, "name", [["val", font.name]]);
    // pushXMLNode(doc, fontNode, "scheme", [["val", "minor"]]);
    // pushXMLNode(doc, fontNode, "family", [["val", 2]]);
  }

  // FILLS
  const fills = pushXMLNode(doc, styleSheet, "fills", [["count", construct.fills.length]]);

  for (let fill of Object.values(construct.fills)) {
    const fillNode = pushXMLNode(doc, fills, "fill", []);
    const patternFillNode = pushXMLNode(doc, fillNode, "patternFill", []);
    if (fill.reservedAttribute !== undefined) {
      patternFillNode.setAttribute("patternType", fill.reservedAttribute);
    } else {
      patternFillNode.setAttribute("patternType", "solid");
      pushXMLNode(doc, patternFillNode, "fgColor", [["rgb", toHex6(fill.fgColor!)]]);
      pushXMLNode(doc, patternFillNode, "bgColor", [["indexed", 64]]);
    }
  }

  // BORDERS
  const borders = pushXMLNode(doc, styleSheet, "borders", [["count", construct.borders.length]]);
  for (let border of Object.values(construct.borders)) {
    const borderNode = pushXMLNode(doc, borders, "border", []);
    for (let prop of ["left", "right", "top", "bottom", "diagonal"]) {
      if (border[prop]) {
        pushXMLNode(doc, borderNode, prop, [
          ["style", border[prop][0]],
          ["color", toHex6(border[prop][1])],
        ]);
      } else {
        pushXMLNode(doc, borderNode, prop, []);
      }
    }
  }

  // CELLXFS / STYLES
  const styles = pushXMLNode(doc, styleSheet, "cellXfs", [["count", construct.styles.length]]);

  for (let style of construct.styles) {
    const attributes: XLSXAttribute[] = [
      ["numFmtId", style.numFmtId],
      ["fillId", style.fillId],
      ["fontId", style.fontId],
      ["borderId", style.borderId],
    ];
    // Note: the apply${substyleName} does not seem to be required
    const xf = pushXMLNode(doc, styles, "xf", attributes);

    const alignAttrs: XLSXAttribute[] = [];
    if (style.verticalAlignment) {
      alignAttrs.push(["vertical", style.verticalAlignment]);
    }
    if (style.horizontalAlignment) {
      alignAttrs.push(["horizontal", style.horizontalAlignment]);
    }
    if (alignAttrs.length !== 0) {
      pushXMLNode(doc, xf, "alignment", alignAttrs);
    }
  }

  // DXFS : Differential Formatting Records - Conditional formats
  const dxfs = pushXMLNode(doc, styleSheet, "dxfs", [["count", construct.dxf.length]]);

  for (const dxf of construct.dxf) {
    const dxfNode = pushXMLNode(doc, dxfs, "dxf", []);
    if (dxf.font?.color) {
      pushXMLNode(doc, dxfNode, "font", [["rgb", toHex6(dxf.font.color)]]);
    }
    if (dxf.fill) {
      const fillNode = pushXMLNode(doc, dxfNode, "fill", []);
      const patternFillNode = pushXMLNode(doc, fillNode, "patternFill", []);
      pushXMLNode(doc, patternFillNode, "bgColor", [["rgb", toHex6(dxf.fill.fgColor!)]]);
    }
  }

  return createXMLFile(doc, "xl/styles.xml");
}

function createSharedStrings(strings: string[]): XLSXExportFile {
  const doc = getNewDoc();

  const sst = pushXMLNode(doc, doc, "sst", [
    ["xmlns", NAMESPACE["sst"]],
    ["count", strings.length],
    ["uniqueCount", strings.length],
  ]);

  for (let string of strings) {
    const si = pushXMLNode(doc, sst, "si", []);
    pushXMLNode(doc, si, "t", [], string);
  }

  return createXMLFile(doc, "xl/sharedStrings.xml");
}

function createWorkbookRels(rels: XLSXRel[]): XLSXExportFile {
  const doc = getNewDoc();
  const relations = pushXMLNode(doc, doc, "Relationships", [["xmlns", NAMESPACE["Relationships"]]]);
  for (const rel of rels) {
    const attributes: XLSXAttribute[] = [
      ["Id", `rId${rel.id}`],
      ["Target", rel.target],
      ["Type", rel.type],
    ];
    pushXMLNode(doc, relations, "Relationship", attributes);
  }
  return createXMLFile(doc, "xl/_rels/workbook.xml.rels");
}

function createContentTypes(data: WorkbookData): XLSXExportFile {
  const doc = getNewDoc();
  const types = pushXMLNode(doc, doc, "Types", [["xmlns", NAMESPACE["Types"]]]);

  createDefault(doc, types, "rels", "application/vnd.openxmlformats-package.relationships+xml");
  createDefault(doc, types, "xml", "application/xml");
  createOverride(doc, types, "/xl/workbook.xml", CONTENT_TYPES.workbook);

  for (const id in data.sheets) {
    createOverride(doc, types, `/xl/worksheets/sheet${id}.xml`, CONTENT_TYPES.sheet);
  }

  createOverride(doc, types, "/xl/sharedStrings.xml", CONTENT_TYPES.sharedStrings);
  createOverride(doc, types, "/xl/styles.xml", CONTENT_TYPES.styles);

  return createXMLFile(doc, "[Content_Types].xml");
}

function createRelRoot(): XLSXExportFile {
  const doc = getNewDoc();
  const relations = pushXMLNode(doc, doc, "Relationships", [["xmlns", NAMESPACE["Relationships"]]]);

  const attributes: XLSXAttribute[] = [
    ["Id", "rId1"],
    ["Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"],
    ["Target", "xl/workbook.xml"],
  ];
  pushXMLNode(doc, relations, "Relationship", attributes);

  return createXMLFile(doc, "_rels/.rels");
}
