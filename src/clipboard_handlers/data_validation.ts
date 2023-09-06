import { UuidGenerator, deepEquals, isInside, recomputeZones, toXC } from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  DataValidationRule,
  HeaderIndex,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  cellPositions: CellPosition[][];
};

export class DataValidationClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  CellPosition
> {
  private readonly uuidGenerator = new UuidGenerator();

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

    const { rowsIndex, columnsIndex } = data;
    const sheetId = this.getters.getActiveSheetId();
    const cellPositions = rowsIndex.map((row) =>
      columnsIndex.map((col) => ({ col, row, sheetId }))
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
    if (!clippedContent?.cellPositions) {
      return;
    }
    if (options?.pasteOption) {
      return;
    }
    if (!("zones" in target) || !target.zones.length) {
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
        this.pasteDataValidation(origin, position, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteDataValidation(
    origin: CellPosition,
    target: CellPosition,
    isCutOperation?: boolean
  ) {
    const rule = this.getters.getValidationRuleForCell(origin);
    if (!rule) {
      const targetRule = this.getters.getValidationRuleForCell(target);
      if (targetRule) {
        // Remove the data validation rule on the target cell
        this.adaptDataValidationRule(
          target.sheetId,
          targetRule,
          [],
          [toXC(target.col, target.row)]
        );
      }
      return;
    }
    const xc = toXC(target.col, target.row);
    for (const range of rule.ranges) {
      if (isInside(origin.col, origin.row, range.zone)) {
        const toRemoveRange: string[] = [];
        if (isCutOperation) {
          toRemoveRange.push(toXC(origin.col, origin.row));
        }
        if (origin.sheetId === target.sheetId) {
          this.adaptDataValidationRule(origin.sheetId, rule, [xc], toRemoveRange);
        } else {
          this.adaptDataValidationRule(origin.sheetId, rule, [], toRemoveRange);
          const copyToRule = this.getDataValidationRuleToCopyTo(target.sheetId, rule);
          this.adaptDataValidationRule(target.sheetId, copyToRule, [xc], []);
        }
      }
    }
  }

  private getDataValidationRuleToCopyTo(
    targetSheetId: UID,
    originRule: DataValidationRule
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
      : { ...originRule, id: this.uuidGenerator.uuidv4(), ranges: [] };
  }

  /**
   * Add or remove XCs to a given data validation rule.
   */
  private adaptDataValidationRule(
    sheetId: UID,
    rule: DataValidationRule,
    toAdd: string[],
    toRemove: string[]
  ) {
    const dvRangesXcs = rule.ranges.map((range) => this.getters.getRangeString(range, sheetId));
    const newRangesXC = recomputeZones([...dvRangesXcs, ...toAdd], toRemove);
    if (newRangesXC.length === 0) {
      this.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: rule.id });
      return;
    }
    this.dispatch("ADD_DATA_VALIDATION_RULE", {
      rule,
      ranges: newRangesXC.map((xc) => this.getters.getRangeDataFromXc(sheetId, xc)),
      sheetId,
    });
  }
}
