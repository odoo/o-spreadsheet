import { BasePlugin } from "../base_plugin";
import { Command, LAYERS, Highlight, CancelledReason, CommandResult } from "../types/index";
import { Mode } from "../model";
import { uuidv4, getNextColor } from "../helpers/index";
import { SelectionMode } from "./selection";
import { rangeReference } from "../formulas/index";

interface RangeInputValue {
  id: string;
  xc: string;
  color?: string | null;
}

/**
 * Selection input Plugin
 *
 * The SelectionInput component input and output are both arrays of strings, but
 * it requires an intermediary internal state to work.
 * This plugin handles this internal state.
 */
export class SelectionInputPlugin extends BasePlugin {
  static modes: Mode[] = ["normal", "readonly"];
  static layers = [LAYERS.Highlights];
  static getters = ["getSelectionInput", "getSelectionInputValue"];

  private inputs: {
    [id: string]: RangeInputValue[];
  } = {};
  private activeSheets: {
    [id: string]: string;
  } = {};
  private inputMaximums: { [id: string]: number } = {};
  private focusedInput: string | null = null;
  private focusedRange: number | null = null;
  private willAddNewRange: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "FOCUS_RANGE":
        const index = this.getIndex(cmd.id, cmd.rangeId);
        if (this.focusedInput === cmd.id && this.focusedRange === index) {
          return { status: "CANCELLED", reason: CancelledReason.InputAlreadyFocused };
        }
        break;
      case "ADD_EMPTY_RANGE":
        if (this.inputs[cmd.id].length === this.inputMaximums[cmd.id]) {
          return { status: "CANCELLED", reason: CancelledReason.MaximumRangesReached };
        }
        break;
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ENABLE_NEW_SELECTION_INPUT":
        this.initInput(cmd.id, cmd.initialRanges || [], cmd.maximumRanges);
        break;
      case "DISABLE_SELECTION_INPUT":
        if (this.focusedInput === cmd.id) {
          this.dispatch("HIGHLIGHT_SELECTION", { enabled: false });
          this.dispatch("REMOVE_ALL_HIGHLIGHTS");
          this.focusedRange = null;
          this.focusedInput = null;
        }
        delete this.inputs[cmd.id];
        delete this.activeSheets[cmd.id];
        delete this.inputMaximums[cmd.id];
        break;
      case "FOCUS_RANGE":
        this.focus(cmd.id, this.getIndex(cmd.id, cmd.rangeId));
        break;
      case "CHANGE_RANGE": {
        const index = this.getIndex(cmd.id, cmd.rangeId);
        if (index !== null) {
          this.changeRange(cmd.id, index, cmd.value);
        }
        break;
      }
      case "ADD_EMPTY_RANGE":
        this.inputs[cmd.id] = [...this.inputs[cmd.id], Object.freeze({ xc: "", id: uuidv4() })];
        this.focusLast(cmd.id);
        break;
      case "REMOVE_RANGE":
        const index = this.getIndex(cmd.id, cmd.rangeId);
        if (index !== null) {
          this.removeRange(cmd.id, index);
        }
        break;
      case "ADD_HIGHLIGHTS":
        const highlights = this.getters.getHighlights();
        this.add(highlights.slice(highlights.length - Object.keys(cmd.ranges).length));
        break;
      case "START_SELECTION_EXPANSION":
        if (this.willAddNewRange) {
          this.dispatch("RESET_PENDING_HIGHLIGHT");
        }
        break;
      case "PREPARE_SELECTION_EXPANSION": {
        const [id, index] = [this.focusedInput, this.focusedRange];
        if (id !== null && index !== null) {
          this.willAddNewRange = this.inputs[id][index].xc.trim() !== "";
        }
        break;
      }
      case "ACTIVATE_SHEET":
        if (this.focusedInput !== null && this.focusedRange !== null) {
          this.highlightAllRanges(this.focusedInput);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getSelectionInput(id: string): (RangeInputValue & { isFocused: boolean })[] {
    if (!this.inputs[id]) {
      return [];
    }
    return this.inputs[id].map((input, index) =>
      Object.assign({}, input, {
        color: this.focusedInput === id && this.focusedRange !== null ? input.color : null,
        isFocused: this.focusedInput === id && this.focusedRange === index,
      })
    );
  }

  /**
   * Return a list of all valid XCs.
   * e.g. ["A1", "Sheet2!B3", "E12"]
   */
  getSelectionInputValue(id: string): string[] {
    return this.cleanInputs(this.inputs[id].map((range) => range.xc));
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private initInput(id: string, initialRanges: string[], maximumRanges?: number) {
    this.inputs[id] = initialRanges.map((r) =>
      Object.freeze({
        xc: r,
        id: uuidv4(),
      })
    ) as RangeInputValue[];
    this.activeSheets[id] = this.getters.getActiveSheet().id;
    if (maximumRanges !== undefined) {
      this.inputMaximums[id] = maximumRanges;
    }
    if (this.inputs[id].length === 0) {
      this.dispatch("ADD_EMPTY_RANGE", { id });
    }
  }

  /**
   * Focus a given range or remove the focus.
   */
  private focus(id: string, index: number | null) {
    const currentFocusedInput = this.focusedInput;
    const currentFocusedRange = this.focusedInput && this.focusedRange;
    this.focusedInput = id;

    if (currentFocusedRange !== null && index == null) {
      this.dispatch("HIGHLIGHT_SELECTION", { enabled: false });
      this.removeAllHighlights();
      const activeSheetId = this.getters.getActiveSheetId();
      if (this.activeSheets[id] !== activeSheetId) {
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: activeSheetId,
          sheetIdTo: this.activeSheets[id],
        })
      }
    }
    if (currentFocusedInput !== null && id !== null && currentFocusedInput !== id) {
      this.removeAllHighlights();
    }
    if ((currentFocusedRange === null && index !== null) || currentFocusedInput !== id) {
      this.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
      this.highlightAllRanges(id);
    }

    this.setPendingRange(id, index);
    if (index !== null) {
      const color = this.inputs[id][index].color || getNextColor();
      this.dispatch("SET_HIGHLIGHT_COLOR", { color });
    }
    this.focusedRange = index;
  }

