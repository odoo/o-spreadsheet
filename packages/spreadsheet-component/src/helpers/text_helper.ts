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
import { Cell, Pixel, PixelPosition, Style } from "../types";

export function computeTextLinesHeight(textLineHeight: number, numberOfLines: number = 1) {
  return numberOfLines * (textLineHeight + MIN_CELL_TEXT_MARGIN) - MIN_CELL_TEXT_MARGIN;
}

/**
 * Get the default height of the cell given its style.
 */
export function getDefaultCellHeight(
  ctx: CanvasRenderingContext2D,
  cell: Cell | undefined,
  colSize: number
) {
  if (!cell || (!cell.isFormula && !cell.content)) {
    return DEFAULT_CELL_HEIGHT;
  }
  const maxWidth = cell.style?.wrapping === "wrap" ? colSize - 2 * MIN_CELL_TEXT_MARGIN : undefined;

  const numberOfLines = cell.isFormula
    ? 1
    : splitTextToWidth(ctx, cell.content, cell.style, maxWidth).length;

  const fontSize = computeTextFontSizeInPixels(cell.style);

  return computeTextLinesHeight(fontSize, numberOfLines) + 2 * PADDING_AUTORESIZE_VERTICAL;
}

export function getDefaultContextFont(
  fontSize: number,
  bold: boolean | undefined = false,
  italic: boolean | undefined = false
): string {
  const italicStr = italic ? "italic" : "";
  const weight = bold ? "bold" : "";
  return `${italicStr} ${weight} ${fontSize}px ${DEFAULT_FONT}`;
}

const textWidthCache: Record<string, Record<string, number>> = {};

export function computeTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
  style: Style,
  fontUnit: "px" | "pt" = "pt"
) {
  const font = computeTextFont(style, fontUnit);
  context.save();
  context.font = font;
  const width = computeCachedTextWidth(context, text);
  context.restore();
  return width;
}

export function computeCachedTextWidth(context: CanvasRenderingContext2D, text: string) {
  const font = context.font;
  if (!textWidthCache[font]) {
    textWidthCache[font] = {};
  }
  if (textWidthCache[font][text] === undefined) {
    const textWidth = context.measureText(text).width;
    textWidthCache[font][text] = textWidth;
  }
  return textWidthCache[font][text];
}

const textDimensionsCache: Record<string, Record<string, { width: number; height: number }>> = {};

export function computeTextDimension(
  context: CanvasRenderingContext2D,
  text: string,
  style: Style,
  fontUnit: "px" | "pt" = "pt"
): { width: number; height: number } {
  const font = computeTextFont(style, fontUnit);
  context.save();
  context.font = font;
  const dimensions = computeCachedTextDimension(context, text);
  context.restore();
  return dimensions;
}

function computeCachedTextDimension(
  context: CanvasRenderingContext2D,
  text: string
): { width: number; height: number } {
  const font = context.font;
  if (!textDimensionsCache[font]) {
    textDimensionsCache[font] = {};
  }
  if (textDimensionsCache[font][text] === undefined) {
    const measure = context.measureText(text);
    const width = measure.width;
    const height = measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent;
    textDimensionsCache[font][text] = { width, height };
  }
  return textDimensionsCache[font][text];
}

export function fontSizeInPixels(fontSize: number) {
  return Math.round((fontSize * 96) / 72);
}

export function computeTextFont(style: Style, fontUnit: "px" | "pt" = "pt"): string {
  const italic = style.italic ? "italic " : "";
  const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
  const size = fontUnit === "pt" ? computeTextFontSizeInPixels(style) : style.fontSize;
  return `${italic}${weight} ${size ?? DEFAULT_FONT_SIZE}px ${DEFAULT_FONT}`;
}

export function computeTextFontSizeInPixels(style?: Style): number {
  const sizeInPt = style?.fontSize || DEFAULT_FONT_SIZE;
  return fontSizeInPixels(sizeInPt);
}

function splitWordToSpecificWidth(
  ctx: CanvasRenderingContext2D,
  word: string,
  width: number,
  style: Style
): string[] {
  const wordWidth = computeTextWidth(ctx, word, style);
  if (wordWidth <= width) {
    return [word];
  }

  const splitWord: string[] = [];
  let wordPart = "";
  for (let l of word) {
    const wordPartWidth = computeTextWidth(ctx, wordPart + l, style);
    if (wordPartWidth > width) {
      splitWord.push(wordPart);
      wordPart = l;
    } else {
      wordPart += l;
    }
  }
  splitWord.push(wordPart);
  return splitWord;
}

