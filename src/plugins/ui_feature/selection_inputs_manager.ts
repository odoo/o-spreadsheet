import { positionToZone, rangeReference, splitReference } from "../../helpers/index";
import { Command, CommandResult, Highlight, LAYERS, UID } from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";
import { RangeInputValue, SelectionInputPlugin } from "./selection_input";

/**
 * Selection input Plugin
 *
 * The SelectionInput component input and output are both arrays of strings, but
 * it requires an intermediary internal state to work.
 * This plugin handles this internal state.
 */
export class SelectionInputsManagerPlugin extends UIPlugin {
  static layers = [LAYERS.Highlights];
  static getters = [
    "getSelectionInput",
    "getSelectionInputValue",
    "isRangeValid",
    "getSelectionInputHighlights",
  ] as const;

  private inputs: Record<UID, SelectionInputPlugin> = {};
  private focusedInputId: UID | null = null;

  get currentInput(): SelectionInputPlugin | null {
    return this.focusedInputId ? this.inputs[this.focusedInputId] : null;
  }

  constructor(private config: UIPluginConfig) {
    super(config);
  }
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "FOCUS_RANGE":
      case "CHANGE_RANGE":
      case "ADD_EMPTY_RANGE":
      case "REMOVE_RANGE":
        if (!this.inputs[cmd.id]) {
          return CommandResult.InvalidInputId;
        }
    }

    switch (cmd.type) {
      case "FOCUS_RANGE":
        const index = this.currentInput?.getIndex(cmd.rangeId);
        if (this.focusedInputId === cmd.id && this.currentInput?.focusedRangeIndex === index) {
          return CommandResult.InputAlreadyFocused;
        }
        break;
      case "ADD_EMPTY_RANGE":
        const input = this.inputs[cmd.id];
        if (input.inputHasSingleRange && input.ranges.length === 1) {
          return CommandResult.MaximumRangesReached;
        }
        break;
      case "CHANGE_RANGE": {
        const input = this.inputs[cmd.id];
        if (input.inputHasSingleRange && cmd.value.split(",").length > 1) {
          return CommandResult.MaximumRangesReached;
        }
        break;
      }
    }

    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ENABLE_NEW_SELECTION_INPUT":
        this.initInput(cmd.id, cmd.initialRanges || [], cmd.hasSingleRange);
        break;
      case "DISABLE_SELECTION_INPUT":
        if (this.focusedInputId === cmd.id) {
          this.unfocus();
        }
        delete this.inputs[cmd.id];
        break;
      case "UNFOCUS_SELECTION_INPUT":
        this.unfocus();
        break;

      case "ADD_EMPTY_RANGE":
      case "REMOVE_RANGE":
        if (cmd.id !== this.focusedInputId) {
          const input = this.inputs[cmd.id];
          this.selection.capture(
            input,
            { cell: { col: 0, row: 0 }, zone: positionToZone({ col: 0, row: 0 }) },
            { handleEvent: input.handleEvent.bind(input) }
          );
          this.focusedInputId = cmd.id;
        }
        break;
      case "FOCUS_RANGE":
      case "CHANGE_RANGE":
        if (cmd.id !== this.focusedInputId) {
          const input = this.inputs[cmd.id];
          const range = input.ranges.find((range) => range.id === cmd.rangeId);
          const sheetId = this.getters.getActiveSheetId();
          const zone = this.getters.getRangeFromSheetXC(sheetId, range?.xc || "A1").zone;
          this.selection.capture(
            input,
            { cell: { col: zone.left, row: zone.top }, zone },
            { handleEvent: input.handleEvent.bind(input) }
          );
          this.focusedInputId = cmd.id;
        }
        break;
    }
    this.currentInput?.handle(cmd);
  }

  unsubscribe() {
    this.unfocus();
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
    return this.inputs[id].ranges.map((input, index) =>
      Object.assign({}, input, {
        color:
          this.focusedInputId === id &&
          this.inputs[id].focusedRangeIndex !== null &&
          this.isRangeValid(input.xc)
            ? input.color
            : null,
        isFocused: this.focusedInputId === id && this.inputs[id].focusedRangeIndex === index,
      })
    );
  }

  isRangeValid(reference: string): boolean {
    if (!reference) {
      return false;
    }
    const { xc, sheetName } = splitReference(reference);
    return (
      xc.match(rangeReference) !== null &&
      (!sheetName || this.getters.getSheetIdByName(sheetName) !== undefined)
    );
  }

  getSelectionInputValue(id: UID): string[] {
    return this.inputs[id].getSelectionInputValue();
  }

  getSelectionInputHighlights(): Highlight[] {
    if (!this.focusedInputId) {
      return [];
    }
    return this.inputs[this.focusedInputId].getSelectionInputHighlights();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private initInput(id: UID, initialRanges: string[], inputHasSingleRange: boolean = false) {
    this.inputs[id] = new SelectionInputPlugin(this.config, initialRanges, inputHasSingleRange);
    if (initialRanges.length === 0) {
      const input = this.inputs[id];
      const anchor = {
        zone: positionToZone({ col: 0, row: 0 }),
        cell: { col: 0, row: 0 },
      };
      this.selection.capture(input, anchor, { handleEvent: input.handleEvent.bind(input) });
      this.focusedInputId = id;
    }
  }

  private unfocus() {
    this.selection.release(this.currentInput!);
    this.focusedInputId = null;
  }
}
