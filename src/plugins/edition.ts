import { tokenize, composerTokenize, rangeReference, EnrichedToken } from "../formulas/index";
import { toXC, toCartesian, colors, getComposerSheetName } from "../helpers/index";
import { Command, LAYERS, CancelledReason, CommandResult } from "../types/index";
import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";

export type EditionMode = "editing" | "selecting" | "inactive" | "resettingPosition";

export interface ComposerSelection {
  start: number;
  end: number;
}

export class EditionPlugin extends BasePlugin {
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
      case "CHANGE_COMPOSER_SELECTION":
        this.selectionStart = cmd.start;
        this.selectionEnd = cmd.end;
        break;
      case "START_COMPOSER_SELECTION":
        this.mode = "resettingPosition";
        this.dispatch("SELECT_CELL", {
          col: this.col,
          row: this.row,
        });
        this.mode = "selecting";
        // We set this variable to store the start of the selection, to allow
        // to replace selections (ex: select twice a cell should only be added
        // once)
        this.selectionInitialStart = this.selectionStart;
        break;
      case "STOP_COMPOSER_SELECTION":
        if (this.mode === "selecting") {
          this.mode = "editing";
        }
        break;
      case "START_EDITION":
        this.startEdition(cmd.text);
        this.highlightRanges();
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEdition();
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
      case "SELECT_CELL":
      case "SET_SELECTION":
      case "MOVE_POSITION":
        if (this.mode === "editing") {
          this.stopEdition();
        } else if (this.mode === "selecting") {
          this.insertSelectedRange();
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

  private startEdition(str?: string) {
    if (!str) {
      const cell = this.getters.getActiveCell();
      str = cell ? cell.content || "" : "";
    }
    this.mode = "editing";
    this.setContent(str || "");
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
    const [col, row] = this.getters.getPosition();
    this.col = col;
    this.row = row;
    this.sheet = this.getters.getActiveSheetId();
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEdition();
      const xc = this.getters.getMainCell(toXC(this.col, this.row));
      const cells = this.getters.getCells();
      const cell = cells[xc];
      let content = this.currentContent;
      this.setContent("");
      const didChange = cell ? cell.content !== content : content !== "";
      if (!didChange) {
        return;
      }
      const [col, row] = toCartesian(xc);
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
          sheet: this.sheet,
          col,
          row,
          content,
        });
      } else {
        this.dispatch("UPDATE_CELL", {
          sheet: this.sheet,
          content: "",
          col,
          row,
        });
      }
      if (this.getters.getActiveSheetId() !== this.sheet) {
        this.dispatch("ACTIVATE_SHEET", { from: this.getters.getActiveSheetId(), to: this.sheet });
      }
    }
  }

  private cancelEdition() {
    this.mode = "inactive";
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }

  private setContent(text: string, selection?: ComposerSelection) {
    this.currentContent = text;
    if (selection) {
      this.selectionStart = selection.start;
      this.selectionEnd = selection.end;
    } else {
      this.selectionStart = this.selectionEnd = text.length;
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
    let selectedXc = this.getters.zoneToXC(zone);
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
  replaceSelection(text) {
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
}
