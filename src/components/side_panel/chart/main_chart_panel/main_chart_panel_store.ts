import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";
import { Command, UID } from "../../../../types";
import { SidePanelStore } from "../../side_panel/side_panel_store";

export class MainChartPanelStore extends SpreadsheetStore {
  private sidePanel = this.get(SidePanelStore);

  figureId: UID | null;
  panel: "configuration" | "design" = "configuration";

  constructor(get: Get, figureId: UID | null) {
    super(get);
    this.figureId = figureId;
  }

  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "DELETE_FIGURE":
        if (this.sidePanel.componentTag === "ChartPanel" && this.figureId === cmd.id) {
          this.sidePanel.close();
        }
        break;
      case "SELECT_FIGURE":
        if (cmd.id) {
          this.figureId = cmd.id;
        } else if (this.sidePanel.componentTag === "ChartPanel") {
          this.sidePanel.close();
        }
    }
  }

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }
}
