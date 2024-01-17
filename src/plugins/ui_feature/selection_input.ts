import { colors, positionToZone, splitReference } from "../../helpers/index";
import { StreamCallbacks } from "../../selection_stream/event_stream";
import { SelectionEvent } from "../../types/event_stream";
import { Color, Command, Highlight, LAYERS, UID } from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

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
  private activeSheet: UID;
  private willAddNewRange: boolean = false;

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
    this.activeSheet = this.getters.getActiveSheetId();
    if (this.ranges.length === 0) {
      this.insertNewRange(this.ranges.length, [""]);
      this.focusLast();
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handleEvent(event: SelectionEvent) {
    const inputSheetId = this.activeSheet;
    const sheetId = this.getters.getActiveSheetId();
    const zone = event.anchor.zone;
    const range = this.getters.getRangeFromZone(
      sheetId,
      event.options.unbounded ? this.getters.getUnboundedZone(sheetId, zone) : zone
    );
    this.add([this.getters.getSelectionRangeString(range, inputSheetId)]);
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
          this.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
      }
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
  /**
   * Return the index of a range given its id
   * or `null` if the range is not found.
   */
  getIndex(rangeId: number | null): number | null {
    const index = this.ranges.findIndex((range) => range.id === rangeId);
    return index >= 0 ? index : null;
  }
}
