import { composerTokenize, EnrichedToken } from "../../formulas/index";
import { POSTFIX_UNARY_OPERATORS } from "../../formulas/tokenizer";
import {
  colors,
  concat,
  isDateTimeFormat,
  isEqual,
  isNumber,
  markdownLink,
  numberToString,
  positionToZone,
  splitReference,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { canonicalizeContent, localizeFormula } from "../../helpers/locale";
import { loopThroughReferenceType } from "../../helpers/reference_type";
import { _t } from "../../translation";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CellValueType,
  Command,
  CommandResult,
  Format,
  Highlight,
  LocalCommand,
  Locale,
  Range,
  RangePart,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../../types";
import { SelectionEvent } from "../../types/event_stream";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";

const CELL_DELETED_MESSAGE = _t("The cell you are trying to edit has been deleted.");

export interface ComposerSelection {
  start: number;
  end: number;
}

interface EditingState {
  col: number;
  row: number;
  mode: "editing" | "selecting";
  sheetId: UID;
  currentContent: string;
  currentTokens: EnrichedToken[];
  selectionStart: number;
  selectionEnd: number;
  selectionInitialStart: number;
  initialContent: string | undefined;
  previousRef: string;
  previousRange: Range | undefined;
  colorIndexByRange: { [xc: string]: number };
}

interface EmptyState {
  col: undefined;
  row: undefined;
  sheetId: undefined;
  mode: "inactive";
  currentContent: "";
  currentTokens: EnrichedToken[];
  selectionStart: 0;
  selectionEnd: 0;
  selectionInitialStart: 0;
  initialContent: undefined;
  previousRef: undefined;
  previousRange: undefined;
  colorIndexByRange: {};
}

type State = EmptyState | EditingState;

export const SelectionIndicator = "␣";

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
  ] as const;

  private state!: State;

  constructor(config: UIPluginConfig) {
    super(config);
    this.setDefaultState();
  }

  setDefaultState() {
    this.state = {
      col: undefined,
      row: undefined,
      sheetId: undefined,
      mode: "inactive",
      currentContent: "",
      currentTokens: [],
      selectionStart: 0,
      selectionEnd: 0,
      selectionInitialStart: 0,
      initialContent: undefined,
      previousRef: undefined,
      previousRange: undefined,
      colorIndexByRange: {},
    };
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CHANGE_COMPOSER_CURSOR_SELECTION":
        if (this.state.mode === "inactive") {
          return CommandResult.WrongEditionMode;
        }
        return this.validateSelection(this.state.currentContent.length, cmd.start, cmd.end);
      case "SET_CURRENT_CONTENT":
        if (this.state.mode === "inactive") {
          return CommandResult.WrongEditionMode;
        }
        if (cmd.selection) {
          return this.validateSelection(cmd.content.length, cmd.selection.start, cmd.selection.end);
        } else {
          return CommandResult.Success;
        }
      case "REPLACE_COMPOSER_CURSOR_SELECTION":
      case "STOP_COMPOSER_RANGE_SELECTION":
      case "CYCLE_EDITION_REFERENCES":
        return this.state.mode === "inactive"
          ? CommandResult.WrongEditionMode
          : CommandResult.Success;
      case "START_EDITION":
        if (cmd.selection) {
          const content = cmd.text || this.getComposerContent(this.getters.getActivePosition());
          return this.validateSelection(content.length, cmd.selection.start, cmd.selection.end);
        } else {
          return CommandResult.Success;
        }
      default:
        return CommandResult.Success;
    }
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
        if (this.state.mode === "selecting") {
          this.insertSelectedRange(unboundedZone);
        }
        break;
      default:
        if (this.state.mode === "selecting") {
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
        this.state.selectionStart = cmd.start;
        this.state.selectionEnd = cmd.end;
        break;
      case "STOP_COMPOSER_RANGE_SELECTION":
        if (this.isSelectingForComposer()) {
          this.state.mode = "editing";
        }
        break;
      case "START_EDITION":
        if (this.state.mode !== "inactive" && cmd.text) {
          this.setContent(cmd.text, cmd.selection);
        } else {
          this.startEdition(cmd.text, cmd.selection);
        }
        this.updateRangeColor();
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEditionAndActivateSheet();
        } else {
          this.stopEdition();
        }
        this.state.colorIndexByRange = {};
        break;
      case "SET_CURRENT_CONTENT":
        this.setContent(cmd.content, cmd.selection, true);
        break;
      case "REPLACE_COMPOSER_CURSOR_SELECTION":
        this.replaceSelection(cmd.text);
        break;
      case "SELECT_FIGURE":
        this.cancelEditionAndActivateSheet();
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
          this.state.mode = "editing";
        }
        this.selection.resetAnchor(this, { cell: { col: left, row: top }, zone: cmd.zone });
        break;
      case "ACTIVATE_SHEET":
        /** TODO: the condition should be more precise:
         * we either are "selecting" or "editing" a formula while the cursor is targeting a reference.
         * The 'selecting' mode might need to take this into account
         */
        if (!this.state.currentContent.startsWith("=")) {
          this.cancelEdition();
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
        if (this.state.mode !== "inactive") {
          const sheetIdExists = !!this.getters.tryGetSheet(this.state.sheetId);
          if (!sheetIdExists) {
            this.cancelEdition();
            this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
          }
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
    return this.state.mode;
  }

  getCurrentContent(): string {
    if (this.state.mode === "inactive") {
      return this.getComposerContent(this.getters.getActivePosition());
    }
    return this.state.currentContent;
  }

  getComposerSelection(): ComposerSelection {
    return {
      start: this.state.selectionStart,
      end: this.state.selectionEnd,
    };
  }

  getCurrentEditedCell(): CellPosition | undefined {
    return this.state.mode !== "inactive"
      ? {
          sheetId: this.state.sheetId,
          col: this.state.col,
          row: this.state.row,
        }
      : undefined;
  }

  isSelectingForComposer(): boolean {
    return this.state.mode === "selecting";
  }

  showSelectionIndicator(): boolean {
    return this.isSelectingForComposer() && this.canStartComposerRangeSelection();
  }

  getCurrentTokens(): EnrichedToken[] {
    return this.state.currentTokens;
  }

  /**
   * Return the (enriched) token just before the cursor.
   */
  getTokenAtCursor(): EnrichedToken | undefined {
    const start = Math.min(this.state.selectionStart, this.state.selectionEnd);
    const end = Math.max(this.state.selectionStart, this.state.selectionEnd);
    if (start === end && end === 0) {
      return undefined;
    } else {
      return this.state.currentTokens.find((t) => t.start <= start && t.end >= end);
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

  /**
   * Highlight all ranges that can be found in the composer content.
   */
  getComposerHighlights(): Highlight[] {
    if (!this.state.currentContent.startsWith("=") || this.state.mode === "inactive") {
      return [];
    }
    const editionSheetId = this.state.sheetId;
    const rangeColor = (rangeString: string) => {
      const colorIndex = this.state.colorIndexByRange[rangeString];
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

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  private cycleReferences() {
    const updated = this.getCycledReference(this.getComposerSelection(), this.state.currentContent);
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
    if (this.state.mode !== "inactive" && cmd.elements.includes(this.state.col)) {
      this.dispatch("STOP_EDITION", { cancel: true });
      this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
      return;
    } else if (this.state.mode !== "inactive") {
      const { top, left } = updateSelectionOnDeletion(
        {
          left: this.state.col,
          right: this.state.col,
          top: this.state.row,
          bottom: this.state.row,
        },
        "left",
        [...cmd.elements]
      );
      this.state.col = left;
      this.state.row = top;
    }
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (this.state.mode !== "inactive" && cmd.elements.includes(this.state.row)) {
      this.dispatch("STOP_EDITION", { cancel: true });
      this.ui.raiseBlockingErrorUI(CELL_DELETED_MESSAGE);
      return;
    } else if (this.state.mode !== "inactive") {
      const { top, left } = updateSelectionOnDeletion(
        {
          left: this.state.col,
          right: this.state.col,
          top: this.state.row,
          bottom: this.state.row,
        },
        "top",
        [...cmd.elements]
      );
      this.state.col = left;
      this.state.row = top;
    }
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    if (this.state.mode !== "inactive") {
      const { top, left } = updateSelectionOnInsertion(
        {
          left: this.state.col,
          right: this.state.col,
          top: this.state.row,
          bottom: this.state.row,
        },
        cmd.dimension === "COL" ? "left" : "top",
        cmd.base,
        cmd.position,
        cmd.quantity
      );
      this.state.col = left;
      this.state.row = top;
    }
  }

  /**
   * Enable the selecting mode
   */
  private startComposerRangeSelection() {
    if (this.state.sheetId === this.getters.getActiveSheetId()) {
      const zone = positionToZone({ col: this.state.col, row: this.state.row });
      this.selection.resetAnchor(this, {
        cell: { col: this.state.col, row: this.state.row },
        zone,
      });
    }
    this.state.mode = "selecting";
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

    this.state.sheetId = sheetId;
    this.state.col = col;
    this.state.row = row;
    this.state.initialContent = this.getComposerContent({ sheetId, col, row });
    this.state.mode = "editing";
    this.state.colorIndexByRange = {};

    const zone = positionToZone({ col, row });
    this.selection.capture(
      this,
      { cell: { col, row }, zone },
      {
        handleEvent: this.handleEvent.bind(this),
        release: () => {
          this.stopEdition();
        },
      }
    );
    this.setContent(str || this.state.initialContent, selection);
  }

  private stopEdition() {
    if (this.state.mode !== "inactive") {
      const col = this.state.col;
      const row = this.state.row;
      const sheetId = this.state.sheetId;
      let content = this.state.currentContent;
      const didChange = this.state.initialContent !== content;
      if (!didChange) {
        this.cancelEditionAndActivateSheet();
        return;
      }
      if (content) {
        // this is weird. we have the sheet ID that we are writing on , so why fetch the active sheetId ??
        const sheetId = this.getters.getActiveSheetId();
        const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
        content = canonicalizeContent(content, this.getters.getLocale());
        if (content.startsWith("=")) {
          const left = this.state.currentTokens.filter((t) => t.type === "LEFT_PAREN").length;
          const right = this.state.currentTokens.filter((t) => t.type === "RIGHT_PAREN").length;
          const missing = left - right;
          if (missing > 0) {
            content += concat(new Array(missing).fill(")"));
          }
        } else if (cell.link) {
          content = markdownLink(content, cell.link.url);
        }
      }
      this.dispatch("UPDATE_CELL", { sheetId, col, row, content });
      this.cancelEditionAndActivateSheet();
    }
  }

  private cancelEditionAndActivateSheet() {
    if (this.state.mode === "inactive") {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    if (sheetId !== this.state.sheetId) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: this.state.sheetId,
      });
    }
    this.cancelEdition();
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
          return formattedValue;
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
    if (this.state.mode === "inactive") {
      return;
    }
    this.setDefaultState();
    this.selection.release(this);
  }

  private setContent(text: string, selection?: ComposerSelection, raise?: boolean) {
    const isNewCurrentContent = this.state.currentContent !== text;
    this.state.currentContent = text;

    if (selection) {
      this.state.selectionStart = selection.start;
      this.state.selectionEnd = selection.end;
    } else {
      this.state.selectionStart = this.state.selectionEnd = text.length;
    }
    if (isNewCurrentContent || this.state.mode !== "inactive") {
      const locale = this.getters.getLocale();
      this.state.currentTokens = text.startsWith("=") ? composerTokenize(text, locale) : [];
      if (this.state.currentTokens.length > 100) {
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
    this.updateRangeColor();
  }

  private insertSelectedRange(zone: Zone | UnboundedZone) {
    // infer if range selected or selecting range from cursor position
    const start = Math.min(this.state.selectionStart, this.state.selectionEnd);
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
    const start =
      currentToken?.type === "REFERENCE" ? currentToken.start : this.state.selectionStart;
    this.replaceText(ref, start, this.state.selectionEnd);
  }

  /**
   * Replace the reference of the old zone by the new one.
   */
  private updateComposerRange(oldZone: Zone, newZone: Zone | UnboundedZone) {
    if (this.state.mode === "inactive") {
      return;
    }
    const editedSheetId = this.state.sheetId;
    const activeSheetId = this.getters.getActiveSheetId();

    const tokentAtCursor = this.getTokenAtCursor();
    const tokens = tokentAtCursor
      ? [tokentAtCursor, ...this.state.currentTokens]
      : this.state.currentTokens;
    const previousRefToken = tokens
      .filter((token) => token.type === "REFERENCE")
      .find((token) => {
        const { xc, sheetName: sheet } = splitReference(token.value);
        const sheetName = sheet || this.getters.getSheetName(editedSheetId);

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
    this.state.selectionStart = previousRefToken!.start;
    this.state.selectionEnd = this.state.selectionStart + previousRefToken!.value.length;

    const newRange = this.getters.getRangeFromZone(activeSheetId, newZone);
    const newRef = this.getRangeReference(newRange, previousRange.parts, editedSheetId);
    this.replaceSelection(newRef);
  }

  private getZoneReference(zone: Zone | UnboundedZone): string {
    const inputSheetId = this.state.sheetId;
    if (!inputSheetId) {
      throw new Error("Not in editing mode");
    }
    const sheetId = this.getters.getActiveSheetId();
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.getters.getSelectionRangeString(range, inputSheetId);
  }

  private getRangeReference(range: Range, fixedParts: Readonly<RangePart[]>, sheetId: UID) {
    let _fixedParts = [...fixedParts];
    const newRange = range.clone({ parts: _fixedParts });
    return this.getters.getSelectionRangeString(newRange, sheetId);
  }

  /**
   * Replace the current selection by a new text.
   * The cursor is then set at the end of the text.
   */
  private replaceSelection(text: string) {
    const start = Math.min(this.state.selectionStart, this.state.selectionEnd);
    const end = Math.max(this.state.selectionStart, this.state.selectionEnd);
    this.replaceText(text, start, end);
  }

  private replaceText(text: string, start: number, end: number) {
    this.state.currentContent =
      this.state.currentContent.slice(0, start) +
      this.state.currentContent.slice(end, this.state.currentContent.length);
    this.insertText(text, start);
  }

  /**
   * Inserts a text at the given position.
   * The cursor is then set at the end of the text.
   */
  private insertText(text: string, start: number) {
    const content =
      this.state.currentContent.slice(0, start) + text + this.state.currentContent.slice(start);
    const end = start + text.length;
    this.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection: { start: end, end },
    });
  }

  private updateRangeColor() {
    if (!this.state.currentContent.startsWith("=") || this.state.mode === "inactive") {
      return;
    }
    // implies editing a formula
    const editionSheetId = this.state.sheetId;
    const XCs = this.getReferencedRanges().map((range) =>
      this.getters.getRangeString(range, editionSheetId)
    );
    const colorsToKeep = {};
    /**
     * TODO: Unify - sheet1!A1 has a differnet xc and color than A1 which is then
     * correctded in highlight plugin drawgrid but not in the actual highlights
     */
    for (const xc of XCs) {
      if (this.state.colorIndexByRange[xc] !== undefined) {
        colorsToKeep[xc] = this.state.colorIndexByRange[xc];
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
    this.state.colorIndexByRange = colorsToKeep;
  }

  /**
   * Returns ranges currently referenced in the composer
   */
  private getReferencedRanges(): Range[] {
    if (!this.state.currentContent.startsWith("=") || this.state.mode === "inactive") {
      return [];
    }
    const editionSheetId = this.state.sheetId;
    return this.state.currentTokens
      .filter((token) => token.type === "REFERENCE")
      .map((token) => this.getters.getRangeFromSheetXC(editionSheetId, token.value));
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"], and is not a postfix unary operator
   * - the next token is missing or is among ["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"]
   * - Previous and next tokens can be separated by spaces
   */
  private canStartComposerRangeSelection(): boolean {
    if (this.state.currentContent.startsWith("=")) {
      const tokenAtCursor = this.getTokenAtCursor();
      if (!tokenAtCursor) {
        return false;
      }

      const tokenIndex = this.state.currentTokens
        .map((token) => token.start)
        .indexOf(tokenAtCursor.start);

      let index = tokenIndex;
      let currentToken = tokenAtCursor;
      // check previous token
      while (
        !["ARG_SEPARATOR", "LEFT_PAREN", "OPERATOR"].includes(currentToken.type) ||
        POSTFIX_UNARY_OPERATORS.includes(currentToken.value)
      ) {
        if (currentToken.type !== "SPACE" || index < 1) {
          return false;
        }
        index--;
        currentToken = this.state.currentTokens[index];
      }

      index = tokenIndex + 1;
      currentToken = this.state.currentTokens[index];
      // check next token
      while (
        currentToken &&
        !["ARG_SEPARATOR", "RIGHT_PAREN", "OPERATOR"].includes(currentToken.type)
      ) {
        if (currentToken.type !== "SPACE") {
          return false;
        }
        index++;
        currentToken = this.state.currentTokens[index];
      }
      return true;
    }
    return false;
  }
}
