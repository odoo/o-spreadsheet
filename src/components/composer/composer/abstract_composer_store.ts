import { DEFAULT_TOKEN_COLOR, tokenColors } from "../../../constants";
import { composerTokenize, EnrichedToken } from "../../../formulas/composer_tokenizer";
import { AST, iterateAstNodes, parseTokens } from "../../../formulas/parser";
import { POSTFIX_UNARY_OPERATORS } from "../../../formulas/tokenizer";
import { functionRegistry } from "../../../functions";
import { isEvaluationError, transposeMatrix } from "../../../functions/helpers";
import { KeepLast } from "../../../helpers/concurrency";
import {
  clip,
  colors,
  concat,
  formatValue,
  fuzzyLookup,
  getZoneArea,
  isEqual,
  isFormula,
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
import { Get, Store } from "../../../store_engine";
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
  FunctionResultObject,
  HeaderIndex,
  Highlight,
  isMatrix,
  Matrix,
  Range,
  RangePart,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import { EvaluationError } from "../../../types/errors";
import { SelectionEvent } from "../../../types/event_stream";
import { AutoCompleteStore } from "../autocomplete_dropdown/autocomplete_dropdown_store";

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
    "hideHelp",
    "autoCompleteOrStop",
    "insertAutoCompleteValue",
    "moveAutoCompleteSelection",
    "selectAutoCompleteIndex",
    "toggleEditionMode",
    "changeComposerCursorSelection",
    "replaceComposerCursorSelection",
    "hoverToken",
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
  private autoComplete: Store<AutoCompleteStore> = new AutoCompleteStore(this.get);

  hoveredTokens: EnrichedToken[] = [];
  hoveredContentEvaluation: string = "";

  private autoCompleteKeepLast = new KeepLast<AutoCompleteProvider | undefined>();
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
    this.hideHelp();
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
    this.computeFormulaCursorContext();
    this.computeParenthesisRelatedToCursor();
    this.updateAutoCompleteProvider();
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
    this.model.dispatch("SELECT_FIGURE", { figureId: null });
    this.model.dispatch("SCROLL_TO_CELL", { col, row });

    if (this.editionMode !== "inactive" && text) {
      this.setContent(text, selection);
    } else {
      this._startEdition(text, selection);
    }
    this.updateTokenColor();
    this.computeFormulaCursorContext();
    this.computeParenthesisRelatedToCursor();
    this.updateAutoCompleteProvider();
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
    this.updateTokenColor();
    this.computeFormulaCursorContext();
    this.computeParenthesisRelatedToCursor();
  }

  replaceComposerCursorSelection(text: string) {
    this.replaceSelection(text);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SELECT_FIGURE":
        if (cmd.figureId) {
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

  get autoCompleteProposals() {
    return this.autoComplete.provider?.proposals || [];
  }

  get autoCompleteSelectedIndex() {
    return this.autoComplete.selectedIndex;
  }

  get isAutoCompleteDisplayed() {
    return !!this.autoComplete.provider;
  }

  get canBeToggled() {
    return this.autoComplete.provider?.canBeToggled ?? true;
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

  hoverToken(tokenIndex: number | undefined) {
    this.currentTokens.forEach((t) => (t.isInHoverContext = undefined));
    const tokens = [...this.currentTokens];
    if (tokenIndex === undefined || ["ARG_SEPARATOR", "SPACE"].includes(tokens[tokenIndex].type)) {
      this.hoveredContentEvaluation = "";
      this.hoveredTokens = [];
      return;
    }

    const missingParenthesis = this.getNumberOfMissingParenthesis(tokens);
    if (missingParenthesis > 0) {
      tokens.push(...Array(missingParenthesis).fill({ value: ")", type: "RIGHT_PAREN" }));
    }

    let hoveredContextTokens = tokens;
    if (tokenIndex !== 0) {
      const relatedTokens = this.getRelatedTokens(tokens, tokenIndex);
      const notHoveredTokens = tokens.filter(
        (t) => !relatedTokens.includes(t) && t.type !== "SPACE"
      );
      // Includes starting "=" if all the other tokens are hovered
      hoveredContextTokens =
        notHoveredTokens.length === 1 && notHoveredTokens[0] === tokens[0] ? tokens : relatedTokens;
    }

    hoveredContextTokens.forEach((t) => (t.isInHoverContext = true));

    let hoveredFormula = hoveredContextTokens.map((t) => t.value).join("");
    if (!isFormula(hoveredFormula)) {
      hoveredFormula = `=${hoveredFormula}`;
    }
    const canonicalFormula = canonicalizeNumberContent(hoveredFormula, this.getters.getLocale());
    const result = this.getters.evaluateFormulaResult(this.sheetId, canonicalFormula);
    this.hoveredTokens = hoveredContextTokens;
    this.hoveredContentEvaluation = this.evaluationResultToDisplayString(result);
  }

  private getRelatedTokens(tokens: EnrichedToken[], tokenIndex: number): EnrichedToken[] {
    try {
      const ast = parseTokens(tokens);
      let match: AST | undefined = undefined;
      for (const node of iterateAstNodes(ast)) {
        if (tokenIndex >= node.tokenStartIndex && tokenIndex <= node.tokenEndIndex) {
          match = node;
        } else if (tokenIndex < node.tokenStartIndex) {
          break;
        }
      }
      if (!match) {
        return tokens; // Happens if we're hovering spaces at the start/end of the formula
      }
      return tokens.slice(match.tokenStartIndex, match.tokenEndIndex + 1);
    } catch (e) {
      if (e instanceof EvaluationError) {
        return tokens;
      }
      throw e;
    }
  }

  private evaluationResultToDisplayString(
    result: Matrix<FunctionResultObject> | FunctionResultObject
  ): string {
    const locale = this.getters.getLocale();
    if (isMatrix(result)) {
      const rowSeparator = locale.decimalSeparator === "," ? "/" : ",";
      const arrayStr = transposeMatrix(result)
        .map((row) => row.map((val) => this.cellValueToDisplayString(val)).join(rowSeparator))
        .join(";");
      return `{${arrayStr}}`;
    }

    return this.cellValueToDisplayString(result);
  }

  private cellValueToDisplayString(result: FunctionResultObject): string {
    const value = result.value;
    switch (typeof value) {
      case "number":
        return formatValue(value, { locale: this.getters.getLocale(), format: result.format });
      case "string":
        if (isEvaluationError(value)) {
          return value;
        }
        return `"${value}"`;
      case "boolean":
        return value ? "TRUE" : "FALSE";
    }
    return "0";
  }

  private captureSelection(zone: Zone, col?: HeaderIndex, row?: HeaderIndex) {
    this.model.selection.capture(
      this,
      {
        cell: { col: col ?? zone.left, row: row ?? zone.right },
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
    this.editionMode = "editing";
    this.initialContent = this.getComposerContent({ sheetId, col, row });
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
        if (isFormula(content)) {
          const missing = this.getNumberOfMissingParenthesis(this.currentTokens);
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
    this.hoveredTokens = [];
    this.hoveredContentEvaluation = "";
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
      this.currentTokens = isFormula(text) ? composerTokenize(text, locale) : [];
      const nonSpaceTokensCount = this.currentTokens.filter(
        (token) => token.type !== "SPACE"
      ).length;
      if (nonSpaceTokensCount > 1000) {
        if (raise) {
          this.notificationStore.raiseError(
            _t(
              "This formula has over 1000 parts. It can't be processed properly, consider splitting it into multiple cells"
            )
          );
        }
      }
    }
    if (this.canStartComposerRangeSelection()) {
      this.startComposerRangeSelection();
    }
    this.updateAutoCompleteProvider();
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

  protected getZoneReference(zone: Zone | UnboundedZone): string {
    const inputSheetId = this.sheetId;
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, inputSheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]> | undefined) {
    const _fixedParts = fixedParts ? [...fixedParts] : undefined;
    const newRange = { ...range, parts: _fixedParts };
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
    this.updateRangeColor();
    for (let i = 0; i < this.currentTokens.length; i++) {
      this.currentTokens[i].color = this.getTokenColor(this.currentTokens[i]);
    }
  }

  protected getTokenColor(token: EnrichedToken): string {
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
      if (token.parenthesesCode === "") {
        return tokenColors.ORPHAN_RIGHT_PAREN;
      }
    }
    return tokenColors[token.type] || DEFAULT_TOKEN_COLOR;
  }

  private rangeColor(xc: string, sheetName?: string): Color | undefined {
    const refSheet = sheetName ? this.model.getters.getSheetIdByName(sheetName) : this.sheetId;

    const highlight = this.highlights.find((highlight) => {
      if (highlight.range.sheetId !== refSheet) return false;

      const range = this.model.getters.getRangeFromSheetXC(refSheet, xc);
      let zone = range.zone;
      zone = getZoneArea(zone) === 1 ? this.model.getters.expandZone(refSheet, zone) : zone;
      return isEqual(zone, highlight.range.zone);
    });
    return highlight && highlight.color ? highlight.color : undefined;
  }

  /**
   * Compute for each token if it is part of the same
   * formula as the current selector token.
   * If no specific formula found for the current selected
   * token, it assumes all tokens are part of the formula
   * context.
   */
  private computeFormulaCursorContext() {
    // reset everything first
    for (let i = 0; i < this.currentTokens.length; i++) {
      this.currentTokens[i].isBlurred = false;
    }

    if (this.selectionStart !== this.selectionEnd) {
      return;
    }

    const parenthesesCodeAtCursor = this.getParenthesesCodeAfterCursor();
    const previousSymbolAtCursor = [...this.currentTokens] // a formula correspond to a symbol token
      .reverse()
      .find((t) => parenthesesCodeAtCursor.startsWith(t.parenthesesCode!) && t.type === "SYMBOL");

    if (!previousSymbolAtCursor) {
      return;
    }

    // we refer to the previous symbol parenthesesCode and not directly the
    // parenthesesCode of the token at the cursor because we don't want to
    // match cases where the token at the cursor is between parentheses which
    // are not function parentheses
    for (let i = 0; i < this.currentTokens.length; i++) {
      if (
        !(this.currentTokens[i].parenthesesCode || "").startsWith(
          previousSymbolAtCursor.parenthesesCode || ""
        )
      ) {
        this.currentTokens[i].isBlurred = true;
      }
    }
  }

  private getParenthesesCodeAfterCursor(): string {
    // we always look at the code associated with the token located after the cursor.
    // This code is the same as the 'tokenAtCursor' except in the case of a closing parenthesis.
    // In this case we look at the code located one degree below in the parentheses tree
    const code = this.tokenAtCursor?.parenthesesCode || "";
    if (this.tokenAtCursor?.type === "RIGHT_PAREN") {
      return code.slice(0, -1) || "";
    }
    return code;
  }

  private computeParenthesisRelatedToCursor() {
    // reset everything first
    for (let i = 0; i < this.currentTokens.length; i++) {
      this.currentTokens[i].isParenthesisLinkedToCursor = false;
    }

    const tokenAtCursor = this.tokenAtCursor;
    if (
      !tokenAtCursor ||
      tokenAtCursor.parenthesesCode === "" ||
      !["LEFT_PAREN", "RIGHT_PAREN"].includes(tokenAtCursor.type)
    ) {
      return;
    }

    for (let i = 0; i < this.currentTokens.length; i++) {
      const currentToken = this.currentTokens[i];
      if (
        ["LEFT_PAREN", "RIGHT_PAREN"].includes(currentToken.type) &&
        currentToken.parenthesesCode === tokenAtCursor.parenthesesCode &&
        currentToken !== tokenAtCursor
      ) {
        this.currentTokens[i].isParenthesisLinkedToCursor = true;
        this.tokenAtCursor.isParenthesisLinkedToCursor = true;
      }
    }
  }

  private updateRangeColor() {
    if (!isFormula(this._currentContent) || this.editionMode === "inactive") {
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
    if (!isFormula(this.currentContent) || this.editionMode === "inactive") {
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
          : range.unboundedZone;
      return {
        range: this.model.getters.getRangeFromZone(range.sheetId, zone),
        color: rangeColor(rangeString),
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

  private async updateAutoCompleteProvider() {
    this.autoComplete.hide();
    const provider = await this.autoCompleteKeepLast.add(this.findAutocompleteProvider());
    if (provider) {
      this.autoComplete.useProvider(provider);
      this.model.trigger("update");
    }
  }

  private async findAutocompleteProvider() {
    const content = this.currentContent;
    const tokenAtCursor = isFormula(content)
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
      let proposals = await provider.getProposals();
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

  hideHelp() {
    this.autoComplete.hide();
  }

  autoCompleteOrStop(direction: Direction) {
    if (this.editionMode !== "inactive") {
      const autoComplete = this.autoComplete;
      if (autoComplete.provider && autoComplete.selectedIndex !== undefined) {
        const autoCompleteValue = autoComplete.provider.proposals[autoComplete.selectedIndex]?.text;
        if (autoCompleteValue) {
          this.autoComplete.provider?.selectProposal(autoCompleteValue);
          return;
        }
      }
      this.stopEdition(direction);
    }
  }

  insertAutoCompleteValue(value: string) {
    this.autoComplete.provider?.selectProposal(value);
  }

  selectAutoCompleteIndex(index: number) {
    this.autoComplete.selectIndex(clip(0, index, 10));
  }

  moveAutoCompleteSelection(direction: "previous" | "next") {
    this.autoComplete.moveSelection(direction);
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"], and is not a postfix unary operator
   * - the next token is missing or is among ["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"]
   * - Previous and next tokens can be separated by spaces
   */
  private canStartComposerRangeSelection(): boolean {
    if (isFormula(this._currentContent)) {
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

  private getNumberOfMissingParenthesis(tokens: EnrichedToken[]): number {
    const left = tokens.filter((t) => t.type === "LEFT_PAREN").length;
    const right = tokens.filter((t) => t.type === "RIGHT_PAREN").length;
    return left - right;
  }
}
