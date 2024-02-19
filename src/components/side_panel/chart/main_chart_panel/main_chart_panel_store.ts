import { SpreadsheetStore } from "../../../../stores";

export class MainChartPanelStore extends SpreadsheetStore {
  panel: "configuration" | "design" = "configuration";

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }
}
