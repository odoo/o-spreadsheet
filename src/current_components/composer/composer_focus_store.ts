import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { ComposerFocusType, EditionMode } from "../../types";
import { ComposerSelection } from "./composer/abstract_composer_store";

export interface ComposerInterface {
  id: string; // for testing purposes only
  editionMode: EditionMode;
  startEdition(content?: string, selection?: ComposerSelection): void;
  stopEdition(): void;
  setCurrentContent(content: string, selection?: ComposerSelection): void;
}

interface Args {
  focusMode?: ComposerFocusType;
  content?: string;
  selection?: ComposerSelection;
}

const VOID_COMPOSER: ComposerInterface = {
  id: "void-composer",
  get editionMode(): EditionMode {
    return "inactive";
  },
  startEdition: () => {
    throw new Error("No composer is registered");
  },
  stopEdition: () => {
    throw new Error("No composer is registered");
  },
  setCurrentContent: () => {
    throw new Error("No composer is registered");
  },
};

export class ComposerFocusStore extends SpreadsheetStore {
  mutators = ["focusComposer", "focusActiveComposer"] as const;

  activeComposer: ComposerInterface = VOID_COMPOSER;

  private _focusMode: ComposerFocusType = "inactive";

  get focusMode(): ComposerFocusType {
    return this.activeComposer.editionMode === "inactive" ? "inactive" : this._focusMode;
  }

  focusComposer(listener: ComposerInterface, args: Args) {
    this.activeComposer = listener;
    if (this.getters.isReadonly()) {
      return;
    }
    this._focusMode = args.focusMode || "contentFocus";
    if (this._focusMode !== "inactive") {
      this.setComposerContent(args);
    }
  }

  focusActiveComposer(args: Args) {
    if (this.getters.isReadonly()) {
      return;
    }
    if (!this.activeComposer) {
      throw new Error("No composer is registered");
    }
    this._focusMode = args.focusMode || "contentFocus";
    if (this._focusMode !== "inactive") {
      this.setComposerContent(args);
    }
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
    if (this.activeComposer.editionMode === "inactive") {
      this.activeComposer.startEdition(content, selection);
    } else if (content) {
      this.activeComposer.setCurrentContent(content, selection);
    }
  }
}
