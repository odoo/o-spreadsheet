import { SpreadsheetStore } from "../../../../stores";

export class MainChartPanelStore extends SpreadsheetStore {
  mutators = ["activatePanel"];
  panel: "configuration" | "design" = "configuration";

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }
}
