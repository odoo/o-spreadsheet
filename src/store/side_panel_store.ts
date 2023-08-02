import { SpreadsheetStore } from "./spreadsheet_store";

export class SidePanelStore extends SpreadsheetStore {
  isOpen = false;
  component?: string; // rename to componentTag or sidePanelTag
  panelProps: any = {};

  toggleSidePanel(panel: string, panelProps: any) {
    if (this.isOpen && this.component === panel) {
      this.closeSidePanel();
    } else {
      this.openSidePanel(panel, panelProps);
    }
  }

  openSidePanel(panel: string, panelProps: any) {
    this.component = panel;
    this.panelProps = panelProps;
    this.isOpen = true;
  }

  closeSidePanel() {
    this.isOpen = false;
    this.component = undefined;
    this.panelProps = {};
  }
}
