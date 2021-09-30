export class GlobalState {
  composer: "inactive" | "cellFocus" | "contentFocus" = "inactive";

  focusCellComposer() {
    this.composer = "cellFocus";
  }

  focusContentComposer() {
    this.composer = "contentFocus";
  }

  unFocusComposer() {
    this.composer = "inactive";
  }



}

const state = new GlobalState();

export default state;
