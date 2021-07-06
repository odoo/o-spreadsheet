import { DATETIME_FORMAT } from "../../constants";
import { composerTokenize, EnrichedToken, rangeReference } from "../../formulas/index";
import { formatDateTime } from "../../functions/dates";
import {
  colors,
  getComposerSheetName,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../helpers/index";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  AddColumnsRowsCommand,
  Cell,
  CellType,
  Command,
  CommandResult,
  LAYERS,
  RemoveColumnsRowsCommand,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { SelectionMode } from "./selection";

export type EditionMode =
  | "editing"
  | "waitingForRangeSelection"
  | "rangeSelected" // should tell if you need to underline the current range selected.
  | "inactive"
  | "resettingPosition";

const CELL_DELETED_MESSAGE = _lt("The cell you are trying to edit has been deleted.");

export interface ComposerSelection {
  start: number;
  end: number;
}

export const SelectionIndicator = "␣";

export class EditionPlugin extends UIPlugin {
  static layers = [LAYERS.Highlights];
  static getters = [
    "getEditionMode",
    "isSelectingForComposer",
    "getCurrentContent",
    "getEditionSheet",
    "getComposerSelection",
    "getCurrentTokens",
    "getTokenAtCursor",
  ];
  static modes: Mode[] = ["normal", "readonly"];

  private col: number = 0;
  private row: number = 0;
  private mode: EditionMode = "inactive";
  private sheet: string = "";
  private currentContent: string = "";
  private currentTokens: EnrichedToken[] = [];
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private selectionInitialStart: number = 0;
  private multiSelectionInitialStart: number = 0;
  private initialContent: string | undefined = "";

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
          const content = cmd.text || (cell && this.getCellContent(cell)) || "";
          return this.validateSelection(content.length, cmd.selection.start, cmd.selection.end);
        } else {
          return CommandResult.Success;
        }
      default:
        return CommandResult.Success;
    }
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        if (!this.isSelectingForComposer()) {
          this.stopEdition();
        }
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.setActiveContent();
        break;
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
        this.highlightRanges();
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEdition();
          this.resetContent();
        } else {
          this.stopEdition();
        }
        break;
      case "SET_CURRENT_CONTENT":
        this.setContent(cmd.content, cmd.selection);
        if (this.mode !== "inactive") {
          this.highlightRanges();
        }
        break;
      case "REPLACE_COMPOSER_CURSOR_SELECTION":
        this.replaceSelection(cmd.text);
        break;
      case "ACTIVATE_SHEET":
        if (this.mode === "inactive") {
          this.setActiveContent();
        }
        break;
      case "SELECT_FIGURE":
        this.cancelEdition();
        this.resetContent();
        break;
      case "SELECT_CELL":
      case "SET_SELECTION":
      case "MOVE_POSITION":
        switch (this.mode) {
          case "editing":
            this.dispatch("STOP_EDITION");
            break;
          case "inactive":
            this.setActiveContent();
            break;
          case "waitingForRangeSelection":
            this.insertSelectedRange();
            break;
          case "rangeSelected":
            switch (cmd.type) {
              case "MOVE_POSITION":
                this.replaceAllSelectedRanges();
                break;
              case "SELECT_CELL":
                if (this.getters.getSelectionMode() === SelectionMode.expanding) {
                  this.insertSelectedRange();
                } else {
                  this.replaceAllSelectedRanges();
                }
                break;
              case "SET_SELECTION":
                if (!cmd.strict) {
                  this.replaceSelectedRange();
                } else if (this.getters.getSelectionMode() === SelectionMode.expanding) {
                  this.insertSelectedRange();
                } else {
                  this.replaceAllSelectedRanges();
                }
                break;
            }
            break;
        }
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
      case "DELETE_SHEET":
        if (cmd.sheetId === this.sheet && this.mode !== "inactive") {
          this.dispatch("STOP_EDITION", { cancel: true });
          this.ui.notifyUser(CELL_DELETED_MESSAGE);
        }
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
      const activeSheetId = this.getters.getActiveSheetId();
      return cell ? this.getters.getCellText(cell, activeSheetId, true) : "";
    }
    return this.currentContent;
  }

  getEditionSheet(): string {
    return this.sheet;
  }

  getComposerSelection(): ComposerSelection {
    return {
      start: this.selectionStart,
      end: this.selectionEnd,
    };
  }

  isSelectingForComposer(): boolean {
    return (
      this.mode === "waitingForRangeSelection" ||
      this.mode === "rangeSelected" ||
      this.mode === "resettingPosition"
    );
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
      this.ui.notifyUser(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "left",
      cmd.elements
    );
    this.col = left;
    this.row = top;
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.row) && this.mode !== "inactive") {
      this.dispatch("STOP_EDITION", { cancel: true });
      this.ui.notifyUser(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "top",
      cmd.elements
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
    this.mode = "resettingPosition";
    this.dispatch("SELECT_CELL", {
      col: this.col,
      row: this.row,
    });
    this.mode = "waitingForRangeSelection";
    // We set this variable to store the start of the multiple range
    // selection. This is useful for example when we select multiple
    // cells with ctrl, release the ctrl and select a new cell.
    // This should result in deletions of previously selected cells.
    this.multiSelectionInitialStart = this.selectionStart;
  }

  private getCellContent(cell: Cell) {
    switch (cell.type) {
      case CellType.formula:
        return this.getters.getFormulaCellContent(this.getters.getActiveSheetId(), cell);
      case CellType.empty:
        return "";
      case CellType.number:
        return cell.format?.match(DATETIME_FORMAT)
          ? formatDateTime({ value: (cell.value || 0) as number, format: cell.format! })
          : cell.content;
      case CellType.text:
      case CellType.invalidFormula:
        return cell.content;
    }
  }

  /**
   * start the edition of a cell
   * @param str the key that is used to start the edition if it is a "content" key like a letter or number
   * @param selection
   * @private
   */
  private startEdition(str?: string, selection?: ComposerSelection) {
    const cell = this.getters.getActiveCell();
    this.initialContent = (cell && this.getCellContent(cell)) || "";
    this.mode = "editing";
    const [col, row] = this.getters.getPosition();
    this.col = col;
    this.row = row;
    this.sheet = this.getters.getActiveSheetId();
    this.setContent(str || this.initialContent, selection);
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEdition();
      const sheetId = this.getters.getActiveSheetId();
      const [col, row] = this.getters.getMainCell(sheetId, this.col, this.row);
      let content = this.currentContent;
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
            content += new Array(missing).fill(")").join("");
          }
        }
        this.dispatch("UPDATE_CELL", {
          sheetId: this.sheet,
          col,
          row,
          content,
        });
      } else {
        this.dispatch("UPDATE_CELL", {
          sheetId: this.sheet,
          content: "",
          col,
          row,
        });
      }
      if (sheetId !== this.sheet) {
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: this.getters.getActiveSheetId(),
          sheetIdTo: this.sheet,
        });
      }
      this.setContent("");
    }
  }

  private cancelEdition() {
    this.mode = "inactive";
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }

  /**
   * Reset the current content to the active cell content
   */
  private resetContent() {
    this.setContent(this.initialContent || "");
  }

  private setContent(text: string, selection?: ComposerSelection) {
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
    }
    if (this.canStartComposerRangeSelection()) {
      this.startComposerRangeSelection();
    }
  }

  /**
   * Insert reference of the currently selected zone in the composer content.
   * Separates references with commas when more than one is selected.
   */
  private insertSelectedRange() {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    if (this.mode === "waitingForRangeSelection") {
      this.insertText(this.getZoneReference(), start);
      this.selectionInitialStart = start;
      this.mode = "rangeSelected";
      return;
    }
    // range already present (mean this.mode === "rangeSelected")
    this.insertText("," + this.getZoneReference(), start);
    this.selectionInitialStart = start + 1;
  }

  /**
   * Replace the last reference by the new one.
   * This function is particularly useful when multiple cells selection is
   * enabled and we need to change the last reference (eg: change the cell
   * reference to a range reference)
   */
  private replaceSelectedRange() {
    const { end } = this.getters.getComposerSelection();
    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: this.selectionInitialStart,
      end,
    });
    this.replaceSelection(this.getZoneReference());
  }

  /**
   * Replace all references selected by the new one.
   * */
  private replaceAllSelectedRanges() {
    const { end } = this.getters.getComposerSelection();
    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: this.multiSelectionInitialStart,
      end,
    });
    this.replaceSelection(this.getZoneReference());
    this.selectionInitialStart = this.multiSelectionInitialStart;
  }

  private getZoneReference(): string {
    const zone = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    let selectedXc = this.getters.zoneToXC(sheetId, zone);
    if (this.getters.getEditionSheet() !== this.getters.getActiveSheetId()) {
      const sheetName = getComposerSheetName(
        this.getters.getSheetName(this.getters.getActiveSheetId())!
      );
      selectedXc = `${sheetName}!${selectedXc}`;
    }
    return selectedXc;
  }

  /**
   * Replace the current selection by a new text.
   * The cursor is then set at the end of the text.
   */
  private replaceSelection(text) {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
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

  /**
   * Highlight all ranges that can be found in the composer content.
   */
  private highlightRanges() {
    if (!this.currentContent.startsWith("=")) {
      return;
    }
    this.dispatch("REMOVE_ALL_HIGHLIGHTS"); //cleanup highlights for references
    const ranges = {};
    let lastUsedColorIndex = 0;
    for (let token of this.currentTokens.filter((token) => token.type === "SYMBOL")) {
      let value = token.value;
      const [xc, sheet] = value.split("!").reverse();
      if (rangeReference.test(xc)) {
        const refSanitized =
          (sheet ? `${sheet}!` : `${this.getters.getSheetName(this.getters.getEditionSheet())}!`) +
          xc.replace(/\$/g, "");
        if (!ranges[refSanitized]) {
          ranges[refSanitized] = { color: colors[lastUsedColorIndex], quantity: 1 };
          lastUsedColorIndex = ++lastUsedColorIndex % colors.length;
        } else {
          ranges[refSanitized].quantity++;
        }
      }
    }
    if (Object.keys(ranges).length) {
      this.dispatch("ADD_HIGHLIGHTS", { ranges });
    }
  }

  private setActiveContent() {
    const sheetId = this.getters.getActiveSheetId();
    const [mainCellCol, mainCellRow] = this.getters.getMainCell(
      sheetId,
      ...this.getters.getPosition()
    );
    const anchor = this.getters.getCell(this.getters.getActiveSheetId(), mainCellCol, mainCellRow);
    if (anchor) {
      const { col, row } = this.getters.getCellPosition(anchor.id);
      this.col = col;
      this.row = row;
    }
    const content = anchor ? this.getters.getCellText(anchor, sheetId, true) : "";
    this.dispatch("SET_CURRENT_CONTENT", {
      content,
    });
  }

  /**
   * Function used to determine when composer selection can start.
   * Three conditions are necessary:
   * - the previous token is among ["COMMA", "LEFT_PAREN", "OPERATOR"]
   * - the next token is missing or is among ["COMMA", "RIGHT_PAREN", "OPERATOR"]
   * - Previous and next tokens can be separated by spaces
   */
  private canStartComposerRangeSelection(): boolean {
    if (this.mode !== "editing" && this.selectionStart === this.selectionEnd) {
      return false;
    }
    if (this.currentContent.startsWith("=")) {
      const tokenAtCursor = this.getTokenAtCursor();
      if (tokenAtCursor) {
        const tokenIdex = this.currentTokens
          .map((token) => token.start)
          .indexOf(tokenAtCursor.start);

        let count = tokenIdex;
        let currentToken = tokenAtCursor;
        // check previous token
        while (!["COMMA", "LEFT_PAREN", "OPERATOR"].includes(currentToken.type)) {
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
        count++;
        currentToken = this.currentTokens[count];
      }
      return true;
    }
    return false;
  }
}
