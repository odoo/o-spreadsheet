import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  MIN_CELL_TEXT_MARGIN,
  MIN_CF_ICON_MARGIN,
  NEWLINE,
  PADDING_AUTORESIZE_VERTICAL,
} from "../constants";
import { Cell, Pixel, Style } from "../types";

export function computeTextLinesHeight(textLineHeight: number, numberOfLines: number = 1) {
  return numberOfLines * (textLineHeight + MIN_CELL_TEXT_MARGIN) - MIN_CELL_TEXT_MARGIN;
}

/**
 * Get the default height of the cell given its style.
 */
export function getDefaultCellHeight(cell: Cell | undefined): Pixel {
  if (!cell || !cell.content) {
    return DEFAULT_CELL_HEIGHT;
  }
  const fontSize = computeTextFontSizeInPixels(cell.style);
  const numberOfLines = cell.isFormula ? 1 : cell.content.split(NEWLINE).length;
  return computeTextLinesHeight(fontSize, numberOfLines) + 2 * PADDING_AUTORESIZE_VERTICAL;
}

const textWidthCache: Record<string, Record<string, number>> = {};

export function computeTextWidth(context: CanvasRenderingContext2D, text: string, style: Style) {
  const font = computeTextFont(style);
  if (!textWidthCache[font]) {
    textWidthCache[font] = {};
  }
  if (textWidthCache[font][text] === undefined) {
    context.save();
    context.font = font;
    const textWidth = context.measureText(text).width;
    context.restore();
    textWidthCache[font][text] = textWidth;
  }
  return textWidthCache[font][text];
}

export function fontSizeInPixels(fontSize: number) {
  return Math.round((fontSize * 96) / 72);
}

export function computeTextFont(style: Style): string {
  const italic = style.italic ? "italic " : "";
  const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
  const size = computeTextFontSizeInPixels(style);
  return `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
}

export function computeTextFontSizeInPixels(style?: Style): number {
  const sizeInPt = style?.fontSize || DEFAULT_FONT_SIZE;
  return fontSizeInPixels(sizeInPt);
}

/**
 * Return the font size that makes the width of a text match the given line width.
 * Minimum font size is 1.
 *
 * @param getTextWidth function that takes a fontSize as argument, and return the width of the text with this font size.
 */
export function getFontSizeMatchingWidth(
  lineWidth: number,
  maxFontSize: number,
  getTextWidth: (fontSize: number) => number,
  precision = 0.25
) {
  let minFontSize = 1;
  if (getTextWidth(minFontSize) > lineWidth) return minFontSize;
  if (getTextWidth(maxFontSize) < lineWidth) return maxFontSize;

  // Dichotomic search
  let fontSize = (minFontSize + maxFontSize) / 2;
  let currentTextWidth = getTextWidth(fontSize);

  // Use a maximum number of iterations to be safe, because measuring text isn't 100% precise
  let iterations = 0;
  while (Math.abs(currentTextWidth - lineWidth) > precision && iterations < 20) {
    if (currentTextWidth >= lineWidth) {
      maxFontSize = (minFontSize + maxFontSize) / 2;
    } else {
      minFontSize = (minFontSize + maxFontSize) / 2;
    }
    fontSize = (minFontSize + maxFontSize) / 2;
    currentTextWidth = getTextWidth(fontSize);
    iterations++;
  }
  return fontSize;
}

export function computeIconWidth(style: Style) {
  return computeTextFontSizeInPixels(style) + 2 * MIN_CF_ICON_MARGIN;
}

/** Transform a string to lower case. If the string is undefined, return an empty string */
export function toLowerCase(str: string | undefined): string {
  return str ? str.toLowerCase() : "";
}
