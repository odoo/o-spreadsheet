import { proxy, Signal, useEffect, useListener } from "@odoo/owl";

export function useHoveredElement(ref: Signal<HTMLElement | null>) {
  const state = proxy({ hovered: false });
  useListener(ref, "mouseenter", () => (state.hovered = true));
  useListener(ref, "mouseleave", () => (state.hovered = false));
  // If a render changes the element size while the mouse is over it,
  // the mouseleave event might not be triggered. Removing the hover state in case of a resize is not great,
  // but it's better than having a stuck hover state.
  const resizeObserver = new ResizeObserver(() => {
    state.hovered = false;
  });
  useEffect(() => {
    const el = ref();
    if (el) {
      resizeObserver.observe(el);
    }
    return () => {
      resizeObserver.disconnect();
    };
  });

  return state;
}
