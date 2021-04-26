import { toHex6 } from "../../helpers";
import { Border, BorderDescr } from "../../types";
import { XLSXDxf, XLSXFill, XLSXFont, XLSXStyle, XMLAttributes, XMLString } from "../../types/xlsx";
import { FIRST_NUMFMT_ID } from "../constants";
import { formatAttributes } from "../helpers/xml_helpers";

export function addNumberFormats(numFmts: string[]): XMLString {
  const numFmtNodes: XMLString[] = [];
  for (let [index, numFmt] of Object.entries(numFmts)) {
    const numFmtAttrs: XMLAttributes = [
      ["numFmtId", parseInt(index) + FIRST_NUMFMT_ID],
      ["formatCode", numFmt],
    ];
    numFmtNodes.push(/*xml*/ `
      <numFmt ${formatAttributes(numFmtAttrs)}/>
    `);
  }
  return /*xml*/ `
    <numFmts count="${numFmts.length}">
      ${numFmtNodes.join("\n")}
    </numFmts>
  `;
}

export function addFonts(fonts: XLSXFont[]): XMLString {
  const fontNodes: XMLString[] = [];
  for (let font of Object.values(fonts)) {
    fontNodes.push(/*xml*/ `
      <font>
        ${font.bold ? /*xml*/ `<b />` : ""}
        ${font.italic ? /*xml*/ `<i />` : ""}
        ${font.strike ? /*xml*/ `<strike />` : ""}
        <sz val="${font.size}" />
        <color rgb="${toHex6(font.color)}" />
        <name val="${font.name}" />
      </font>
    `);
  }
  return /*xml*/ `
    <fonts count="${fonts.length}">
      ${fontNodes.join("\n")}
    </fonts>
  `;
}

export function addFills(fills: XLSXFill[]): XMLString {
  const fillNodes: XMLString[] = [];
  for (let fill of Object.values(fills)) {
    if (fill.reservedAttribute !== undefined) {
      fillNodes.push(/*xml*/ `
        <fill>
          <patternFill patternType="${fill.reservedAttribute}" />
        </fill>
      `);
    } else {
      fillNodes.push(/*xml*/ `
        <fill>
          <patternFill patternType="solid">
            <fgColor rgb="${toHex6(fill.fgColor!)}" />
            <bgColor indexed="64" />
          </patternFill>
        </fill>
      `);
    }
  }
  return /*xml*/ `
    <fills count="${fills.length}">
    ${fillNodes.join("\n")}
    </fills>
  `;
}

export function addBorders(borders: Border[]): XMLString {
  const borderNodes: XMLString[] = [];
  for (let border of Object.values(borders)) {
    borderNodes.push(/*xml*/ `
      <border>
        <left ${formatBorderAttribute(border["left"])} />
        <right ${formatBorderAttribute(border["right"])} />
        <top ${formatBorderAttribute(border["top"])} />
        <bottom ${formatBorderAttribute(border["bottom"])} />
        <diagonal ${formatBorderAttribute(border["diagonal"])} />
      </border>
    `);
  }
  return /*xml*/ `
    <borders count="${borders.length}">
      ${borderNodes.join("\n")}
    </borders>
  `;
}

export function formatBorderAttribute(description: BorderDescr | undefined): XMLString {
  if (!description) {
    return "";
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

    styleNodes.push(/*xml*/ `
      <xf ${formatAttributes(attributes)}>
        ${alignAttrs ? /*xml*/ `<alignment ${formatAttributes(alignAttrs)} />` : ""}
      </xf>
    `);
  }
  return /*xml*/ `
    <cellXfs count="${styles.length}">
      ${styleNodes.join("\n")}
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
    let fontNode: XMLString = "";
    if (dxf.font?.color) {
      fontNode = /*xml*/ `
        <font rgb="${toHex6(dxf.font.color)}" />
      `;
    }
    let fillNode: XMLString = "";
    if (dxf.fill) {
      fillNode = /*xml*/ `
        <fill>
          <patternFill>
            <bgColor rgb="${toHex6(dxf.fill.fgColor!)}" />
          </patternFill>
        </fill>
      `;
    }
    dxfNodes.push(/*xml*/ `
      <dxf>
        ${fontNode}
        ${fillNode}
      </dxf>
    `);
  }
  return /*xml*/ `
    <dxfs count="${dxfs.length}">
      ${dxfNodes.join("\n")}
    </dxfs>
  `;
}
