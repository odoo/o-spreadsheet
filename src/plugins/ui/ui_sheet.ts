import { PADDING_AUTORESIZE_HORIZONTAL } from "../../constants";
import { computeIconWidth, computeTextWidth, positionToZone } from "../../helpers/index";
import { Cell, CellValueType, Command, CommandResult, UID } from "../../types";
import { HeaderIndex, Pixel, Style } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = ["getCellWidth", "getTextWidth", "getCellText", "getCellMultiLineText"] as const;

  private ctx = document.createElement("canvas").getContext("2d")!;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "AUTORESIZE_ROWS":
      case "AUTORESIZE_COLUMNS":
        try {
          this.getters.getSheet(cmd.sheetId);
          break;
        } catch (error) {
          return CommandResult.InvalidSheetId;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [col],
              dimension: "COL",
              size,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          this.dispatch("RESIZE_COLUMNS_ROWS", {
            elements: [row],
            dimension: "ROW",
            size: null,
            sheetId: cmd.sheetId,
          });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellWidth(cell: Cell): number {
    let contentWidth = this.getTextWidth(cell);
    const cellPosition = this.getters.getCellPosition(cell.id);
    const icon = this.getters.getConditionalIcon(cellPosition.col, cellPosition.row);
    if (icon) {
      contentWidth += computeIconWidth(this.getters.getCellStyle(cell));
    }
    contentWidth += 2 * PADDING_AUTORESIZE_HORIZONTAL;

    if (this.getters.getCellStyle(cell).wrapping === "wrap") {
      const zone = positionToZone(this.getters.getCellPosition(cell.id));
      const colWidth = this.getters.getColSize(this.getters.getActiveSheetId(), zone.left);
      return Math.min(colWidth, contentWidth);
    }
    return contentWidth;
  }

  getTextWidth(cell: Cell): number {
    const text = this.getters.getCellText(cell, this.getters.shouldShowFormulas());
    const { sheetId, col, row } = this.getters.getCellPosition(cell.id);
    return computeTextWidth(this.ctx, text, this.getters.getCellComputedStyle(sheetId, col, row));
  }

  getCellText(cell: Cell, showFormula: boolean = false): string {
    if (showFormula && (cell.isFormula() || cell.evaluated.type === CellValueType.error)) {
      return cell.content;
    } else {
      return cell.formattedValue;
    }
  }

  getCellMultiLineText(cell: Cell, width: number): string[] {
    const style = this.getters.getCellStyle(cell);
    const text = this.getters.getCellText(cell);
    const words = text.split(" ");
    const brokenText: string[] = [];

    let textLine = "";
    let availableWidth = width;

    for (let word of words) {
      const splitWord = this.splitWordToSpecificWidth(this.ctx, word, width, style);
      const lastPart = splitWord.pop()!;
      const lastPartWidth = computeTextWidth(this.ctx, lastPart, style);

      // At this step: "splitWord" is an array composed of parts of word whose
      // length is at most equal to "width".
      // Last part contains the end of the word.
      // Note that: When word length is less than width, then lastPart is equal
      // to word and splitWord is empty

      if (splitWord.length) {
        if (textLine !== "") {
          brokenText.push(textLine);
          textLine = "";
          availableWidth = width;
        }
        splitWord.forEach((wordPart) => {
          brokenText.push(wordPart);
        });
        textLine = lastPart;
        availableWidth = width - lastPartWidth;
      } else {
        // here "lastPart" is equal to "word" and the "word" size is smaller than "width"
        const _word = textLine === "" ? lastPart : " " + lastPart;
        const wordWidth = computeTextWidth(this.ctx, _word, style);

        if (wordWidth <= availableWidth) {
          textLine += _word;
          availableWidth -= wordWidth;
        } else {
          brokenText.push(textLine);
          textLine = lastPart;
          availableWidth = width - lastPartWidth;
        }
      }
    }

    if (textLine !== "") {
      brokenText.push(textLine);
    }
    return brokenText;
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): Pixel {
    const cells = this.getters.getColCells(sheetId, index);
    const sizes = cells.map((cell: Cell) => this.getCellWidth(cell));
    return Math.max(0, ...sizes);
  }

  private splitWordToSpecificWidth(
    ctx: CanvasRenderingContext2D,
    word: string,
    width: number,
    style: Style
  ): string[] {
    const wordWidth = computeTextWidth(ctx, word, style);
    if (wordWidth <= width) {
      return [word];
    }

    const splitWord: string[] = [];
    let wordPart = "";
    for (let l of word) {
      const wordPartWidth = computeTextWidth(ctx, wordPart + l, style);
      if (wordPartWidth > width) {
        splitWord.push(wordPart);
        wordPart = l;
      } else {
        wordPart += l;
      }
    }
    splitWord.push(wordPart);
    return splitWord;
  }
}
