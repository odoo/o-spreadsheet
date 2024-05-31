import { EnrichedToken, composerTokenize } from "../../../formulas/composer_tokenizer";
import { POSTFIX_UNARY_OPERATORS } from "../../../formulas/tokenizer";
import {
  colors,
  fuzzyLookup,
  isEqual,
  positionToZone,
  splitReference,
  zoneToDimension,
} from "../../../helpers/index";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { cycleFixedReference } from "../../../helpers/reference_type";
import {
  AutoCompleteProvider,
  autoCompleteProviders,
} from "../../../registries/auto_completes/auto_complete_registry";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { HighlightStore } from "../../../stores/highlight_store";
import { NotificationStore } from "../../../stores/notification_store";
import { _t } from "../../../translation";
import { Command, Highlight, Range, RangePart, UID, UnboundedZone, Zone } from "../../../types";
import { SelectionEvent } from "../../../types/event_stream";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";

export interface ComposerSelection {
  start: number;
  end: number;
}

export class StandaloneComposerStore extends SpreadsheetStore {
  mutators = [
    "startEdition",
    "setCurrentContent",
    "stopEdition",
    "stopComposerRangeSelection",
    "cancelEdition",
    "cycleReferences",
    "changeComposerCursorSelection",
    "replaceComposerCursorSelection",
  ] as const;
  editionMode: EditionMode = "inactive";
  private sheetId: UID = "";
  private _currentContent: string = "";
  currentTokens: EnrichedToken[] = [];
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  initialContent: string | undefined = "";
  private colorIndexByRange: { [xc: string]: number } = {};

