import { UuidGenerator, deepEquals, isInside, positionToZone } from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ConditionalFormat,
  HeaderIndex,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  cellPositions: CellPosition[][];
};

export class ConditionalFormatClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  CellPosition
> {
  private readonly uuidGenerator = new UuidGenerator();

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = this.getters.getActiveSheetId();
    const cellPositions = rowsIndexes.map((row) =>
      columnsIndexes.map((col) => ({ col, row, sheetId }))
    );

    return {
      cellPositions,
    };
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: ClipboardContent,
    options?: ClipboardOptions
  ) {
    if (
      !clippedContent?.cellPositions ||
      options?.pasteOption === "asValue" ||
      !("zones" in target) ||
      !target.zones.length
    ) {
      return;
    }
    const zones = target.zones;
    const sheetId = this.getters.getActiveSheetId();

    if (!options?.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent.cellPositions);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent);
    }
  }

  private pasteFromCut(sheetId: UID, target: Zone[], content: ClipboardContent) {
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content.cellPositions, {
      isCutOperation: true,
    });
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    positions: CellPosition[][],
    clipboardOptions?: ClipboardOptions
  ) {
    for (const [r, rowCells] of positions.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteCf(origin, position, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteCf(origin: CellPosition, target: CellPosition, isCutOperation?: boolean) {
    const zone = positionToZone(target);
    for (const rule of this.getters.getConditionalFormats(origin.sheetId)) {
      for (const range of rule.ranges) {
        if (
          isInside(
            origin.col,
            origin.row,
            this.getters.getRangeFromSheetXC(origin.sheetId, range).zone
          )
        ) {
          const toRemoveZones: Zone[] = [];
          if (isCutOperation) {
            //remove from current rule
            toRemoveZones.push(positionToZone(origin));
          }
          if (origin.sheetId === target.sheetId) {
            this.adaptCFRules(origin.sheetId, rule, [zone], toRemoveZones);
          } else {
            this.adaptCFRules(origin.sheetId, rule, [], toRemoveZones);
            const cfToCopyTo = this.getCFToCopyTo(target.sheetId, rule);
            this.adaptCFRules(target.sheetId, cfToCopyTo, [zone], []);
          }
        }
      }
    }
  }

  /**
   * Add or remove cells to a given conditional formatting rule.
   */
  private adaptCFRules(sheetId: UID, cf: ConditionalFormat, toAdd: Zone[], toRemove: Zone[]) {
    const newRangesXc = this.getters.getAdaptedCfRanges(sheetId, cf, toAdd, toRemove);
    if (!newRangesXc) {
      return;
    }
    if (newRangesXc.length === 0) {
      this.dispatch("REMOVE_CONDITIONAL_FORMAT", { id: cf.id, sheetId });
      return;
    }
    this.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: cf.id,
        rule: cf.rule,
        stopIfTrue: cf.stopIfTrue,
      },
      ranges: newRangesXc,
      sheetId,
    });
  }

  private getCFToCopyTo(targetSheetId: UID, originCF: ConditionalFormat): ConditionalFormat {
    const cfInTarget = this.getters
      .getConditionalFormats(targetSheetId)
      .find((cf) => cf.stopIfTrue === originCF.stopIfTrue && deepEquals(cf.rule, originCF.rule));

    return cfInTarget ? cfInTarget : { ...originCF, id: this.uuidGenerator.uuidv4(), ranges: [] };
  }
}
