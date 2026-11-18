import { Plugin, signal } from "@odoo/owl";
import { ViewportsPluginInstance } from "./viewports_owl_plugin";

export class ExposeViewportsPlugin extends Plugin {
  viewports = signal<ViewportsPluginInstance | undefined>(undefined);

  exposeViewports(viewports: ViewportsPluginInstance) {
    this.viewports.set(viewports);
  }
}
