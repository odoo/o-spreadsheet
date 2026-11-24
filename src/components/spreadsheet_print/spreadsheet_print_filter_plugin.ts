import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";

export class SpreadsheetPrintFilterPlugin extends OwlPluginWithModel {
  printFilters(page: HTMLElement) {
    const test = document.createElement("span");
    test.textContent = "Should not be displayed";
    page.appendChild(test);
    return page;
  }
}
