import { useEffect, useState } from "@odoo/owl";
import { Ref } from "../../types";

/**
 * Manages an event listener on a ref. Useful for hooks that want to manage
 * event listeners, especially more than one. Prefer using t-on directly in
 * components. If your hook only needs a single event listener, consider simply
 * returning it from the hook and letting the user attach it with t-on.
 *
 * Adapted from Odoo Community - See https://github.com/odoo/odoo/blob/saas-16.2/addons/web/static/src/core/utils/hooks.js
 */
export function useRefListener(
  ref: Ref<HTMLElement>,
  ...listener: Parameters<typeof addEventListener>
) {
  useEffect(
    (el: HTMLElement | null) => {
      el?.addEventListener(...listener);
      return () => el?.removeEventListener(...listener);
    },
    () => [ref.el]
  );
}

export function useHoveredElement(ref: Ref<HTMLElement>) {
  const state = useState({ hovered: false });
  useRefListener(ref, "mouseenter", () => (state.hovered = true));
  useRefListener(ref, "mouseleave", () => (state.hovered = false));
  // If a render changes the element size while the mouse is over it,
  // the mouseleave event might not be triggered. Removing the hover state in case of a resize is not great,
  // but it's better than having a stuck hover state.
  const resizeObserver = new ResizeObserver(() => {
    state.hovered = false;
  });
  useEffect(
    () => {
      resizeObserver.observe(ref.el!);
      return () => {
        resizeObserver.disconnect();
      };
    },
    () => [ref.el]
  );

  return state;
}
