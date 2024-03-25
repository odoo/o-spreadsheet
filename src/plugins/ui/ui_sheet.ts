import {
  FILTER_ICON_MARGIN,
  ICON_EDGE_LENGTH,
  PADDING_AUTORESIZE_HORIZONTAL,
} from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  largeMax,
  positions,
  positionToZone,
} from "../../helpers/index";
import { Cell, CellValueType, Command, CommandResult, UID } from "../../types";
import { Dimension, HeaderDimensions, HeaderIndex, Pixel, Position, Style } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = [
    "getCellWidth",
    "getTextWidth",
    "getCellText",
    "getCellMultiLineText",
    "getColDimensions",
    "getRowDimensions",
    "getColRowOffset",
  ] as const;

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

  getCellWidth(sheetId: UID, { col, row }: Position): number {
    const cell = this.getters.getCell(sheetId, col, row);
    let contentWidth = 0;
    if (cell) {
      contentWidth += this.getTextWidth(cell);
    }
    const icon = this.getters.getConditionalIcon(col, row);
    if (icon) {
      contentWidth += computeIconWidth(this.getters.getCellStyle(cell));
    }
    const isFilterHeader = this.getters.isFilterHeader(sheetId, col, row);
    if (isFilterHeader) {
      contentWidth += ICON_EDGE_LENGTH + FILTER_ICON_MARGIN;
    }

    if (contentWidth > 0) {
      contentWidth += 2 * PADDING_AUTORESIZE_HORIZONTAL;

      if (this.getters.getCellStyle(cell).wrapping === "wrap") {
        const zone = positionToZone({ col, row });
        const colWidth = this.getters.getColSize(this.getters.getActiveSheetId(), zone.left);
        return Math.min(colWidth, contentWidth);
      }
    }
    return contentWidth;
  }

  getTextWidth(cell: Cell): Pixel {
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

  /**
   * Returns the size, start and end coordinates of a column on an unfolded sheet
   */
  getColDimensions(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    const start = this.getColRowOffset("COL", 0, col, sheetId);
    const size = this.getters.getColSize(sheetId, col);
    const isColHidden = this.getters.isColHidden(sheetId, col);
    return {
      start,
      size,
      end: start + (isColHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row an unfolded sheet
   */
  getRowDimensions(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    const start = this.getColRowOffset("ROW", 0, row, sheetId);
    const size = this.getters.getRowSize(sheetId, row);
    const isRowHidden = this.getters.isRowHidden(sheetId, row);
    return {
      start,
      size: size,
      end: start + (isRowHidden ? 0 : size),
    };
  }

  /**
   * Returns the offset of a header (determined by the dimension) at the given index
   * based on the referenceIndex given. If start === 0, this method will return
   * the start attribute of the header.
   *
   * i.e. The size from A to B is the distance between A.start and B.end
   */
  getColRowOffset(
    dimension: Dimension,
    referenceIndex: HeaderIndex,
    index: HeaderIndex,
    sheetId: UID = this.getters.getActiveSheetId()
  ): Pixel {
    if (index < referenceIndex) {
      return -this.getColRowOffset(dimension, index, referenceIndex);
    }
    let offset = 0;
    for (let i = referenceIndex; i < index; i++) {
      if (this.getters.isHeaderHidden(sheetId, dimension, i)) {
        continue;
      }
      offset +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
    }
    return offset;
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): number {
    const cellsPositions = positions(this.getters.getColsZone(sheetId, index, index));
    const sizes = cellsPositions.map((position) => this.getCellWidth(sheetId, position));
    return Math.max(0, largeMax(sizes));
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
