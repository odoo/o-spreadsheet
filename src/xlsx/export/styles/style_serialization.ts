import { isObjectEmptyRecursive } from "../../../helpers/misc";
import {
  XLSXBorder,
  XLSXBorderDescr,
  XLSXDxf,
  XLSXExportFile,
  XLSXFill,
  XLSXFont,
  XLSXNumFormat,
  XLSXStructure,
  XLSXStyle,
  XMLAttributes,
  XMLString,
} from "../../../types/xlsx";
import { FIRST_NUMFMT_ID, NAMESPACE, RELATIONSHIP_NSR } from "../../constants";
import { toXlsxHexColor } from "../../helpers/colors";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../xlsx_xml";

/**
 * Phase-2: build `xl/styles.xml` from the already-populated style primitives
 * on the `XLSXStructure` accumulator.
 */
export function serializeStyles(structure: XLSXStructure): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["styleSheet"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ];
  const xml = escapeXml/*xml*/ `
    <styleSheet ${formatAttributes(namespaces)}>
      ${addNumberFormats(structure.numFmts)}
      ${addFonts(structure.fonts)}
      ${addFills(structure.fills)}
      ${addBorders(structure.borders)}
      ${addStyles(structure.styles)}
      ${addCellWiseConditionalFormatting(structure.dxfs)}
    </styleSheet>
  `;
  return createXMLFile(parseXML(xml), "xl/styles.xml", "styles");
}

function addNumberFormats(numFmts: XLSXNumFormat[]): XMLString {
  const numFmtNodes: XMLString[] = [];
  for (const [index, numFmt] of Object.entries(numFmts)) {
    const numFmtAttrs: XMLAttributes = [
      ["numFmtId", parseInt(index) + FIRST_NUMFMT_ID],
      ["formatCode", numFmt.format],
    ];
    numFmtNodes.push(escapeXml/*xml*/ `
      <numFmt ${formatAttributes(numFmtAttrs)}/>
    `);
  }
  return escapeXml/*xml*/ `
    <numFmts count="${numFmts.length}">
      ${joinXmlNodes(numFmtNodes)}
    </numFmts>
  `;
}

export function renderFont(font: Partial<XLSXFont>): XMLString {
  if (isObjectEmptyRecursive(font)) {
    return escapeXml/*xml*/ ``;
  }
  return escapeXml/*xml*/ `
    <font>
      ${font.bold ? escapeXml/*xml*/ `<b />` : ""}
      ${font.italic ? escapeXml/*xml*/ `<i />` : ""}
      ${font.underline ? escapeXml/*xml*/ `<u />` : ""}
      ${font.strike ? escapeXml/*xml*/ `<strike />` : ""}
      ${font.size ? escapeXml/*xml*/ `<sz val="${font.size}" />` : ""}
      ${
        font.color && font.color.rgb
          ? escapeXml/*xml*/ `<color rgb="${toXlsxHexColor(font.color.rgb)}" />`
          : ""
      }
      ${font.name ? escapeXml/*xml*/ `<name val="${font.name}" />` : ""}
    </font>
  `;
}

function addFonts(fonts: XLSXFont[]): XMLString {
  return escapeXml/*xml*/ `
    <fonts count="${fonts.length}">
      ${joinXmlNodes(Object.values(fonts).map(renderFont))}
    </fonts>
  `;
}

function addFills(fills: XLSXFill[]): XMLString {
  const fillNodes: XMLString[] = [];
  for (const fill of Object.values(fills)) {
    if (fill.reservedAttribute !== undefined) {
      fillNodes.push(escapeXml/*xml*/ `
        <fill>
          <patternFill patternType="${fill.reservedAttribute}" />
        </fill>
      `);
    } else {
      fillNodes.push(escapeXml/*xml*/ `
        <fill>
          <patternFill patternType="solid">
            <fgColor rgb="${toXlsxHexColor(fill.fgColor!.rgb!)}" />
            <bgColor indexed="64" />
          </patternFill>
        </fill>
      `);
    }
  }
  return escapeXml/*xml*/ `
    <fills count="${fills.length}">
    ${joinXmlNodes(fillNodes)}
    </fills>
  `;
}

