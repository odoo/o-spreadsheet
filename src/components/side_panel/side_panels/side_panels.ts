import { Component, useEffect } from "@odoo/owl";
import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types/spreadsheetChildEnv";
import { cssPropertiesToCss } from "../../helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { SidePanel, SidePanelProps } from "../side_panel/side_panel";
import { SidePanelStore } from "../side_panel/side_panel_store";

export class SidePanels extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanels";
  static props = {};
  static components = { SidePanel };
  sidePanelStore!: Store<SidePanelStore>;
  spreadsheetRect = useSpreadsheetRect();

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    useEffect(
      () => {
        if (this.sidePanelStore.mainPanel && !this.sidePanelStore.isMainPanelOpen) {
          this.sidePanelStore.closeMainPanel();
        }
        if (this.sidePanelStore.secondaryPanel && !this.sidePanelStore.isSecondaryPanelOpen) {
          this.sidePanelStore.close();
        }
      },
      () => [this.sidePanelStore.isMainPanelOpen, this.sidePanelStore.isSecondaryPanelOpen]
    );
  }

  startHandleDrag(panel: "mainPanel" | "secondaryPanel", ev: MouseEvent) {
    const startingCursor = document.body.style.cursor;
    const panelInfo =
      panel === "mainPanel" ? this.sidePanelStore.mainPanel : this.sidePanelStore.secondaryPanel;
    if (!panelInfo) {
      return;
    }
    const startSize = panelInfo.size;
    const startPosition = ev.clientX;
    const onMouseMove = (ev: MouseEvent) => {
      document.body.style.cursor = "col-resize";
      const newSize = startSize + startPosition - ev.clientX;
      this.sidePanelStore.changePanelSize(panel, newSize);
    };
    const cleanUp = () => {
      document.body.style.cursor = startingCursor;
    };
    startDnd(onMouseMove, cleanUp);
  }

  get mainPanelProps(): SidePanel["props"] | undefined {
    const panelProps = this.sidePanelStore.mainPanelProps;
    if (!this.sidePanelStore.mainPanel || !panelProps) {
      return undefined;
    }
    return {
      panelContent: sidePanelRegistry.get(this.sidePanelStore.mainPanel.componentTag),
      panelProps,
      onCloseSidePanel: () => this.sidePanelStore.closeMainPanel(),
      onTogglePinPanel: () => this.sidePanelStore.togglePinPanel(),
      onStartHandleDrag: (ev: MouseEvent) => this.startHandleDrag("mainPanel", ev),
      onResetPanelSize: () => this.sidePanelStore.resetPanelSize("mainPanel"),
      isPinned: this.sidePanelStore.mainPanel?.isPinned,
      onToggleCollapsePanel: () => this.sidePanelStore.toggleCollapsePanel("mainPanel"),
      isCollapsed: this.sidePanelStore.mainPanel?.isCollapsed,
    };
  }

  get secondaryPanelProps(): SidePanelProps | undefined {
    const panelProps = this.sidePanelStore.secondaryPanelProps;
    if (!this.sidePanelStore.secondaryPanel || !panelProps) {
      return undefined;
    }
    return {
      panelContent: sidePanelRegistry.get(this.sidePanelStore.secondaryPanel.componentTag),
      panelProps,
      onCloseSidePanel: () => this.sidePanelStore.close(),
      onStartHandleDrag: (ev: MouseEvent) => this.startHandleDrag("secondaryPanel", ev),
      onResetPanelSize: () => this.sidePanelStore.resetPanelSize("secondaryPanel"),
      onToggleCollapsePanel: () => this.sidePanelStore.toggleCollapsePanel("secondaryPanel"),
      isCollapsed: this.sidePanelStore.secondaryPanel?.isCollapsed,
    };
  }

  get panelList() {
    return [
      {
        key: this.sidePanelStore.secondaryPanelKey,
        props: this.secondaryPanelProps,
        style: this.sidePanelStore.secondaryPanel
          ? cssPropertiesToCss({ width: `${this.sidePanelStore.secondaryPanel.size}px` })
          : "",
      },
      {
        key: this.sidePanelStore.mainPanelKey,
        props: this.mainPanelProps,
        style: this.sidePanelStore.mainPanel
          ? cssPropertiesToCss({ width: `${this.sidePanelStore.mainPanel.size}px` })
          : "",
      },
    ].filter((panel) => panel.key && panel.props);
  }
}
