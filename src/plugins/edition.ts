import { tokenize } from "../formulas/index";
import { toXC, toZone, toCartesian } from "../helpers/index";
import { GridCommand, Zone, Highlight, EditionMode } from "../types/index";
import { BasePlugin, LAYERS, GridRenderingContext } from "../base_plugin";
import { Mode } from "../model";

export class EditionPlugin extends BasePlugin {
  static layers = [LAYERS.Highlights];
  static getters = ["getEditionMode", "getCurrentContent"];
  static modes: Mode[] = ["normal", "readonly"];

  private col: number = 0;
  private row: number = 0;
  private mode: EditionMode = "inactive";
  private currentContent: string = "";
  private highlights: Highlight[] = [];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "ADD_HIGHLIGHTS":
        this.addHighlights(cmd.ranges);
        break;
      case "REMOVE_HIGHLIGHTS":
        this.highlights = [];
        break;
      case "START_COMPOSER_SELECTION":
        this.mode = "selecting";
        this.dispatch("SET_SELECTION", {
          zones: this.getters.getSelectedZones(),
          anchor: this.getters.getPosition()
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

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  private addHighlights(ranges: { [range: string]: string }) {
    let highlights = Object.keys(ranges)
      .map(r1c1 => {
        const zone: Zone = this.getters.expandZone(toZone(r1c1));
        return { zone, color: ranges[r1c1] };
      })
      .filter(
        x =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.workbook.rows.length &&
          x.zone.right < this.workbook.cols.length
      );

    this.highlights = this.highlights.concat(highlights);
  }

  private startEdition(str?: string) {
    if (!str) {
      const cell = this.getters.getActiveCell();
      str = cell ? cell.content || "" : "";
    }
    this.mode = "editing";
    this.currentContent = str || "";
    this.highlights = [];
    const [col, row] = this.getters.getPosition();
    this.col = col;
    this.row = row;
  }

  private stopEdition() {
    if (this.mode !== "inactive") {
      this.cancelEdition();
      let xc = toXC(this.col, this.row);
      if (xc in this.workbook.mergeCellMap) {
        const mergeId = this.workbook.mergeCellMap[xc];
        xc = this.workbook.merges[mergeId].topLeft;
      }
      let content = this.currentContent;
      this.currentContent = "";
      const cell = this.workbook.cells[xc];
      const didChange = cell ? cell.content !== content : content !== "";
      if (!didChange) {
        return;
      }
      const [col, row] = toCartesian(xc);
      if (content) {
        if (content.startsWith("=")) {
          const tokens = tokenize(content);
          const left = tokens.filter(t => t.type === "LEFT_PAREN").length;
          const right = tokens.filter(t => t.type === "RIGHT_PAREN").length;
          const missing = left - right;
          if (missing > 0) {
            content += new Array(missing).fill(")").join("");
          }
        }
        this.dispatch("UPDATE_CELL", {
          sheet: this.workbook.activeSheet.name,
          col,
          row,
          content
        });
      } else {
        this.dispatch("UPDATE_CELL", {
          sheet: this.workbook.activeSheet.name,
          content: "",
          col,
          row
        });
      }
    }
  }

  private cancelEdition() {
    this.mode = "inactive";
    this.highlights = [];
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    // rendering selection highlights
    const { ctx, viewport, thinLineWidth } = renderingContext;
    ctx.lineWidth = 3 * thinLineWidth;
    for (let h of this.highlights) {
      const [x, y, width, height] = this.getters.getRect(h.zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeStyle = h.color!;
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