  private focusLast(id: string) {
    this.focus(id, this.inputs[id].length - 1);
  }

  private removeAllHighlights() {
    this.dispatch("REMOVE_ALL_HIGHLIGHTS");
  }

  /**
   * Highlight all valid ranges of the current sheet.
   */
  private highlightAllRanges(id: string) {
    const inputs = this.inputs[id];
    for (const [index, input] of inputs.entries()) {
      this.focusedRange = index;
      const ranges = this.inputToHighlights(id, input);
      if (Object.keys(ranges).length > 0) {
        this.dispatch("ADD_HIGHLIGHTS", { ranges });
      }
    }
  }

  private add(newHighlights: Highlight[]) {
    if (
      this.focusedInput === null ||
      this.focusedRange === null ||
      this.getters.isSelectingForComposer() ||
      newHighlights.length === 0
    ) {
      return;
    }
    const mode = this.getters.getSelectionMode();
    const sheet = this.activeSheets[this.focusedInput];
    if (mode === SelectionMode.expanding && this.willAddNewRange) {
      this.addNewRange(this.focusedInput, this.highlightsToInput(newHighlights, sheet));
      this.focusLast(this.focusedInput);
      this.willAddNewRange = false;
    } else {
      this.setRange(
        this.focusedInput,
        this.focusedRange,
        this.highlightsToInput(newHighlights, sheet)
      );
    }
  }

  /**
   * Add a new input at the end.
   */
  private addNewRange(id: string, values: RangeInputValue[]) {
    this.insertNewRange(id, this.inputs[id].length, values);
  }

  /**
   * Insert new inputs after the given index.
   */
  private insertNewRange(id: string, index: number, values: RangeInputValue[]) {
    if (this.inputMaximums[id] < this.inputs[id].length + values.length) {
      return;
    }
    this.inputs[id].splice(index, 0, ...values);
  }

  private setRange(id: string, index: number, values: RangeInputValue[]) {
    let [existingRange, ...newRanges] = values;
    const additionalRanges = this.inputs[id].length + newRanges.length - this.inputMaximums[id];
    if (additionalRanges) {
      newRanges = newRanges.slice(0, newRanges.length - additionalRanges);
    }
    this.inputs[id].splice(index, 1, existingRange, ...newRanges);
    // focus the last newly added range
    if (newRanges.length) {
      this.focus(id, index + newRanges.length);
    }
  }

