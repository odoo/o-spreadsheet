import { tokenize } from "../formulas/index";
import { toXC, toCartesian } from "../helpers/index";
import { Command, LAYERS } from "../types/index";
import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";

export type EditionMode = "editing" | "selecting" | "inactive";

export class EditionPlugin extends BasePlugin {
  static layers = [LAYERS.Highlights];
  static getters = ["getEditionMode", "getCurrentContent", "getEditionSheet"];
  static modes: Mode[] = ["normal", "readonly"];

  private col: number = 0;
  private row: number = 0;
  private mode: EditionMode = "inactive";
  private sheet: string = "";
  private currentContent: string = "";

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

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
      case "START_COMPOSER_SELECTION":
        this.mode = "selecting";
        this.dispatch("SET_SELECTION", {
          zones: this.getters.getSelectedZones(),
          anchor: this.getters.getPosition(),
        });
        break;
      case "STOP_COMPOSER_SELECTION":
        this.mode = "editing";
        break;
      case "START_EDITION":
        this.startEdition(cmd.text);
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEdition();
        } else {
          this.stopEdition();
        }
        break;
      case "SET_CURRENT_CONTENT":
        this.currentContent = cmd.content;
        break;
      case "SELECT_CELL":
      case "MOVE_POSITION":
        if (this.mode === "editing") {
          this.stopEdition();
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

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  private startEdition(str?: string) {
    if (!str) {
      const cell = this.getters.getActiveCell();
      str = cell ? cell.content || "" : "";
    }
    this.mode = "editing";
    this.currentContent = str || "";
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
    const [col, row] = this.getters.getPosition();
    this.col = col;
    this.row = row;
    this.sheet = this.getters.getActiveSheet();
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEdition();
      let xc = toXC(this.col, this.row);
      const { mergeCellMap, merges, cells } = this.workbook.activeSheet;
      if (xc in mergeCellMap) {
        const mergeId = mergeCellMap[xc];
        xc = merges[mergeId].topLeft;
      }
      let content = this.currentContent;
      this.currentContent = "";
      const cell = cells[xc];
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
      if (this.getters.getActiveSheet() !== this.sheet) {
        this.dispatch("ACTIVATE_SHEET", { from: this.getters.getActiveSheet(), to: this.sheet });
      }
    }
  }

  private cancelEdition() {
    this.mode = "inactive";
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }
}
