import { useRef } from "@odoo/owl";
import { useLayoutEffect } from "../../owl3_compatibility_layer";

export function useAutofocus({ refName }: { refName: string }) {
  const ref = useRef(refName);
  useLayoutEffect(
    (el) => {
      el?.focus();
    },
    () => [ref.el]
  );
}
