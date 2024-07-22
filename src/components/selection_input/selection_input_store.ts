import { ColorGenerator, isEqual, positionToZone, splitReference } from "../../helpers/index";
import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { HighlightStore } from "../../stores/highlight_store";
import { SelectionEvent } from "../../types/event_stream";
import { Color, Command, Highlight, UID } from "../../types/index";
import { FocusStore } from "../focus_store";

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
export class SelectionInputStore extends SpreadsheetStore {
  mutators = [
    "resetWithRanges",
    "focusById",
    "unfocus",
    "addEmptyRange",
    "removeRange",
    "changeRange",
    "reset",
    "confirm",
  ] as const;
  ranges: RangeInputValue[] = [];
  focusedRangeIndex: number | null = null;
  private inputSheetId: UID;
  private focusStore = this.get(FocusStore);
  protected highlightStore = this.get(HighlightStore);

  constructor(
    get: Get,
    private initialRanges: string[] = [],
    private readonly inputHasSingleRange: boolean = false,
    private readonly colors: Color[] = []
  ) {
    super(get);
    if (inputHasSingleRange && initialRanges.length > 1) {
      throw new Error(
        "Input with a single range cannot be instantiated with several range references."
      );
    }
    this.inputSheetId = this.getters.getActiveSheetId();
    this.resetWithRanges(initialRanges);
    this.highlightStore.register(this);
    this.onDispose(() => {
      this.unfocus();
      this.highlightStore.unRegister(this);
    });
  }

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
          this.model.selection.resetAnchor(this, {
            cell: { col: left, row: top },
            zone: newZone,
          });
        }
        break;
    }
  }

  changeRange(rangeId: number, value: string) {
    if (this.inputHasSingleRange && value.split(",").length > 1) {
      return;
    }
    const index = this.getIndex(rangeId);
    if (index !== null && this.focusedRangeIndex !== index) {
      this.focus(index);
    }
    if (index !== null) {
      const valueWithoutLeadingComma = value.replace(/^,+/, "");
      const values = valueWithoutLeadingComma.split(",").map((reference) => reference.trim());
      this.setRange(index, values);
      this.captureSelection();
    }
  }

  addEmptyRange() {
    if (this.inputHasSingleRange && this.ranges.length === 1) {
      return;
    }
    this.insertNewRange(this.ranges.length, [""]);
    this.focusLast();
  }

  removeRange(rangeId: number) {
    if (this.ranges.length === 1) {
      return;
    }
    const index = this.getIndex(rangeId);
    if (index !== null) {
      this.removeRangeByIndex(index);
    }
  }

  confirm() {
    for (const range of this.selectionInputs) {
      if (range.xc === "") {
        this.removeRange(range.id);
      }
    }
    const activeSheetId = this.getters.getActiveSheetId();
    if (this.inputSheetId !== activeSheetId) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: this.inputSheetId,
      });
    }
    if (this.selectionInputValues.join() !== this.initialRanges.join()) {
      this.resetWithRanges(this.selectionInputValues);
    }
    this.initialRanges = this.selectionInputValues;
    this.unfocus();
  }

  reset() {
    this.resetWithRanges(this.initialRanges);
    this.confirm();
  }

  get selectionInputValues(): string[] {
    return this.cleanInputs(
      this.ranges.map((range) => {
        return range.xc ? range.xc : "";
      })
    );
  }

  /**
   * Return a list of all valid XCs.
   * e.g. ["A1", "Sheet2!B3", "E12"]
   */
  get selectionInputs(): (RangeInputValue & { isFocused: boolean; isValidRange: boolean })[] {
    const generator = new ColorGenerator(this.ranges.length, this.colors);
    return this.ranges.map((input, index) =>
      Object.assign({}, input, {
        color:
          this.hasMainFocus &&
          this.focusedRangeIndex !== null &&
          this.getters.isRangeValid(input.xc)
            ? generator.next()
            : null,
        isFocused: this.hasMainFocus && this.focusedRangeIndex === index,
        isValidRange: input.xc === "" || this.getters.isRangeValid(input.xc),
      })
    );
  }

  get isResettable(): boolean {
    return this.initialRanges.join() !== this.ranges.map((r) => r.xc).join();
  }

  get isConfirmable(): boolean {
    const hasFocus = this.selectionInputs.some((i) => i.isFocused);
    return hasFocus && this.selectionInputs.every((range) => range.isValidRange);
  }

  private get hasMainFocus() {
    const focusedElement = this.focusStore.focusedElement;
    return !!focusedElement && focusedElement === this;
  }

  get highlights(): Highlight[] {
    if (!this.hasMainFocus) {
      return [];
    }
    // TODO expand zone globally
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
    this.focusedRangeIndex = null;
    this.focusStore.unfocus(this);
    this.model.selection.release(this);
  }

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
      {
        handleEvent: this.handleEvent.bind(this),
        release: this.unfocus.bind(this),
      }
    );
  }

  resetWithRanges(ranges: string[]) {
    this.ranges = [];
    this.insertNewRange(0, ranges);
    if (this.ranges.length === 0) {
      this.insertNewRange(this.ranges.length, [""]);
      this.focusLast();
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
    const colors = new ColorGenerator(this.ranges.length, this.colors);
    for (let i = 0; i < index; i++) {
      colors.next();
    }
    this.ranges.splice(
      index,
      0,
      ...values.map((xc, i) => ({
        xc,
        id: currentMaxId + i + 1,
        color: colors.next(),
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
   * Converts highlights input format to the command format.
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
        interactive: true,
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
