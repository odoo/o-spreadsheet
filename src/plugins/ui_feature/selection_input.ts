import { colors, isEqual, positionToZone, splitReference } from "../../helpers/index";
import type { StreamCallbacks } from "../../selection_stream/event_stream";
import type { SelectionEvent } from "../../types/event_stream";
import type { Color, Command, Highlight, UID } from "../../types/index";
import { LAYERS } from "../../types/index";
import type { UIPluginConfig } from "../ui_plugin";
import { UIPlugin } from "../ui_plugin";

export interface RangeInputValue {
  id: number;
  xc: string;
  color: Color;
}

/**
 * Selection input Plugin
 *
 * The SelectionInput component input and output are both arrays of strings, but
 * it requires an intermediary internal state to work.
 * This plugin handles this internal state.
 */
export class SelectionInputPlugin extends UIPlugin implements StreamCallbacks<SelectionEvent> {
  static layers = [LAYERS.Highlights];
  static getters = [];

  ranges: RangeInputValue[] = [];
  focusedRangeIndex: number | null = null;
  private inputSheetId: UID;

  constructor(
    config: UIPluginConfig,
    initialRanges: string[],
    readonly inputHasSingleRange: boolean
  ) {
    if (inputHasSingleRange && initialRanges.length > 1) {
      throw new Error(
        "Input with a single range cannot be instantiated with several range references."
      );
    }
    super(config);
    this.insertNewRange(0, initialRanges);
    this.inputSheetId = this.getters.getActiveSheetId();
    if (this.ranges.length === 0) {
      this.insertNewRange(this.ranges.length, [""]);
      this.focusLast();
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handleEvent(event: SelectionEvent) {
    if (this.focusedRangeIndex === null) {
      return;
    }

    const inputSheetId = this.inputSheetId;
    const activeSheetId = this.getters.getActiveSheetId();
    const zone = event.options.unbounded
      ? this.getters.getUnboundedZone(activeSheetId, event.anchor.zone)
      : event.anchor.zone;
    const range = this.getters.getRangeFromZone(activeSheetId, zone);

    const willAddNewRange =
      event.mode === "newAnchor" &&
      !this.inputHasSingleRange &&
      this.ranges[this.focusedRangeIndex].xc.trim() !== "";

    if (willAddNewRange) {
      const xc = this.getters.getSelectionRangeString(range, inputSheetId);
      this.insertNewRange(this.ranges.length, [xc]);
      this.focusLast();
    } else {
      let parts = range.parts;
      const previousXc = this.ranges[this.focusedRangeIndex].xc.trim();
      if (previousXc) {
        parts = this.getters.getRangeFromSheetXC(inputSheetId, previousXc).parts;
      }
      const newRange = range.clone({ parts });
      const xc = this.getters.getSelectionRangeString(newRange, inputSheetId);
      this.setRange(this.focusedRangeIndex, [xc]);
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNFOCUS_SELECTION_INPUT":
        this.unfocus();
        break;
      case "FOCUS_RANGE":
        this.focus(this.getIndex(cmd.rangeId));
        break;
      case "CHANGE_RANGE": {
        const index = this.getIndex(cmd.rangeId);
        if (index !== null && this.focusedRangeIndex !== index) {
          this.focus(index);
        }
        if (index !== null) {
          const valueWithoutLeadingComma = cmd.value.replace(/^,+/, "");
          const values = valueWithoutLeadingComma.split(",").map((reference) => reference.trim());
          this.setRange(index, values);
        }
        break;
      }
      case "ADD_EMPTY_RANGE":
        this.insertNewRange(this.ranges.length, [""]);
        this.focusLast();
        break;
      case "ADD_RANGE":
        this.insertNewRange(this.ranges.length, [cmd.value]);
        this.focusLast();
        break;
      case "REMOVE_RANGE":
        const index = this.getIndex(cmd.rangeId);
        if (index !== null) {
          this.removeRange(index);
        }
        break;
      case "ACTIVATE_SHEET": {
        if (cmd.sheetIdFrom !== cmd.sheetIdTo) {
          const { col, row } = this.getters.getNextVisibleCellPosition({
            sheetId: cmd.sheetIdTo,
            col: 0,
            row: 0,
          });
          const zone = this.getters.expandZone(cmd.sheetIdTo, positionToZone({ col, row }));
          this.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
        break;
      }
      case "START_CHANGE_HIGHLIGHT":
        const activeSheetId = this.getters.getActiveSheetId();
        const newZone = this.getters.expandZone(activeSheetId, cmd.zone);
        const focusIndex = this.ranges.findIndex((range) => {
          const { xc, sheetName: sheet } = splitReference(range.xc);
          const sheetName = sheet || this.getters.getSheetName(this.inputSheetId);
          if (this.getters.getSheetName(activeSheetId) !== sheetName) {
            return false;
          }
          const refRange = this.getters.getRangeFromSheetXC(activeSheetId, xc);
          return isEqual(this.getters.expandZone(activeSheetId, refRange.zone), newZone);
        });

        if (focusIndex !== -1) {
          this.focus(focusIndex);
          const { left, top } = newZone;
          this.selection.resetAnchor(this, { cell: { col: left, row: top }, zone: newZone });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters || only callable by the parent
  // ---------------------------------------------------------------------------

  getSelectionInputValue(): string[] {
    return this.cleanInputs(
      this.ranges.map((range) => {
        return range.xc ? range.xc : "";
      })
    );
  }

  getSelectionInputHighlights(): Highlight[] {
    return this.ranges.map((input) => this.inputToHighlights(input)).flat();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  /**
   * Focus a given range or remove the focus.
   */
  private focus(index: number | null) {
    this.focusedRangeIndex = index;
  }

  private focusLast() {
    this.focus(this.ranges.length - 1);
  }

  private unfocus() {
    this.focusedRangeIndex = null;
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

  private removeRange(index: number) {
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
      .filter((reference) => this.shouldBeHighlighted(this.inputSheetId, reference));
    return XCs.map((xc) => {
      const { sheetName } = splitReference(xc);
      return {
        zone: this.getters.getRangeFromSheetXC(this.inputSheetId, xc).zone,
        sheetId: (sheetName && this.getters.getSheetIdByName(sheetName)) || this.inputSheetId,
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
  /**
   * Return the index of a range given its id
   * or `null` if the range is not found.
   */
  getIndex(rangeId: number | null): number | null {
    const index = this.ranges.findIndex((range) => range.id === rangeId);
    return index >= 0 ? index : null;
  }
}
