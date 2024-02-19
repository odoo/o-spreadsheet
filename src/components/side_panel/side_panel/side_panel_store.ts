import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetStore } from "../../../stores";

interface SidePanelProps {
  onCloseSidePanel?: () => void;
  [key: string]: unknown;
}

interface OpenSidePanel {
  isOpen: true;
  props: SidePanelProps;
}

interface ClosedSidePanel {
  isOpen: false;
}

export type SidePanelState = OpenSidePanel | ClosedSidePanel;

export class SidePanelStore extends SpreadsheetStore {
  initialPanelProps: SidePanelProps = {};
  componentTag: string = "";

  get isOpen() {
    if (!this.componentTag) {
      return false;
    }
    return this.computeState(this.componentTag, this.initialPanelProps).isOpen;
  }

  get panelProps() {
    const state = this.computeState(this.componentTag, this.initialPanelProps);
    if (state.isOpen) {
      return state.props;
    }
    return {};
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
    this.initialPanelProps = state.props;
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
