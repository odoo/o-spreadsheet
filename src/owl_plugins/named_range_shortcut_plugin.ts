import { Plugin, Signal } from "@odoo/owl";

export class NamedRangeShortcutPlugin extends Plugin {
  private namedRangeSelectorRef?: Signal<HTMLElement | null>;

  provideRef(ref: Signal<HTMLElement | null>) {
    this.namedRangeSelectorRef = ref;
  }

  focusOnSelector() {
    this.namedRangeSelectorRef?.()?.querySelector("input")?.focus();
  }
}
