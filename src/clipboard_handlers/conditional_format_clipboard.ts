import { UuidGenerator, deepEquals, positionToZone } from "../helpers";
import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ConditionalFormat,
  HeaderIndex,
  Maybe,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardConditionalFormat {
  position: CellPosition;
  rules: ConditionalFormat[];
}

interface ClipboardContent {
  cfRules: Maybe<ClipboardConditionalFormat>[][];
}

export class ConditionalFormatClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  Maybe<ClipboardConditionalFormat>
> {
  private readonly uuidGenerator = new UuidGenerator();

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

    const { rowsIndexes, columnsIndexes } = data;
    const sheetId = data.sheetId;
    const cfRules: Maybe<ClipboardConditionalFormat>[][] = [];

    for (const row of rowsIndexes) {
      const cfRuleInRow: Maybe<ClipboardConditionalFormat>[] = [];
      for (const col of columnsIndexes) {
        const cfRules = Array.from(this.getters.getRulesByCell(sheetId, col, row));
        cfRuleInRow.push({
          position: { col, row, sheetId },
          rules: cfRules,
        });
      }
      cfRules.push(cfRuleInRow);
    }
    return { cfRules };
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: ClipboardContent,
    options?: ClipboardOptions
  ) {
    if (
      !clippedContent?.cfRules ||
      options?.pasteOption === "asValue" ||
      !("zones" in target) ||
      !target.zones.length
    ) {
      return;
    }
    const zones = target.zones;
    const sheetId = target.sheetId;

    if (!options?.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, clippedContent.cfRules, options);
    } else {
      this.pasteFromCut(sheetId, zones, clippedContent);
    }
  }

  private pasteFromCut(sheetId: UID, target: Zone[], content: ClipboardContent) {
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content.cfRules, {
      isCutOperation: true,
    });
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    cfRules: Maybe<ClipboardConditionalFormat>[][],
    clipboardOptions?: ClipboardOptions
  ) {
    for (const [r, rowCells] of cfRules.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteCf(origin, position, clipboardOptions?.isCutOperation);
      }
    }
  }

  private pasteCf(
    origin: Maybe<ClipboardConditionalFormat>,
    target: CellPosition,
    isCutOperation?: boolean
  ) {
    if (origin?.rules && origin.rules.length > 0) {
      const zone = positionToZone(target);
      for (const rule of origin.rules) {
        const toRemoveZones: Zone[] = [];
        if (isCutOperation) {
          //remove from current rule
          toRemoveZones.push(positionToZone(origin.position));
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
