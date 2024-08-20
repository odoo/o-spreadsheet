import { composerTokenize, EnrichedToken } from "../../../formulas/composer_tokenizer";
import { POSTFIX_UNARY_OPERATORS } from "../../../formulas/tokenizer";
import { functionRegistry } from "../../../functions";
import {
  colors,
  concat,
  fuzzyLookup,
  getZoneArea,
  isEqual,
  isNumber,
  positionToZone,
  splitReference,
  zoneToDimension,
} from "../../../helpers/index";
import { canonicalizeNumberContent, localizeFormula } from "../../../helpers/locale";
import { createPivotFormula } from "../../../helpers/pivot/pivot_helpers";
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
  Color,
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

const functionColor = "#4a4e4d";
const operatorColor = "#3da4ab";
const DEFAULT_TOKEN_COLOR = "#000000";

export const tokenColors = {
  OPERATOR: operatorColor,
  NUMBER: "#02c39a",
  STRING: "#00a82d",
  FUNCTION: functionColor,
  DEBUGGER: operatorColor,
  LEFT_PAREN: functionColor,
  RIGHT_PAREN: functionColor,
  ARG_SEPARATOR: functionColor,
  MATCHING_PAREN: "#000000",
} as const;

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
    "toggleEditionMode",
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
    this.updateTokenColor();
  }

  cancelEdition() {
    this.cancelEditionAndActivateSheet();
    this.resetContent();
  }

  setCurrentContent(content: string, selection?: ComposerSelection) {
    if (selection && !this.isSelectionValid(content.length, selection.start, selection.end)) {
      return;
    }

    this.setContent(content, selection, true);
    this.updateRangeColor();
    this.updateTokenColor();
  }

  replaceComposerCursorSelection(text: string) {
    this.replaceSelection(text);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SELECT_FIGURE":
        if (cmd.id) {
          this.cancelEditionAndActivateSheet();
          this.resetContent();
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

  toggleEditionMode() {
    if (this.editionMode === "inactive") return;
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    const refToken = [...this.currentTokens]
      .reverse()
      .find((tk) => tk.end >= start && end >= tk.start && tk.type === "REFERENCE");

    if (this.editionMode === "editing" && refToken) {
      const currentSheetId = this.getters.getActiveSheetId();
      const { sheetName, xc } = splitReference(refToken.value);
      const sheetId = this.getters.getSheetIdByName(sheetName);
      if (sheetId && sheetId !== currentSheetId) {
        this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: currentSheetId, sheetIdTo: sheetId });
      }
      // move cursor to the right part of the token
      this.selectionStart = this.selectionEnd = refToken.end;
      const zone = this.getters.getRangeFromSheetXC(this.sheetId, xc).zone;
      this.captureSelection(zone);
      this.editionMode = "selecting";
    } else {
      this.editionMode = "editing";
    }
  }

  private captureSelection(zone: Zone, col?: HeaderIndex, row?: HeaderIndex) {
    this.model.selection.capture(
      this,
      {
        cell: { col: col || zone.left, row: row || zone.right },
        zone,
      },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          this._stopEdition();
        },
      }
    );
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
    this.captureSelection(zone, col, row);
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

    let replaceStart = this.selectionStart;
    if (currentToken?.type === "REFERENCE") {
      replaceStart = currentToken.start;
    } else if (currentToken?.type === "RIGHT_PAREN") {
      // match left parenthesis
      const leftParenthesisIndex = this.currentTokens.findIndex(
        (token) => token.type === "LEFT_PAREN" && token.parenIndex === currentToken.parenIndex
      );
      const functionToken = this.currentTokens[leftParenthesisIndex - 1];
      if (functionToken === undefined) {
        return;
      }
      replaceStart = functionToken.start;
    }
    this.replaceText(ref, replaceStart, this.selectionEnd);
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
    if (zone.top === zone.bottom && zone.left === zone.right) {
      const position = { sheetId, col: zone.left, row: zone.top };
      const pivotId = this.getters.getPivotIdFromPosition(position);
      const pivotCell = this.getters.getPivotCellFromPosition(position);
      const cell = this.getters.getCell(position);
      if (pivotId && pivotCell.type !== "EMPTY" && !cell?.isFormula) {
        const formulaPivotId = this.getters.getPivotFormulaId(pivotId);
        const formula = createPivotFormula(formulaPivotId, pivotCell);
        return localizeFormula(formula, this.getters.getLocale()).slice(1); // strip leading =
      }
    }
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

  private updateTokenColor() {
    for (let i = 0; i < this.currentTokens.length; i++) {
      this.currentTokens[i].color = this.getTokenColor(this.currentTokens[i]);
    }
  }

  private getTokenColor(token: EnrichedToken): string {
    if (token.type === "REFERENCE") {
      const { xc, sheetName } = splitReference(token.value);
      return this.rangeColor(xc, sheetName) || DEFAULT_TOKEN_COLOR;
    }
    if (token.type === "SYMBOL") {
      const upperCaseValue = token.value.toUpperCase();
      if (upperCaseValue === "TRUE" || upperCaseValue === "FALSE") {
        return tokenColors.NUMBER;
      }
      if (upperCaseValue in functionRegistry.content) {
        return tokenColors.FUNCTION;
      }
    }
    if (["LEFT_PAREN", "RIGHT_PAREN"].includes(token.type)) {
      // Compute the matching parenthesis
      if (
        this.tokenAtCursor &&
        ["LEFT_PAREN", "RIGHT_PAREN"].includes(this.tokenAtCursor.type) &&
        this.tokenAtCursor.parenIndex &&
        this.tokenAtCursor.parenIndex === token.parenIndex
      ) {
        return tokenColors.MATCHING_PAREN;
      }
    }
    return tokenColors[token.type] || DEFAULT_TOKEN_COLOR;
  }

  private rangeColor(xc: string, sheetName?: string): Color | undefined {
    const refSheet = sheetName ? this.model.getters.getSheetIdByName(sheetName) : this.sheetId;

    const highlight = this.highlights.find((highlight) => {
      if (highlight.sheetId !== refSheet) return false;

      const range = this.model.getters.getRangeFromSheetXC(refSheet, xc);
      let zone = range.zone;
      zone = getZoneArea(zone) === 1 ? this.model.getters.expandZone(refSheet, zone) : zone;
      return isEqual(zone, highlight.zone);
    });
    return highlight && highlight.color ? highlight.color : undefined;
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
    const highlights: Highlight[] = [];
    for (const range of this.getReferencedRanges()) {
      const rangeString = this.getters.getRangeString(range, editionSheetId);
      const { numberOfRows, numberOfCols } = zoneToDimension(range.zone);
      const zone =
        numberOfRows * numberOfCols === 1
          ? this.getters.expandZone(range.sheetId, range.zone)
          : range.zone;
      highlights.push({
        zone,
        color: rangeColor(rangeString),
        sheetId: range.sheetId,
        interactive: true,
      });
    }
    const activeSheetId = this.getters.getActiveSheetId();
    const selectionZone = this.model.selection.getAnchor().zone;
    const isSelectionHightlighted = highlights.find(
      (highlight) => highlight.sheetId === activeSheetId && isEqual(highlight.zone, selectionZone)
    );
    if (this.editionMode === "selecting" && !isSelectionHightlighted) {
      highlights.push({
        zone: selectionZone,
        color: "#445566",
        sheetId: activeSheetId,
        dashed: true,
        interactive: false,
        noFill: true,
        thinLine: true,
      });
    }
    return highlights;
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
