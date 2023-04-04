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
export function getMultiLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: Style | undefined,
  width: number | undefined
): string[] {
  if (!style) style = {};
  const brokenText: string[] = [];
  for (const line of text.split("\n")) {
    const words = line.split(" ");

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
