import { DEFAULT_FONT_SIZE, NEWLINE } from "../../../constants";
import { getCanonicalRepresentation } from "../../../helpers/data_normalization";
import { BorderDescr, Style } from "../../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../../types/workbook_data";
import {
  ExtractedStyle,
  XLSXBorder,
  XLSXBorderDescr,
  XLSXHorizontalAlignment,
  XLSXNumFormat,
  XLSXStructure,
  XLSXStyle,
} from "../../../types/xlsx";
import { FIRST_NUMFMT_ID } from "../../constants";
import {
  V_ALIGNMENT_EXPORT_CONVERSION_MAP,
  XLSX_FORMAT_MAP,
} from "../../conversion/conversion_maps";

/**
 * Build the initial XLSXStructure accumulator with default fonts / fills /
 * borders / styles that are always present in an xlsx file (index 0 is the
 * "default cell" entry in each of fonts / fills / borders / styles).
 */
export function createDefaultXLSXStructure(data: ExcelWorkbookData): XLSXStructure {
  const xlsxBorders: XLSXBorder[] = Object.values(data.borders).map((border) => ({
    left: convertBorderDescr(border.left),
    right: convertBorderDescr(border.right),
    bottom: convertBorderDescr(border.bottom),
    top: convertBorderDescr(border.top),
  }));
  return {
    sheets: [],
    sharedStrings: [],
    styles: [{ fontId: 0, fillId: 0, numFmtId: 0, borderId: 0, alignment: {} }],
    fonts: [{ size: DEFAULT_FONT_SIZE, family: 2, color: { rgb: "000000" }, name: "Arial" }],
    fills: [{ reservedAttribute: "none" }, { reservedAttribute: "gray125" }],
    borders: [{}, ...xlsxBorders],
    numFmts: [],
    dxfs: [],
  };
}

function convertBorderDescr(descr: BorderDescr | undefined): XLSXBorderDescr | undefined {
  if (!descr) {
    return undefined;
  }
  return { style: descr.style, color: { rgb: descr.color } };
}

export function extractStyle(
  data: WorkbookData,
  content: string | undefined,
  styleId: number | undefined,
  formatId: number | undefined,
  borderId: number | undefined
): ExtractedStyle {
  const style: Style = styleId ? data.styles[styleId] : {};
  const format = formatId ? data.formats[formatId] : undefined;
  const styles = {
    font: {
      size: style?.fontSize || DEFAULT_FONT_SIZE,
      color: { rgb: style?.textColor ? style!.textColor : "000000" },
      family: 2,
      name: "Arial",
    },
    fill: style?.fillColor
      ? {
          fgColor: { rgb: style!.fillColor },
        }
      : { reservedAttribute: "none" },
    numFmt: format ? { format: format, id: 0 /* id not used for export */ } : undefined,
    border: borderId || 0,
    alignment: {
      horizontal: style.align as XLSXHorizontalAlignment,
      vertical: style.verticalAlign
        ? V_ALIGNMENT_EXPORT_CONVERSION_MAP[style.verticalAlign]
        : undefined,
      wrapText: style.wrapping === "wrap" || content?.includes(NEWLINE) ? true : undefined,
      textRotation: style.rotation ? rotationToXLSX(style.rotation) : undefined,
      shrinkToFit: style.wrapping === "clip" ? true : undefined,
    },
  };

  styles.font["strike"] = !!style?.strikethrough || undefined;
  styles.font["underline"] = !!style?.underline || undefined;
  styles.font["bold"] = !!style?.bold || undefined;
  styles.font["italic"] = !!style?.italic || undefined;
  return styles;
}

function rotationToXLSX(rad: number): number {
  let deg = Math.round((-rad / Math.PI) * 180) % 180;
  if (deg > 90) {
    deg -= 180;
  } else if (deg < -90) {
    deg += 180;
  }
  if (deg >= 0) {
    return deg;
  } else {
    return 90 - deg;
  }
}

export function normalizeStyle(construct: XLSXStructure, styles: ExtractedStyle): number {
  const numFmtId = convertFormat(styles["numFmt"], construct.numFmts);
  const style = {
    fontId: pushElement(styles.font, construct.fonts),
    fillId: pushElement(styles.fill, construct.fills),
    borderId: styles.border,
    numFmtId,
    alignment: {
      vertical: styles.alignment.vertical,
      horizontal: styles.alignment.horizontal,
      wrapText: styles.alignment.wrapText,
      textRotation: styles.alignment.textRotation,
      shrinkToFit: styles.alignment.shrinkToFit,
    },
  } as XLSXStyle;

  return pushElement(style, construct.styles);
}

function convertFormat(
  format: XLSXNumFormat | undefined,
  numFmtStructure: XLSXNumFormat[]
): number {
  if (!format) {
    return 0;
  }
  let formatId: number | undefined = XLSX_FORMAT_MAP[format.format];
  if (!formatId) {
    formatId = pushElement(format, numFmtStructure) + FIRST_NUMFMT_ID;
  }
  return formatId;
}

const globalReverseLookup = new WeakMap<any[], Map<string, number>>();

/**
 * Dedup-and-append primitive. Looks up `property` in `propertyList` by
 * canonical representation; appends it if not present. Returns its index.
 *
 * (Retained as a free function for now because it is used by many call
 * sites. Future passes may migrate to the `XLSXInterned<T>` class-based
 * primitive in `../xlsx_interned.ts`.)
 */
export function pushElement<T>(property: T, propertyList: T[]): number {
  let reverseLookup = globalReverseLookup.get(propertyList);
  if (!reverseLookup) {
    reverseLookup = new Map();
    for (let i = 0; i < propertyList.length; i++) {
      const canonical = getCanonicalRepresentation(propertyList[i]);
      reverseLookup.set(canonical, i);
    }
    globalReverseLookup.set(propertyList, reverseLookup);
  }

  const canonical = getCanonicalRepresentation(property);
  if (reverseLookup.has(canonical)) {
    return reverseLookup.get(canonical)!;
  }

  const maxId = propertyList.length;
  propertyList.push(property);
  reverseLookup.set(canonical, maxId);
  return maxId;
}
