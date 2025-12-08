import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  MIN_CELL_TEXT_MARGIN,
  NEWLINE,
  PADDING_AUTORESIZE_VERTICAL,
} from "../constants";
import { Canvas2DContext } from "../types/canvas";
import { Cell } from "../types/cells";
import { Pixel, PixelPosition, Style } from "../types/misc";
import { isMarkdownLink, parseMarkdownLink } from "./misc";

export function computeTextLinesHeight(textLineHeight: number, numberOfLines: number = 1) {
  return numberOfLines * (textLineHeight + MIN_CELL_TEXT_MARGIN) - MIN_CELL_TEXT_MARGIN;
}

export function getCanvas(width: number = 100, height: number = 100): Canvas2DContext {
  // Browser environment
  return new OffscreenCanvas(width, height).getContext("2d") as unknown as Canvas2DContext;
}
/**
 * Get the default height of the cell given its style.
 */
export function getDefaultCellHeight(
  ctx: Canvas2DContext,
  cell: Cell | undefined,
  style: Style | undefined,
  colSize: number
) {
  if (!cell || (!cell.isFormula && !cell.content)) {
    return DEFAULT_CELL_HEIGHT;
  }
  const content = cell.isFormula ? "" : cell.content;
  return getCellContentHeight(ctx, content, style, colSize);
}

