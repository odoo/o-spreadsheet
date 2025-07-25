import { composerTokenize, EnrichedToken } from "../../../formulas/composer_tokenizer";
import { POSTFIX_UNARY_OPERATORS } from "../../../formulas/tokenizer";
import {
  colors,
  concat,
  fuzzyLookup,
  isEqual,
  isNumber,
  isSheetNameEqual,
  positionToZone,
  splitReference,
  zoneToDimension,
} from "../../../helpers/index";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { cycleFixedReference } from "../../../helpers/reference_type";
import {
  AutoCompleteProvider,
  AutoCompleteProviderDefinition,
  autoCompleteProviders,
} from "../../../registries/auto_completes/auto_complete_registry";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { HighlightStore } from "../../../stores/highlight_store";
import { NotificationStore } from "../../../stores/notification_store";
import { _t } from "../../../translation";
import {
  CellPosition,
  Command,
  Direction,
  EditionMode,
  HeaderIndex,
  Highlight,
  Range,
  RangePart,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import { SelectionEvent } from "../../../types/event_stream";

export interface ComposerSelection {
  start: number;
  end: number;
}

export abstract class AbstractComposerStore extends SpreadsheetStore {
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
  protected col: HeaderIndex = 0;
  protected row: HeaderIndex = 0;
  editionMode: EditionMode = "inactive";
  sheetId: UID = "";
  protected _currentContent: string = "";
  currentTokens: EnrichedToken[] = [];
  protected selectionStart: number = 0;
  protected selectionEnd: number = 0;
  protected initialContent: string | undefined = "";
  private colorIndexByRange: { [xc: string]: number } = {};

  protected notificationStore = this.get(NotificationStore);
  private highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.highlightStore.unRegister(this);
    });
  }
  protected abstract confirmEdition(content: string): void;
  protected abstract getComposerContent(position: CellPosition): string;

  abstract stopEdition(direction?: Direction): void;

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

  startEdition(text?: string, selection?: ComposerSelection) {
    if (selection) {
      const content = text || this.getComposerContent(this.getters.getActivePosition());
      const validSelection = this.isSelectionValid(content.length, selection.start, selection.end);
      if (!validSelection) {
        return;
      }
    }
    const { col, row } = this.getters.getActivePosition();
    this.model.dispatch("SELECT_FIGURE", { id: null });
    this.model.dispatch("SCROLL_TO_CELL", { col, row });

    if (this.editionMode !== "inactive" && text) {
      this.setContent(text, selection);
    } else {
      this._startEdition(text, selection);
    }
    this.updateRangeColor();
  }

  cancelEdition() {
    this.resetContent();
    this.cancelEditionAndActivateSheet();
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
      case "SELECT_FIGURE":
        if (cmd.id) {
          this.resetContent();
          this.cancelEditionAndActivateSheet();
        }
        break;
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
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get currentContent(): string {
    if (this.editionMode === "inactive") {
      return this.getComposerContent(this.getters.getActivePosition());
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
    if (this.sheetId === this.getters.getActiveSheetId()) {
      const zone = positionToZone({ col: this.col, row: this.row });
      this.model.selection.resetAnchor(this, {
        cell: { col: this.col, row: this.row },
        zone,
      });
    }
    this.editionMode = "selecting";
  }

  /**
   * start the edition of a cell
   * @param str the key that is used to start the edition if it is a "content" key like a letter or number
   * @param selection
   * @private
   */
  private _startEdition(str?: string, selection?: ComposerSelection) {
    const evaluatedCell = this.getters.getActiveCell();
    const locale = this.getters.getLocale();
    if (str && evaluatedCell.format?.includes("%") && isNumber(str, locale)) {
      selection = selection || { start: str.length, end: str.length };
      str = `${str}%`;
    }
    const { col, row, sheetId } = this.getters.getActivePosition();
    this.col = col;
    this.sheetId = sheetId;
    this.row = row;
    this.initialContent = this.getComposerContent({ sheetId, col, row });
    this.editionMode = "editing";
    this.setContent(str || this.initialContent, selection);
    this.colorIndexByRange = {};
    const zone = positionToZone({ col: this.col, row: this.row });
    this.model.selection.capture(
      this,
      { cell: { col: this.col, row: this.row }, zone },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          this._stopEdition();
        },
      }
    );
  }

  protected _stopEdition() {
    if (this.editionMode !== "inactive") {
      this.cancelEditionAndActivateSheet();
      let content = this.getCurrentCanonicalContent();
      const didChange = this.initialContent !== content;
      if (!didChange) {
        return;
      }
      if (content) {
        if (content.startsWith("=")) {
          const left = this.currentTokens.filter((t) => t.type === "LEFT_PAREN").length;
          const right = this.currentTokens.filter((t) => t.type === "RIGHT_PAREN").length;
          const missing = left - right;
          if (missing > 0) {
            content += concat(new Array(missing).fill(")"));
          }
        }
      }
      this.confirmEdition(content);
    }
  }

  protected getCurrentCanonicalContent(): string {
    return canonicalizeNumberContent(this._currentContent, this.getters.getLocale());
  }

  protected cancelEditionAndActivateSheet() {
    if (this.editionMode === "inactive") {
      return;
    }
    this._cancelEdition();
    const sheetId = this.getters.getActiveSheetId();
    if (sheetId !== this.sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: this.sheetId,
      });
    }
  }

  protected _cancelEdition() {
    if (this.editionMode === "inactive") {
      return;
    }
    this.editionMode = "inactive";
    this.model.selection.release(this);
    this.colorIndexByRange = {};
  }

  /**
   * Reset the current content to the active cell content
   */
  protected resetContent() {
    this.setContent(this.initialContent || "");
  }

  protected setContent(text: string, selection?: ComposerSelection, raise?: boolean) {
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

  protected getAutoCompleteProviders(): AutoCompleteProviderDefinition[] {
    return autoCompleteProviders.getAll();
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

        if (!isSheetNameEqual(this.getters.getSheetName(activeSheetId), sheetName)) {
          return false;
        }
        const refRange = this.getters.getRangeFromSheetXC(activeSheetId, xc);
        return isEqual(this.getters.expandZone(activeSheetId, refRange.zone), oldZone);
      });

    if (!previousRefToken) {
      return;
    }

    const previousRange = this.getters.getRangeFromSheetXC(activeSheetId, previousRefToken.value);
    this.selectionStart = previousRefToken!.start;
    this.selectionEnd = this.selectionStart + previousRefToken!.value.length;

    const newRange = this.getters.getRangeFromZone(activeSheetId, newZone);
    const newRef = this.getRangeReference(newRange, previousRange.parts);
    this.replaceSelection(newRef);
  }

  private getZoneReference(zone: Zone | UnboundedZone): string {
    const inputSheetId = this.sheetId;
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, inputSheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]>) {
    let _fixedParts = [...fixedParts];
    const newRange = range.clone({ parts: _fixedParts });
    return this.getters.getSelectionRangeString(newRange, this.sheetId);
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
    if (
      this.editionMode === "inactive" ||
      !tokenAtCursor ||
      ["TRUE", "FALSE"].includes(tokenAtCursor.value.toUpperCase()) ||
      !(
        this.canStartComposerRangeSelection() ||
        ["SYMBOL", "STRING", "UNKNOWN"].includes(tokenAtCursor.type)
      )
    ) {
      return;
    }
    const thisCtx = { composer: this, getters: this.getters };
    const providersDefinitions = this.getAutoCompleteProviders();
    const providers = providersDefinitions
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
      if (
        this._currentContent === this.initialContent &&
        provider.displayAllOnInitialContent &&
        proposals?.length
      ) {
        return {
          proposals,
          selectProposal: provider.selectProposal,
          autoSelectFirstProposal: provider.autoSelectFirstProposal ?? false,
          canBeToggled: provider.canBeToggled,
        };
      }
      if (exactMatch && this._currentContent !== this.initialContent) {
        // this means the user has chosen a proposal
        return;
      }
      if (
        searchTerm &&
        proposals &&
        !["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"].includes(tokenAtCursor.type)
      ) {
        const filteredProposals = fuzzyLookup(
          searchTerm,
          proposals,
          (p) => p.fuzzySearchKey || p.text
        );
        if (!exactMatch || filteredProposals.length) {
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
          canBeToggled: provider.canBeToggled,
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