  private notificationStore = this.get(NotificationStore);
  private highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.highlightStore.unRegister(this);
    });
  }

  private handleEvent(event: SelectionEvent) {
    const sheetId = this.getters.getActiveSheetId();
    let unboundedZone: UnboundedZone;
    if (event.options.unbounded) {
      unboundedZone = this.getters.getUnboundedZone(sheetId, event.anchor.zone);
    } else {
      unboundedZone = event.anchor.zone;
    }
    switch (event.mode) {
      case "newAnchor":
        if (this.editionMode === "selecting") {
          this.insertSelectedRange(unboundedZone);
        }
        break;
      default:
        if (this.editionMode === "selecting") {
          this.replaceSelectedRange(unboundedZone);
        } else {
          this.updateComposerRange(event.previousAnchor.zone, unboundedZone);
        }
        break;
    }
  }

  changeComposerCursorSelection(start: number, end: number) {
    if (!this.isSelectionValid(this._currentContent.length, start, end)) {
      return;
    }
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  stopComposerRangeSelection() {
    if (this.isSelectingRange) {
      this.editionMode = "editing";
    }
  }

  startEdition(initialText: string, text?: string, selection?: ComposerSelection) {
    if (selection && text !== undefined) {
      const content = text;
      const validSelection = this.isSelectionValid(content.length, selection.start, selection.end);
      if (!validSelection) {
        return;
      }
    }

    if (this.editionMode !== "inactive" && text) {
      this.setContent(text, selection);
    } else {
      this._startEdition(initialText, text, selection);
    }
    this.updateRangeColor();
  }

  stopEdition() {
    this._stopEdition();
    this.colorIndexByRange = {};
  }

  cancelEdition() {
    this._cancelEdition();
    this.resetContent();
    this.colorIndexByRange = {};
  }

  setCurrentContent(content: string, selection?: ComposerSelection) {
    if (selection && !this.isSelectionValid(content.length, selection.start, selection.end)) {
      return;
    }

    this.setContent(content, selection, true);
    this.updateRangeColor();
  }

  replaceComposerCursorSelection(text: string) {
    this.replaceSelection(text);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START_CHANGE_HIGHLIGHT":
        const { left, top } = cmd.zone;
        // changing the highlight can conflit with the 'selecting' mode
        if (this.isSelectingRange) {
          this.editionMode = "editing";
        }
        this.model.selection.resetAnchor(this, {
          cell: { col: left, row: top },
          zone: cmd.zone,
        });
        break;
      case "ACTIVATE_SHEET":
        if (!this._currentContent.startsWith("=")) {
          this._cancelEdition();
          this.resetContent();
        }
        if (cmd.sheetIdFrom !== cmd.sheetIdTo) {
          const activePosition = this.getters.getActivePosition();
          const { col, row } = this.getters.getNextVisibleCellPosition({
            sheetId: cmd.sheetIdTo,
            col: activePosition.col,
            row: activePosition.row,
          });
          const zone = this.getters.expandZone(cmd.sheetIdTo, positionToZone({ col, row }));
          this.model.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get currentContent(): string {
    if (this.editionMode === "inactive") {
      return ""; // ?
    }
    return this._currentContent;
  }

  get composerSelection(): ComposerSelection {
    return {
      start: this.selectionStart,
      end: this.selectionEnd,
    };
  }

  get isSelectingRange(): boolean {
    return this.editionMode === "selecting";
  }

  get showSelectionIndicator(): boolean {
    return this.isSelectingRange && this.canStartComposerRangeSelection();
  }

  /**
   * Return the (enriched) token just before the cursor.
   */
  get tokenAtCursor(): EnrichedToken | undefined {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    if (start === end && end === 0) {
      return undefined;
    } else {
      return this.currentTokens.find((t) => t.start <= start && t.end >= end);
    }
  }

  cycleReferences() {
    const locale = this.getters.getLocale();
    const updated = cycleFixedReference(this.composerSelection, this._currentContent, locale);
    if (updated === undefined) {
      return;
    }

    this.setCurrentContent(updated.content, updated.selection);
  }

  private isSelectionValid(length: number, start: number, end: number): boolean {
    return start >= 0 && start <= length && end >= 0 && end <= length;
  }

  /**
   * Enable the selecting mode
   */
  private startComposerRangeSelection() {
    // if (this.sheetId === this.getters.getActiveSheetId()) {
    //   const zone = positionToZone({ col: this.col, row: this.row });
    //   this.model.selection.resetAnchor(this, {
    //     cell: { col: this.col, row: this.row },
    //     zone,
    //   });
    // }
    this.editionMode = "selecting";
  }

  /**
   * start the edition of a cell
   * @param str the key that is used to start the edition if it is a "content" key like a letter or number
   * @param selection
   * @private
   */
  private _startEdition(initialContent: string, str: string = "", selection?: ComposerSelection) {
    const position = this.getters.getActivePosition();
    // this.col = col;
    this.sheetId = position.sheetId;
    // this.row = row;
    this.initialContent = initialContent;
    // this.initialContent = this.getComposerContent({ sheetId, col, row });
    this.editionMode = "editing";
    this.setContent(str || this.initialContent, selection);
    this.colorIndexByRange = {};
    const zone = positionToZone(position);
    this.model.selection.capture(
      this,
      { cell: position, zone },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          // this should write on the cell :/
          this._stopEdition();
        },
      }
    );
  }

  private _stopEdition() {
    if (this.editionMode !== "inactive") {
      this._cancelEdition();
      let content = this.getCurrentCanonicalContent();
      const didChange = this.initialContent !== content;
      if (!didChange) {
        return;
      }
      this.setContent("");
    }
  }

  private getCurrentCanonicalContent(): string {
    return canonicalizeNumberContent(this._currentContent, this.getters.getLocale());
  }

  private _cancelEdition() {
    if (this.editionMode === "inactive") {
      return;
    }
    this.editionMode = "inactive";
    this.model.selection.release(this);
  }

  /**
   * Reset the current content to the active cell content
   */
  resetContent() {
    // private
    this.setContent(this.initialContent || "");
  }

  setContent(text: string, selection?: ComposerSelection, raise?: boolean) {
    // private
    const isNewCurrentContent = this._currentContent !== text;
    this._currentContent = text;

    if (selection) {
      this.selectionStart = selection.start;
      this.selectionEnd = selection.end;
    } else {
      this.selectionStart = this.selectionEnd = text.length;
    }
    if (isNewCurrentContent || this.editionMode !== "inactive") {
      const locale = this.getters.getLocale();
      this.currentTokens = text.startsWith("=") ? composerTokenize(text, locale) : [];
      if (this.currentTokens.length > 100) {
        if (raise) {
          this.notificationStore.raiseError(
            _t(
              "This formula has over 100 parts. It can't be processed properly, consider splitting it into multiple cells"
            )
          );
        }
      }
    }
    if (this.canStartComposerRangeSelection()) {
      this.startComposerRangeSelection();
    }
  }

  private insertSelectedRange(zone: Zone | UnboundedZone) {
    // infer if range selected or selecting range from cursor position
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const ref = this.getZoneReference(zone);
    if (this.canStartComposerRangeSelection()) {
      this.insertText(ref, start);
    } else {
      this.insertText("," + ref, start);
    }
  }

  /**
   * Replace the current reference selected by the new one.
   * */
  private replaceSelectedRange(zone: Zone | UnboundedZone) {
    const ref = this.getZoneReference(zone);
    const currentToken = this.tokenAtCursor;
    const start = currentToken?.type === "REFERENCE" ? currentToken.start : this.selectionStart;
    this.replaceText(ref, start, this.selectionEnd);
  }

  /**
   * Replace the reference of the old zone by the new one.
   */
  private updateComposerRange(oldZone: Zone, newZone: Zone | UnboundedZone) {
    const activeSheetId = this.getters.getActiveSheetId();

    const tokentAtCursor = this.tokenAtCursor;
    const tokens = tokentAtCursor ? [tokentAtCursor, ...this.currentTokens] : this.currentTokens;
    const previousRefToken = tokens
      .filter((token) => token.type === "REFERENCE")
      .find((token) => {
        const { xc, sheetName: sheet } = splitReference(token.value);
        const sheetName = sheet || this.getters.getSheetName(this.sheetId);

        if (this.getters.getSheetName(activeSheetId) !== sheetName) {
          return false;
        }
        const refRange = this.getters.getRangeFromSheetXC(activeSheetId, xc);
        return isEqual(this.getters.expandZone(activeSheetId, refRange.zone), oldZone);
      });

    // this function assumes that the previous range is always found because
    // it's called when changing a highlight, which exists by definition
    if (!previousRefToken) {
      throw new Error("Previous range not found");
    }

    const previousRange = this.getters.getRangeFromSheetXC(activeSheetId, previousRefToken.value);
    this.selectionStart = previousRefToken!.start;
    this.selectionEnd = this.selectionStart + previousRefToken!.value.length;

    const newRange = this.getters.getRangeFromZone(activeSheetId, newZone);
    const newRef = this.getRangeReference(newRange, previousRange.parts);
    this.replaceSelection(newRef);
  }

  private getZoneReference(zone: Zone | UnboundedZone): string {
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, this.sheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]>) {
    let _fixedParts = [...fixedParts];
    const newRange = range.clone({ parts: _fixedParts });
    return this.getters.getSelectionRangeString(newRange, "this.sheetId");
  }

  /**
   * Replace the current selection by a new text.
   * The cursor is then set at the end of the text.
   */
  private replaceSelection(text: string) {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    this.replaceText(text, start, end);
  }

  private replaceText(text: string, start: number, end: number) {
    this._currentContent =
      this._currentContent.slice(0, start) +
      this._currentContent.slice(end, this._currentContent.length);
    this.insertText(text, start);
  }

  /**
   * Insert a text at the given position.
   * The cursor is then set at the end of the text.
   */
  private insertText(text: string, start: number) {
    const content = this._currentContent.slice(0, start) + text + this._currentContent.slice(start);
    const end = start + text.length;
    this.setCurrentContent(content, { start: end, end });
  }

  private updateRangeColor() {
    if (!this._currentContent.startsWith("=") || this.editionMode === "inactive") {
      return;
    }
    const editionSheetId = this.sheetId;
    const XCs = this.getReferencedRanges().map((range) =>
      this.getters.getRangeString(range, editionSheetId)
    );
    const colorsToKeep = {};
    for (const xc of XCs) {
      if (this.colorIndexByRange[xc] !== undefined) {
        colorsToKeep[xc] = this.colorIndexByRange[xc];
      }
    }
    const usedIndexes = new Set(Object.values(colorsToKeep));
    let currentIndex = 0;
    const nextIndex = () => {
      while (usedIndexes.has(currentIndex)) currentIndex++;
      usedIndexes.add(currentIndex);
      return currentIndex;
    };
    for (const xc of XCs) {
      const colorIndex = xc in colorsToKeep ? colorsToKeep[xc] : nextIndex();
      colorsToKeep[xc] = colorIndex;
    }
    this.colorIndexByRange = colorsToKeep;
  }

  /**
   * Highlight all ranges that can be found in the composer content.
   */
  get highlights(): Highlight[] {
    if (!this.currentContent.startsWith("=") || this.editionMode === "inactive") {
      return [];
    }
    const editionSheetId = this.sheetId;
    const rangeColor = (rangeString: string) => {
      const colorIndex = this.colorIndexByRange[rangeString];
      return colors[colorIndex % colors.length];
    };
    return this.getReferencedRanges().map((range) => {
      const rangeString = this.getters.getRangeString(range, editionSheetId);
      const { numberOfRows, numberOfCols } = zoneToDimension(range.zone);
      const zone =
        numberOfRows * numberOfCols === 1
          ? this.getters.expandZone(range.sheetId, range.zone)
          : range.zone;

      return {
        zone,
        color: rangeColor(rangeString),
        sheetId: range.sheetId,
        interactive: true,
      };
    });
  }

  /**
   * Return ranges currently referenced in the composer
   */
  private getReferencedRanges(): Range[] {
    const editionSheetId = this.sheetId;
    const referenceRanges = this.currentTokens
      .filter((token) => token.type === "REFERENCE")
      .map((token) => this.getters.getRangeFromSheetXC(editionSheetId, token.value));
    return referenceRanges.filter((range) => !range.invalidSheetName && !range.invalidXc);
  }

  get autocompleteProvider(): AutoCompleteProvider | undefined {
    const content = this.currentContent;
    const tokenAtCursor = content.startsWith("=")
      ? this.tokenAtCursor
      : { type: "STRING", value: content };
    if (this.editionMode === "inactive" || !tokenAtCursor) {
      return;
    }

    const thisCtx = { composer: this, getters: this.getters };
    const providers = autoCompleteProviders
      .getAll()
      .sort((a, b) => (a.sequence ?? Infinity) - (b.sequence ?? Infinity))
      .map((provider) => ({
        ...provider,
        getProposals: provider.getProposals.bind(thisCtx, tokenAtCursor, content),
        selectProposal: provider.selectProposal.bind(thisCtx, tokenAtCursor),
      }));
    for (const provider of providers) {
      let proposals = provider.getProposals();
      const exactMatch = proposals?.find((p) => p.text === tokenAtCursor.value);
      // remove tokens that are likely to be other parts of the formula that slipped in the token if it's a string
      const searchTerm = tokenAtCursor.value.replace(/[ ,\(\)]/g, "");
      if (exactMatch && this._currentContent !== this.initialContent) {
        // this means the user has chosen a proposal
        return;
      }
      if (
        searchTerm &&
        proposals &&
        !["ARG_SEPARATOR", "LEFT_PAREN"].includes(tokenAtCursor.type)
      ) {
        const filteredProposals = fuzzyLookup(
          searchTerm,
          proposals,
          (p) => p.fuzzySearchKey || p.text
        );
        if (!exactMatch || filteredProposals.length > 1) {
          proposals = filteredProposals;
        }
      }
      if (provider.maxDisplayedProposals) {
        proposals = proposals?.slice(0, provider.maxDisplayedProposals);
      }
      if (proposals?.length) {
        return {
          proposals,
          selectProposal: provider.selectProposal,
          autoSelectFirstProposal: provider.autoSelectFirstProposal ?? false,
        };
      }
    }
    return;
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"], and is not a postfix unary operator
   * - the next token is missing or is among ["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"]
   * - Previous and next tokens can be separated by spaces
   */
  private canStartComposerRangeSelection(): boolean {
    if (this._currentContent.startsWith("=")) {
      const tokenAtCursor = this.tokenAtCursor;
      if (!tokenAtCursor) {
        return false;
      }

      const tokenIdex = this.currentTokens.map((token) => token.start).indexOf(tokenAtCursor.start);

      let count = tokenIdex;
      let currentToken = tokenAtCursor;
      // check previous token
      while (
        !["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"].includes(currentToken.type) ||
        POSTFIX_UNARY_OPERATORS.includes(currentToken.value)
      ) {
        if (currentToken.type !== "SPACE" || count < 1) {
          return false;
        }
        count--;
        currentToken = this.currentTokens[count];
      }

      count = tokenIdex + 1;
      currentToken = this.currentTokens[count];
      // check next token
      while (
        currentToken &&
        !["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"].includes(currentToken.type)
      ) {
        if (currentToken.type !== "SPACE") {
          return false;
        }
        count++;
        currentToken = this.currentTokens[count];
      }
      return true;
    }
    return false;
  }
}
