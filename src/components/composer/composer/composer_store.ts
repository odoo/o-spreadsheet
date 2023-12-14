import { toRaw } from "@odoo/owl";
import { EnrichedToken, composerTokenize } from "../../../formulas/composer_tokenizer";
import { POSTFIX_UNARY_OPERATORS } from "../../../formulas/tokenizer";
import { parseLiteral } from "../../../helpers/cells";
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
  toXC,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
  zoneToDimension,
} from "../../../helpers/index";
import {
  canonicalizeNumberContent,
  getDateTimeFormat,
  localizeFormula,
} from "../../../helpers/locale";
import { cycleFixedReference } from "../../../helpers/reference_type";
import { dataValidationEvaluatorRegistry } from "../../../registries/data_validation_registry";
import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { HighlightStore } from "../../../stores/highlight_store";
import { NotificationStore } from "../../../stores/notification_store";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CellValueType,
  Command,
  Format,
  HeaderIndex,
  Highlight,
  Locale,
  Range,
  RangePart,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Zone,
  isMatrix,
} from "../../../types";
import { SelectionEvent } from "../../../types/event_stream";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";

const CELL_DELETED_MESSAGE = _t("The cell you are trying to edit has been deleted.");

export interface ComposerSelection {
  start: number;
  end: number;
}

export class ComposerStore extends SpreadsheetStore {
  private col: HeaderIndex = 0;
  private row: HeaderIndex = 0;
  editionMode: EditionMode = "inactive";
  private sheetId: UID = "";
  private _currentContent: string = "";
  currentTokens: EnrichedToken[] = [];
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private initialContent: string | undefined = "";
  private colorIndexByRange: { [xc: string]: number } = {};

  private notificationStore = this.get(NotificationStore);
  private highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(toRaw(this));
    this.onDispose(() => {
      this.highlightStore.unRegister(toRaw(this));
    });
  }

  private canStopEdition(): boolean {
    if (this.editionMode === "inactive") {
      return true;
    }
    return this.checkDataValidation();
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
    if (this.isSelectingForComposer) {
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

  stopEdition() {
    const canStopEdition = this.canStopEdition();
    if (canStopEdition) {
      this._stopEdition();
      this.colorIndexByRange = {};
      return;
    }
    const editedCell = this.currentEditedCell;
    const cellXc = toXC(editedCell.col, editedCell.row);

    const rule = this.getters.getValidationRuleForCell(editedCell);
    if (!rule) {
      return;
    }

    const evaluator = dataValidationEvaluatorRegistry.get(rule.criterion.type);
    const errorStr = evaluator.getErrorString(rule.criterion, this.getters, editedCell.sheetId);
    this.notificationStore.raiseError(
      _t(
        "The data you entered in %s violates the data validation rule set on the cell:\n%s",
        cellXc,
        errorStr
      )
    );
    this.cancelEdition();
    this.colorIndexByRange = {};
  }

  cancelEdition() {
    this.cancelEditionAndActivateSheet();
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
      case "SELECT_FIGURE":
        if (cmd.id) {
          this.cancelEditionAndActivateSheet();
          this.resetContent();
        }
        break;
      case "SET_FORMATTING":
        this.cancelEdition();
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
        if (this.isSelectingForComposer) {
          this.editionMode = "editing";
        }
        this.model.selection.resetAnchor(toRaw(this), {
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
          this.model.selection.resetAnchor(toRaw(this), { cell: { col, row }, zone });
        }
        break;
      case "DELETE_SHEET":
      case "UNDO":
      case "REDO":
        const sheetIdExists = !!this.getters.tryGetSheet(this.sheetId);
        if (!sheetIdExists && this.editionMode !== "inactive") {
          this.sheetId = this.getters.getActiveSheetId();
          this.cancelEditionAndActivateSheet();
          this.resetContent();
          this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
        }
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

  get currentEditedCell(): CellPosition {
    return {
      sheetId: this.sheetId,
      col: this.col,
      row: this.row,
    };
  }

  get isSelectingForComposer(): boolean {
    return this.editionMode === "selecting";
  }

  get showSelectionIndicator(): boolean {
    return this.isSelectingForComposer && this.canStartComposerRangeSelection();
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

  private onColumnsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.col) && this.editionMode !== "inactive") {
      this.cancelEdition();
      this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
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
    if (cmd.elements.includes(this.row) && this.editionMode !== "inactive") {
      this.cancelEdition();
      this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
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
      this.model.selection.resetAnchor(toRaw(this), {
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
      toRaw(this),
      { cell: { col: this.col, row: this.row }, zone },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          this._stopEdition();
        },
      }
    );
  }

  private _stopEdition() {
    if (this.editionMode !== "inactive") {
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
        this.model.dispatch("UPDATE_CELL", {
          sheetId: this.sheetId,
          col,
          row,
          content,
        });
      } else {
        this.model.dispatch("UPDATE_CELL", {
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
    return canonicalizeNumberContent(this._currentContent, this.getters.getLocale());
  }

  private cancelEditionAndActivateSheet() {
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
      case CellValueType.error:
        return value;
      case CellValueType.boolean:
        return formattedValue;
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

  private _cancelEdition() {
    if (this.editionMode === "inactive") {
      return;
    }
    this.editionMode = "inactive";
    this.model.selection.release(toRaw(this));
  }

  /**
   * Reset the current content to the active cell content
   */
  private resetContent() {
    this.setContent(this.initialContent || "");
  }

  private setContent(text: string, selection?: ComposerSelection, raise?: boolean) {
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
    const inputSheetId = this.currentEditedCell.sheetId;
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, inputSheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]>) {
    let _fixedParts = [...fixedParts];
    const newRange = range.clone({ parts: _fixedParts });
    return this.getters.getSelectionRangeString(newRange, this.currentEditedCell.sheetId);
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
    const editionSheetId = this.currentEditedCell.sheetId;
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
    const editionSheetId = this.currentEditedCell.sheetId;
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
    const editionSheetId = this.currentEditedCell.sheetId;
    const referenceRanges = this.currentTokens
      .filter((token) => token.type === "REFERENCE")
      .map((token) => this.getters.getRangeFromSheetXC(editionSheetId, token.value));
    return referenceRanges.filter((range) => !range.invalidSheetName && !range.invalidXc);
  }

  get autoCompleteDataValidationValues(): string[] {
    if (this.editionMode === "inactive") {
      return [];
    }

    const rule = this.getters.getValidationRuleForCell(this.currentEditedCell);
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
      values = this.getters
        .getRangeValues(range)
        .filter(isNotNull)
        .map((value) => value.toString())
        .filter((val) => val !== "");
    }
    const composerContent = this.currentContent;
    if (composerContent && composerContent !== this.initialContent) {
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

  private checkDataValidation(): boolean {
    const cellPosition = { sheetId: this.sheetId, col: this.col, row: this.row };
    try {
      const content = this.getCurrentCanonicalContent();
      const cellValue = content.startsWith("=")
        ? this.getters.evaluateFormula(this.sheetId, content)
        : parseLiteral(content, this.getters.getLocale());

      if (isMatrix(cellValue)) {
        return true;
      }

      const validationResult = this.getters.getValidationResultForCellValue(
        cellValue,
        cellPosition
      );
      if (!validationResult.isValid && validationResult.rule.isBlocking) {
        return false;
      }
      return true;
    } catch (e) {
      // in this case we are in an error because we tried to evaluate a spread formula
      // whether the rule is blocking or not, we accept to enter formulas which spread
      return true;
    }
  }
}
