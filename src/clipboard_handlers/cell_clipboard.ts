import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import {
  columnRowIndexesToZones,
  getPasteZones,
} from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { canonicalizeNumberValue } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { createPivotFormula } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { deepEquals, formatValue, isZoneInside } from "../helpers";
import {
  CellPosition,
  ClipboardCell,
  ClipboardCellData,
  ClipboardCopyOptions,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  HeaderIndex,
  Map2D,
  UID,
  Zone,
} from "../types";

interface ClipboardContent {
  cellContent: Map2D<ClipboardCell>;
  zones: Zone[];
  sheetId: UID;
}

export class CellClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  isCutAllowed(data: ClipboardCellData) {
    if (data.zones.length !== 1) {
      return CommandResult.WrongCutSelection;
    }
    return CommandResult.Success;
  }

  copy(
    data: ClipboardCellData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const { clippedZones, rowsIndexes, columnsIndexes } = data;
    const clippedCells = new Map2D<ClipboardCell>(columnsIndexes.length, rowsIndexes.length);
    const isCopyingOneCell = rowsIndexes.length === 1 && columnsIndexes.length === 1;
    for (const [zone, c, r] of columnRowIndexesToZones(data.columnsIndexes, data.rowsIndexes)) {
      const positions =
        mode === "shiftCells"
          ? this.getters
              .getCellsFromZones(sheetId, [zone])
              .map((cell) => this.getters.getCellPosition(cell.id))
          : this.getters.getEvaluatedCellsPositionInZone(sheetId, zone);

      for (const position of positions) {
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        let cell = this.getters.getCell(position);
        const pivotId = this.getters.getPivotIdFromPosition(position);
        const spreader = this.getters.getArrayFormulaSpreadingOn(position);
        if (mode !== "shiftCells" && pivotId && spreader) {
          const pivotZone = this.getters.getSpreadZone(spreader);
          if (
            (!deepEquals(spreader, position) || !isCopyingOneCell) &&
            pivotZone &&
            !data.zones.some((z) => isZoneInside(pivotZone, z))
          ) {
            const pivotCell = this.getters.getPivotCellFromPosition(position);
            const formulaPivotId = this.getters.getPivotFormulaId(pivotId);
            const pivotFormula = createPivotFormula(formulaPivotId, pivotCell);
            cell = {
              id: cell?.id ?? 0,
              content: pivotFormula,
              isFormula: false,
              parsedValue: evaluatedCell.value,
            };
          }
        } else if (mode !== "shiftCells") {
          if (spreader && !deepEquals(spreader, position)) {
            const isSpreaderCopied =
              rowsIndexes.has(spreader.row) && columnsIndexes.has(spreader.col);
            const content = isSpreaderCopied
              ? ""
              : formatValue(evaluatedCell.value, { locale: this.getters.getLocale() });
            cell = {
              id: cell?.id ?? 0,
              content,
              isFormula: false,
              parsedValue: evaluatedCell.value,
            };
          }
        }
        if (cell?.content !== "") {
          clippedCells.set(c + position.col - zone.left, r + position.row - zone.top, {
            content: cell?.content ?? "",
            tokens: cell?.isFormula
              ? cell.compiledFormula.tokens.map(({ value, type }) => ({ value, type }))
              : [],
            evaluatedCell,
            position,
          });
        }
      }
    }

    return {
      cellContent: clippedCells,
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
    if (!content.cellContent) {
      return CommandResult.Success;
    }
    if (clipboardOptions?.isCutOperation && clipboardOptions?.pasteOption !== undefined) {
      // cannot paste only format or only value if the previous operation is a CUT
      return CommandResult.WrongPasteOption;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (content.cellContent.width > 1 || content.cellContent.height > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    const clipboardHeight = content.cellContent.height;
    const clipboardWidth = content.cellContent.width;
    for (const zone of getPasteZones(target, clipboardWidth, clipboardHeight)) {
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
    if (options.pasteOption === "asValue") {
      this.dispatch("DELETE_CONTENT", {
        sheetId,
        target: zones,
      });
    } else if (options.pasteOption === undefined) {
      this.dispatch("CLEAR_CELLS", {
        sheetId,
        target: zones,
      });
    }
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content, options);
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
    const width = content.cellContent.width;
    const height = content.cellContent.height;
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
    return { sheetId, zones: getPasteZones(target, width, height) };
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ) {
    this.clearClippedZones(content);
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, options);
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
    content: ClipboardContent,
    clipboardOptions?: ClipboardOptions
  ) {
    // then, perform the actual paste operation
    for (const [c, r, origin] of content.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteCell(origin, position, clipboardOptions);
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
    const originFormat = origin?.format || origin.evaluatedCell.format;

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
        format: originFormat ?? targetCell.format,
      });
      return;
    }

    let content = origin?.content;
    if (origin?.tokens && origin.tokens.length > 0 && !clipboardOption?.isCutOperation) {
      content = this.getters.getTranslatedCellFormula(
        sheetId,
        col - origin.position.col,
        row - origin.position.row,
        origin.tokens
      );
    } else if (origin?.tokens && origin.tokens.length > 0) {
      content = this.getters.getFormulaMovedInSheet(
        origin.position.sheetId,
        sheetId,
        origin.tokens
      );
    }
    if (content !== "" || origin?.format) {
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        format: origin?.format,
      });
    } else if (targetCell) {
      this.dispatch("CLEAR_CELL", target);
    }
  }

  convertTextToClipboardData(text: string): ClipboardContent {
    const locale = this.getters.getLocale();
    const values: string[][] = [];
    let rowLength = 0;
    for (const [i, row] of text.replace(/\r/g, "").split("\n").entries()) {
      values.push(row.split("\t"));
      if (values[i].length > rowLength) {
        rowLength = values[i].length;
      }
    }
    const cells = new Map2D<any>(rowLength, values.length);
    for (const [r, row] of values.entries()) {
      for (let col = 0; col < rowLength; col++) {
        const content = canonicalizeNumberValue(row[col] || "", locale);
        cells.set(col, r, {
          content: content,
          evaluatedCell: {
            formattedValue: content,
          },
        });
      }
    }
    return { cellContent: cells } as any;
  }
}