  private changeRange(id: string, index: number, value: string) {
    if (this.focusedInput !== id || this.focusedRange !== index) {
      this.dispatch("FOCUS_RANGE", { id, rangeId: this.inputs[id][index].id });
    }
    const input = this.inputs[id][index];
    const valuesNotHighlighted = value
      .split(",")
      .map((reference) => reference.trim())
      .filter((reference) => !this.shouldBeHighlighted(this.activeSheets[id], reference));
    const highlightRanges = this.inputToHighlights(id, {
      color: input.color,
      xc: value,
    });
    this.dispatch("REMOVE_HIGHLIGHTS", { ranges: this.inputToHighlights(id, input) });
    this.dispatch("ADD_HIGHLIGHTS", {
      ranges: highlightRanges,
    });
    const highlightNumber = Object.keys(highlightRanges).length;
    const setRange = highlightNumber ? this.insertNewRange.bind(this) : this.setRange.bind(this);
    setRange(
      id,
      index + highlightNumber,
      valuesNotHighlighted.map((value) => ({
        id: uuidv4(),
        xc: value,
      }))
    );
  }

  private removeRange(id: string, index: number) {
    const [removedRange] = this.inputs[id].splice(index, 1);
    if (this.focusedInput === id && this.focusedRange !== null) {
      this.dispatch("REMOVE_HIGHLIGHTS", {
        ranges: this.inputToHighlights(id, removedRange),
      });
      this.focusLast(id);
    }
  }

  private setPendingRange(id: string, index: number | null) {
    this.dispatch("RESET_PENDING_HIGHLIGHT");
    if (index !== null && this.inputs[id][index].xc) {
      this.dispatch("ADD_PENDING_HIGHLIGHTS", {
        ranges: this.inputToHighlights(id, this.inputs[id][index]),
      });
    }
  }

  /**
   * Convert highlights to the input format
   */
  private highlightsToInput(highlights: Highlight[], activeSheetId: string): RangeInputValue[] {
    const toXC = this.getters.zoneToXC;
    return highlights.map((h) =>
      Object.freeze({
        xc:
          h.sheet !== activeSheetId
            ? `${this.getters.getSheetName(h.sheet)}!${toXC(h.zone)}`
            : toXC(h.zone),
        id: uuidv4(),
        color: h.color,
      })
    );
  }

  /**
   * Convert highlights input format to the command format.
   * The first xc in the input range will keep its color.
   * Invalid ranges and ranges from other sheets than the active sheets
   * are ignored.
   */
  private inputToHighlights(
    id: string,
    { xc, color }: Pick<RangeInputValue, "xc" | "color">
  ): { [range: string]: string } {
    const ranges = this.cleanInputs([xc]).filter((reference) =>
      this.shouldBeHighlighted(this.activeSheets[id], reference)
    );
    if (ranges.length === 0) return {};
    const [fromInput, ...otherRanges] = ranges;
    const highlights: { [range: string]: string } = {
      [fromInput]: color || getNextColor(),
    };
    for (const range of otherRanges) {
      highlights[range] = getNextColor();
    }
    return highlights;
  }

  private isRangeValid(xc: string): boolean {
    const [rangeXc, sheetName] = xc.split("!").reverse();
    return (
      rangeXc.match(rangeReference) !== null &&
      (sheetName === undefined || this.getters.getSheetIdByName(sheetName) !== undefined)
    );
  }

  private cleanInputs(ranges: string[]): string[] {
    return ranges
      .map((xc) => xc.split(","))
      .flat()
      .map((xc) => xc.trim())
      .filter((xc) => xc !== "")
      .filter((range) => this.isRangeValid(range));
  }

  /**
   * Check if a cell or range reference should be highlighted.
   * It should be highlighted if it references the current active sheet.
   * Note that if no sheet name is given in the reference ("A1"), it refers to the
   * active sheet when the selection input was enabled which might be different from
   * the current active sheet.
   */
  private shouldBeHighlighted(inputSheetId: string, reference: string): boolean {
    const sheetName = reference.split("!").reverse()[1];
    const sheetId = this.getters.getSheetIdByName(sheetName);
    const activeSheetId = this.getters.getActiveSheet().id;
    const valid = this.cleanInputs([reference]).length === 1;
    return (
      valid &&
      (sheetId === activeSheetId || (sheetId === undefined && activeSheetId === inputSheetId))
    );
  }

  /**
   * Return the index of a range given its id
   * or `null` if the range is not found.
   */
  private getIndex(id: string, rangeId: string | null): number | null {
    const index = this.inputs[id].findIndex((range) => range.id === rangeId);
    return index >= 0 ? index : null;
  }
}
