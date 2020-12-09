import { tokenize, composerTokenize, rangeReference, EnrichedToken } from "../../formulas/index";
import { toXC, toCartesian, colors, getComposerSheetName } from "../../helpers/index";
import { Command, LAYERS, CancelledReason, CommandResult, CellType, Cell } from "../../types/index";
import { Mode } from "../../model";
import { UIPlugin } from "../ui_plugin";

export type EditionMode = "editing" | "selecting" | "inactive" | "resettingPosition";

export interface ComposerSelection {
  start: number;
  end: number;
}

export class EditionPlugin extends UIPlugin {
  static layers = [LAYERS.Highlights];
  static getters = [
    "getEditionMode",
    "isSelectingForComposer",
    "getCurrentContent",
    "getEditionSheet",
    "getComposerSelection",
    "getTokenAtCursor",
  ];
  static modes: Mode[] = ["normal", "readonly"];

  private col: number = 0;
  private row: number = 0;
  private mode: EditionMode = "inactive";
  private sheet: string = "";
  private currentContent: string = "";
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private selectionInitialStart: number = 0;
  private initialContent: string | undefined = "";

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "CHANGE_COMPOSER_SELECTION":
        const length = this.currentContent.length;
        const { start, end } = cmd;
        return start >= 0 && start <= length && end >= 0 && end <= length && start <= end
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongComposerSelection };
      case "SET_CURRENT_CONTENT":
      case "START_EDITION":
        return cmd.selection && cmd.selection.start > cmd.selection.end
          ? { status: "CANCELLED", reason: CancelledReason.WrongComposerSelection }
          : { status: "SUCCESS" };
      default:
        return { status: "SUCCESS" };
    }
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        if (this.mode !== "selecting") {
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
      case "CHANGE_COMPOSER_SELECTION":
        this.selectionStart = cmd.start;
        this.selectionEnd = cmd.end;
        break;
      case "STOP_COMPOSER_SELECTION":
        if (this.mode === "selecting") {
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
      case "REPLACE_COMPOSER_SELECTION":
        this.replaceSelection(cmd.text);
        break;
      case "UPDATE_CELL":
        // TODO check
        const [col, row] = this.getters.getPosition();
        if (col === this.col && row === this.row) {
          this.setActiveContent();
        }
        break;
      case "ACTIVATE_SHEET":
        if (this.mode === "inactive") {
          this.setActiveContent();
        }
        break;
      case "SELECT_CELL":
      case "SET_SELECTION":
      case "MOVE_POSITION":
        if (this.mode === "editing") {
          this.dispatch("STOP_EDITION");
        } else if (this.mode === "selecting") {
          this.insertSelectedRange();
        }
        if (this.mode === "inactive") {
          this.setActiveContent();
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
    return this.mode === "selecting" || this.mode === "resettingPosition";
  }

  /**
   * Return the (enriched) token just before the cursor.
   */
  getTokenAtCursor(): EnrichedToken | undefined {
    const start = this.selectionStart;
    const end = this.selectionEnd;
    if (start === end && end === 0) {
      return undefined;
    } else {
      const tokens = composerTokenize(this.currentContent);
      return tokens.find((t) => t.start <= start && t.end >= end);
    }
  }

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  /**
   * Enable the selecting mode
   */
  private startComposerSelection() {
    this.mode = "resettingPosition";
    const [col, row] = this.getters.getPosition();
    this.dispatch("SELECT_CELL", {
      col,
      row,
    });
    this.mode = "selecting";
    // We set this variable to store the start of the selection, to allow
    // to replace selections (ex: select twice a cell should only be added
    // once)
    this.selectionInitialStart = this.selectionStart;
  }

  private getCellContent(cell: Cell) {
    switch (cell.type) {
      case CellType.formula:
        return this.getters.getFormulaCellContent(this.getters.getActiveSheetId(), cell);
      case CellType.empty:
        return "";
      case CellType.date:
      case CellType.number:
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
    this.setContent(str || this.initialContent, selection);
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
    const [col, row] = this.getters.getPosition();
    this.col = col;
    this.row = row;
    this.sheet = this.getters.getActiveSheetId();
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEdition();
      const sheetId = this.getters.getActiveSheetId();
      const xc = this.getters.getMainCell(sheetId, toXC(this.col, this.row));
      const [col, row] = toCartesian(xc);
      let content = this.currentContent;
      this.setContent("");
      const didChange = this.initialContent !== content;
      if (!didChange) {
        return;
      }
      if (content) {
        if (content.startsWith("=")) {
          const tokens = tokenize(content);
          const left = tokens.filter((t) => t.type === "LEFT_PAREN").length;
          const right = tokens.filter((t) => t.type === "RIGHT_PAREN").length;
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
    this.currentContent = text;
    if (selection) {
      this.selectionStart = selection.start;
      this.selectionEnd = selection.end;
    } else {
      this.selectionStart = this.selectionEnd = text.length;
    }
    if (this.canStartComposerSelection()) {
      this.startComposerSelection();
    }
  }

  /**
   * Insert the currently selected zone XC in the composer content.
   * The XC replaces the following section:
   *  - start:  where the cursor was when the edition mode was
   *            changed to `selecting`.
   *  - end:    the current end of the selection.
   */
  private insertSelectedRange() {
    const [zone] = this.getters.getSelectedZones();
    const sheetId = this.getters.getActiveSheetId();
    let selectedXc = this.getters.zoneToXC(sheetId, zone);
    const { end } = this.getters.getComposerSelection();
    this.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: this.selectionInitialStart,
      end,
    });
    if (this.getters.getEditionSheet() !== this.getters.getActiveSheetId()) {
      const sheetName = getComposerSheetName(
        this.getters.getSheetName(this.getters.getActiveSheetId())!
      );
      selectedXc = `${sheetName}!${selectedXc}`;
    }
    this.replaceSelection(selectedXc);
  }

  /**
   * Replace the current selection by a new text.
   * The cursor is then set at the end of the text.
   */
  private replaceSelection(text) {
    const start = this.selectionStart;
    const end = this.selectionEnd;
    this.currentContent =
      this.currentContent.slice(0, start) +
      this.currentContent.slice(end, this.currentContent.length);
    this.insertText(text, this.selectionStart);
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
    const tokens = composerTokenize(this.currentContent);
    const ranges = {};
    let lastUsedColorIndex = 0;
    for (let token of tokens.filter((token) => token.type === "SYMBOL")) {
      let value = token.value;
      const [xc, sheet] = value.split("!").reverse();
      if (rangeReference.test(xc)) {
        const refSanitized =
          (sheet ? `${sheet}!` : `${this.getters.getSheetName(this.getters.getEditionSheet())}!`) +
          xc.replace(/\$/g, "");
        if (!ranges[refSanitized]) {
          ranges[refSanitized] = colors[lastUsedColorIndex];
          lastUsedColorIndex = ++lastUsedColorIndex % colors.length;
        }
      }
    }
    if (Object.keys(ranges).length) {
      this.dispatch("ADD_HIGHLIGHTS", { ranges });
    }
  }

  private setActiveContent() {
    const sheetId = this.getters.getActiveSheetId();
    const mainCell = this.getters.getMainCell(sheetId, toXC(...this.getters.getPosition()));
    const anchor = this.getters.getCell(this.getters.getActiveSheetId(), ...toCartesian(mainCell));
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

  private canStartComposerSelection(): boolean {
    if (this.isSelectingForComposer()) return false;
    // todo: check the precise context of the surrounding tokens in which the selection can start
    const tokenAtCursor = this.getTokenAtCursor();
    if (
      tokenAtCursor &&
      ["COMMA", "LEFT_PAREN", "OPERATOR", "SPACE"].includes(tokenAtCursor.type)
    ) {
      return true;
    }
    return false;
  }
}
