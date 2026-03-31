import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetStore } from "../../../stores";
import { NotificationStore } from "../../../stores/notification_store";
import { ScreenWidthStore } from "../../../stores/screen_width_store";
import { _t } from "../../../translation";

export interface SidePanelComponentProps {
  onCloseSidePanel?: () => void;
  [key: string]: any;
}

interface OpenSidePanel {
  isOpen: true;
  props?: SidePanelComponentProps;
  key?: string;
}

interface ClosedSidePanel {
  isOpen: false;
}

export type SidePanelState = OpenSidePanel | ClosedSidePanel;

export const DEFAULT_SIDE_PANEL_SIZE = 350;
export const COLLAPSED_SIDE_PANEL_SIZE = 45;
export const MIN_SHEET_VIEW_WIDTH = 150;

interface PanelInfo {
  currentPanelProps: SidePanelComponentProps;
  componentTag: string;
  size: number;
  isCollapsed?: boolean;
}

export class SidePanelStore extends SpreadsheetStore {
  mutators = [
    "open",
    "replace",
    "toggle",
    "close",
    "changePanelSize",
    "resetPanelSize",
    "togglePinPanel",
    "closeMainPanel",
    "changeSpreadsheetWidth",
    "toggleCollapsePanel",
  ] as const;

  mainPanel: (PanelInfo & { isCollapsed?: boolean; isPinned?: boolean }) | undefined = undefined;
  secondaryPanel: PanelInfo | undefined;
  availableWidth: number = 0;

  screenWidthStore = this.get(ScreenWidthStore);

  get isMainPanelOpen() {
    return this.mainPanel && this.mainPanel.componentTag
      ? this.computeState(this.mainPanel).isOpen
      : false;
  }

  get isSecondaryPanelOpen() {
    return this.secondaryPanel && this.secondaryPanel.componentTag
      ? this.computeState(this.secondaryPanel).isOpen
      : false;
  }

  get mainPanelProps(): SidePanelComponentProps | undefined {
    return this.mainPanel ? this.getPanelProps(this.mainPanel) : undefined;
  }

  get mainPanelKey(): string | undefined {
    return this.mainPanel ? this.getPanelKey(this.mainPanel) : undefined;
  }

  get secondaryPanelProps(): SidePanelComponentProps | undefined {
    return this.secondaryPanel ? this.getPanelProps(this.secondaryPanel) : undefined;
  }

  get secondaryPanelKey(): string | undefined {
    return this.secondaryPanel ? this.getPanelKey(this.secondaryPanel) : undefined;
  }

  get totalPanelSize() {
    return (this.mainPanel?.size || 0) + (this.secondaryPanel?.size ?? 0);
  }

  private getPanelProps(panelInfo: PanelInfo): SidePanelComponentProps {
    const state = this.computeState(panelInfo);
    if (state.isOpen) {
      panelInfo.currentPanelProps = state.props ?? panelInfo.currentPanelProps;
      return state.props ?? {};
    }
    return {};
  }

  private getPanelKey(panelInfo: PanelInfo): string | undefined {
    const state = this.computeState(panelInfo);
    if (state.isOpen) {
      return state.key;
    }
    return undefined;
  }

  open(componentTag: string, currentPanelProps: SidePanelComponentProps = {}) {
    if (this.screenWidthStore.isSmall) {
      return;
    }

    const newPanelInfo = { currentPanelProps, componentTag, size: DEFAULT_SIDE_PANEL_SIZE };
    const state = this.computeState(newPanelInfo);
    if (!state.isOpen) {
      return;
    }

    if (!this.mainPanel || !this.mainPanel.isPinned || this.mainPanelKey === state.key) {
      this._openPanel("mainPanel", newPanelInfo, state);
      return;
    }

    // Try to open secondary panel if main panel is pinned
    const nonCollapsedPanelSize = this.mainPanel.isCollapsed
      ? DEFAULT_SIDE_PANEL_SIZE
      : this.mainPanel.size;
    if (
      !this.secondaryPanel &&
      nonCollapsedPanelSize + DEFAULT_SIDE_PANEL_SIZE > this.availableWidth
    ) {
      this.get(NotificationStore).notifyUser({
        sticky: false,
        type: "warning",
        text: _t("The window is too small to display multiple side panels."),
      });
      return;
    }

    this._openPanel("secondaryPanel", newPanelInfo, state);
  }

  replace(
    componentTag: string,
    currentPanelKey: string,
    currentPanelProps: SidePanelComponentProps = {}
  ) {
    const newPanelInfo = { currentPanelProps, componentTag, size: DEFAULT_SIDE_PANEL_SIZE };
    const state = this.computeState(newPanelInfo);
    if (!state.isOpen) {
      return;
    }
    const ensureMainPanelExpanded = () => {
      if (this.mainPanel?.isCollapsed) {
        this.toggleCollapsePanel("mainPanel");
      }
    };

    // Close the current panel if the target panel is already open
    const isMainPanel = this.mainPanelKey === state.key;
    const isSecondaryPanel = this.secondaryPanelKey === state.key;
    if (isMainPanel && this.secondaryPanel) {
      this.close();
      ensureMainPanelExpanded();
      return;
    }
    if (isSecondaryPanel) {
      this.closeMainPanel();
      this.togglePinPanel();
      ensureMainPanelExpanded();
      return;
    }

    const targetPanel = this.mainPanelKey === currentPanelKey ? "mainPanel" : "secondaryPanel";
    this._openPanel(targetPanel, newPanelInfo, state);
  }

