/**
 * Return true if the event was triggered from
 * a child element.
 */
export function isChildEvent(parent: HTMLElement, ev: Event): boolean {
  console.log(ev.target);
  return !!ev.target && parent!.contains(ev.target as Node);
}
