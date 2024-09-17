import { useEffect, useRef } from "@odoo/owl";

export function useAutofocus({ refName }: { refName: string }) {
  const ref = useRef(refName);
  useEffect(
    (el) => {
      el?.focus();
    },
    () => [ref.el]
  );
}