  private _openPanel(
    panel: "mainPanel" | "secondaryPanel",
    newPanel: PanelInfo,
    state: OpenSidePanel
  ) {
    const currentPanel = this[panel];

    if (currentPanel && newPanel.componentTag !== currentPanel.componentTag) {
      currentPanel.currentPanelProps?.onCloseSidePanel?.();
    }
    this[panel] = {
      currentPanelProps: state.props ?? {},
      componentTag: newPanel.componentTag,
      size: currentPanel?.size || DEFAULT_SIDE_PANEL_SIZE,
      isCollapsed: currentPanel?.isCollapsed || false,
      isPinned: currentPanel && "isPinned" in currentPanel ? currentPanel.isPinned : false,
    };
    if (this[panel].isCollapsed) {
      this.toggleCollapsePanel(panel);
    }
  }

  toggle(componentTag: string, panelProps: SidePanelComponentProps) {
    const panel = this.mainPanel?.isPinned ? this.secondaryPanel : this.mainPanel;
    if (panel && componentTag === panel.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    if (this.mainPanel?.isPinned) {
      if (this.secondaryPanel) {
        this.secondaryPanel.currentPanelProps.onCloseSidePanel?.();
        this.secondaryPanel = undefined;
      }
      return;
    }
    this.mainPanel?.currentPanelProps.onCloseSidePanel?.();
    this.mainPanel = undefined;
  }

  closeMainPanel() {
    this.mainPanel?.currentPanelProps.onCloseSidePanel?.();
    this.mainPanel = this.secondaryPanel || undefined;
    this.secondaryPanel = undefined;
  }

  changePanelSize(panel: "mainPanel" | "secondaryPanel", size: number) {
    const panelInfo = this[panel];
    if (!panelInfo || ("isCollapsed" in panelInfo && panelInfo.isCollapsed)) {
      return;
    }

    size = Math.max(size, DEFAULT_SIDE_PANEL_SIZE);
    let otherPanelSize =
      panel === "mainPanel" ? this.secondaryPanel?.size || 0 : this.mainPanel?.size || 0;

    if (size > this.availableWidth - otherPanelSize) {
      if (panel === "mainPanel" && this.secondaryPanel) {
        // reduce the secondary panel size to fit the main panel
        this.secondaryPanel.size = Math.max(this.availableWidth - size, DEFAULT_SIDE_PANEL_SIZE);
        otherPanelSize = this.secondaryPanel.size;
      }
      size = Math.max(this.availableWidth - otherPanelSize, DEFAULT_SIDE_PANEL_SIZE);
    }
    panelInfo.size = size;
  }

  resetPanelSize(panel: "mainPanel" | "secondaryPanel") {
    if (this[panel]) {
      this[panel].size = DEFAULT_SIDE_PANEL_SIZE;
    }
  }

  togglePinPanel() {
    if (!this.mainPanel) {
      return;
    }
    this.mainPanel.isPinned = !this.mainPanel.isPinned;
    if (!this.mainPanel.isPinned && this.secondaryPanel) {
      this.secondaryPanel?.currentPanelProps.onCloseSidePanel?.();
      this.mainPanel = this.secondaryPanel;
      this.secondaryPanel = undefined;
    }
  }

  toggleCollapsePanel(panel: "mainPanel" | "secondaryPanel") {
    const panelInfo = this[panel];
    if (!panelInfo) {
      return;
    }
    if (panelInfo.isCollapsed) {
      panelInfo.isCollapsed = false;
      this.changePanelSize(panel, DEFAULT_SIDE_PANEL_SIZE);
    } else {
      panelInfo.isCollapsed = true;
      panelInfo.size = COLLAPSED_SIDE_PANEL_SIZE;
    }
  }

  private computeState({
    componentTag,
    currentPanelProps: initialPanelProps,
  }: PanelInfo): SidePanelState {
    const customComputeState = sidePanelRegistry.get(componentTag).computeState;
    const state: SidePanelState = customComputeState
      ? customComputeState(this.getters, initialPanelProps)
      : { isOpen: true, props: initialPanelProps };
    return state.isOpen ? { ...state, key: state.key || componentTag } : state;
  }

  changeSpreadsheetWidth(width: number) {
    this.availableWidth = width - MIN_SHEET_VIEW_WIDTH;
    if (this.secondaryPanel && width - this.totalPanelSize < MIN_SHEET_VIEW_WIDTH) {
      this.secondaryPanel?.currentPanelProps.onCloseSidePanel?.();
      this.secondaryPanel = undefined;
    }
    if (this.mainPanel && width - this.totalPanelSize < MIN_SHEET_VIEW_WIDTH) {
      this.mainPanel.size = Math.max(width - MIN_SHEET_VIEW_WIDTH, DEFAULT_SIDE_PANEL_SIZE);
    }
  }
}
