import { Signal, useEffect } from "@odoo/owl";

export function useAutofocus(ref: Signal<HTMLElement | null>) {
  useEffect(() => ref()?.focus());
}
