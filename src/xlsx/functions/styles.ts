import { isObjectEmptyRecursive } from "../../helpers";
import {
  XLSXBorder,
  XLSXBorderDescr,
  XLSXDxf,
  XLSXFill,
  XLSXFont,
  XLSXNumFormat,
  XLSXStyle,
  XMLAttributes,
  XMLString,
} from "../../types/xlsx";
import { FIRST_NUMFMT_ID } from "../constants";
import { toXlsxHexColor } from "../helpers/colors";
import { escapeXml, formatAttributes, joinXmlNodes } from "../helpers/xml_helpers";

export function addNumberFormats(numFmts: XLSXNumFormat[]): XMLString {
  const numFmtNodes: XMLString[] = [];
  for (let [index, numFmt] of Object.entries(numFmts)) {
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

function addFont(font: Partial<XLSXFont>): XMLString {
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

export function addFonts(fonts: XLSXFont[]): XMLString {
  return escapeXml/*xml*/ `
    <fonts count="${fonts.length}">
      ${joinXmlNodes(Object.values(fonts).map(addFont))}
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

export function addBorders(borders: XLSXBorder[]): XMLString {
  const borderNodes: XMLString[] = [];
  for (let border of Object.values(borders)) {
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
    if (style.alignment && style.alignment.vertical) {
      alignAttrs.push(["vertical", style.alignment.vertical]);
    }
    if (style.alignment && style.alignment.horizontal) {
      alignAttrs.push(["horizontal", style.alignment.horizontal]);
    }
    if (style.alignment && style.alignment.wrapText) {
      alignAttrs.push(["wrapText", "1"]);
    }

    if (alignAttrs.length > 0) {
      attributes.push(["applyAlignment", "1"]); // for Libre Office
      styleNodes.push(
        escapeXml/*xml*/ `<xf ${formatAttributes(
          attributes
        )}>${escapeXml/*xml*/ `<alignment ${formatAttributes(alignAttrs)} />`}</xf> `
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
 * DXFS : Differential Formatting Records - Conditional formats
 */
export function addCellWiseConditionalFormatting(
  dxfs: XLSXDxf[] // cell-wise CF
): XMLString {
  const dxfNodes: XMLString[] = [];
  for (const dxf of dxfs) {
    let fontNode: XMLString = escapeXml``;
    if (dxf.font) {
      fontNode = addFont(dxf.font);
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
