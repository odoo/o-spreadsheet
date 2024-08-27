import { canonicalizeNumberValue } from "../formulas/formula_locale";
import { deepEquals, formatValue } from "../helpers";
import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import { createPivotFormula } from "../helpers/pivot/pivot_helpers";
import {
  CellPosition,
  ClipboardCell,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  HeaderIndex,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardContent {
  cells: ClipboardCell[][];
  zones: Zone[];
  sheetId: UID;
}

export class CellClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  ClipboardCell
> {
  isCutAllowed(data: ClipboardCellData) {
    if (data.zones.length !== 1) {
      return CommandResult.WrongCutSelection;
    }
    return CommandResult.Success;
  }

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;

    const { clippedZones, rowsIndexes, columnsIndexes } = data;
    const clippedCells: ClipboardCell[][] = [];
    const isCopyingOneCell = rowsIndexes.length == 1 && columnsIndexes.length == 1;
    for (let row of rowsIndexes) {
      let cellsInRow: ClipboardCell[] = [];
      for (let col of columnsIndexes) {
        const position = { col, row, sheetId };
        let cell = this.getters.getCell(position);
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        const pivotId = this.getters.getPivotIdFromPosition(position);
        const spreader = this.getters.getArrayFormulaSpreadingOn(position);
        if (pivotId) {
          if (spreader && (!deepEquals(spreader, position) || !isCopyingOneCell)) {
            const pivotCell = this.getters.getPivotCellFromPosition(position);
            const formulaPivotId = this.getters.getPivotFormulaId(pivotId);
            const pivotFormula = createPivotFormula(formulaPivotId, pivotCell);
            cell = {
              id: cell?.id || "",
              style: cell?.style,
              format: evaluatedCell.format,
              content: pivotFormula,
              isFormula: false,
              parsedValue: evaluatedCell.value,
            };
          }
        } else {
          if (spreader && !deepEquals(spreader, position)) {
            const isSpreaderCopied =
              rowsIndexes.includes(spreader.row) && columnsIndexes.includes(spreader.col);
            const content = isSpreaderCopied
              ? ""
              : formatValue(evaluatedCell.value, { locale: this.getters.getLocale() });
            cell = {
              id: cell?.id || "",
              style: cell?.style,
              format: evaluatedCell.format,
              content,
              isFormula: false,
              parsedValue: evaluatedCell.value,
            };
          }
        }
        cellsInRow.push({
          cell,
          border: this.getters.getCellBorder(position) || undefined,
          evaluatedCell,
          position,
        });
      }
      clippedCells.push(cellsInRow);
    }

    return {
      cells: clippedCells,
      zones: clippedZones,
      sheetId: data.sheetId,
    };
  }

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    clipboardOptions: ClipboardOptions
  ): CommandResult {
    if (!content.cells) {
      return CommandResult.Success;
    }
    if (clipboardOptions?.isCutOperation && clipboardOptions?.pasteOption !== undefined) {
      // cannot paste only format or only value if the previous operation is a CUT
      return CommandResult.WrongPasteOption;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (content.cells.length > 1 || content.cells[0].length > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    const clipboardHeight = content.cells.length;
    const clipboardWidth = content.cells[0].length;
    for (const zone of getPasteZones(target, content.cells)) {
      if (this.getters.doesIntersectMerge(sheetId, zone)) {
        if (
          target.length > 1 ||
          !this.getters.isSingleCellOrMerge(sheetId, target[0]) ||
          clipboardHeight * clipboardWidth !== 1
        ) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const zones = target.zones;
    const sheetId = target.sheetId;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content.cells, options);
    } else {
      this.pasteFromCut(sheetId, zones, content, options);
    }
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const width = content.cells[0].length;
    const height = content.cells.length;
    if (options?.isCutOperation) {
      return {
        sheetId,
        zones: [
          {
            left: target[0].left,
            top: target[0].top,
            right: target[0].left + width - 1,
            bottom: target[0].top + height - 1,
          },
        ],
      };
    }
    if (width === 1 && height === 1) {
      return { zones: [], sheetId };
    }
    return { sheetId, zones: getPasteZones(target, content.cells) };
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ) {
    this.clearClippedZones(content);
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content.cells, options);
    this.dispatch("MOVE_RANGES", {
      target: content.zones,
      sheetId: content.sheetId,
      targetSheetId: sheetId,
      col: selection.left,
      row: selection.top,
    });
  }

  /**
   * Clear the clipped zones: remove the cells and clear the formatting
   */
  private clearClippedZones(content: ClipboardContent) {
    this.dispatch("CLEAR_CELLS", {
      sheetId: content.sheetId,
      target: content.zones,
    });
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: content.sheetId,
      target: content.zones,
    });
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    cells: ClipboardCell[][],
    clipboardOptions?: ClipboardOptions
  ) {
    // then, perform the actual paste operation
    for (const [r, rowCells] of cells.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        if (!origin) {
          continue;
        }
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteCell(origin, position, clipboardOptions);
      }
    }
  }

  /**
   * Paste the cell at the given position to the target position
   */
  private pasteCell(
    origin: ClipboardCell,
    target: CellPosition,
    clipboardOption?: ClipboardOptions
  ) {
    const { sheetId, col, row } = target;
    const targetCell = this.getters.getEvaluatedCell(target);
    const originFormat = origin.cell?.format ?? origin.evaluatedCell.format;

    if (clipboardOption?.pasteOption === "asValue") {
      this.dispatch("UPDATE_CELL", {
        ...target,
        content: origin.evaluatedCell.value?.toString() || "",
        format: originFormat,
      });
      return;
    }

    if (clipboardOption?.pasteOption === "onlyFormat") {
      this.dispatch("UPDATE_CELL", {
        ...target,
        style: origin.cell?.style ?? null,
        format: originFormat ?? targetCell.format,
      });
      return;
    }

    let content = origin.cell?.content;
    if (origin.cell?.isFormula && !clipboardOption?.isCutOperation) {
      content = this.getters.getTranslatedCellFormula(
        sheetId,
        col - origin.position.col,
        row - origin.position.row,
        origin.cell.compiledFormula
      );
    } else if (origin.cell?.isFormula) {
      content = this.getters.getFormulaMovedInSheet(sheetId, origin.cell.compiledFormula);
    }
    if (content !== "" || origin.cell?.format || origin.cell?.style) {
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        style: origin.cell?.style || null,
        format: origin.cell?.format,
      });
    } else if (targetCell) {
      this.dispatch("CLEAR_CELL", target);
    }
  }

  convertOSClipboardData(text: string): ClipboardContent {
    const locale = this.getters.getLocale();
    const copiedData: any = {
      cells: [],
    };
    const values: string[][] = [];
    let rowLength = 0;
    for (const [i, row] of text.replace(/\r/g, "").split("\n").entries()) {
      values.push(row.split("\t"));
      if (values[i].length > rowLength) {
        rowLength = values[i].length;
      }
    }
    for (const row of values) {
      const cells: any[] = [];
      for (let i = 0; i < rowLength; i++) {
        const content = canonicalizeNumberValue(row[i] || "", locale);
        cells.push({
          cell: {
            isFormula: false,
            content,
          },
          evaluatedCell: {
            formattedValue: content,
          },
        });
      }
      copiedData.cells.push(cells);
    }
    return copiedData;
  }
}
