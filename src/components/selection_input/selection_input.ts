import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  useEffect,
  useRef,
  useState,
} from "@odoo/owl";
import { UuidGenerator } from "../../helpers/index";
import { RangeInputValue } from "../../plugins/ui_feature/selection_input";
import { Color, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";

const uuidGenerator = new UuidGenerator();

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
  ranges: () => string[];
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
    ranges: Function,
    hasSingleRange: { type: Boolean, optional: true },
    required: { type: Boolean, optional: true },
    isInvalid: { type: Boolean, optional: true },
    class: { type: String, optional: true },
    onSelectionChanged: { type: Function, optional: true },
    onSelectionConfirmed: { type: Function, optional: true },
  };
  private id = uuidGenerator.uuidv4();
  private previousRanges: string[] = this.props.ranges() || [];
  private originSheet = this.env.model.getters.getActiveSheetId();
  private state: State = useState({
    isMissing: false,
    mode: "select-range",
  });
  private focusedInput = useRef("focusedInput");

  get ranges(): SelectionRange[] {
    const existingSelectionRanges = this.env.model.getters.getSelectionInput(this.id);
    const ranges = existingSelectionRanges.length
      ? existingSelectionRanges
      : this.props.ranges().map((xc, id) => ({
          xc,
          id: id + 1,
          isFocused: false,
        }));
    return ranges.map((range) => ({
      ...range,
      isValidRange: range.xc === "" || this.env.model.getters.isRangeValid(range.xc),
    }));
  }

  get hasFocus(): boolean {
    return this.ranges.filter((i) => i.isFocused).length > 0;
  }

  get canAddRange(): boolean {
    return !this.props.hasSingleRange;
  }

  get isInvalid(): boolean {
    return this.props.isInvalid || this.state.isMissing;
  }

  get isConfirmable(): boolean {
    return this.hasFocus && this.ranges.every((range) => range.isValidRange);
  }

  get isResettable(): boolean {
    return this.previousRanges.join() !== this.ranges.map((r) => r.xc).join();
  }

  setup() {
    useEffect(
      () => this.focusedInput.el?.focus(),
      () => [this.focusedInput.el]
    );
    onMounted(() => this.enableNewSelectionInput());
    onWillUnmount(async () => this.disableNewSelectionInput());
    onPatched(() => this.checkChange());
  }

  enableNewSelectionInput() {
    this.env.model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
      id: this.id,
      initialRanges: this.props.ranges(),
      hasSingleRange: this.props.hasSingleRange,
    });
  }

  disableNewSelectionInput() {
    this.env.model.dispatch("DISABLE_SELECTION_INPUT", { id: this.id });
  }

  checkChange() {
    const value = this.env.model.getters.getSelectionInputValue(this.id);
    const valid = !this.isInvalid && this.ranges.every((range) => range.isValidRange);
    if (valid && this.previousRanges.join() !== value.join()) {
      this.triggerChange();
    }
  }

  getColor(range: SelectionRange) {
    const color = range.color || "#000";
    return "color: " + color + ";";
  }

  private triggerChange() {
    const ranges = this.env.model.getters.getSelectionInputValue(this.id);
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
    this.env.model.dispatch("FOCUS_RANGE", {
      id: this.id,
      rangeId,
    });
  }

  addEmptyInput() {
    this.env.model.dispatch("ADD_EMPTY_RANGE", { id: this.id });
  }

  removeInput(rangeId: number) {
    this.env.model.dispatch("REMOVE_RANGE", { id: this.id, rangeId });
    this.triggerChange();
    this.props.onSelectionConfirmed?.();
  }

  onInputChanged(rangeId: number, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    const value = this.extractRanges(target.value);
    this.env.model.dispatch("CHANGE_RANGE", {
      id: this.id,
      rangeId,
      value,
    });
    this.triggerChange();
  }

  reset() {
    this.env.model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
      id: this.id,
      initialRanges: this.previousRanges,
      hasSingleRange: this.props.hasSingleRange,
    });
    this.confirm();
  }

  confirm() {
    let anyValidInput = false;
    const existingSelectionRanges = this.env.model.getters.getSelectionInput(this.id);
    const existingSelectionXcs: string[] = [];
    for (const range of existingSelectionRanges) {
      if (range.xc === "") {
        const result = this.env.model.dispatch("REMOVE_RANGE", {
          id: this.id,
          rangeId: range.id,
        });
        if (result.isSuccessful) {
          continue;
        }
      }
      existingSelectionXcs.push(range.xc);
      if (this.env.model.getters.isRangeValid(range.xc)) {
        anyValidInput = true;
      }
    }
    if (this.props.required && !anyValidInput) {
      this.state.isMissing = true;
    }
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    if (this.originSheet !== activeSheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: this.originSheet,
      });
    }
    this.props.onSelectionChanged?.(existingSelectionXcs);
    this.props.onSelectionConfirmed?.();
    this.previousRanges = this.props.ranges();
    if (existingSelectionXcs.join() !== this.previousRanges.join()) {
      this.enableNewSelectionInput();
    }
    this.env.model.dispatch("UNFOCUS_SELECTION_INPUT");
  }
}
