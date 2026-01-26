import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { columnRowIndexesToZones } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { UuidGenerator, deepEquals, positionToZone } from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ConditionalFormat,
  HeaderIndex,
  Map2D,
  UID,
  Zone,
} from "../types";

interface ClipboardConditionalFormat {
  rules: ConditionalFormat[];
  position: CellPosition;
}

interface ClipboardContent {
  cellContent: Map2D<ClipboardConditionalFormat>;
}

export class ConditionalFormatClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  private readonly uuidGenerator = new UuidGenerator();
  private queuedChanges: Record<UID, { toAdd: Zone[]; toRemove: Zone[]; cf: ConditionalFormat }[]> =
    {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const cfRules: Map2D<ClipboardConditionalFormat> = new Map2D(
      columnsIndexes.length,
      rowsIndexes.length
    );

    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      for (const [col, row, rules] of this.getters
        .getConditionalFormatRulesInZone(sheetId, zone)
        .entries()) {
        cfRules.set(col - zone.left + colsBefore, row - zone.top + rowsBefore, {
          rules,
          position: { sheetId, col, row },
        });
      }
    }
    return { cellContent: cfRules };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    this.queuedChanges = {};
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent, options);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent);
    }

    this.executeQueuedChanges();
  }

  private pasteFromCut(sheetId: UID, target: Zone[], content: ClipboardContent) {
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, {
      isCutOperation: true,
    });
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    content: ClipboardContent,
    clipboardOptions?: ClipboardOptions
  ) {
    for (const [c, r, origin] of content.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteCf(origin, position, clipboardOptions?.isCutOperation);
    }
  }

  private pasteCf(
    origin: ClipboardConditionalFormat,
    target: CellPosition,
    isCutOperation?: boolean
  ) {
    if (origin.rules && origin.rules.length > 0) {
      const originZone = positionToZone(origin.position);
      const zone = positionToZone(target);
      for (const rule of origin.rules) {
        const toRemoveZones: Zone[] = [];
        if (isCutOperation) {
          //remove from current rule
          toRemoveZones.push(originZone);
        }
        if (origin.position.sheetId === target.sheetId) {
          this.adaptCFRules(origin.position.sheetId, rule, [zone], toRemoveZones);
        } else {
          this.adaptCFRules(origin.position.sheetId, rule, [], toRemoveZones);
          const cfToCopyTo = this.getCFToCopyTo(target.sheetId, rule);
          this.adaptCFRules(target.sheetId, cfToCopyTo, [zone], []);
        }
      }
    }
  }

  /**
   * Add or remove cells to a given conditional formatting rule.
   */
  private adaptCFRules(sheetId: UID, cf: ConditionalFormat, toAdd: Zone[], toRemove: Zone[]) {
    if (!this.queuedChanges[sheetId]) {
      this.queuedChanges[sheetId] = [];
    }
    const queuedChange = this.queuedChanges[sheetId].find((queued) => queued.cf.id === cf.id);
    if (!queuedChange) {
      this.queuedChanges[sheetId].push({ toAdd, toRemove, cf });
    } else {
      queuedChange.toAdd.push(...toAdd);
      queuedChange.toRemove.push(...toRemove);
    }
  }

  private executeQueuedChanges() {
    for (const sheetId in this.queuedChanges) {
      for (const { toAdd, toRemove, cf } of this.queuedChanges[sheetId]) {
        const newRangesXc = this.getters.getAdaptedCfRanges(sheetId, cf, toAdd, toRemove);
        if (!newRangesXc) {
          continue;
        }
        if (newRangesXc.length === 0) {
          this.dispatch("REMOVE_CONDITIONAL_FORMAT", { id: cf.id, sheetId });
          continue;
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
    }
  }

  private getCFToCopyTo(targetSheetId: UID, originCF: ConditionalFormat): ConditionalFormat {
    let targetCF = this.getters
      .getConditionalFormats(targetSheetId)
      .find((cf) => cf.stopIfTrue === originCF.stopIfTrue && deepEquals(cf.rule, originCF.rule));

    const queuedCfs = this.queuedChanges[targetSheetId];
    if (!targetCF && queuedCfs) {
      targetCF = queuedCfs.find(
        (queued) =>
          queued.cf.stopIfTrue === originCF.stopIfTrue && deepEquals(queued.cf.rule, originCF.rule)
      )?.cf;
    }

    return targetCF || { ...originCF, id: this.uuidGenerator.smallUuid(), ranges: [] };
  }
}
