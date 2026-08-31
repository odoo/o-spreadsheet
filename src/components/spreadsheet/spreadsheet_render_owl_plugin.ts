import { Plugin, signal } from "@odoo/owl";

export class SpreadsheetRenderPlugin extends Plugin {
  counter = signal(0);

  render() {
    this.counter.set(this.counter() + 1);
  }
}
