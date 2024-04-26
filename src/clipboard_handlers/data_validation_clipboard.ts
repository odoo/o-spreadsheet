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

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

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

  paste(
    target: ClipboardPasteTarget,
    clippedContent: ClipboardContent,
    options?: ClipboardOptions
  ) {
    if (!clippedContent?.dvRules) {
      return;
    }
    if (options?.pasteOption) {
      return;
    }
    if (!("zones" in target) || !target.zones.length) {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options?.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent.dvRules);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent);
    }
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
    const ruleInTargetSheet = this.getters
      .getDataValidationRules(targetSheetId)
      .find(
        (rule) =>
          deepEquals(originRule.criterion, rule.criterion) &&
          originRule.isBlocking === rule.isBlocking
      );

    return ruleInTargetSheet
      ? ruleInTargetSheet
      : { ...originRule, id: newId ? this.uuidGenerator.uuidv4() : originRule.id, ranges: [] };
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
    const dvZones = rule.ranges.map((range) => range.zone);
    const newDvZones = recomputeZones([...dvZones, ...toAdd], toRemove);
    if (newDvZones.length === 0) {
      this.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: rule.id });
      return;
    }
    this.dispatch("ADD_DATA_VALIDATION_RULE", {
      rule,
      ranges: newDvZones.map((zone) => this.getters.getRangeDataFromZone(sheetId, zone)),
      sheetId,
    });
  }
}
