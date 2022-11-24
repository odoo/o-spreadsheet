/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement, ev: Event): boolean {
  return !!ev.target && parent!.contains(ev.target as Node);
}

export function gridOverlayPosition() {
  const spreadsheetElement = document.querySelector(".o-grid-overlay");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement?.getBoundingClientRect();
    return { top, left };
  }
  throw new Error("Can't find spreadsheet position");
}

/**
 * Iterate over the dom tree starting at `el` and over all the children depth first.
 */
export function* iterateChildren(el: Node): Generator<Node> {
  yield el;
  if (el.hasChildNodes()) {
    for (let child of el.childNodes) {
      yield* iterateChildren(child);
    }
  }
}

export function getElementScrollTop(el: HTMLElement | null): number {
  return el?.scrollTop || 0;
}

export function setElementScrollTop(el: HTMLElement | null, scroll: number) {
  if (!el) return;
  el.scrollTop = scroll;
}
