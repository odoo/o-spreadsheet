import { Dimension, HeaderIndex } from "../../types/misc";

interface HeaderResizeEditorState {
  isOpen: boolean;
  dimension: Dimension;
  index: HeaderIndex;
}

export class HeaderResizeEditorStore {
  mutators = ["setTarget", "open", "close"] as const;
  state: HeaderResizeEditorState | null = null;

  setTarget(dimension: Dimension, index: HeaderIndex) {
    this.state = { isOpen: false, dimension, index };
  }

  open() {
    if (!this.state) {
      return "noStateChange";
    }
    this.state = { ...this.state, isOpen: true };
    return;
  }

  close() {
    if (!this.state) {
      return "noStateChange";
    }
    this.state = null;
    return;
  }
}
