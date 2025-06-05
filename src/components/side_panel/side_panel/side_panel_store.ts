import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetStore } from "../../../stores";
import { NotificationStore } from "../../../stores/notification_store";
import { _t } from "../../../translation";

export interface SidePanelProps {
  onCloseSidePanel?: () => void;
  [key: string]: any;
}

interface OpenSidePanel {
  isOpen: true;
  props?: SidePanelProps;
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
  initialPanelProps: SidePanelProps;
  componentTag: string;
  size: number;
}

export class SidePanelStore extends SpreadsheetStore {
  mutators = [
    "open",
    "toggle",
    "close",
    "changePanelSize",
    "resetPanelSize",
    "togglePinPanel",
    "closeMainPanel",
    "changeSpreadsheetWidth",
    "toggleCollapseMainPanel",
  ] as const;

  mainPanel: (PanelInfo & { isCollapsed?: boolean; isPined?: boolean }) | undefined = undefined;
  secondaryPanel: PanelInfo | undefined;
  availableWidth: number = 0;

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

  get mainPanelProps(): SidePanelProps | undefined {
    return this.mainPanel ? this.getPanelProps(this.mainPanel) : undefined;
  }

  get mainPanelKey(): string | undefined {
    return this.mainPanel ? this.getPanelKey(this.mainPanel) : undefined;
  }

  get secondaryPanelProps(): SidePanelProps | undefined {
    return this.secondaryPanel ? this.getPanelProps(this.secondaryPanel) : undefined;
  }

  get secondaryPanelKey(): string | undefined {
    return this.secondaryPanel ? this.getPanelKey(this.secondaryPanel) : undefined;
  }

  get totalPanelSize() {
    return (this.mainPanel?.size || 0) + (this.secondaryPanel?.size ?? 0);
  }

  private getPanelProps(panelInfo: PanelInfo): SidePanelProps {
    const state = this.computeState(panelInfo);
    if (state.isOpen) {
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

  open(componentTag: string, initialPanelProps: SidePanelProps = {}) {
    const newPanelInfo = { initialPanelProps, componentTag, size: DEFAULT_SIDE_PANEL_SIZE };
    const state = this.computeState(newPanelInfo);
    if (!state.isOpen) {
      return;
    }

    if (!this.mainPanel || !this.mainPanel.isPined) {
      if (this.mainPanel && componentTag !== this.mainPanel.componentTag) {
        this.mainPanel.initialPanelProps?.onCloseSidePanel?.();
      }
      this.mainPanel = {
        initialPanelProps: state.props ?? {},
        componentTag,
        size: this.mainPanel?.size || DEFAULT_SIDE_PANEL_SIZE,
        isCollapsed: false,
      };
      return;
    }

    if (this.getPanelKey(this.mainPanel) === state.key) {
      if (this.mainPanel.isCollapsed) {
        this.toggleCollapseMainPanel();
      }
      return;
    }

    // Try to open secondary panel if main panel is pinned
    if (
      !this.secondaryPanel &&
      this.totalPanelSize + DEFAULT_SIDE_PANEL_SIZE > this.availableWidth
    ) {
      this.get(NotificationStore).notifyUser({
        sticky: false,
        type: "warning",
        text: _t("The window is too small to display multiple side panels."),
      });
      return;
    }

    if (this.secondaryPanel && componentTag !== this.secondaryPanel.componentTag) {
      this.secondaryPanel.initialPanelProps?.onCloseSidePanel?.();
    }
    this.secondaryPanel = {
      initialPanelProps: state.props ?? {},
      componentTag: componentTag,
      size: this.secondaryPanel?.size || DEFAULT_SIDE_PANEL_SIZE,
    };
  }

  toggle(componentTag: string, panelProps: SidePanelProps) {
    const panel = this.mainPanel?.isPined ? this.secondaryPanel : this.mainPanel;
    if (panel && componentTag === panel.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    if (this.mainPanel?.isPined) {
      if (this.secondaryPanel) {
        this.secondaryPanel.initialPanelProps.onCloseSidePanel?.();
        this.secondaryPanel = undefined;
      }
      return;
    }
    this.mainPanel?.initialPanelProps.onCloseSidePanel?.();
    this.mainPanel = undefined;
  }

  closeMainPanel() {
    this.mainPanel?.initialPanelProps.onCloseSidePanel?.();
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
    const panelInfo = this[panel];
    if (!panelInfo) {
      return;
    }
    panelInfo.size = DEFAULT_SIDE_PANEL_SIZE;
  }

  togglePinPanel() {
    if (!this.mainPanel) {
      return;
    }
    this.mainPanel.isPined = !this.mainPanel.isPined;
    if (!this.mainPanel.isPined && this.secondaryPanel) {
      this.secondaryPanel?.initialPanelProps.onCloseSidePanel?.();
      this.mainPanel = this.secondaryPanel;
      this.secondaryPanel = undefined;
    }
    if (!this.mainPanel.isPined && this.mainPanel?.isCollapsed) {
      this.mainPanel.isCollapsed = false;
      this.changePanelSize("mainPanel", DEFAULT_SIDE_PANEL_SIZE);
    }
  }

  toggleCollapseMainPanel() {
    if (!this.mainPanel || !this.mainPanel.isPined) {
      return;
    }
    if (this.mainPanel.isCollapsed) {
      this.mainPanel.isCollapsed = false;
      this.changePanelSize("mainPanel", DEFAULT_SIDE_PANEL_SIZE);
    } else {
      this.mainPanel.isCollapsed = true;
      this.mainPanel.size = COLLAPSED_SIDE_PANEL_SIZE;
    }
  }

  private computeState({ componentTag, initialPanelProps }: PanelInfo): SidePanelState {
    const customComputeState = sidePanelRegistry.get(componentTag).computeState;
    const state: SidePanelState = customComputeState
      ? customComputeState(this.getters, initialPanelProps)
      : { isOpen: true, props: initialPanelProps };
    return state.isOpen ? { ...state, key: state.key || componentTag } : state;
  }

  changeSpreadsheetWidth(width: number) {
    this.availableWidth = width - MIN_SHEET_VIEW_WIDTH;
    if (this.secondaryPanel && width - this.totalPanelSize < MIN_SHEET_VIEW_WIDTH) {
      this.secondaryPanel?.initialPanelProps.onCloseSidePanel?.();
      this.secondaryPanel = undefined;
    }
    if (this.mainPanel && width - this.totalPanelSize < MIN_SHEET_VIEW_WIDTH) {
      this.mainPanel.size = Math.max(width - MIN_SHEET_VIEW_WIDTH, DEFAULT_SIDE_PANEL_SIZE);
    }
  }
}
