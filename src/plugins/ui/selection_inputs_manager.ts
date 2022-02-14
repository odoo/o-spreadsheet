import { positionToZone, rangeReference } from "../../helpers/index";
import { Mode, ModelConfig } from "../../model";
import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { StateObserver } from "../../state_observer";
import { Command, CommandDispatcher, CommandResult, Getters, LAYERS, UID } from "../../types/index";
import { UIPlugin } from "../ui_plugin";
import { SelectionInputPlugin } from "./selection_input";

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
export class SelectionInputsManagerPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
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

  constructor(
    getters: Getters,
    private state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    private config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(getters, state, dispatch, config, selection);
  }
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "FOCUS_RANGE":
        const index = this.currentInput?.getIndex(cmd.rangeId);
        if (this.focusedInputId === cmd.id && this.currentInput?.focusedRangeIndex === index) {
          return CommandResult.InputAlreadyFocused;
        }
        break;
    }
    if (this.currentInput) {
      return this.currentInput.allowDispatch(cmd);
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
      case "FOCUS_RANGE":
      case "CHANGE_RANGE":
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
    return this.inputs[id].getSelectionInputValue();
  }

  getSelectionInputHighlights(): [string, string][] {
    if (!this.focusedInputId) {
      return [];
    }
    return this.inputs[this.focusedInputId].getSelectionInputHighlights();
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private initInput(id: UID, initialRanges: string[], inputHasSingleRange: boolean = false) {
    this.inputs[id] = new SelectionInputPlugin(
      this.getters,
      this.state,
      this.dispatch,
      this.config,
      this.selection,
      initialRanges,
      inputHasSingleRange
    );
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
