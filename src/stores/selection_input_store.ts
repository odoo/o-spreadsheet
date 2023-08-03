import {
  colors,
  getComposerSheetName,
  isEqual,
  positionToZone,
  splitReference,
  zoneToXc,
} from "../helpers";
import { SpreadsheetStore } from "../store_engine/spreadsheet_store";
import { Get } from "../store_engine/store";
import { Command, Highlight, LAYERS, UID } from "../types";
import { SelectionEvent } from "../types/event_stream";
import { CanvasStore } from "./canvas_store";
import { FocusStore } from "./focus_store";

export interface RangeInputValue {
  id: number;
  xc: string;
  color: string;
}

/**
 * Selection input Store
 *
 * The SelectionInput component input and output are both arrays of strings, but
 * it requires an intermediary internal state to work.
 * This plugin handles this internal state.
 */
export class SelectionInputStore extends SpreadsheetStore {
  ranges: RangeInputValue[] = [];
  focusedRangeIndex: number | null = null;
  private activeSheet: UID;
  private willAddNewRange: boolean = false;
  private focusStore = this.get(FocusStore);

  constructor(
    get: Get,
    initialRanges: string[] = [],
    private readonly inputHasSingleRange: boolean = false
  ) {
    super(get);
    this.insertNewRange(0, initialRanges);
    this.activeSheet = this.getters.getActiveSheetId();
    if (this.ranges.length === 0) {
      this.insertNewRange(this.ranges.length, [""]);
      // this means the last mounted component is focused :/
      this.focusLast();
    }
  }

