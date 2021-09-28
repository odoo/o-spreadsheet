import {
  getComposerSheetName,
  getNextColor,
  rangeReference,
  UuidGenerator,
  zoneToXc,
} from "../../helpers/index";
import { Mode } from "../../model";
import { Command, CommandResult, LAYERS, UID } from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { SelectionMode } from "./selection";

const uuidGenerator = new UuidGenerator();

export interface RangeInputValue {
  id: UID;
  xc: string;
  color: string;
}

/**
 * Selection input Plugin
 *
 * The SelectionInput component input and output are both arrays of strings, but
 * it requires an intermediary internal state to work.
 * This plugin handles this internal state.
 */
export class SelectionInputPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  static layers = [LAYERS.Highlights];
  static getters = [
    "getSelectionInput",
    "getSelectionInputValue",
    "isRangeValid",
    "getSelectionInputHighlights",
  ];

  private inputs: Record<UID, RangeInputValue[]> = {};
  private activeSheets: Record<UID, UID> = {};
  private inputMaximums: Record<UID, number> = {};
  private focusedInputId: UID | null = null;
  private focusedRange: number | null = null;
  private willAddNewRange: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "FOCUS_RANGE":
        const index = this.getIndex(cmd.id, cmd.rangeId);
        if (this.focusedInputId === cmd.id && this.focusedRange === index) {
          return CommandResult.InputAlreadyFocused;
        }
        break;
      case "ADD_EMPTY_RANGE":
        if (this.inputs[cmd.id].length === this.inputMaximums[cmd.id]) {
          return CommandResult.MaximumRangesReached;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ENABLE_NEW_SELECTION_INPUT":
        this.initInput(cmd.id, cmd.initialRanges || [], cmd.maximumRanges);
        break;
      case "DISABLE_SELECTION_INPUT":
        if (this.focusedInputId === cmd.id) {
          this.focusedRange = null;
          this.focusedInputId = null;
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
          const id = cmd.id;
          if (this.focusedInputId !== id || this.focusedRange !== index) {
            this.dispatch("FOCUS_RANGE", { id, rangeId: this.inputs[id][index].id });
          }
          const values = cmd.value.split(",").map((reference) => reference.trim());
          this.setRange(id, index, values);
        }
        break;
      }
      case "ADD_EMPTY_RANGE":
        this.insertNewRange(cmd.id, this.inputs[cmd.id].length, [""]);
        this.focusLast(cmd.id);
        break;
      case "REMOVE_RANGE":
        const index = this.getIndex(cmd.id, cmd.rangeId);
        if (index !== null) {
          this.removeRange(cmd.id, index);
        }
        break;
      case "SELECT_CELL":
      case "SET_SELECTION":
        if (!this.focusedInputId) {
          break;
        }
        const all = this.getSelectionInputValue(this.focusedInputId);
        const selectedZones = this.getters
          .getSelectedZones()
          .map(zoneToXc)
          .filter((zoneXc) => !all.includes(zoneXc));
        const inputSheetId = this.activeSheets[this.focusedInputId];
        const sheetId = this.getters.getActiveSheetId();
        const sheetName = this.getters.getSheetName(sheetId);
        this.add(
          selectedZones.map((xc) =>
            sheetId === inputSheetId ? xc : `${getComposerSheetName(sheetName)}!${xc}`
          )
        );
        break;
      case "PREPARE_SELECTION_EXPANSION": {
        const [id, index] = [this.focusedInputId, this.focusedRange];
        if (id !== null && index !== null) {
          this.willAddNewRange = this.inputs[id][index].xc.trim() !== "";
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  /**
   * Return a list of all valid XCs.
   * e.g. ["A1", "Sheet2!B3", "E12"]
   */
  getSelectionInput(id: UID): (RangeInputValue & { isFocused: boolean })[] {
    if (!this.inputs[id]) {
      return [];
    }
    return this.inputs[id].map((input, index) =>
      Object.assign({}, input, {
        color:
          this.focusedInputId === id && this.focusedRange !== null && this.isRangeValid(input.xc)
            ? input.color
            : null,
        isFocused: this.focusedInputId === id && this.focusedRange === index,
      })
    );
  }

  isRangeValid(xc: string): boolean {
    if (!xc) {
      return false;
    }
    const [rangeXc, sheetName] = xc.split("!").reverse();
    return (
      rangeXc.match(rangeReference) !== null &&
      (sheetName === undefined || this.getters.getSheetIdByName(sheetName) !== undefined)
    );
  }

  getSelectionInputValue(id: UID): string[] {
    return this.cleanInputs(
      this.inputs[id].map((range) => {
        return range.xc ? range.xc : "";
      })
    );
  }

  getSelectionInputHighlights(): [string, string][] {
    if (!this.focusedInputId) {
      return [];
    }
    return this.inputs[this.focusedInputId]
      .map((input) => this.inputToHighlights(this.focusedInputId!, input))
      .flat();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private initInput(id: UID, initialRanges: string[], maximumRanges?: number) {
    this.inputs[id] = [];
    this.insertNewRange(id, 0, initialRanges);
    this.activeSheets[id] = this.getters.getActiveSheetId();
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
  private focus(id: UID, index: number | null) {
    this.focusedInputId = id;
    this.focusedRange = index;
  }

  private focusLast(id: UID) {
    this.focus(id, this.inputs[id].length - 1);
  }

  private add(newRanges: string[]) {
    if (
      this.focusedInputId === null ||
      this.focusedRange === null ||
      this.getters.isSelectingForComposer() ||
      newRanges.length === 0
    ) {
      return;
    }
    const mode = this.getters.getSelectionMode();
    if (mode === SelectionMode.expanding && this.willAddNewRange) {
      const id = this.focusedInputId;
      this.insertNewRange(id, this.inputs[id].length, newRanges);
      this.focusLast(this.focusedInputId);
      this.willAddNewRange = false;
    } else {
      this.setRange(this.focusedInputId, this.focusedRange, newRanges);
    }
  }

  private setContent(id: string, index: number, xc: string) {
    this.inputs[id][index] = {
      ...this.inputs[id][index],
      id: uuidGenerator.uuidv4(),
      xc,
    };
  }

  /**
   * Insert new inputs after the given index.
   */
  private insertNewRange(id: string, index: number, values: string[]) {
    if (this.inputs[id].length + values.length > this.inputMaximums[id]) {
      values = values.slice(0, this.inputMaximums[id] - this.inputs[id].length);
    }
    this.inputs[id].splice(
      index,
      0,
      ...values.map((xc, i) => ({
        xc,
        id: (this.inputs[id].length + i + 1).toString(),
        color: getNextColor(),
      }))
    );
  }

  /**
   * Set a new value in a given range input. If more than one value is provided,
   * new inputs will be added.
   */
  private setRange(id: UID, index: number, values: string[]) {
    let [, ...additionalValues] = values;
    this.setContent(id, index, values[0]);
    this.insertNewRange(id, index + 1, additionalValues);
    // focus the last newly added range
    if (additionalValues.length) {
      this.focus(id, index + additionalValues.length);
    }
  }

  private removeRange(id: UID, index: number) {
    this.inputs[id].splice(index, 1);
    if (this.focusedInputId === id && this.focusedRange !== null) {
      this.focusLast(id);
    }
  }

  /**
   * Convert highlights input format to the command format.
   * The first xc in the input range will keep its color.
   * Invalid ranges and ranges from other sheets than the active sheets
   * are ignored.
   */
  private inputToHighlights(
    id: UID,
    { xc, color }: Pick<RangeInputValue, "xc" | "color">
  ): [string, string][] {
    const ranges = this.cleanInputs([xc])
      .filter((range) => this.isRangeValid(range))
      .filter((reference) => this.shouldBeHighlighted(this.activeSheets[id], reference));
    if (ranges.length === 0) return [];
    const [fromInput, ...otherRanges] = ranges;
    const highlights: [string, string][] = [[fromInput, color || getNextColor()]];
    for (const range of otherRanges) {
      highlights.push([range, getNextColor()]);
    }
    return highlights;
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
    const sheetName = reference.split("!").reverse()[1];
    const sheetId = this.getters.getSheetIdByName(sheetName);
    const activeSheetId = this.getters.getActiveSheet().id;
    const valid = this.isRangeValid(reference);
    return (
      valid &&
      (sheetId === activeSheetId || (sheetId === undefined && activeSheetId === inputSheetId))
    );
  }
  /**
   * Return the index of a range given its id
   * or `null` if the range is not found.
   */
  private getIndex(id: UID, rangeId: string | null): number | null {
    const index = this.inputs[id].findIndex((range) => range.id === rangeId);
    return index >= 0 ? index : null;
  }
}
