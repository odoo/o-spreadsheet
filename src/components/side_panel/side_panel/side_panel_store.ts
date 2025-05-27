import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetStore } from "../../../stores";

interface SidePanelProps {
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
    "pinSidePanel",
  ] as const;

  activePanel: PanelInfo = {
    initialPanelProps: {},
    componentTag: "",
    panelSize: DEFAULT_SIDE_PANEL_SIZE,
  };

  pinedPanel: PanelInfo | undefined;

  get isOpen() {
    if (!this.activePanel.componentTag) {
      return false;
    }
    return this.computeState(this.activePanel.componentTag, this.activePanel.initialPanelProps)
      .isOpen;
  }

  get panelProps(): SidePanelProps {
    const state = this.computeState(
      this.activePanel.componentTag,
      this.activePanel.initialPanelProps
    );
    if (state.isOpen) {
      return state.props ?? {};
    }
    return {};
  }

  get panelKey(): string | undefined {
    const state = this.computeState(
      this.activePanel.componentTag,
      this.activePanel.initialPanelProps
    );
    if (state.isOpen) {
      return state.key;
    }
    return undefined;
  }

  open(componentTag: string, panelProps: SidePanelProps = {}) {
    const state = this.computeState(componentTag, panelProps);
    if (!state.isOpen) {
      return;
    }
    if (this.isOpen && componentTag !== this.activePanel.componentTag) {
      this.activePanel.initialPanelProps?.onCloseSidePanel?.();
    }
    this.activePanel.componentTag = componentTag;
    this.activePanel.initialPanelProps = state.props ?? {};
  }

  toggle(componentTag: string, panelProps: SidePanelProps) {
    if (this.isOpen && componentTag === this.activePanel.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    this.activePanel.initialPanelProps.onCloseSidePanel?.();
    this.activePanel.initialPanelProps = {};
    this.activePanel.componentTag = "";
  }

  changePanelSize(size: number, spreadsheetElWidth: number) {
    if (size < DEFAULT_SIDE_PANEL_SIZE) {
      this.activePanel.panelSize = DEFAULT_SIDE_PANEL_SIZE;
    } else if (size > spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH) {
      this.activePanel.panelSize = Math.max(
        spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH,
        DEFAULT_SIDE_PANEL_SIZE
      );
    } else {
      this.activePanel.panelSize = size;
    }
  }

  resetPanelSize() {
    this.activePanel.panelSize = DEFAULT_SIDE_PANEL_SIZE;
  }

  pinSidePanel() {
    this.pinedPanel = { ...this.activePanel };
    this.activePanel.componentTag = "";
    this.activePanel.initialPanelProps = {};
    this.activePanel.panelSize = DEFAULT_SIDE_PANEL_SIZE;
  }

  private computeState(componentTag: string, panelProps: SidePanelProps): SidePanelState {
    const customComputeState = sidePanelRegistry.get(componentTag).computeState;
    if (!customComputeState) {
      return {
        isOpen: true,
        props: panelProps,
      };
    } else {
      return customComputeState(this.getters, panelProps);
    }
  }
}
