import { UuidGenerator, deepEquals, positionToZone, recomputeZones } from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  DataValidationRule,
  HeaderIndex,
  Maybe,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardDataValidationRule {
  position: CellPosition;
  rule: Maybe<DataValidationRule>;
}

interface ClipboardContent {
  dvRules: Maybe<ClipboardDataValidationRule>[][];
}

export class DataValidationClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  Maybe<ClipboardDataValidationRule>
> {
  private readonly uuidGenerator = new UuidGenerator();
  private queuedChanges: Record<
    UID,
    { toAdd: Zone[]; toRemove: Zone[]; rule: DataValidationRule }[]
  > = {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const dvRules: Maybe<ClipboardDataValidationRule>[][] = [];

    for (const row of rowsIndexes) {
      const dvRuleInRow: Maybe<ClipboardDataValidationRule>[] = [];
      for (const col of columnsIndexes) {
        const position = { sheetId, col, row };
        const rule = this.getters.getValidationRuleForCell(position);
        dvRuleInRow.push({ position, rule });
      }
      dvRules.push(dvRuleInRow);
    }
    return { dvRules };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    this.queuedChanges = {};
    if (options.pasteOption) {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent.dvRules);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent);
    }
    this.executeQueuedChanges();
  }

  private pasteFromCut(sheetId: UID, target: Zone[], content: ClipboardContent) {
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content.dvRules, {
      isCutOperation: true,
    });
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    dvRules: Maybe<ClipboardDataValidationRule>[][],
    clipboardOptions?: ClipboardOptions
  ) {
    for (const [r, rowCells] of dvRules.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteDataValidation(origin, position, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteDataValidation(
    origin: Maybe<ClipboardDataValidationRule>,
    target: CellPosition,
    isCutOperation?: boolean
  ) {
    if (origin) {
      const zone = positionToZone(target);
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
        toRemoveZone.push(positionToZone(origin.position));
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
        id: newId ? this.uuidGenerator.uuidv4() : originRule.id,
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
          rule: dv,
          ranges: newDvZones.map((zone) => this.getters.getRangeDataFromZone(sheetId, zone)),
          sheetId,
        });
      }
    }
  }
}