function addBorders(borders: XLSXBorder[]): XMLString {
  const borderNodes: XMLString[] = [];
  for (const border of Object.values(borders)) {
    borderNodes.push(escapeXml/*xml*/ `
      <border>
        <left ${formatBorderAttribute(border["left"])}>
          ${addBorderColor(border["left"])}
        </left>
        <right ${formatBorderAttribute(border["right"])}>
          ${addBorderColor(border["right"])}
        </right>
        <top ${formatBorderAttribute(border["top"])}>
          ${addBorderColor(border["top"])}
        </top>
        <bottom ${formatBorderAttribute(border["bottom"])}>
          ${addBorderColor(border["bottom"])}
        </bottom>
        <diagonal ${formatBorderAttribute(border["diagonal"])}>
          ${addBorderColor(border["diagonal"])}
        </diagonal>
      </border>
    `);
  }
  return escapeXml/*xml*/ `
    <borders count="${borders.length}">
      ${joinXmlNodes(borderNodes)}
    </borders>
  `;
}

function formatBorderAttribute(description: XLSXBorderDescr | undefined): XMLString {
  if (!description) {
    return escapeXml``;
  }
  return formatAttributes([["style", description.style]]);
}

function addBorderColor(description: XLSXBorderDescr | undefined): XMLString {
  if (!description) {
    return escapeXml``;
  }
  return escapeXml/*xml*/ `
    <color ${formatAttributes([["rgb", toXlsxHexColor(description.color.rgb!)]])}/>
  `;
}

function addStyles(styles: XLSXStyle[]): XMLString {
  const styleNodes: XMLString[] = [];
  for (const style of styles) {
    const attributes: XMLAttributes = [
      ["numFmtId", style.numFmtId],
      ["fillId", style.fillId],
      ["fontId", style.fontId],
      ["borderId", style.borderId],
    ];
    const alignAttrs: XMLAttributes = [];
    if (style.alignment && style.alignment.vertical) {
      alignAttrs.push(["vertical", style.alignment.vertical]);
    }
    if (style.alignment && style.alignment.horizontal) {
      alignAttrs.push(["horizontal", style.alignment.horizontal]);
    }
    if (style.alignment && style.alignment.wrapText) {
      alignAttrs.push(["wrapText", "1"]);
    }
    if (style.alignment && style.alignment.textRotation) {
      alignAttrs.push(["textRotation", style.alignment.textRotation]);
    }
    if (style.alignment && style.alignment.shrinkToFit) {
      alignAttrs.push(["shrinkToFit", "1"]);
    }

    if (alignAttrs.length > 0) {
      attributes.push(["applyAlignment", "1"]); // for Libre Office
      styleNodes.push(
        escapeXml/*xml*/ `<xf ${formatAttributes(attributes)}><alignment ${formatAttributes(
          alignAttrs
        )} /></xf> `
      );
    } else {
      styleNodes.push(escapeXml/*xml*/ `<xf ${formatAttributes(attributes)} />`);
    }
  }
  return escapeXml/*xml*/ `
    <cellXfs count="${styles.length}">
      ${joinXmlNodes(styleNodes)}
    </cellXfs>
  `;
}

/**
 * DXFS : Differential Formatting Records — conditional formats.
 */
function addCellWiseConditionalFormatting(dxfs: XLSXDxf[]): XMLString {
  const dxfNodes: XMLString[] = [];
  for (const dxf of dxfs) {
    let fontNode: XMLString = escapeXml``;
    if (dxf.font) {
      fontNode = renderFont(dxf.font);
    }
    let fillNode: XMLString = escapeXml``;
    if (dxf.fill) {
      fillNode = escapeXml/*xml*/ `
        <fill>
          <patternFill>
            <bgColor rgb="${toXlsxHexColor(dxf.fill.fgColor!.rgb!)}" />
          </patternFill>
        </fill>
      `;
    }
    dxfNodes.push(escapeXml/*xml*/ `
      <dxf>
        ${fontNode}
        ${fillNode}
      </dxf>
    `);
  }
  return escapeXml/*xml*/ `
    <dxfs count="${dxfs.length}">
      ${joinXmlNodes(dxfNodes)}
    </dxfs>
  `;
}
