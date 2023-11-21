const macRegex = /Mac/i;

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

export function getOpenedMenus(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".o-spreadsheet .o-menu"));
}

export function isMacOS(): boolean {
  return Boolean(macRegex.test(navigator.userAgent));
}

/**
 * @param {KeyboardEvent | MouseEvent} ev
 * @returns Returns true if the event was triggered with the "ctrl" modifier pressed.
 * On Mac, this is the "meta" or "command" key.
 */
export function isCtrlKey(ev: KeyboardEvent | MouseEvent): boolean {
  return isMacOS() ? ev.metaKey : ev.ctrlKey;
}
