import { Border, BorderDescr, Style } from "../../types";
import {
  XLSXBorder,
  XLSXBorderDescr,
  XLSXCellAlignment,
  XLSXFill,
  XLSXFont,
  XLSXHorizontalAlignment,
  XLSXImportData,
  XLSXVerticalAlignment,
} from "../../types/xlsx";
import { arrayToObject } from "../helpers/misc";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { convertColor } from "./color_conversion";
import {
  BORDER_STYLE_CONVERSION_MAP,
  H_ALIGNMENT_CONVERSION_MAP,
  SUPPORTED_BORDER_STYLES,
  SUPPORTED_FILL_PATTERNS,
  SUPPORTED_FONTS,
  SUPPORTED_HORIZONTAL_ALIGNMENTS,
  SUPPORTED_VERTICAL_ALIGNMENTS,
  V_ALIGNMENT_CONVERSION_MAP,
} from "./conversion_maps";
import { convertXlsxFormat } from "./format_conversion";

interface StyleStruct {
  fontStyle?: XLSXFont;
  fillStyle?: XLSXFill;
  alignment?: XLSXCellAlignment;
}

export function convertBorders(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): { [key: number]: Border } {
  const borderArray = data.borders.map((border): Border => {
    addBorderWarnings(border, warningManager);
    const b = {
      top: convertBorderDescr(border.top, warningManager),
      bottom: convertBorderDescr(border.bottom, warningManager),
      left: convertBorderDescr(border.left, warningManager),
      right: convertBorderDescr(border.right, warningManager),
    };
    Object.keys(b).forEach((key) => b[key] === undefined && delete b[key]);
    return b;
  });

  return arrayToObject(borderArray, 1);
}

function convertBorderDescr(
  borderDescr: XLSXBorderDescr | undefined,
  warningManager: XLSXImportWarningManager
): BorderDescr | undefined {
  if (!borderDescr) return undefined;

  addBorderDescrWarnings(borderDescr, warningManager);

  const style = BORDER_STYLE_CONVERSION_MAP[borderDescr.style];
  return style ? { style, color: convertColor(borderDescr.color)! } : undefined;
}

export function convertStyles(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): { [key: number]: Style } {
  const stylesArray = data.styles.map((style): Style => {
    return convertStyle(
      {
        fontStyle: data.fonts[style.fontId],
        fillStyle: data.fills[style.fillId],
        alignment: style.alignment,
      },
      warningManager
    );
  });

  return arrayToObject(stylesArray, 1);
}

export function convertStyle(
  styleStruct: StyleStruct,
  warningManager: XLSXImportWarningManager
): Style {
  addStyleWarnings(styleStruct?.fontStyle, styleStruct?.fillStyle, warningManager);
  addHorizontalAlignmentWarnings(styleStruct?.alignment?.horizontal, warningManager);
  addVerticalAlignmentWarnings(styleStruct?.alignment?.vertical, warningManager);

  return {
    bold: styleStruct.fontStyle?.bold,
    italic: styleStruct.fontStyle?.italic,
    strikethrough: styleStruct.fontStyle?.strike,
    underline: styleStruct.fontStyle?.underline,
    verticalAlign: styleStruct.alignment?.vertical
      ? V_ALIGNMENT_CONVERSION_MAP[styleStruct.alignment.vertical]
      : undefined,
    align: styleStruct.alignment?.horizontal
      ? H_ALIGNMENT_CONVERSION_MAP[styleStruct.alignment.horizontal]
      : undefined,
    // In xlsx fills, bgColor is the color of the fill, and fgColor is the color of the pattern above the background, except in solid fills
    fillColor:
      styleStruct.fillStyle?.patternType === "solid"
        ? convertColor(styleStruct.fillStyle?.fgColor)
        : convertColor(styleStruct.fillStyle?.bgColor),
    textColor: convertColor(styleStruct.fontStyle?.color),
    fontSize: styleStruct.fontStyle?.size,
    indent: styleStruct.alignment?.indent || undefined,
    wrapping: styleStruct.alignment?.wrapText ? "wrap" : "overflow",
  };
}

export function convertFormats(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): { [key: number]: string } {
  const formats: string[] = [];

  for (let style of data.styles) {
    const format = convertXlsxFormat(style.numFmtId, data.numFmts, warningManager);
    if (format) {
      formats[style.numFmtId] = format;
    }
  }

  return arrayToObject(formats, 1);
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function addStyleWarnings(
  font: XLSXFont | undefined,
  fill: XLSXFill | undefined,
  warningManager: XLSXImportWarningManager
) {
  if (font && font.name && !SUPPORTED_FONTS.includes(font.name)) {
    warningManager.generateNotSupportedWarning(
      WarningTypes.FontNotSupported,
      font.name,
      SUPPORTED_FONTS
    );
  }
  if (fill && fill.patternType && !SUPPORTED_FILL_PATTERNS.includes(fill.patternType)) {
    warningManager.generateNotSupportedWarning(
      WarningTypes.FillStyleNotSupported,
      fill.patternType,
      SUPPORTED_FILL_PATTERNS
    );
  }
}

function addBorderDescrWarnings(
  borderDescr: XLSXBorderDescr,
  warningManager: XLSXImportWarningManager
) {
  if (!SUPPORTED_BORDER_STYLES.includes(borderDescr.style)) {
    warningManager.generateNotSupportedWarning(
      WarningTypes.BorderStyleNotSupported,
      borderDescr.style,
      SUPPORTED_BORDER_STYLES
    );
  }
}

function addBorderWarnings(border: XLSXBorder, warningManager: XLSXImportWarningManager) {
  if (border.diagonal) {
    warningManager.generateNotSupportedWarning(WarningTypes.DiagonalBorderNotSupported);
  }
}

function addHorizontalAlignmentWarnings(
  alignment: XLSXHorizontalAlignment | undefined,
  warningManager: XLSXImportWarningManager
) {
  if (alignment && !SUPPORTED_HORIZONTAL_ALIGNMENTS.includes(alignment)) {
    warningManager.generateNotSupportedWarning(
      WarningTypes.HorizontalAlignmentNotSupported,
      alignment,
      SUPPORTED_HORIZONTAL_ALIGNMENTS
    );
  }
}

function addVerticalAlignmentWarnings(
  alignment: XLSXVerticalAlignment | undefined,
  warningManager: XLSXImportWarningManager
) {
  if (alignment && !SUPPORTED_VERTICAL_ALIGNMENTS.includes(alignment)) {
    warningManager.generateNotSupportedWarning(
      WarningTypes.VerticalAlignmentNotSupported,
      alignment,
      SUPPORTED_VERTICAL_ALIGNMENTS
    );
  }
}
