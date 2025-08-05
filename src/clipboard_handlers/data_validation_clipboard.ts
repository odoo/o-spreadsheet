import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { columnRowIndexesToZones } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import {
  UuidGenerator,
  deepEquals,
  intersection,
  positionToZone,
  recomputeZones,
} from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  DataValidationRule,
  HeaderIndex,
  Map2D,
  UID,
  Zone,
} from "../types";

interface ClipboardDataValidationRule {
  position: CellPosition;
  rule: DataValidationRule;
}

interface ClipboardContent {
  cellContent: Map2D<ClipboardDataValidationRule>;
}

export class DataValidationClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  private readonly uuidGenerator = new UuidGenerator();
  private queuedChanges: Record<
    UID,
    { toAdd: Zone[]; toRemove: Zone[]; rule: DataValidationRule }[]
  > = {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const dvRules: Map2D<ClipboardDataValidationRule> = new Map2D(
      columnsIndexes.length,
      rowsIndexes.length
    );

    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      for (const [col, row, rule] of this.getters
        .getDataValidationRulesInZone(sheetId, zone)
        .entries()) {
        dvRules.set(col - zone.left + colsBefore, row - zone.top + rowsBefore, {
          rule,
          position: { sheetId, col, row },
        });
      }
    }
    return { cellContent: dvRules };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    this.queuedChanges = {};
    if (options.pasteOption) {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent);
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
    const pasteZone = {
      left: col,
      right: col + content.cellContent.width - 1,
      top: row,
      bottom: row + content.cellContent.height - 1,
    };
    const dvRuletoAdapt = this.getters
      .getDataValidationRules(sheetId)
      .filter((dv) => dv.ranges.some((range) => intersection(pasteZone, range.zone)));
    for (const dvRule of dvRuletoAdapt) {
      this.adaptDataValidationRule(sheetId, dvRule, [], [pasteZone]);
    }
    for (const [c, r, origin] of content.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteDataValidation(origin, position, clipboardOptions?.isCutOperation);
    }
  }

  private pasteDataValidation(
    origin: ClipboardDataValidationRule,
    target: CellPosition,
    isCutOperation?: boolean
  ) {
    const zone = positionToZone(target);
    const originZone = positionToZone(origin.position);
    const rule = origin.rule;
    const toRemoveZone: Zone[] = [];
    if (isCutOperation) {
      toRemoveZone.push(originZone);
    }
    if (origin.position.sheetId === target.sheetId) {
      const copyToRule = this.getDataValidationRuleToCopyTo(target.sheetId, rule, false);
      this.adaptDataValidationRule(origin.position.sheetId, copyToRule, [zone], toRemoveZone);
    } else {
      const originRule = this.getters.getValidationRuleForCell(origin.position);
      if (originRule) {
        this.adaptDataValidationRule(origin.position.sheetId, originRule, [], toRemoveZone);
      }
      const copyToRule = this.getDataValidationRuleToCopyTo(target.sheetId, rule);
      this.adaptDataValidationRule(target.sheetId, copyToRule, [zone], []);
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
        id: newId ? this.uuidGenerator.smallUuid() : originRule.id,
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
}
