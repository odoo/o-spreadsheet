import { composerTokenize, EnrichedToken } from "../../formulas/index";
import { POSTFIX_UNARY_OPERATORS } from "../../formulas/tokenizer";
import {
  colors,
  concat,
  getComposerSheetName,
  getZoneArea,
  isEqual,
  isNumber,
  markdownLink,
  positionToZone,
  splitReference,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { loopThroughReferenceType } from "../../helpers/reference_type";
import { _lt } from "../../translation";
import { Highlight, Range, RangePart, UID, Zone } from "../../types";
import { SelectionEvent } from "../../types/event_stream";
import {
  AddColumnsRowsCommand,
  Command,
  CommandResult,
  HeaderIndex,
  RemoveColumnsRowsCommand,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export type EditionMode =
  | "editing"
  | "selecting" // should tell if you need to underline the current range selected.
  | "inactive";

const CELL_DELETED_MESSAGE = _lt("The cell you are trying to edit has been deleted.");

export interface ComposerSelection {
  start: number;
  end: number;
}

export const SelectionIndicator = "␣";

export class EditionPlugin extends UIPlugin {
  static getters = [
    "getEditionMode",
    "isSelectingForComposer",
    "showSelectionIndicator",
    "getCurrentContent",
    "getEditionSheet",
    "getComposerSelection",
    "getCurrentTokens",
    "getTokenAtCursor",
    "getComposerHighlights",
  ] as const;

  private col: HeaderIndex = 0;
  private row: HeaderIndex = 0;
  private mode: EditionMode = "inactive";
  private sheetId: UID = "";
  private currentContent: string = "";
  private currentTokens: EnrichedToken[] = [];
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private selectionInitialStart: number = 0;
  private initialContent: string | undefined = "";
  private previousRef: string = "";
  private previousRange: Range | undefined = undefined;
  private colorIndexByRange: { [xc: string]: number } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "CHANGE_COMPOSER_CURSOR_SELECTION":
        return this.validateSelection(this.currentContent.length, cmd.start, cmd.end);
      case "SET_CURRENT_CONTENT":
        if (cmd.selection) {
          return this.validateSelection(cmd.content.length, cmd.selection.start, cmd.selection.end);
        } else {
          return CommandResult.Success;
        }
      case "START_EDITION":
        if (cmd.selection) {
          const cell = this.getters.getActiveCell();
          const content = cmd.text || cell?.composerContent || "";
          return this.validateSelection(content.length, cmd.selection.start, cmd.selection.end);
        } else {
          return CommandResult.Success;
        }
      default:
        return CommandResult.Success;
    }
  }

  private handleEvent(event: SelectionEvent) {
    if (this.mode !== "selecting") {
      return;
    }
    switch (event.mode) {
      case "newAnchor":
        this.insertSelectedRange(event.anchor.zone);
        break;
      default:
        this.replaceSelectedRanges(event.anchor.zone);
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
        this.startEdition(cmd.text, cmd.selection);
        this.updateRangeColor();
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEditionAndActivateSheet();
          this.resetContent();
        } else {
          this.stopEdition();
        }
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
        this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
        const range = this.getters.getRangeFromRangeData(cmd.range);
        const previousRefToken = this.currentTokens
          .filter((token) => token.type === "REFERENCE")
          .find((token) => {
            const { xc, sheetName: sheet } = splitReference(token.value);
            const sheetName = sheet || this.getters.getSheetName(this.sheetId);
            const activeSheetId = this.getters.getActiveSheetId();
            if (this.getters.getSheetName(activeSheetId) !== sheetName) {
              return false;
            }
            const refRange = this.getters.getRangeFromSheetXC(activeSheetId, xc);
            return isEqual(this.getters.expandZone(activeSheetId, refRange.zone), range.zone);
          });
        this.previousRef = previousRefToken!.value;
        this.previousRange = this.getters.getRangeFromSheetXC(
          this.getters.getActiveSheetId(),
          this.previousRef
        );
        this.selectionInitialStart = previousRefToken!.start;
        break;
      case "CHANGE_HIGHLIGHT":
        const cmdRange = this.getters.getRangeFromRangeData(cmd.range);
        const newRef = this.getRangeReference(cmdRange, this.previousRange!.parts);
        this.selectionStart = this.selectionInitialStart;
        this.selectionEnd = this.selectionInitialStart + this.previousRef.length;
        this.replaceSelection(newRef);
        this.previousRef = newRef;
        this.selectionStart = this.currentContent.length;
        this.selectionEnd = this.currentContent.length;
        break;
      case "ACTIVATE_SHEET":
        if (!this.currentContent.startsWith("=")) {
          this.cancelEdition();
          this.resetContent();
        }
        if (cmd.sheetIdFrom !== cmd.sheetIdTo) {
          const { col, row } = this.getters.getNextVisibleCellPosition(cmd.sheetIdTo, 0, 0);
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
          this.ui.notifyUI({
            type: "ERROR",
            text: CELL_DELETED_MESSAGE,
          });
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
      const cell = this.getters.getActiveCell();
      return cell?.composerContent || "";
    }
    return this.currentContent;
  }

  getEditionSheet(): string {
    return this.sheetId;
  }

  getComposerSelection(): ComposerSelection {
    return {
      start: this.selectionStart,
      end: this.selectionEnd,
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

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  private cycleReferences() {
    const tokens = this.getTokensInSelection();
    const refTokens = tokens.filter((token) => token.type === "REFERENCE");
    if (refTokens.length === 0) return;

    const updatedReferences = tokens
      .map(loopThroughReferenceType)
      .map((token) => token.value)
      .join("");

    const content = this.currentContent;
    const start = tokens[0].start;
    const end = tokens[tokens.length - 1].end;
    const newContent = content.slice(0, start) + updatedReferences + content.slice(end);
    const lengthDiff = newContent.length - content.length;

    const startOfTokens = refTokens[0].start;
    const endOfTokens = refTokens[refTokens.length - 1].end + lengthDiff;
    const selection = { start: startOfTokens, end: endOfTokens };
    // Put the selection at the end of the token if we cycled on a single token
    if (refTokens.length === 1 && this.selectionStart === this.selectionEnd) {
      selection.start = selection.end;
    }

    this.dispatch("SET_CURRENT_CONTENT", {
      content: newContent,
      selection,
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
      this.dispatch("STOP_EDITION", { cancel: true });
      this.ui.notifyUI({
        type: "ERROR",
        text: CELL_DELETED_MESSAGE,
      });
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
      this.dispatch("STOP_EDITION", { cancel: true });
      this.ui.notifyUI({
        type: "ERROR",
        text: CELL_DELETED_MESSAGE,
      });
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
    this.selectionInitialStart = this.selectionStart;
  }

  /**
   * start the edition of a cell
   * @param str the key that is used to start the edition if it is a "content" key like a letter or number
   * @param selection
   * @private
   */
  private startEdition(str?: string, selection?: ComposerSelection) {
    const cell = this.getters.getActiveCell();
    if (str && cell?.format?.includes("%") && isNumber(str)) {
      selection = selection || { start: str.length, end: str.length };
      str = `${str}%`;
    }
    this.initialContent = cell?.composerContent || "";
    this.mode = "editing";
    const { col, row } = this.getters.getPosition();
    this.col = col;
    this.row = row;
    this.sheetId = this.getters.getActiveSheetId();
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
      const activeSheetId = this.getters.getActiveSheetId();
      this.cancelEditionAndActivateSheet();
      const { col, row } = this.getters.getMainCellPosition(this.sheetId, this.col, this.row);
      let content = this.currentContent;
      const didChange = this.initialContent !== content;
      if (!didChange) {
        return;
      }
      if (content) {
        const cell = this.getters.getCell(activeSheetId, col, row);
        if (content.startsWith("=")) {
          const left = this.currentTokens.filter((t) => t.type === "LEFT_PAREN").length;
          const right = this.currentTokens.filter((t) => t.type === "RIGHT_PAREN").length;
          const missing = left - right;
          if (missing > 0) {
            content += concat(new Array(missing).fill(")"));
          }
        } else if (cell?.isLink()) {
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
    text = text.replace(/[\r\n]/g, "");
    const isNewCurrentContent = this.currentContent !== text;
    this.currentContent = text;

    if (selection) {
      this.selectionStart = selection.start;
      this.selectionEnd = selection.end;
    } else {
      this.selectionStart = this.selectionEnd = text.length;
    }
    if (isNewCurrentContent || this.mode !== "inactive") {
      this.currentTokens = text.startsWith("=") ? composerTokenize(text) : [];
      if (this.currentTokens.length > 100) {
        if (raise) {
          this.ui.notifyUI({
            type: "ERROR",
            text: _lt(
              "This formula has over 100 parts. It can't be processed properly, consider splitting it into multiple cells"
            ),
          });
        }
      }
    }
    if (this.canStartComposerRangeSelection()) {
      this.startComposerRangeSelection();
    }
  }

  private insertSelectedRange(zone: Zone) {
    // infer if range selected or selecting range from cursor position
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const ref = this.getZoneReference(zone);
    if (this.canStartComposerRangeSelection()) {
      this.insertText(ref, start);
      this.selectionInitialStart = start;
    } else {
      this.insertText("," + ref, start);
      this.selectionInitialStart = start + 1;
    }
  }
  /**
   * Replace the current reference selected by the new one.
   * */
  private replaceSelectedRanges(zone: Zone) {
    const ref = this.getZoneReference(zone);
    this.replaceText(ref, this.selectionInitialStart, this.selectionEnd);
  }

  private getZoneReference(
    zone: Zone,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ): string {
    const sheetId = this.getters.getActiveSheetId();
    let selectedXc = this.getters.zoneToXC(sheetId, zone, fixedParts);
    if (this.getters.getEditionSheet() !== this.getters.getActiveSheetId()) {
      const sheetName = getComposerSheetName(
        this.getters.getSheetName(this.getters.getActiveSheetId())
      );
      selectedXc = `${sheetName}!${selectedXc}`;
    }
    return selectedXc;
  }

  private getRangeReference(
    range: Range,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ) {
    if (fixedParts.length === 1 && getZoneArea(range.zone) > 1) {
      fixedParts.push({ ...fixedParts[0] });
    } else if (fixedParts.length === 2 && getZoneArea(range.zone) === 1) {
      fixedParts.pop();
    }
    const newRange = range.clone({ parts: this.previousRange!.parts });
    return this.getters.getSelectionRangeString(newRange, this.getters.getEditionSheet());
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
    const editionSheetId = this.getters.getEditionSheet();
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
    const editionSheetId = this.getters.getEditionSheet();
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
    const editionSheetId = this.getters.getEditionSheet();
    const referenceRanges = this.currentTokens
      .filter((token) => token.type === "REFERENCE")
      .map((token) => this.getters.getRangeFromSheetXC(editionSheetId, token.value));
    return referenceRanges.filter((range) => !range.invalidSheetName && !range.invalidXc);
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["COMMA", "LEFT_PAREN", "OPERATOR"], and is not a postfix unary operator
   * - the next token is missing or is among ["COMMA", "RIGHT_PAREN", "OPERATOR"]
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
        !["COMMA", "LEFT_PAREN", "OPERATOR"].includes(currentToken.type) ||
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
      while (currentToken && !["COMMA", "RIGHT_PAREN", "OPERATOR"].includes(currentToken.type)) {
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

  /**
   * Return all the tokens between selectionStart and selectionEnd.
   * Includes token that begin right on selectionStart or end right on selectionEnd.
   */
  private getTokensInSelection(): EnrichedToken[] {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    return this.currentTokens.filter(
      (t) => (t.start <= start && t.end >= start) || (t.start >= start && t.start < end)
    );
  }
}
