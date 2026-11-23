import { Plugin, signal } from "@odoo/owl";
import { ViewportsStore } from "../stores/viewports_store";
import { Store } from "../types/store_engine";

export class ExposeViewportsPlugin extends Plugin {
  viewports = signal<Store<ViewportsStore> | undefined>(undefined);

  exposeViewports(viewports: Store<ViewportsStore>) {
    this.viewports.set(viewports);
  }
}
