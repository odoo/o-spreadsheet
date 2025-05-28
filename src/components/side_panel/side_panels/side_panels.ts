import { Component, useEffect } from "@odoo/owl";
import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { SidePanel } from "../side_panel/side_panel";
import { SidePanelStore } from "../side_panel/side_panel_store";

css/* scss */ `
  .o-sidePanels {
    overflow-x: auto;
  }
`;
export class SidePanels extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanels";
  static props = { "*": Object }; // ADRM TODO
  static components = { SidePanel };
  sidePanelStore!: Store<SidePanelStore>;
  spreadsheetRect = useSpreadsheetRect();

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    useEffect(
      (isOpen) => {
        // ADRM TODO: 100% sure this doesn't work too well. table side panel crashed if it's the secondary panel, and that we click outisde of a table
        if (!isOpen) {
          this.sidePanelStore.closeMainPanel();
        }
      },
      () => [this.sidePanelStore.isOpen]
    );
  }

  getPanelKey(panel: "mainPanel" | "secondaryPanel"): string | undefined {
    const key =
      panel === "mainPanel"
        ? this.sidePanelStore.mainPanelKey
        : this.sidePanelStore.secondaryPanelKey;
    console.log(panel, key);
    return key;
  }

  startHandleDrag(panel: "mainPanel" | "secondaryPanel", ev: MouseEvent) {
    const startingCursor = document.body.style.cursor;
    const panelInfo =
      panel === "mainPanel" ? this.sidePanelStore.mainPanel : this.sidePanelStore.secondaryPanel;
    if (!panelInfo) {
      return;
    }
    const startSize = panelInfo.panelSize;
    const startPosition = ev.clientX;
    const onMouseMove = (ev: MouseEvent) => {
      document.body.style.cursor = "col-resize";
      const newSize = startSize + startPosition - ev.clientX;
      this.sidePanelStore.changePanelSize(panel, newSize, this.spreadsheetRect.width);
    };
    const cleanUp = () => {
      document.body.style.cursor = startingCursor;
    };
    startDnd(onMouseMove, cleanUp);
  }

  resetPanelSize(panel: "mainPanel" | "secondaryPanel") {
    this.sidePanelStore.resetPanelSize(panel);
  }

  getDivStyle(panel: "mainPanel" | "secondaryPanel"): string {
    const panelInfo =
      panel === "mainPanel" ? this.sidePanelStore.mainPanel : this.sidePanelStore.secondaryPanel;
    if (!panelInfo) {
      return "";
    }
    return cssPropertiesToCss({
      width: `${panelInfo.panelSize}px`,
    });
  }

  get mainPanelProps(): SidePanel["props"] | undefined {
    if (!this.sidePanelStore.mainPanel) {
      return undefined;
    }
    return {
      panelContent: sidePanelRegistry.get(this.sidePanelStore.mainPanel.componentTag),
      panelProps: this.sidePanelStore.mainPanelProps!, // ADRM TODO avoid exclamation mark
      onCloseSidePanel: () => this.sidePanelStore.closeMainPanel(),
      togglePinPanel: () => this.sidePanelStore.togglePinPanel(),
      onStartHandleDrag: (ev: MouseEvent) => this.startHandleDrag("mainPanel", ev),
      onResetPanelSize: () => this.resetPanelSize("mainPanel"),
      canPinPanel: true,
      isPinned: this.sidePanelStore.hasPinedPanel,
    };
  }

  get secondaryPanelProps(): SidePanel["props"] | undefined {
    if (!this.sidePanelStore.secondaryPanel) {
      return undefined;
    }
    return {
      panelContent: sidePanelRegistry.get(this.sidePanelStore.secondaryPanel.componentTag),
      panelProps: this.sidePanelStore.secondaryPanelProps!, // ADRM TODO avoid exclamation mark
      onCloseSidePanel: () => this.sidePanelStore.close(),
      onStartHandleDrag: (ev: MouseEvent) => this.startHandleDrag("secondaryPanel", ev),
      onResetPanelSize: () => this.resetPanelSize("secondaryPanel"),
      canPinPanel: false,
    };
  }

  get panelList() {
    const list: any[] = [];
    if (this.sidePanelStore.secondaryPanel) {
      console.log(this.secondaryPanelProps);
      list.push({
        key: this.getPanelKey("secondaryPanel"),
        props: this.secondaryPanelProps,
        style: this.getDivStyle("secondaryPanel"),
      });
    }
    if (this.sidePanelStore.mainPanel) {
      list.push({
        key: this.getPanelKey("mainPanel"),
        props: this.mainPanelProps,
        style: this.getDivStyle("mainPanel"),
      });
    }
    return list;
  }
}
