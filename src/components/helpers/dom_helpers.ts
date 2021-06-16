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
