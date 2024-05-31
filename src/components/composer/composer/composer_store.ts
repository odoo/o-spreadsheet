import { EnrichedToken } from "../../../formulas/composer_tokenizer";
import { parseLiteral } from "../../../helpers/cells";
import {
  concat,
  formatValue,
  isDateTimeFormat,
  isNumber,
  markdownLink,
  numberToString,
  parseDateTime,
  positionToZone,
  toXC,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../../helpers/index";
import {
  canonicalizeNumberContent,
  getDateTimeFormat,
  localizeFormula,
} from "../../../helpers/locale";
import { AutoCompleteProvider } from "../../../registries/auto_completes/auto_complete_registry";
import { dataValidationEvaluatorRegistry } from "../../../registries/data_validation_registry";
import { SpreadsheetStore } from "../../../stores";
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
  RemoveColumnsRowsCommand,
  UID,
  isMatrix,
} from "../../../types";
import { StandaloneComposerStore } from "./_standalone_composer_store";

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
  private col: HeaderIndex = 0;
  private row: HeaderIndex = 0;
  private sheetId: UID = "";

  private notificationStore = this.get(NotificationStore);

  private standaloneComposer = new StandaloneComposerStore(this.get);

  private canStopEdition(): boolean {
    if (this.editionMode === "inactive") {
      return true;
    }
    return this.checkDataValidation();
  }

  changeComposerCursorSelection(start: number, end: number) {
    this.standaloneComposer.changeComposerCursorSelection(start, end);
  }

  stopComposerRangeSelection() {
    this.standaloneComposer.stopComposerRangeSelection();
  }

  startEdition(text?: string, selection?: ComposerSelection) {
    const evaluatedCell = this.getters.getActiveCell();
    const locale = this.getters.getLocale();
    if (text && evaluatedCell.format?.includes("%") && isNumber(text, locale)) {
      selection = selection || { start: text.length, end: text.length };
      text = `${text}%`;
    }
    const { col, row, sheetId } = this.getters.getActivePosition();
    this.col = col;
    this.sheetId = sheetId;
    this.row = row;
    const initial = this.getComposerContent(this.getters.getActivePosition());
    this.standaloneComposer.startEdition(initial, text, selection);
    if (this.standaloneComposer.editionMode !== "inactive") {
      const { col, row } = this.getters.getActivePosition();
      this.model.dispatch("SELECT_FIGURE", { id: null });
      this.model.dispatch("SCROLL_TO_CELL", { col, row });
    }
  }

  stopEdition() {
    const canStopEdition = this.canStopEdition();
    if (canStopEdition) {
      this._stopEdition();
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
  }

  cancelEdition() {
    this.cancelEditionAndActivateSheet();
    this.standaloneComposer.resetContent();
  }

  setCurrentContent(content: string, selection?: ComposerSelection) {
    this.standaloneComposer.setCurrentContent(content, selection);
  }

  replaceComposerCursorSelection(text: string) {
    this.standaloneComposer.replaceComposerCursorSelection(text);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SELECT_FIGURE":
        if (cmd.id) {
          this.cancelEditionAndActivateSheet();
          this.standaloneComposer.resetContent();
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
      case "ACTIVATE_SHEET":
        if (!this.standaloneComposer.currentContent.startsWith("=")) {
          this.standaloneComposer.cancelEdition();
          this.standaloneComposer.resetContent();
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
      case "DELETE_SHEET":
      case "UNDO":
      case "REDO":
        const sheetIdExists = !!this.getters.tryGetSheet(this.sheetId);
        if (!sheetIdExists && this.editionMode !== "inactive") {
          this.sheetId = this.getters.getActiveSheetId();
          this.cancelEditionAndActivateSheet();
          this.standaloneComposer.resetContent();
          this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get currentTokens() {
    return this.standaloneComposer.currentTokens;
  }

  get editionMode(): EditionMode {
    return this.standaloneComposer.editionMode;
  }

  get currentContent(): string {
    if (this.editionMode === "inactive") {
      return this.getComposerContent(this.getters.getActivePosition());
    }
    return this.standaloneComposer.currentContent;
  }

  get composerSelection(): ComposerSelection {
    return this.standaloneComposer.composerSelection;
  }

  get currentEditedCell(): CellPosition {
    return {
      sheetId: this.sheetId,
      col: this.col,
      row: this.row,
    };
  }

  get isSelectingRange(): boolean {
    return this.standaloneComposer.isSelectingRange;
  }

  get showSelectionIndicator(): boolean {
    return this.standaloneComposer.showSelectionIndicator;
  }

  /**
   * Return the (enriched) token just before the cursor.
   */
  get tokenAtCursor(): EnrichedToken | undefined {
    return this.standaloneComposer.tokenAtCursor;
  }

  cycleReferences() {
    return this.standaloneComposer.cycleReferences();
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

  private _stopEdition() {
    if (this.editionMode !== "inactive") {
      const col = this.col;
      const row = this.row;
      let content = this.getCurrentCanonicalContent();
      const didChange = this.standaloneComposer.initialContent !== content;

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
        this.addHeadersForSpreadingFormula(content);
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
      this.model.dispatch("AUTOFILL_TABLE_COLUMN", { col, row, sheetId: this.sheetId });
      this.cancelEditionAndActivateSheet();
      this.standaloneComposer.stopEdition();
    }
  }

  private getCurrentCanonicalContent(): string {
    return canonicalizeNumberContent(
      this.standaloneComposer.currentContent,
      this.getters.getLocale()
    );
  }

  private cancelEditionAndActivateSheet() {
    if (this.editionMode === "inactive") {
      return;
    }
    this.standaloneComposer.cancelEdition();
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
      case CellValueType.empty:
        return "";
      case CellValueType.text:
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

  /** Add headers at the end of the sheet so the formula in the composer has enough space to spread */
  private addHeadersForSpreadingFormula(content: string) {
    if (!content.startsWith("=")) {
      return;
    }

    const evaluated = this.getters.evaluateFormula(this.sheetId, content);
    if (!isMatrix(evaluated)) {
      return;
    }

    const numberOfRows = this.getters.getNumberRows(this.sheetId);
    const numberOfCols = this.getters.getNumberCols(this.sheetId);

    const missingRows = this.row + evaluated[0].length - numberOfRows;
    const missingCols = this.col + evaluated.length - numberOfCols;

    if (missingCols > 0) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: this.sheetId,
        dimension: "COL",
        base: numberOfCols - 1,
        position: "after",
        quantity: missingCols + 20,
      });
    }
    if (missingRows > 0) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: this.sheetId,
        dimension: "ROW",
        base: numberOfRows - 1,
        position: "after",
        quantity: missingRows + 50,
      });
    }
  }

  /**
   * Highlight all ranges that can be found in the composer content.
   */
  get highlights(): Highlight[] {
    return this.standaloneComposer.highlights;
  }

  get autocompleteProvider(): AutoCompleteProvider | undefined {
    return this.standaloneComposer.autocompleteProvider;
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
