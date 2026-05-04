/**
 * This file is largely inspired by owl 1.
 * `css` tag has been removed from owl 2 without workaround to manage css.
 * So, the solution was to import the behavior of owl 1 directly in our
 * codebase, with one difference: the css is added to the sheet as soon as the
 * css tag is executed. In owl 1, the css was added as soon as a Component was
 * created for the first time.
 */

import { CSSProperties, Style } from "../../types/misc";

export function getTextDecoration({
  strikethrough,
  underline,
}: {
  strikethrough?: boolean;
  underline?: boolean;
}): string {
  if (!strikethrough && !underline) {
    return "none";
  }
  return `${strikethrough ? "line-through" : ""} ${underline ? "underline" : ""}`;
}

/**
 * Convert the cell style to CSS properties.
 */
export function cellStyleToCss(style: Style | undefined): CSSProperties {
  const attributes = cellTextStyleToCss(style);
  if (!style) {
    return attributes;
  }

  if (style.fillColor) {
    attributes["background"] = style.fillColor;
  }

  return attributes;
}

/**
 * Convert the cell text style to CSS properties.
 */
export function cellTextStyleToCss(style: Style | undefined): CSSProperties {
  const attributes: Record<string, string> = {};
  if (!style) {
    return attributes;
  }

  if (style.bold) {
    attributes["font-weight"] = "bold";
  }
  if (style.italic) {
    attributes["font-style"] = "italic";
  }
  if (style.fontSize) {
    attributes["font-size"] = `${style.fontSize}px`;
  }
  if (style.strikethrough || style.underline) {
    let decoration = style.strikethrough ? "line-through" : "";
    decoration = style.underline ? decoration + " underline" : decoration;
    attributes["text-decoration"] = decoration;
  }
  if (style.textColor) {
    attributes["color"] = style.textColor;
  }

  return attributes;
}

/**
 * Transform CSS properties into a CSS string.
 */
export function cssPropertiesToCss(attributes: CSSProperties): string {
  let styleStr = "";
  for (const attName in attributes) {
    if (!attributes[attName]) {
      continue;
    }
    styleStr += `${attName}:${attributes[attName]}; `;
  }

  return styleStr;
}

export function getElementMargins(el: Element) {
  const style = window.getComputedStyle(el);
  return {
    top: parseInt(style.marginTop, 10) || 0,
    bottom: parseInt(style.marginBottom, 10) || 0,
    left: parseInt(style.marginLeft, 10) || 0,
    right: parseInt(style.marginRight, 10) || 0,
  };
}
