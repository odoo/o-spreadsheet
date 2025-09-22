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
  updatedProps?: SidePanelProps;
}

interface ClosedSidePanel {
  isOpen: false;
}

export type SidePanelState = OpenSidePanel | ClosedSidePanel;

export const DEFAULT_SIDE_PANEL_SIZE = 350;
export const MIN_SHEET_VIEW_WIDTH = 150;

export class SidePanelStore extends SpreadsheetStore {
  mutators = ["open", "toggle", "close", "changePanelSize", "resetPanelSize"] as const;
  initialPanelProps: SidePanelProps = {};
  componentTag: string = "";
  panelSize = DEFAULT_SIDE_PANEL_SIZE;

  get isOpen() {
    if (!this.componentTag) {
      return false;
    }
    return this.computeState(this.componentTag, this.initialPanelProps).isOpen;
  }

  get panelProps(): SidePanelProps {
    const state = this.computeState(this.componentTag, this.initialPanelProps);
    if (state.isOpen) {
      return state.props ?? {};
    }
    return {};
  }

  get panelKey(): string | undefined {
    const state = this.computeState(this.componentTag, this.initialPanelProps);
    if (state.isOpen) {
      return state.key;
    }
    return undefined;
  }

  open(componentTag: string, panelProps: SidePanelProps = {}) {
    const state = this.computeState(componentTag, panelProps);
    if (state.isOpen === false) {
      return;
    }
    if (this.isOpen && componentTag !== this.componentTag) {
      this.initialPanelProps?.onCloseSidePanel?.();
    }
    this.componentTag = componentTag;
    this.initialPanelProps = state.props ?? {};
  }

  toggle(componentTag: string, panelProps: SidePanelProps) {
    if (this.isOpen && componentTag === this.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    this.initialPanelProps.onCloseSidePanel?.();
    this.initialPanelProps = {};
    this.componentTag = "";
  }

  changePanelSize(size: number, spreadsheetElWidth: number) {
    if (size < DEFAULT_SIDE_PANEL_SIZE) {
      this.panelSize = DEFAULT_SIDE_PANEL_SIZE;
    } else if (size > spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH) {
      this.panelSize = Math.max(spreadsheetElWidth - MIN_SHEET_VIEW_WIDTH, DEFAULT_SIDE_PANEL_SIZE);
    } else {
      this.panelSize = size;
    }
  }

  resetPanelSize() {
    this.panelSize = DEFAULT_SIDE_PANEL_SIZE;
  }

  private computeState(componentTag: string, panelProps: SidePanelProps): SidePanelState {
    const customComputeState = sidePanelRegistry.get(componentTag).computeState;
    if (!customComputeState) {
      return {
        isOpen: true,
        props: panelProps,
      };
    } else {
      const state = customComputeState(this.getters, panelProps);
      if (state.isOpen) {
        this.initialPanelProps = state.updatedProps ?? this.initialPanelProps;
      }
      return state;
    }
  }
}