export function getCellContentHeight(
  ctx: Canvas2DContext,
  content: string,
  style: Style | undefined,
  colSize: number
): number {
  const maxWidth = style?.wrapping === "wrap" ? colSize - 2 * MIN_CELL_TEXT_MARGIN : undefined;
  const lines = splitTextToWidth(ctx, content, style, maxWidth);
  return computeMultilineTextSize(ctx, lines, style).height + 2 * PADDING_AUTORESIZE_VERTICAL;
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

export function computeMultilineTextSize(
  context: Canvas2DContext,
  textLines: string[],
  style: Style = {},
  fontUnit: "px" | "pt" = "pt"
) {
  if (!textLines.length) {
    return { width: 0, height: 0 };
  }
  const font = computeTextFont(style, fontUnit);
  const sizes = textLines.map((line) => computeCachedTextDimension(context, line, font));
  const height = computeTextLinesHeight(sizes[0].height, textLines.length);
  const width = Math.max(...sizes.map((size) => size.width));
  if (!style.rotation) {
    return { height, width };
  }
  const cos = Math.abs(Math.cos(style.rotation));
  const sin = Math.abs(Math.sin(style.rotation));
  return { width: width * cos + height * sin, height: sin * width + cos * height };
}

export function computeTextWidth(
  context: Canvas2DContext,
  text: string,
  style: Style = {},
  fontUnit: "px" | "pt" = "pt"
) {
  const font = computeTextFont(style, fontUnit);
  return computeCachedTextWidth(context, text, font, style.rotation);
}

function computeCachedTextWidth(
  context: Canvas2DContext,
  text: string,
  font: string,
  rotation?: number
) {
  const size = computeCachedTextDimension(context, text, font);
  if (!rotation) {
    return size.width;
  }
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  return size.width * cos + size.height * sin;
}

const textDimensionsCache: Record<string, Record<string, { width: number; height: number }>> = {};

export function computeTextDimension(
  context: Canvas2DContext,
  text: string,
  style: Style,
  fontUnit: "px" | "pt" = "pt"
): { width: number; height: number } {
  const font = computeTextFont(style, fontUnit);
  const size = computeCachedTextDimension(context, text, font);
  if (!style.rotation) {
    return size;
  }
  const cos = Math.abs(Math.cos(style.rotation));
  const sin = Math.abs(Math.sin(style.rotation));
  return {
    width: size.width * cos + size.height * sin,
    height: size.height * cos + size.width * sin,
  };
}

function computeCachedTextDimension(
  context: Canvas2DContext,
  text: string,
  font: string
): { width: number; height: number } {
  if (!textDimensionsCache[font]) {
    textDimensionsCache[font] = {};
  }
  if (textDimensionsCache[font][text] === undefined) {
    context.save();
    context.font = font;
    const measure = context.measureText(text);
    context.restore();
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
  ctx: Canvas2DContext,
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
  for (const l of word) {
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
  ctx: Canvas2DContext,
  text: string,
  style: Style | undefined,
  width: number | undefined
): string[] {
  if (!style) {
    style = {};
  }
  if (isMarkdownLink(text)) {
    text = parseMarkdownLink(text).label;
  }
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

    for (const word of words) {
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
  if (getTextWidth(minFontSize) > lineWidth) {
    return minFontSize;
  }
  if (getTextWidth(maxFontSize) < lineWidth) {
    return maxFontSize;
  }

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
export function clipTextWithEllipsis(ctx: Canvas2DContext, text: string, maxWidth: number) {
  let width = computeCachedTextWidth(ctx, text, ctx.font);
  if (width <= maxWidth) {
    return text;
  }
  const ellipsis = "…";
  const ellipsisWidth = computeCachedTextWidth(ctx, ellipsis, ctx.font);
  if (width <= ellipsisWidth) {
    return text;
  }
  let len = text.length;
  while (width >= maxWidth - ellipsisWidth && len-- > 0) {
    text = text.substring(0, len);
    width = computeCachedTextWidth(ctx, text, ctx.font);
  }
  return text + ellipsis;
}

export function drawDecoratedText(
  context: Canvas2DContext,
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

export function sliceTextToFitWidth(
  context: Canvas2DContext,
  width: number,
  text: string,
  style: Style,
  fontUnit: "px" | "pt" = "pt"
) {
  if (computeTextWidth(context, text, style, fontUnit) <= width) {
    return text;
  }
  const ellipsis = "...";
  const ellipsisWidth = computeTextWidth(context, ellipsis, style, fontUnit);
  if (ellipsisWidth >= width) {
    return "";
  }

  let lowerBoundLen = 1;
  let upperBoundLen = text.length;
  let currentWidth: number;

  while (lowerBoundLen <= upperBoundLen) {
    const currentLen = Math.floor((lowerBoundLen + upperBoundLen) / 2);
    const currentText = text.slice(0, currentLen);
    currentWidth = computeTextWidth(context, currentText, style, fontUnit);
    if (currentWidth + ellipsisWidth > width) {
      upperBoundLen = currentLen - 1;
    } else {
      lowerBoundLen = currentLen + 1;
    }
  }

  const slicedText = text.slice(0, Math.max(0, lowerBoundLen - 1));
  return slicedText ? slicedText + ellipsis : "";
}

/**
 * Return the position to draw text on a rotated canvas to ensure that the rotated text alignment correspond
 * with to original's text vertical and horizontal alignment.
 */
export function computeRotationPosition(
  rect: { x: number; y: number; textWidth: number; textHeight: number },
  style: Style
): PixelPosition {
  if (!style.rotation || style.rotation % (Math.PI * 2) === 0) {
    return rect;
  }
  let { x, y } = rect; // top-left when align=left and top-right when align=right, top-center when align=center
  const cos = Math.cos(-style.rotation);
  const sin = Math.sin(-style.rotation);
  const width = rect.textWidth - 2 * MIN_CELL_TEXT_MARGIN;
  const height = rect.textHeight;

  const center = style.align === "center";
  const rotateTowardCellCenter = (style.align === "left") === sin < 0;

  const sh = sin * height;
  const sw = Math.abs(sin * width);
  const ch = cos * height;

  // Adapt the anchor position based on the alignment and rotation
  if (style.verticalAlign === "top") {
    if (center) {
      y += sw / 2;
      x -= sh / 2;
    } else if (rotateTowardCellCenter) {
      x -= sh;
    } else {
      y += sw;
    }
  } else if (!style.verticalAlign || style.verticalAlign === "bottom") {
    y += height - ch;
    if (center) {
      y -= sw / 2;
      x -= sh / 2;
    } else if (rotateTowardCellCenter) {
      x -= sh;
      y -= sw;
    }
  } else {
    if (center) {
      x -= sh / 2;
      y -= height / 2;
      if (rotateTowardCellCenter) {
        y += sh;
      } else {
        y -= sh;
      }
    } else if (rotateTowardCellCenter) {
      x -= sh;
      y -= sw / 2;
    } else {
      y += sw / 2 + ch / 4;
    }
  }

  // Return the coordinate in the rotate 2d plane
  return { x: cos * x - sin * y, y: cos * y + sin * x };
}
