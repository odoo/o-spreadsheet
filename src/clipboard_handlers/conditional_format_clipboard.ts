import { makeIndexer } from "../helpers/clipboard/clipboard_helpers";
import { deepEquals } from "../helpers/misc";
import { UuidGenerator } from "../helpers/uuid";
import { positionToZone } from "../helpers/zones";
import {
  ClipboardCellData,
  ClipboardCF,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  CompactCFHandlerData,
} from "../types/clipboard";
import { ConditionalFormat } from "../types/conditional_formatting";
import { CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class ConditionalFormatClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardCF,
  CompactCFHandlerData
> {
  private queuedChanges: Record<UID, { toAdd: Zone[]; toRemove: Zone[]; cf: ConditionalFormat }[]> =
    {};

  copy(data: ClipboardCellData): CompactCFHandlerData | undefined {
    if (!data.zones.length) {
      return;
    }

    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const cfRules: ClipboardCF[][] = [];

    for (const row of rowsIndexes) {
      const cfRuleInRow: ClipboardCF[] = [];
      for (const col of columnsIndexes) {
        const cfRules = Array.from(this.getters.getRulesByCell(sheetId, col, row));
        cfRuleInRow.push({
          rules: cfRules,
        });
      }
      cfRules.push(cfRuleInRow);
    }
    return this.compact(cfRules);
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: ClipboardCF[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    this.queuedChanges = {};
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent, options, positions);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent, options, positions);
    }

    this.executeQueuedChanges();
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: ClipboardCF[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, options, positions);
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    cfRules: ClipboardCF[][],
    clipboardOptions: ClipboardOptions,
    clipboardPositions: ClipboardPositions
  ) {
    for (const [r, rowCells] of cfRules.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const target = { col: col + c, row: row + r, sheetId };
        const originPosition = this.getOriginPosition(r, c, clipboardPositions);
        this.pasteCf(origin, target, originPosition, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteCf(
    origin: ClipboardCF,
    target: CellPosition,
    originPosition: CellPosition,
    isCutOperation?: boolean
  ) {
    if (origin?.rules && origin.rules.length > 0) {
      const originZone = positionToZone(originPosition);
      const zone = positionToZone(target);
      for (const rule of origin.rules) {
        const toRemoveZones: Zone[] = [];
        if (isCutOperation) {
          //remove from current rule
          toRemoveZones.push(originZone);
        }
        if (originPosition.sheetId === target.sheetId) {
          this.adaptCFRules(originPosition.sheetId, rule, [zone], toRemoveZones);
        } else {
          this.adaptCFRules(originPosition.sheetId, rule, [], toRemoveZones);
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

    return targetCF || { ...originCF, id: UuidGenerator.smallUuid(), ranges: [] };
  }

  protected compact(data: ClipboardCF[][]): CompactCFHandlerData {
    const rows = data.length;
    const cols = data[0]?.length ?? 0;
    const { index: cfIndex, table: cfTable } = makeIndexer<ConditionalFormat>((cf) => cf.id);
    const items: CompactCFHandlerData["items"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (data[r]?.length ?? 0); c++) {
        const rules = data[r][c]?.rules;
        if (rules && rules.length > 0) {
          items.push({ r, c, cfIndices: rules.map(cfIndex) });
        }
      }
    }
    return { rows, cols, cfTable, items };
  }

  expand(data: unknown): ClipboardCF[][] {
    if (Array.isArray(data)) {
      return data as ClipboardCF[][];
    }
    const compact = data as CompactCFHandlerData;
    const { rows, cols, cfTable, items } = compact;
    const result: ClipboardCF[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ rules: [] }))
    );
    for (const { r, c, cfIndices } of items) {
      result[r][c] = { rules: cfIndices.map((i) => cfTable[i]) };
    }
    return result;
  }
}
