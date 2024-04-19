import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { ComposerSelection, ComposerStore } from "./composer/composer_store";

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

export class ComposerFocusStore extends SpreadsheetStore {
  mutators = ["focusTopBarComposer", "focusGridComposerContent", "focusGridComposerCell"] as const;
  private composerStore = this.get(ComposerStore);

  private topBarFocus: Exclude<ComposerFocusType, "cellFocus"> = "inactive";
  private gridFocusMode: ComposerFocusType = "inactive";

  get topBarComposerFocus(): Omit<ComposerFocusType, "cellFocus"> {
    return this.composerStore.editionMode === "inactive" ? "inactive" : this.topBarFocus;
  }

  get gridComposerFocus(): ComposerFocusType {
    return this.composerStore.editionMode === "inactive" ? "inactive" : this.gridFocusMode;
  }

  focusTopBarComposer(selection: ComposerSelection) {
    if (this.getters.isReadonly()) {
      return;
    }
    this.topBarFocus = "contentFocus";
    this.gridFocusMode = "inactive";
    this.setComposerContent({ selection } || {});
  }

  focusGridComposerContent() {
    if (this.getters.isReadonly()) {
      return;
    }
    this.topBarFocus = "inactive";
    this.gridFocusMode = "contentFocus";
    this.setComposerContent({});
  }

  focusGridComposerCell(content?: string, selection?: ComposerSelection) {
    if (this.getters.isReadonly()) {
      return;
    }
    this.topBarFocus = "inactive";
    this.gridFocusMode = "cellFocus";
    this.setComposerContent({ content, selection } || {});
  }

  /**
   * Start the edition or update the content if it's already started.
   */
  private setComposerContent({
    content,
    selection,
  }: {
    content?: string | undefined;
    selection?: ComposerSelection;
  }) {
    if (this.composerStore.editionMode === "inactive") {
      this.composerStore.startEdition(content, selection);
    } else if (content) {
      this.composerStore.setCurrentContent(content, selection);
    }
  }
}
