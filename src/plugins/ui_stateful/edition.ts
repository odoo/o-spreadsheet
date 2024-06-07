import { composerTokenize, EnrichedToken } from "../../formulas/index";
import { POSTFIX_UNARY_OPERATORS } from "../../formulas/tokenizer";
import { parseLiteral } from "../../helpers/cells";
import {
  colors,
  concat,
  formatValue,
  fuzzyLookup,
  isDateTimeFormat,
  isEqual,
  isNotNull,
  isNumber,
  markdownLink,
  numberToString,
  parseDateTime,
  positionToZone,
  splitReference,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import {
  canonicalizeNumberContent,
  getDateTimeFormat,
  localizeFormula,
} from "../../helpers/locale";
import { loopThroughReferenceType } from "../../helpers/reference_type";
import { _t } from "../../translation";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CellValueType,
  Command,
  CommandResult,
  Format,
  HeaderIndex,
  Highlight,
  isMatrix,
  LocalCommand,
  Locale,
  Range,
  RangePart,
  RemoveColumnsRowsCommand,
  StopEditionCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../../types";
import { SelectionEvent } from "../../types/event_stream";
import { UIPlugin } from "../ui_plugin";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";

const CELL_DELETED_MESSAGE = _t("The cell you are trying to edit has been deleted.");

export interface ComposerSelection {
  start: number;
  end: number;
}

export class EditionPlugin extends UIPlugin {
  static getters = [
    "getEditionMode",
    "isSelectingForComposer",
    "showSelectionIndicator",
    "getCurrentContent",
    "getComposerSelection",
    "getCurrentTokens",
    "getTokenAtCursor",
    "getComposerHighlights",
    "getCurrentEditedCell",
    "getCycledReference",
    "getAutoCompleteDataValidationValues",
  ] as const;

  private col: HeaderIndex = 0;
  private row: HeaderIndex = 0;
  private mode: EditionMode = "inactive";
  private sheetId: UID = "";
  private currentContent: string = "";
  private currentTokens: EnrichedToken[] = [];
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private initialContent: string | undefined = "";
  private colorIndexByRange: { [xc: string]: number } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CHANGE_COMPOSER_CURSOR_SELECTION":
        return this.validateSelection(this.currentContent.length, cmd.start, cmd.end);
      case "SET_CURRENT_CONTENT":
        if (cmd.selection) {
          return this.validateSelection(cmd.content.length, cmd.selection.start, cmd.selection.end);
        }
        break;
      case "START_EDITION":
        if (cmd.selection) {
          const content = cmd.text || this.getComposerContent(this.getters.getActivePosition());
          return this.validateSelection(content.length, cmd.selection.start, cmd.selection.end);
        }
        break;
      case "STOP_EDITION":
        if (this.mode === "inactive") {
          return CommandResult.Success;
        }
        return this.checkDataValidation(cmd);
    }
    return CommandResult.Success;
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
        if (this.mode === "selecting") {
          this.insertSelectedRange(unboundedZone);
        }
        break;
      default:
        if (this.mode === "selecting") {
          this.replaceSelectedRange(unboundedZone);
        } else {
          this.updateComposerRange(event.previousAnchor.zone, unboundedZone);
        }
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CHANGE_COMPOSER_CURSOR_SELECTION":
        this.selectionStart = cmd.start;
        this.selectionEnd = cmd.end;
        break;
      case "STOP_COMPOSER_RANGE_SELECTION":
        if (this.isSelectingForComposer()) {
          this.mode = "editing";
        }
        break;
      case "START_EDITION":
        if (this.mode !== "inactive" && cmd.text) {
          this.setContent(cmd.text, cmd.selection);
        } else {
          this.startEdition(cmd.text, cmd.selection);
        }
        this.updateRangeColor();
        break;
      case "STOP_EDITION":
        this.stopEdition();
        this.colorIndexByRange = {};
        break;
      case "CANCEL_EDITION":
        this.cancelEditionAndActivateSheet();
        this.resetContent();
        this.colorIndexByRange = {};
        break;
      case "SET_CURRENT_CONTENT":
        this.setContent(cmd.content, cmd.selection, true);
        this.updateRangeColor();
        break;
      case "REPLACE_COMPOSER_CURSOR_SELECTION":
        this.replaceSelection(cmd.text);
        break;
      case "SELECT_FIGURE":
        this.cancelEditionAndActivateSheet();
        this.resetContent();
        break;
      case "ADD_COLUMNS_ROWS":
        this.onAddElements(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.onColumnsRemoved(cmd);
        } else {
          this.onRowsRemoved(cmd);
        }
        break;
      case "START_CHANGE_HIGHLIGHT":
        const { left, top } = cmd.zone;
        // changing the highlight can conflit with the 'selecting' mode
        if (this.isSelectingForComposer()) {
          this.mode = "editing";
        }
        this.selection.resetAnchor(this, { cell: { col: left, row: top }, zone: cmd.zone });
        break;
      case "ACTIVATE_SHEET":
        if (!this.currentContent.startsWith("=")) {
          this.cancelEdition();
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
          this.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
        break;
      case "DELETE_SHEET":
      case "UNDO":
      case "REDO":
        const sheetIdExists = !!this.getters.tryGetSheet(this.sheetId);
        if (!sheetIdExists && this.mode !== "inactive") {
          this.sheetId = this.getters.getActiveSheetId();
          this.cancelEditionAndActivateSheet();
          this.resetContent();
          this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
        }
        break;
      case "CYCLE_EDITION_REFERENCES":
        this.cycleReferences();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getEditionMode(): EditionMode {
    return this.mode;
  }

  getCurrentContent(): string {
    if (this.mode === "inactive") {
      return this.getComposerContent(this.getters.getActivePosition());
    }
    return this.currentContent;
  }

  getComposerSelection(): ComposerSelection {
    return {
      start: this.selectionStart,
      end: this.selectionEnd,
    };
  }

  getCurrentEditedCell(): CellPosition {
    return {
      sheetId: this.sheetId,
      col: this.col,
      row: this.row,
    };
  }

  isSelectingForComposer(): boolean {
    return this.mode === "selecting";
  }

  showSelectionIndicator(): boolean {
    return this.isSelectingForComposer() && this.canStartComposerRangeSelection();
  }

  getCurrentTokens(): EnrichedToken[] {
    return this.currentTokens;
  }

  /**
   * Return the (enriched) token just before the cursor.
   */
  getTokenAtCursor(): EnrichedToken | undefined {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    if (start === end && end === 0) {
      return undefined;
    } else {
      return this.currentTokens.find((t) => t.start <= start && t.end >= end);
    }
  }

  /**
   * Return the cycled reference if any (A1 -> $A$1 -> A$1 -> $A1 -> A1)
   */
  getCycledReference(selection: { start: number; end: number }, content: string) {
    const locale = this.getters.getLocale();
    const currentTokens = content.startsWith("=") ? composerTokenize(content, locale) : [];

    const tokens = currentTokens.filter(
      (t) =>
        (t.start <= selection.start && t.end >= selection.start) ||
        (t.start >= selection.start && t.start < selection.end)
    );

    const refTokens = tokens.filter((token) => token.type === "REFERENCE");
    if (refTokens.length === 0) {
      return;
    }

    const updatedReferences = tokens
      .map(loopThroughReferenceType)
      .map((token) => token.value)
      .join("");

    const start = tokens[0].start;
    const end = tokens[tokens.length - 1].end;
    const newContent = content.slice(0, start) + updatedReferences + content.slice(end);
    const lengthDiff = newContent.length - content.length;
    const startOfTokens = refTokens[0].start;
    const endOfTokens = refTokens[refTokens.length - 1].end + lengthDiff;
    const newSelection = { start: startOfTokens, end: endOfTokens };
    if (refTokens.length === 1 && selection.start === selection.end) {
      newSelection.start = newSelection.end;
    }
    return { content: newContent, selection: newSelection };
  }

  getInitialComposerContent(): string | undefined {
    return this.initialContent;
  }

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  private cycleReferences() {
    const updated = this.getCycledReference(this.getComposerSelection(), this.currentContent);
    if (updated === undefined) {
      return;
    }

    this.dispatch("SET_CURRENT_CONTENT", {
      content: updated.content,
      selection: updated.selection,
    });
  }

  private validateSelection(
    length: number,
    start: number,
    end: number
  ): CommandResult.Success | CommandResult.WrongComposerSelection {
    return start >= 0 && start <= length && end >= 0 && end <= length
      ? CommandResult.Success
      : CommandResult.WrongComposerSelection;
  }

  private onColumnsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.col) && this.mode !== "inactive") {
      this.dispatch("CANCEL_EDITION");
      this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "left",
      [...cmd.elements]
    );
    this.col = left;
    this.row = top;
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.row) && this.mode !== "inactive") {
      this.dispatch("CANCEL_EDITION");
      this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "top",
      [...cmd.elements]
    );
    this.col = left;
    this.row = top;
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    const { top, left } = updateSelectionOnInsertion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      cmd.dimension === "COL" ? "left" : "top",
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    this.col = left;
    this.row = top;
  }

  /**
   * Enable the selecting mode
   */
  private startComposerRangeSelection() {
    if (this.sheetId === this.getters.getActiveSheetId()) {
      const zone = positionToZone({ col: this.col, row: this.row });
      this.selection.resetAnchor(this, { cell: { col: this.col, row: this.row }, zone });
    }
    this.mode = "selecting";
  }

  /**
   * start the edition of a cell
   * @param str the key that is used to start the edition if it is a "content" key like a letter or number
   * @param selection
   * @private
   */
  private startEdition(str?: string, selection?: ComposerSelection) {
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
    this.mode = "editing";
    this.setContent(str || this.initialContent, selection);
    this.colorIndexByRange = {};
    const zone = positionToZone({ col: this.col, row: this.row });
    this.selection.capture(
      this,
      { cell: { col: this.col, row: this.row }, zone },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          this.stopEdition();
        },
      }
    );
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEditionAndActivateSheet();
      const col = this.col;
      const row = this.row;
      let content = this.getCurrentCanonicalContent();
      const didChange = this.initialContent !== content;
      if (!didChange) {
        return;
      }
      if (content) {
        const sheetId = this.getters.getActiveSheetId();
        const cell = this.getters.getEvaluatedCell({ sheetId, col: this.col, row: this.row });
        if (content.startsWith("=")) {
          const left = this.currentTokens.filter((t) => t.type === "LEFT_PAREN").length;
          const right = this.currentTokens.filter((t) => t.type === "RIGHT_PAREN").length;
          const missing = left - right;
          if (missing > 0) {
            content += concat(new Array(missing).fill(")"));
          }
        } else if (cell.link) {
          content = markdownLink(content, cell.link.url);
        }
        this.dispatch("UPDATE_CELL", {
          sheetId: this.sheetId,
          col,
          row,
          content,
        });
      } else {
        this.dispatch("UPDATE_CELL", {
          sheetId: this.sheetId,
          content: "",
          col,
          row,
        });
      }
      this.setContent("");
    }
  }

  private getCurrentCanonicalContent(): string {
    return canonicalizeNumberContent(this.currentContent, this.getters.getLocale());
  }

  private cancelEditionAndActivateSheet() {
    if (this.mode === "inactive") {
      return;
    }
    this.cancelEdition();
    const sheetId = this.getters.getActiveSheetId();
    if (sheetId !== this.sheetId) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: this.sheetId,
      });
    }
  }

  private getComposerContent(position: CellPosition): string {
    const locale = this.getters.getLocale();
    const cell = this.getters.getCell(position);
    if (cell?.isFormula) {
      return localizeFormula(cell.content, locale);
    }
    const { format, value, type, formattedValue } = this.getters.getEvaluatedCell(position);
    switch (type) {
      case CellValueType.text:
      case CellValueType.empty:
        return value;
      case CellValueType.boolean:
        return formattedValue;
      case CellValueType.error:
        return cell?.content || "";
      case CellValueType.number:
        if (format && isDateTimeFormat(format)) {
          if (parseDateTime(formattedValue, locale) !== null) {
            // formatted string can be parsed again
            return formattedValue;
          }
          // display a simplified and parsable string otherwise
          const timeFormat = Number.isInteger(value)
            ? locale.dateFormat
            : getDateTimeFormat(locale);
          return formatValue(value, { locale, format: timeFormat });
        }
        return this.numberComposerContent(value, format, locale);
    }
  }

  private numberComposerContent(value: number, format: Format | undefined, locale: Locale): string {
    if (format?.includes("%")) {
      return `${numberToString(value * 100, locale.decimalSeparator)}%`;
    }
    return numberToString(value, locale.decimalSeparator);
  }

  private cancelEdition() {
    if (this.mode === "inactive") {
      return;
    }
    this.mode = "inactive";
    this.selection.release(this);
  }

  /**
   * Reset the current content to the active cell content
   */
  private resetContent() {
    this.setContent(this.initialContent || "");
  }

  private setContent(text: string, selection?: ComposerSelection, raise?: boolean) {
    const isNewCurrentContent = this.currentContent !== text;
    this.currentContent = text;

    if (selection) {
      this.selectionStart = selection.start;
      this.selectionEnd = selection.end;
    } else {
      this.selectionStart = this.selectionEnd = text.length;
    }
    if (isNewCurrentContent || this.mode !== "inactive") {
      const locale = this.getters.getLocale();
      this.currentTokens = text.startsWith("=") ? composerTokenize(text, locale) : [];
      if (this.currentTokens.length > 100) {
        if (raise) {
          this.ui.raiseBlockingErrorUI(
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
    const currentToken = this.getTokenAtCursor();
    const start = currentToken?.type === "REFERENCE" ? currentToken.start : this.selectionStart;
    this.replaceText(ref, start, this.selectionEnd);
  }

  /**
   * Replace the reference of the old zone by the new one.
   */
  private updateComposerRange(oldZone: Zone, newZone: Zone | UnboundedZone) {
    const activeSheetId = this.getters.getActiveSheetId();

    const tokentAtCursor = this.getTokenAtCursor();
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
    const inputSheetId = this.getters.getCurrentEditedCell().sheetId;
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, inputSheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]>) {
    let _fixedParts = [...fixedParts];
    const newRange = range.clone({ parts: _fixedParts });
    return this.getters.getSelectionRangeString(
      newRange,
      this.getters.getCurrentEditedCell().sheetId
    );
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
    this.currentContent =
      this.currentContent.slice(0, start) +
      this.currentContent.slice(end, this.currentContent.length);
    this.insertText(text, start);
  }

  /**
   * Insert a text at the given position.
   * The cursor is then set at the end of the text.
   */
  private insertText(text: string, start: number) {
    const content = this.currentContent.slice(0, start) + text + this.currentContent.slice(start);
    const end = start + text.length;
    this.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection: { start: end, end },
    });
  }

  private updateRangeColor() {
    if (!this.currentContent.startsWith("=") || this.mode === "inactive") {
      return;
    }
    const editionSheetId = this.getters.getCurrentEditedCell().sheetId;
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
  getComposerHighlights(): Highlight[] {
    if (!this.currentContent.startsWith("=") || this.mode === "inactive") {
      return [];
    }
    const editionSheetId = this.getters.getCurrentEditedCell().sheetId;
    const rangeColor = (rangeString: string) => {
      const colorIndex = this.colorIndexByRange[rangeString];
      return colors[colorIndex % colors.length];
    };
    return this.getReferencedRanges().map((range) => {
      const rangeString = this.getters.getRangeString(range, editionSheetId);
      return {
        zone: range.zone,
        color: rangeColor(rangeString),
        sheetId: range.sheetId,
      };
    });
  }

  /**
   * Return ranges currently referenced in the composer
   */
  getReferencedRanges(): Range[] {
    const editionSheetId = this.getters.getCurrentEditedCell().sheetId;
    const referenceRanges = this.currentTokens
      .filter((token) => token.type === "REFERENCE")
      .map((token) => this.getters.getRangeFromSheetXC(editionSheetId, token.value));
    return referenceRanges.filter((range) => !range.invalidSheetName && !range.invalidXc);
  }

  getAutoCompleteDataValidationValues(): string[] {
    if (this.mode === "inactive") {
      return [];
    }

    const rule = this.getters.getValidationRuleForCell(this.getCurrentEditedCell());
    if (
      !rule ||
      (rule.criterion.type !== "isValueInList" && rule.criterion.type !== "isValueInRange")
    ) {
      return [];
    }

    let values: string[];
    if (rule.criterion.type === "isValueInList") {
      values = rule.criterion.values;
    } else {
      const range = this.getters.getRangeFromSheetXC(this.sheetId, rule.criterion.values[0]);
      values = Array.from(
        new Set(
          this.getters
            .getRangeValues(range)
            .filter(isNotNull)
            .map((value) => value.toString())
            .filter((val) => val !== "")
        )
      );
    }
    const composerContent = this.getCurrentContent();
    if (composerContent && composerContent !== this.getInitialComposerContent()) {
      const filteredValues = fuzzyLookup(composerContent, values, (val) => val);
      values = filteredValues.length ? filteredValues : values;
    }

    return values;
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"], and is not a postfix unary operator
   * - the next token is missing or is among ["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"]
   * - Previous and next tokens can be separated by spaces
   */
  private canStartComposerRangeSelection(): boolean {
    if (this.currentContent.startsWith("=")) {
      const tokenAtCursor = this.getTokenAtCursor();
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

  private checkDataValidation(cmd: StopEditionCommand) {
    const cellPosition = { sheetId: this.sheetId, col: this.col, row: this.row };
    try {
      const content = this.getCurrentCanonicalContent();
      const cellValue = content.startsWith("=")
        ? this.getters.evaluateFormula(this.sheetId, content)
        : parseLiteral(content, this.getters.getLocale());

      if (isMatrix(cellValue)) {
        return CommandResult.Success;
      }

      const validationResult = this.getters.getValidationResultForCellValue(
        cellValue,
        cellPosition
      );
      if (!validationResult.isValid && validationResult.rule.isBlocking) {
        return CommandResult.BlockingValidationRule;
      }
      return CommandResult.Success;
    } catch (e) {
      // error at formula evaluation
      const rule = this.getters.getValidationRuleForCell(cellPosition);
      return rule?.isBlocking ? CommandResult.BlockingValidationRule : CommandResult.Success;
    }
  }
}
