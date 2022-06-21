import { CSSProperties, Style } from "../../types";

/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement, ev: Event): boolean {
  return !!ev.target && parent!.contains(ev.target as Node);
}

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
 * Convert the cell text style to CSS properties.
 */
export function cellTextStyleToCss(style: Style | undefined): CSSProperties {
  const attributes: Record<string, string> = {};
  if (!style) return attributes;

  if (style.bold) {
    attributes["font-weight"] = "bold";
  }
  if (style.italic) {
    attributes["font-style"] = "italic";
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

export function cssPropertiesToCss(attributes: CSSProperties): string {
  const str = Object.entries(attributes)
    .map(([attName, attValue]) => `${attName}: ${attValue};`)
    .join("\n");

  return "\n" + str + "\n";
}

export function gridOverlayPosition() {
  const spreadsheetElement = document.querySelector(".o-grid-overlay");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement?.getBoundingClientRect();
    return { top, left };
  }
  throw new Error("Can't find spreadsheet position");
}
