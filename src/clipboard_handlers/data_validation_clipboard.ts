import { makeIndexer } from "../helpers/clipboard/clipboard_helpers";
import { deepEquals } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { UuidGenerator } from "../helpers/uuid";
import { positionToZone } from "../helpers/zones";
import {
  ClipboardCellData,
  ClipboardDV,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  CompactDVHandlerData,
} from "../types/clipboard";
import { DataValidationRule } from "../types/data_validation";
import { CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class DataValidationClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardDV,
  CompactDVHandlerData
> {
  private queuedChanges: Record<
    UID,
    { toAdd: Zone[]; toRemove: Zone[]; rule: DataValidationRule }[]
  > = {};

  copy(data: ClipboardCellData): CompactDVHandlerData | undefined {
    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const dvRules: ClipboardDV[][] = [];

    for (const row of rowsIndexes) {
      const dvRuleInRow: ClipboardDV[] = [];
      for (const col of columnsIndexes) {
        const rule = this.getters.getValidationRuleForCell({ sheetId, col, row });
        dvRuleInRow.push({ rule });
      }
      dvRules.push(dvRuleInRow);
    }
    return this.compact(dvRules);
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: ClipboardDV[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    this.queuedChanges = {};
    if (options.pasteOption) {
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
    content: ClipboardDV[][],
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
    dvRules: ClipboardDV[][],
    clipboardOptions: ClipboardOptions,
    clipboardPositions: ClipboardPositions
  ) {
    for (const [r, rowCells] of dvRules.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const target = { col: col + c, row: row + r, sheetId };
        const originPosition = this.getOriginPosition(r, c, clipboardPositions);
        this.pasteDataValidation(origin, target, originPosition, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteDataValidation(
    origin: ClipboardDV,
    target: CellPosition,
    originPosition: CellPosition,
    isCutOperation?: boolean
  ) {
    if (origin) {
      const zone = positionToZone(target);
      const originZone = positionToZone(originPosition);
      const rule = origin.rule;
      if (!rule) {
        const targetRule = this.getters.getValidationRuleForCell(target);
        if (targetRule) {
          // Remove the data validation rule on the target cell
          this.adaptDataValidationRule(target.sheetId, targetRule, [], [zone]);
        }
        return;
      }
      const toRemoveZone: Zone[] = [];
      if (isCutOperation) {
        toRemoveZone.push(originZone);
      }
      if (originPosition.sheetId === target.sheetId) {
        const copyToRule = this.getDataValidationRuleToCopyTo(target.sheetId, rule, false);
        this.adaptDataValidationRule(originPosition.sheetId, copyToRule, [zone], toRemoveZone);
      } else {
        const originRule = this.getters.getValidationRuleForCell(originPosition);
        if (originRule) {
          this.adaptDataValidationRule(originPosition.sheetId, originRule, [], toRemoveZone);
        }
        const copyToRule = this.getDataValidationRuleToCopyTo(target.sheetId, rule);
        this.adaptDataValidationRule(target.sheetId, copyToRule, [zone], []);
      }
    }
  }

  private getDataValidationRuleToCopyTo(
    targetSheetId: UID,
    originRule: DataValidationRule,
    newId = true
  ): DataValidationRule {
    let targetRule = this.getters
      .getDataValidationRules(targetSheetId)
      .find(
        (rule) =>
          deepEquals(originRule.criterion, rule.criterion) &&
          originRule.isBlocking === rule.isBlocking
      );

    const queuedRules = this.queuedChanges[targetSheetId];
    if (!targetRule && queuedRules) {
      targetRule = queuedRules.find(
        (queued) =>
          deepEquals(originRule.criterion, queued.rule.criterion) &&
          originRule.isBlocking === queued.rule.isBlocking
      )?.rule;
    }

    return (
      targetRule || {
        ...originRule,
        id: newId ? UuidGenerator.smallUuid() : originRule.id,
        ranges: [],
      }
    );
  }

  /**
   * Add or remove XCs to a given data validation rule.
   */
  private adaptDataValidationRule(
    sheetId: UID,
    rule: DataValidationRule,
    toAdd: Zone[],
    toRemove: Zone[]
  ) {
    if (!this.queuedChanges[sheetId]) {
      this.queuedChanges[sheetId] = [];
    }
    const queuedChange = this.queuedChanges[sheetId].find((queued) => queued.rule.id === rule.id);
    if (!queuedChange) {
      this.queuedChanges[sheetId].push({ toAdd, toRemove, rule });
    } else {
      queuedChange.toAdd.push(...toAdd);
      queuedChange.toRemove.push(...toRemove);
    }
  }

  private executeQueuedChanges() {
    for (const sheetId in this.queuedChanges) {
      for (const { toAdd, toRemove, rule: dv } of this.queuedChanges[sheetId]) {
        // Remove the zones first in case the same position is in toAdd and toRemove
        const dvZones = dv.ranges.map((range) => range.zone);
        const withRemovedZones = recomputeZones(dvZones, toRemove);
        const newDvZones = recomputeZones([...withRemovedZones, ...toAdd], []);

        if (newDvZones.length === 0) {
          this.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: dv.id });
          continue;
        }
        this.dispatch("ADD_DATA_VALIDATION_RULE", {
          rule: { id: dv.id, criterion: dv.criterion, isBlocking: dv.isBlocking },
          ranges: newDvZones.map((zone) => this.getters.getRangeDataFromZone(sheetId, zone)),
          sheetId,
        });
      }
    }
  }

  protected compact(data: ClipboardDV[][]): CompactDVHandlerData {
    const rows = data.length;
    const cols = data[0]?.length ?? 0;
    const { index: ruleIndex, table: ruleTable } = makeIndexer<DataValidationRule>((r) => r.id);
    const items: CompactDVHandlerData["items"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (data[r]?.length ?? 0); c++) {
        const cell = data[r][c];
        if (cell?.rule !== undefined) {
          items.push({ r, c, ruleIdx: ruleIndex(cell.rule!) });
        }
      }
    }
    return { rows, cols, ruleTable, items };
  }

  expand(data: unknown): ClipboardDV[][] {
    if (Array.isArray(data)) {
      return data as ClipboardDV[][];
    }
    const compact = data as CompactDVHandlerData;
    const { rows, cols, ruleTable, items } = compact;
    const result: ClipboardDV[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ rule: undefined }))
    );
    for (const { r, c, ruleIdx } of items) {
      result[r][c] = { rule: ruleTable[ruleIdx] };
    }
    return result;
  }
}
