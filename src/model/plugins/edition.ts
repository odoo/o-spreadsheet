import { tokenize } from "../../formulas/index";
import { toXC, toZone, toCartesian } from "../../helpers";
import { GridCommand, Zone } from "../../types/index";
import { BasePlugin } from "../base_plugin";

export class EditionPlugin extends BasePlugin {
  col: number = 0;
  row: number = 0;

  handle(cmd: GridCommand): void | GridCommand[] {
    switch (cmd.type) {
      case "ADD_HIGHLIGHTS":
        this.addHighlights(cmd.ranges);
        break;
      case "REMOVE_HIGHLIGHTS":
        this.workbook.highlights = [];
        break;
      case "START_COMPOSER_SELECTION":
        this.workbook.isSelectingRange = true;
        return [
          {
            type: "SET_SELECTION",
            zones: this.workbook.selection.zones,
            anchor: [this.workbook.activeCol, this.workbook.activeRow]
          }
        ];
      case "STOP_COMPOSER_SELECTION":
        this.workbook.isSelectingRange = false;
        break;
      case "START_EDITION":
        this.startEdition(cmd.text);
        break;
      case "STOP_EDITION":
        if (cmd.cancel) {
          this.cancelEdition();
        } else {
          return this.stopEdition();
        }
        break;
      case "SET_CURRENT_CONTENT":
        this.workbook.currentContent = cmd.content;
        break;
      case "SELECT_CELL":
      case "MOVE_POSITION":
        if (!this.workbook.isSelectingRange && this.workbook.isEditing) {
          return this.stopEdition();
        }
    }
  }

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

    this.workbook.highlights = this.workbook.highlights.concat(highlights);
  }

  private startEdition(str?: string) {
    if (!str) {
      const cell = this.getters.getActiveCell();
      str = cell ? cell.content || "" : "";
    }
    this.workbook.isEditing = true;
    this.workbook.currentContent = str;
    this.workbook.highlights = [];
    this.col = this.workbook.activeCol;
    this.row = this.workbook.activeRow;
  }

  private stopEdition(): GridCommand[] | void {
    if (this.workbook.isEditing) {
      this.cancelEdition();
      let xc = toXC(this.col, this.row);
      if (xc in this.workbook.mergeCellMap) {
        const mergeId = this.workbook.mergeCellMap[xc];
        xc = this.workbook.merges[mergeId].topLeft;
      }
      let content = this.workbook.currentContent;
      this.workbook.currentContent = "";
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
        return [
          {
            type: "UPDATE_CELL",
            sheet: this.workbook.activeSheet.name,
            col,
            row,
            content
          }
        ];
      } else {
        return [
          {
            type: "DELETE",
            sheet: this.workbook.activeSheet.name,
            target: [{ left: col, right: col, top: row, bottom: row }]
          }
        ];
      }
    }
  }

  private cancelEdition() {
    this.workbook.isEditing = false;
    this.workbook.isSelectingRange = false;
    this.workbook.highlights = [];
  }
}