/**
 * Return the given text, split in multiple lines if needed. The text will be split in multiple
 * line if it contains NEWLINE characters, or if it's longer than the given width.
 */
export function splitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: Style | undefined,
  width: number | undefined
): string[] {
  if (!style) style = {};
  const brokenText: string[] = [];

  // Checking if text contains NEWLINE before split makes it very slightly slower if text contains it,
  // but 5-10x faster if it doesn't
  const lines = text.includes(NEWLINE) ? text.split(NEWLINE) : [text];
  for (const line of lines) {
    const words = line.includes(" ") ? line.split(" ") : [line];

    if (!width) {
      brokenText.push(line);
      continue;
    }

    let textLine = "";
    let availableWidth = width;

    for (let word of words) {
      const splitWord = splitWordToSpecificWidth(ctx, word, width, style);
      const lastPart = splitWord.pop()!;
      const lastPartWidth = computeTextWidth(ctx, lastPart, style);

      // At this step: "splitWord" is an array composed of parts of word whose
      // length is at most equal to "width".
      // Last part contains the end of the word.
      // Note that: When word length is less than width, then lastPart is equal
      // to word and splitWord is empty

      if (splitWord.length) {
        if (textLine !== "") {
          brokenText.push(textLine);
          textLine = "";
          availableWidth = width;
        }
        splitWord.forEach((wordPart) => {
          brokenText.push(wordPart);
        });
        textLine = lastPart;
        availableWidth = width - lastPartWidth;
      } else {
        // here "lastPart" is equal to "word" and the "word" size is smaller than "width"
        const _word = textLine === "" ? lastPart : " " + lastPart;
        const wordWidth = computeTextWidth(ctx, _word, style);

        if (wordWidth <= availableWidth) {
          textLine += _word;
          availableWidth -= wordWidth;
        } else {
          brokenText.push(textLine);
          textLine = lastPart;
          availableWidth = width - lastPartWidth;
        }
      }
    }

    if (textLine !== "") {
      brokenText.push(textLine);
    }
  }
  return brokenText;
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

/**
 * Extract the fontSize from a context font string
 * @param font The (context) font string to parse
 * @returns The fontSize in pixels
 */
const pxRegex = /([0-9\.]*)px/;
export function getContextFontSize(font: string): Pixel {
  return Number(font.match(pxRegex)?.[1]);
}

// Inspired from https://stackoverflow.com/a/10511598
export function clipTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  let width = computeCachedTextWidth(ctx, text);
  if (width <= maxWidth) {
    return text;
  }
  const ellipsis = "…";
  const ellipsisWidth = computeCachedTextWidth(ctx, ellipsis);
  if (width <= ellipsisWidth) {
    return text;
  }
  let len = text.length;
  while (width >= maxWidth - ellipsisWidth && len-- > 0) {
    text = text.substring(0, len);
    width = computeCachedTextWidth(ctx, text);
  }
  return text + ellipsis;
}

export function drawDecoratedText(
  context: CanvasRenderingContext2D,
  text: string,
  position: PixelPosition,
  underline: boolean | undefined = false,
  strikethrough: boolean | undefined = false,
  strokeWidth: number = getContextFontSize(context.font) / 10 //This value is defined to get a good looking stroke
) {
  context.fillText(text, position.x, position.y);
  if (!underline && !strikethrough) {
    return;
  }
  const measure = context.measureText(text);
  const textWidth = measure.width;
  const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
  const boxHeight = measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent;
  let { x, y } = position;
  let strikeY = y,
    underlineY = y;
  switch (context.textAlign) {
    case "center":
      x -= textWidth / 2;
      break;
    case "right":
      x -= textWidth;
      break;
  }
  switch (context.textBaseline) {
    case "top":
      underlineY += boxHeight - 2 * strokeWidth;
      strikeY += boxHeight / 2 - strokeWidth;
      break;
    case "middle":
      underlineY += boxHeight / 2 - strokeWidth;
      break;
    case "alphabetic":
      underlineY += 2 * strokeWidth;
      strikeY -= 3 * strokeWidth;
      break;
    case "bottom":
      underlineY = y;
      strikeY -= textHeight / 2 - strokeWidth / 2;
      break;
  }
  if (underline) {
    context.lineWidth = strokeWidth;
    context.strokeStyle = context.fillStyle;
    context.beginPath();
    context.moveTo(x, underlineY);
    context.lineTo(x + textWidth, underlineY);
    context.stroke();
  }
  if (strikethrough) {
    context.lineWidth = strokeWidth;
    context.strokeStyle = context.fillStyle;
    context.beginPath();
    context.moveTo(x, strikeY);
    context.lineTo(x + textWidth, strikeY);
    context.stroke();
  }
}
