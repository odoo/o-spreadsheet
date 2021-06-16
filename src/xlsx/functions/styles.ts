import { toHex6 } from "../../helpers";
import { Border, BorderDescr } from "../../types";
import { XLSXDxf, XLSXFill, XLSXFont, XLSXStyle, XMLAttributes, XMLString } from "../../types/xlsx";
import { FIRST_NUMFMT_ID } from "../constants";
import { escapeXml, formatAttributes, joinXmlNodes } from "../helpers/xml_helpers";

export function addNumberFormats(numFmts: string[]): XMLString {
  const numFmtNodes: XMLString[] = [];
  for (let [index, numFmt] of Object.entries(numFmts)) {
    const numFmtAttrs: XMLAttributes = [
      ["numFmtId", parseInt(index) + FIRST_NUMFMT_ID],
      ["formatCode", numFmt],
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

export function addFonts(fonts: XLSXFont[]): XMLString {
  const fontNodes: XMLString[] = [];
  for (let font of Object.values(fonts)) {
    fontNodes.push(escapeXml/*xml*/ `
      <font>
        ${font.bold ? escapeXml/*xml*/ `<b />` : ""}
        ${font.italic ? escapeXml/*xml*/ `<i />` : ""}
        ${font.underline ? escapeXml/*xml*/ `<u />` : ""}
        ${font.strike ? escapeXml/*xml*/ `<strike />` : ""}
        <sz val="${font.size}" />
        <color rgb="${toHex6(font.color)}" />
        <name val="${font.name}" />
      </font>
    `);
  }
  return escapeXml/*xml*/ `
    <fonts count="${fonts.length}">
      ${joinXmlNodes(fontNodes)}
    </fonts>
  `;
}

export function addFills(fills: XLSXFill[]): XMLString {
  const fillNodes: XMLString[] = [];
  for (let fill of Object.values(fills)) {
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
            <fgColor rgb="${toHex6(fill.fgColor!)}" />
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

export function addBorders(borders: Border[]): XMLString {
  const borderNodes: XMLString[] = [];
  for (let border of Object.values(borders)) {
    borderNodes.push(escapeXml/*xml*/ `
      <border>
        <left ${formatBorderAttribute(border["left"])} />
        <right ${formatBorderAttribute(border["right"])} />
        <top ${formatBorderAttribute(border["top"])} />
        <bottom ${formatBorderAttribute(border["bottom"])} />
        <diagonal ${formatBorderAttribute(border["diagonal"])} />
      </border>
    `);
  }
  return escapeXml/*xml*/ `
    <borders count="${borders.length}">
      ${joinXmlNodes(borderNodes)}
    </borders>
  `;
}

export function formatBorderAttribute(description: BorderDescr | undefined): XMLString {
  if (!description) {
    return escapeXml``;
  }
  return formatAttributes([
    ["style", description[0]],
    ["color", toHex6(description[1])],
  ]);
}

export function addStyles(styles: XLSXStyle[]): XMLString {
  const styleNodes: XMLString[] = [];
  for (let style of styles) {
    const attributes: XMLAttributes = [
      ["numFmtId", style.numFmtId],
      ["fillId", style.fillId],
      ["fontId", style.fontId],
      ["borderId", style.borderId],
    ];
    // Note: the apply${substyleName} does not seem to be required
    const alignAttrs: XMLAttributes = [];
    if (style.verticalAlignment) {
      alignAttrs.push(["vertical", style.verticalAlignment]);
    }
    if (style.horizontalAlignment) {
      alignAttrs.push(["horizontal", style.horizontalAlignment]);
    }

    styleNodes.push(escapeXml/*xml*/ `
      <xf ${formatAttributes(attributes)}>
        ${alignAttrs ? escapeXml/*xml*/ `<alignment ${formatAttributes(alignAttrs)} />` : ""}
      </xf>
    `);
  }
  return escapeXml/*xml*/ `
    <cellXfs count="${styles.length}">
      ${joinXmlNodes(styleNodes)}
    </cellXfs>
  `;
}

/**
 * DXFS : Differential Formatting Records - Conditional formats
 */
export function addCellWiseConditionalFormatting(
  dxfs: XLSXDxf[] // cell-wise CF
): XMLString {
  const dxfNodes: XMLString[] = [];
  for (const dxf of dxfs) {
    let fontNode: XMLString = escapeXml``;
    if (dxf.font?.color) {
      fontNode = escapeXml/*xml*/ `
        <font rgb="${toHex6(dxf.font.color)}" />
      `;
    }
    let fillNode: XMLString = escapeXml``;
    if (dxf.fill) {
      fillNode = escapeXml/*xml*/ `
        <fill>
          <patternFill>
            <bgColor rgb="${toHex6(dxf.fill.fgColor!)}" />
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
