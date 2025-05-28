import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetStore } from "../../../stores";

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
export const MIN_SHEET_VIEW_WIDTH = 150;

interface PanelInfo {
  initialPanelProps: SidePanelProps;
  componentTag: string;
  panelSize: number;
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
    "changeMaxPanelSize",
  ] as const;

  hasPinedPanel = false; // ADRM TODO: put that in mainPanel

  mainPanel: PanelInfo | undefined = undefined;

  secondaryPanel: PanelInfo | undefined;

  get isOpen() {
    if (!this.mainPanel || !this.mainPanel.componentTag) {
      return false;
    }
    return this.computeState(this.mainPanel).isOpen;
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
    const panelInfo = { initialPanelProps, componentTag, panelSize: DEFAULT_SIDE_PANEL_SIZE };
    const state = this.computeState(panelInfo);
    if (!state.isOpen) {
      return;
    }

    if (!this.hasPinedPanel) {
      if (this.mainPanel && componentTag !== this.mainPanel.componentTag) {
        this.mainPanel.initialPanelProps?.onCloseSidePanel?.();
      }
      this.mainPanel = {
        initialPanelProps: state.props ?? {},
        componentTag,
        panelSize: this.mainPanel?.panelSize || DEFAULT_SIDE_PANEL_SIZE,
      };
    } else {
      if (this.secondaryPanel && componentTag !== this.secondaryPanel.componentTag) {
        this.secondaryPanel.initialPanelProps?.onCloseSidePanel?.();
      }
      this.secondaryPanel = {
        initialPanelProps: state.props ?? {},
        componentTag: componentTag,
        panelSize: this.secondaryPanel?.panelSize || DEFAULT_SIDE_PANEL_SIZE,
      };
    }
  }

  toggle(componentTag: string, panelProps: SidePanelProps) {
    if (this.hasPinedPanel) {
      if (this.secondaryPanel && componentTag === this.secondaryPanel.componentTag) {
        this.close();
      } else {
        this.open(componentTag, panelProps);
      }
      return;
    }
    if (this.mainPanel && componentTag === this.mainPanel.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    if (this.hasPinedPanel) {
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
    this.hasPinedPanel = false;
    console.log("Main panel closed, secondary panel is now main panel:", this.mainPanel);
  }

  changePanelSize(panel: "mainPanel" | "secondaryPanel", size: number, spreadsheetElWidth: number) {
    const panelInfo = this[panel];
    if (!panelInfo) {
      return;
    }
    if (size < DEFAULT_SIDE_PANEL_SIZE) {
      panelInfo.panelSize = DEFAULT_SIDE_PANEL_SIZE;
    } else if (size > spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH) {
      panelInfo.panelSize = Math.max(
        spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH,
        DEFAULT_SIDE_PANEL_SIZE
      );
    } else {
      panelInfo.panelSize = size;
    }
  }

  resetPanelSize(panel: "mainPanel" | "secondaryPanel") {
    const panelInfo = this[panel];
    if (!panelInfo) {
      return;
    }
    panelInfo.panelSize = DEFAULT_SIDE_PANEL_SIZE;
  }

  togglePinPanel() {
    this.hasPinedPanel = !this.hasPinedPanel;
    if (!this.hasPinedPanel && this.secondaryPanel) {
      this.secondaryPanel?.initialPanelProps.onCloseSidePanel?.();
      this.mainPanel = this.secondaryPanel;
      this.secondaryPanel = undefined;
    }
  }

  private computeState({ componentTag, initialPanelProps }: PanelInfo): SidePanelState {
    const customComputeState = sidePanelRegistry.get(componentTag).computeState;
    const state: SidePanelState = customComputeState
      ? customComputeState(this.getters, initialPanelProps)
      : { isOpen: true, props: initialPanelProps };
    return state.isOpen ? { ...state, key: state.key || componentTag } : state; // ADRM TODO: avoid duplicated key
  }

  get totalPanelSize() {
    return (this.mainPanel?.panelSize || 0) + (this.secondaryPanel?.panelSize ?? 0);
  }

  changeMaxPanelSize(maxSize: number) {
    // ADRM TODO. also change the changePanelSize method
  }
}
