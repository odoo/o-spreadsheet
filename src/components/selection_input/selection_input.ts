import { Component, onWillUpdateProps, useEffect, useRef, useState } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { Color, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";
import { RangeInputValue, SelectionInputStore } from "./selection_input_store";

css/* scss */ `
  .o-selection {
    .o-selection-input {
      padding: 2px 0px;

      input {
        padding: 4px 6px;
        border-radius: 4px;
        box-sizing: border-box;
      }
      input:focus {
        outline: none;
      }
      input.o-required,
      input.o-focused {
        border: 1px solid;
      }
      input.o-focused {
        border-width: 2px;
        padding: 3px 5px;
      }
      input.o-invalid {
        /* The background-color is similar to the bootstrap alert-danger class but, because of the commit 0358a76d,
         * which avoids being parasitized by the dark-mode in spreadsheet, we cannot use this class.
         * TODO: Replace with the bootstrap alert-danger class when we support dark mode
         */
        background-color: #ffdddd;
        border-width: 2px;
      }
      button.o-btn {
        color: #333;
      }
      button.o-btn-action {
        margin: 8px 1px;
        border-radius: 4px;
        border: 1px solid #dadce0;
        color: #188038;
        font-size: 14px;
        height: 25px;
      }
      .error-icon {
        right: 7px;
        top: 7px;
      }
    }
    /** Make the character a bit bigger
    compared to its neighbor INPUT box  */
    .o-remove-selection {
      font-size: calc(100% + 4px);
    }
  }
`;

interface Props {
  ranges: string[];
  hasSingleRange?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  class?: string;
  onSelectionChanged?: (ranges: string[]) => void;
  onSelectionConfirmed?: () => void;
  forceSheet: boolean;
}

type SelectionRangeEditMode = "select-range" | "text-edit";

interface State {
  isMissing: boolean;
  mode: SelectionRangeEditMode;
}

interface SelectionRange extends Omit<RangeInputValue, "color"> {
  isFocused: boolean;
  isValidRange: boolean;
  color?: Color;
}
/**
 * This component can be used when the user needs to input some
 * ranges. He can either input the ranges with the regular DOM `<input/>`
 * displayed or by selecting zones on the grid.
 *
 * onSelectionChanged is called every time the input value
 * changes.
 */
export class SelectionInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SelectionInput";
  static props = {
    ranges: Array,
    hasSingleRange: { type: Boolean, optional: true },
    required: { type: Boolean, optional: true },
    isInvalid: { type: Boolean, optional: true },
    class: { type: String, optional: true },
    onSelectionChanged: { type: Function, optional: true },
    onSelectionConfirmed: { type: Function, optional: true },
    forceSheet: { type: Boolean, optional: true },
  };
  private state: State = useState({
    isMissing: false,
    mode: "select-range",
  });
  private focusedInput = useRef("focusedInput");
  private store!: Store<SelectionInputStore>;

  get ranges(): SelectionRange[] {
    return this.store.selectionInputs;
  }

  get canAddRange(): boolean {
    return !this.props.hasSingleRange;
  }

  get isInvalid(): boolean {
    return this.props.isInvalid || this.state.isMissing;
  }

  get isConfirmable(): boolean {
    return this.store.isConfirmable;
  }

  get isResettable(): boolean {
    return this.store.isResettable;
  }

  setup() {
    useEffect(
      () => this.focusedInput.el?.focus(),
      () => [this.focusedInput.el]
    );
    this.store = useLocalStore(
      SelectionInputStore,
      this.props.ranges,
      this.props.hasSingleRange || false,
      this.props.forceSheet
    );
    onWillUpdateProps((nextProps) => {
      if (nextProps.ranges.join() !== this.store.selectionInputValues.join()) {
        this.triggerChange();
      }
      if (
        nextProps.ranges.join() !== this.props.ranges.join() &&
        nextProps.ranges.join() !== this.store.selectionInputValues.join()
      ) {
        this.store.resetWithRanges(nextProps.ranges);
      }
    });
  }

  getColor(range: SelectionRange) {
    const color = range.color || "#000";
    return "color: " + color + ";";
  }

  private triggerChange() {
    const ranges = this.store.selectionInputValues;
    this.props.onSelectionChanged?.(ranges);
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "F2") {
      ev.preventDefault();
      ev.stopPropagation();
      this.state.mode = this.state.mode === "select-range" ? "text-edit" : "select-range";
    } else if (ev.key.startsWith("Arrow")) {
      ev.stopPropagation();
      if (this.state.mode === "select-range") {
        ev.preventDefault();
        updateSelectionWithArrowKeys(ev, this.env.model.selection);
      }
    } else if (ev.key === "Enter") {
      const target = ev.target as HTMLInputElement;
      target.blur();
      this.confirm();
    }
  }

  private extractRanges(value: string): string {
    return this.props.hasSingleRange ? value.split(",")[0] : value;
  }

  focus(rangeId: number) {
    this.state.isMissing = false;
    this.state.mode = "select-range";
    this.store.focusById(rangeId);
  }

  addEmptyInput() {
    this.store.addEmptyRange();
  }

  removeInput(rangeId: number) {
    this.store.removeRange(rangeId);
    this.triggerChange();
    this.props.onSelectionConfirmed?.();
  }

  onInputChanged(rangeId: number, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    const value = this.extractRanges(target.value);
    this.store.changeRange(rangeId, value);
    this.triggerChange();
  }

  reset() {
    this.store.reset();
    this.triggerChange();
  }

  confirm() {
    this.store.confirm();
    const anyValidInput = this.store.selectionInputs.some((range) =>
      this.env.model.getters.isRangeValid(range.xc)
    );
    if (this.props.required && !anyValidInput) {
      this.state.isMissing = true;
    }
    this.props.onSelectionChanged?.(this.store.selectionInputValues);
    this.props.onSelectionConfirmed?.();
  }
}