  dispose() {
    super.dispose();
    this.unfocus();
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  // allowDispatch(cmd: Command): CommandResult {
  //   switch (cmd.type) {
  //     case "ADD_EMPTY_RANGE":
  //       if (this.inputHasSingleRange && this.ranges.length === 1) {
  //         return CommandResult.MaximumRangesReached;
  //       }
  //       break;
  //   }
  //   return CommandResult.Success;
  // }

  private captureSelection() {
    if (this.focusedRangeIndex === null) {
      return;
    }
    const range = this.ranges[this.focusedRangeIndex];
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getRangeFromSheetXC(sheetId, range?.xc || "A1").zone;
    this.model.selection.capture(
      this,
      { cell: { col: zone.left, row: zone.top }, zone },
      { handleEvent: this.handleEvent.bind(this) }
    );
  }

  private handleEvent(event: SelectionEvent) {
    const xc = zoneToXc(event.anchor.zone);
    const inputSheetId = this.activeSheet;
    const sheetId = this.getters.getActiveSheetId();
    const sheetName = this.getters.getSheetName(sheetId);
    this.add([sheetId === inputSheetId ? xc : `${getComposerSheetName(sheetName)}!${xc}`]);
  }

  changeRange(rangeId: number, value: string) {
    const index = this.getIndex(rangeId);
    if (index !== null && this.focusedRangeIndex !== index) {
      this.focus(index);
    }
    if (index !== null) {
      const valueWithoutLeadingComma = value.replace(/^,+/, "");
      const values = valueWithoutLeadingComma.split(",").map((reference) => reference.trim());
      this.setRange(index, values);
      this.captureSelection(); // ? required ?
    }
  }

  removeRange(rangeId: number) {
    const index = this.getIndex(rangeId);
    if (index !== null) {
      this.removeRangeByIndex(index);
    }
  }

  addEmptyRange() {
    this.insertNewRange(this.ranges.length, [""]);
    this.focusLast();
  }

  protected handle(cmd: Command) {
    switch (cmd.type) {
      case "RENDER_CANVAS":
        if (cmd.layer === LAYERS.Highlights && this.focusStore.focusedElement === this) {
          this.renderHighlights();
        }
        break;
      // case "UNFOCUS_SELECTION_INPUT":
      //   this.unfocus();
      //   break;
      // case "FOCUS_RANGE":
      //   this.focus(this.getIndex(cmd.rangeId));
      //   break;
      // case "CHANGE_RANGE": {
      //   break;
      // }
      // case "ADD_EMPTY_RANGE":

      //   break;
      // case "REMOVE_RANGE":
      //   // const index = this.getIndex(cmd.rangeId);
      //   // if (index !== null) {
      //   //   this.removeRangeByIndex(index);
      //   // }
      //   break;
      case "STOP_SELECTION_INPUT":
        this.willAddNewRange = false;
        break;
      case "PREPARE_SELECTION_INPUT_EXPANSION": {
        const index = this.focusedRangeIndex;
        if (index !== null && !this.inputHasSingleRange) {
          this.willAddNewRange = this.ranges[index].xc.trim() !== "";
        }
        break;
      }
      case "ACTIVATE_SHEET": {
        if (cmd.sheetIdFrom !== cmd.sheetIdTo) {
          const { col, row } = this.getters.getNextVisibleCellPosition({
            sheetId: cmd.sheetIdTo,
            col: 0,
            row: 0,
          });
          const zone = this.getters.expandZone(cmd.sheetIdTo, positionToZone({ col, row }));
          this.model.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters || only callable by the parent
  // ---------------------------------------------------------------------------

  get selectionInputValues(): string[] {
    return this.cleanInputs(
      this.ranges.map((range) => {
        return range.xc ? range.xc : "";
      })
    );
  }

  get selectionInputs(): (RangeInputValue & { isFocused: boolean })[] {
    return this.ranges.map((input, index) =>
      Object.assign({}, input, {
        color:
          this.focusStore.focusedElement === this &&
          this.focusedRangeIndex !== null &&
          this.getters.isRangeValid(input.xc)
            ? input.color
            : null,
        isFocused: this.focusStore.focusedElement === this && this.focusedRangeIndex === index,
      })
    );
  }

  private get selectionInputHighlights(): Highlight[] {
    if (this.focusStore.focusedElement !== this) {
      return [];
    }
    return this.ranges.map((input) => this.inputToHighlights(input)).flat();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  focusById(rangeId: number) {
    this.focus(this.getIndex(rangeId));
  }
  /**
   * Focus a given range or remove the focus.
   */
  private focus(index: number | null) {
    this.focusStore.focus(this);
    this.focusedRangeIndex = index;
    this.captureSelection();
  }

  private focusLast() {
    this.focus(this.ranges.length - 1);
  }

  unfocus() {
    this.model.selection.release(this);
    this.focusedRangeIndex = null;
    this.focusStore.unfocus(this);
  }

  private add(newRanges: string[]) {
    if (this.focusedRangeIndex === null || newRanges.length === 0) {
      return;
    }
    if (this.willAddNewRange) {
      this.insertNewRange(this.ranges.length, newRanges);
      this.focusLast();
      this.willAddNewRange = false;
    } else {
      this.setRange(this.focusedRangeIndex, newRanges);
    }
  }

  private setContent(index: number, xc: string) {
    this.ranges[index] = {
      ...this.ranges[index],
      xc,
    };
  }

  /**
   * Insert new inputs after the given index.
   */
  private insertNewRange(index: number, values: string[]) {
    if (this.ranges.length === 1 && this.inputHasSingleRange) {
      return;
    }
    const currentMaxId = Math.max(0, ...this.ranges.map((range) => Number(range.id)));
    this.ranges.splice(
      index,
      0,
      ...values.map((xc, i) => ({
        xc,
        id: currentMaxId + i + 1,
        color: colors[(currentMaxId + i) % colors.length],
      }))
    );
  }

  /**
   * Set a new value in a given range input. If more than one value is provided,
   * new inputs will be added.
   */
  private setRange(index: number, values: string[]) {
    const [, ...additionalValues] = values;
    this.setContent(index, values[0]);
    this.insertNewRange(index + 1, additionalValues);
    // focus the last newly added range
    if (additionalValues.length) {
      this.focus(index + additionalValues.length);
    }
  }

  private removeRangeByIndex(index: number) {
    this.ranges.splice(index, 1);
    if (this.focusedRangeIndex !== null) {
      this.focusLast();
    }
  }

  /**
   * Convert highlights input format to the command format.
   * The first xc in the input range will keep its color.
   * Invalid ranges and ranges from other sheets than the active sheets
   * are ignored.
   */
  private inputToHighlights({ xc, color }: Pick<RangeInputValue, "xc" | "color">): Highlight[] {
    const XCs = this.cleanInputs([xc])
      .filter((range) => this.getters.isRangeValid(range))
      .filter((reference) => this.shouldBeHighlighted(this.activeSheet, reference));
    return XCs.map((xc) => {
      const { sheetName } = splitReference(xc);
      return {
        zone: this.getters.getRangeFromSheetXC(this.activeSheet, xc).zone,
        sheetId: (sheetName && this.getters.getSheetIdByName(sheetName)) || this.activeSheet,
        color,
      };
    });
  }

  private cleanInputs(ranges: string[]): string[] {
    return ranges
      .map((xc) => xc.split(","))
      .flat()
      .map((xc) => xc.trim())
      .filter((xc) => xc !== "");
  }

  /**
   * Check if a cell or range reference should be highlighted.
   * It should be highlighted if it references the current active sheet.
   * Note that if no sheet name is given in the reference ("A1"), it refers to the
   * active sheet when the selection input was enabled which might be different from
   * the current active sheet.
   */
  private shouldBeHighlighted(inputSheetId: UID, reference: string): boolean {
    const { sheetName } = splitReference(reference);
    const sheetId = this.getters.getSheetIdByName(sheetName);
    const activeSheetId = this.getters.getActiveSheet().id;
    const valid = this.getters.isRangeValid(reference);
    return (
      valid &&
      (sheetId === activeSheetId || (sheetId === undefined && activeSheetId === inputSheetId))
    );
  }

  private renderHighlights() {
    const { ctx, thinLineWidth } = this.get(CanvasStore);

    const sheetId = this.getters.getActiveSheetId();
    const lineWidth = 3 * thinLineWidth;
    ctx.lineWidth = lineWidth;
    /**
     * We only need to draw the highlights of the current sheet.
     *
     * Note that there can be several times the same highlight in 'this.highlights'.
     * In order to avoid superposing the same color layer and modifying the final
     * opacity, we filter highlights to remove duplicates.
     */
    const highlights = this.selectionInputHighlights;
    for (let h of highlights.filter(
      (highlight, index) =>
        // For every highlight in the sheet, deduplicated by zone
        highlights.findIndex((h) => isEqual(h.zone, highlight.zone) && h.sheetId === sheetId) ===
        index
    )) {
      const { x, y, width, height } = this.getters.getVisibleRect(h.zone);
      if (width > 0 && height > 0) {
        ctx.strokeStyle = h.color!;
        ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = h.color! + "20";
        ctx.fillRect(x + lineWidth, y + lineWidth, width - 2 * lineWidth, height - 2 * lineWidth);
      }
    }
  }
  /**
   * Return the index of a range given its id
   * or `null` if the range is not found.
   */
  getIndex(rangeId: number | null): number | null {
    const index = this.ranges.findIndex((range) => range.id === rangeId);
    return index >= 0 ? index : null;
  }
}
