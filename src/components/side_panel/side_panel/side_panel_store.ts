import { SpreadsheetStore } from "../../../stores";

interface SidePanelProps {
  onCloseSidePanel?: () => void;
  [key: string]: unknown;
}

export class SidePanelStore extends SpreadsheetStore {
  isOpen: boolean = false;
  panelProps: SidePanelProps = {};
  componentTag: string = "";

  open(componentTag: string, panelProps: SidePanelProps = {}) {
    if (this.isOpen && componentTag !== this.componentTag) {
      this.panelProps?.onCloseSidePanel?.();
    }
    this.componentTag = componentTag;
    this.panelProps = panelProps;
    this.isOpen = true;
  }

  toggle(componentTag: string, panelProps: SidePanelProps) {
    if (this.isOpen && componentTag === this.componentTag) {
      this.close();
    } else {
      this.open(componentTag, panelProps);
    }
  }

  close() {
    this.panelProps.onCloseSidePanel?.();
    this.isOpen = false;
    this.panelProps = {};
    this.componentTag = "";
  }
}
