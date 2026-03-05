import { useRef } from "@odoo/owl";
import { useLayoutEffect } from "../../owl2";

export function useAutofocus({ refName }: { refName: string }) {
  const ref = useRef(refName);
  useLayoutEffect(
    (el) => {
      el?.focus();
    },
    () => [ref.el]
  );
}
