import { Component, onMounted, onPatched, useEffect, useRef, useState } from "@odoo/owl";
import { SELECTION_BORDER_COLOR } from "../../constants";
// import { UuidGenerator } from "../../helpers/index";
import { RangeInputValue } from "../../plugins/ui_feature/selection_input";
import { Store } from "../../store/dependency_container";
import { SelectionInputStore } from "../../store/selection_input_store";
import { useLocalStore } from "../../store/store_hooks";
import { SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";

// const uuidGenerator = new UuidGenerator();

css/* scss */ `
  .o-selection {
    .o-selection-input {
      display: flex;
      flex-direction: row;

      input {
        padding: 4px 6px;
        border-radius: 4px;
        box-sizing: border-box;
        flex-grow: 2;
      }
      input:focus {
        outline: none;
      }
      input.o-required,
      input.o-focused {
        border-width: 2px;
        padding: 3px 5px;
      }
      input.o-focused {
        border-color: ${SELECTION_BORDER_COLOR};
      }
      input.o-invalid {
        border-color: red;
      }
      button.o-btn {
        background: transparent;
        border: none;
        color: #333;
        cursor: pointer;
      }
      button.o-btn-action {
        margin: 8px 1px;
        border-radius: 4px;
        background: transparent;
        border: 1px solid #dadce0;
        color: #188038;
        font-weight: bold;
        font-size: 14px;
        height: 25px;
      }
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
}

type SelectionRangeEditMode = "select-range" | "text-edit";

interface State {
  isMissing: boolean;
  mode: SelectionRangeEditMode;
}

interface SelectionRange extends Omit<RangeInputValue, "color"> {
  isFocused: boolean;
  isValidRange: boolean;
  color?: string;
}

let d = 0;
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
  // private id = uuidGenerator.uuidv4();
  private previousRanges: string[] = this.props.ranges || [];
  private originSheet = this.env.model.getters.getActiveSheetId();
  private state: State = useState({
    isMissing: false,
    mode: "select-range",
  });
  private focusedInput = useRef("focusedInput");
  private store!: Store<SelectionInputStore>;

  get ranges(): SelectionRange[] {
    // const existingSelectionRange = this.env.model.getters.getSelectionInput(this.id);
    const existingSelectionRange = this.store.selectionInputs;
    const ranges = existingSelectionRange.length
      ? existingSelectionRange
      : this.props.ranges
      ? this.props.ranges.map((xc, id) => ({
          xc,
          id,
          isFocused: false,
        }))
      : [];
    return ranges.map((range) => ({
      ...range,
      isValidRange: range.xc === "" || this.env.model.getters.isRangeValid(range.xc),
    }));
  }

  get hasFocus(): boolean {
    // @ts-ignore
    // console.log("hasFocus", this.d,  this.ranges.filter((i) => i.isFocused).length > 0);
    return this.ranges.filter((i) => i.isFocused).length > 0;
  }

  get canAddRange(): boolean {
    return !this.props.hasSingleRange;
  }

  get isInvalid(): boolean {
    return this.props.isInvalid || this.state.isMissing;
  }

  setup() {
    // @ts-ignore
    this.d = ++d;
    // what if props changes?
    this.store = useLocalStore(
      SelectionInputStore,
      this.props.ranges,
      this.props.hasSingleRange || false
    );
    // onMounted hooks are called in reverse order of component declaration
    // with this, we make sure that the first input in the DOM is focused
    onMounted(() => {
      if (!this.store.selectionInputs[0].xc) {
        this.store.focusById(this.store.selectionInputs[0].id);
      }
    });
    useEffect(
      () => {
        this.focusedInput.el?.focus();
      },
      () => [this.focusedInput.el]
    );
    // onMounted(() => this.enableNewSelectionInput());
    // onWillUnmount(async () => this.disableNewSelectionInput());
    onPatched(() => this.checkChange());
  }

  // enableNewSelectionInput() {
  //   this.env.model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
  //     id: this.id,
  //     initialRanges: this.props.ranges,
  //     hasSingleRange: this.props.hasSingleRange,
  //   });
  // }

  // disableNewSelectionInput() {
  //   this.env.model.dispatch("DISABLE_SELECTION_INPUT", { id: this.id });
  // }

  checkChange() {
    const value = this.store.selectionInputValues;
    if (this.previousRanges.join() !== value.join()) {
      this.triggerChange();
    }
  }

  getColor(range: SelectionRange) {
    const color = range.color || "#000";
    return "color: " + color + ";";
  }

  private triggerChange() {
    const ranges = this.store.selectionInputValues;
    this.props.onSelectionChanged?.(ranges);
    this.previousRanges = ranges;
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

  focus(rangeId: number) {
    // @ts-ignore
    // console.log("focus", rangeId, this.d);
    this.state.isMissing = false;
    this.state.mode = "select-range";
    this.store.focusById(rangeId);
    // this.env.model.dispatch("FOCUS_RANGE", {
    //   id: this.id,
    //   rangeId,
    // });
  }

  addEmptyInput() {
    this.store.addEmptyRange();
    // this.env.model.dispatch("ADD_EMPTY_RANGE", { id: this.id });
  }

  removeInput(rangeId: number) {
    this.store.removeRange(rangeId);
    // this.env.model.dispatch("REMOVE_RANGE", { id: this.id, rangeId });
    this.triggerChange();
    this.props.onSelectionConfirmed?.();
  }

  onInputChanged(rangeId: number, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.store.changeRange(rangeId, target.value);
    // this.env.model.dispatch("CHANGE_RANGE", {
    //   id: this.id,
    //   rangeId,
    //   value: target.value,
    // });
    this.triggerChange();
  }

  confirm() {
    this.store.unfocus();
    // this.env.model.dispatch("UNFOCUS_SELECTION_INPUT");
    const ranges = this.store.selectionInputValues;
    if (this.props.required && ranges.length === 0) {
      this.state.isMissing = true;
    }
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    if (this.originSheet !== activeSheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: this.originSheet,
      });
    }
    this.props.onSelectionConfirmed?.();
  }
}

SelectionInput.props = {
  ranges: Array,
  hasSingleRange: { type: Boolean, optional: true },
  required: { type: Boolean, optional: true },
  isInvalid: { type: Boolean, optional: true },
  class: { type: String, optional: true },
  onSelectionChanged: { type: Function, optional: true },
  onSelectionConfirmed: { type: Function, optional: true },
};
