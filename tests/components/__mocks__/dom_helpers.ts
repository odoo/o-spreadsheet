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

export function gridOverlayPosition() {
  const spreadsheetElement = document.querySelector(".o-grid-overlay");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement.getBoundingClientRect();
    return { top, left };
  } else {
    return { top: 0, left: 0 };
  }
}
