import { Component, onMounted, onPatched, onWillUnmount, useState, xml } from "@odoo/owl";
import { SELECTION_BORDER_COLOR } from "../constants";
import { UuidGenerator } from "../helpers/index";
import { RangeInputValue } from "../plugins/ui/selection_input";
import { SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";

const uuidGenerator = new UuidGenerator();

const TEMPLATE = xml/* xml */ `
  <div class="o-selection">
    <div t-foreach="ranges" t-as="range" t-key="range.id" class="o-selection-input" t-att-class="props.class">
      <input
        type="text"
        spellcheck="false"
        t-on-change="(ev) => this.onInputChanged(range.id, ev)"
        t-on-focus="() => this.focus(range.id)"
        t-att-value="range.xc"
        t-att-style="getColor(range)"
        t-att-class="{
          'o-focused' : range.isFocused,
          'o-required': props.required,
          'o-invalid': isInvalid || !range.isValidRange,
        }"
      />
      <button
        class="o-btn o-remove-selection"
        t-if="ranges.length > 1"
        t-on-click="() => this.removeInput(range.id)">✖</button>
    </div>

    <div class="o-selection-input">
      <button
        class="o-btn-action o-add-selection"
        t-if="canAddRange"
        t-on-click="addEmptyInput">Add range</button>
      <button
          class="o-btn-action o-selection-ok"
          t-if="hasFocus"
          t-on-click="disable">Confirm</button>
    </div>

  </div>`;

css/* scss */ `
  .o-selection {
    .o-selection-input {
      display: flex;
      flex-direction: row;

      input {
        padding: 4px 6px;
        border-radius: 4px;
        box-sizing: border-box;
        border: 1px solid #dadce0;
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
  onSelectionChanged?: (ranges: string[]) => void;
  onSelectionConfirmed?: () => void;
}

interface SelectionRange extends Omit<RangeInputValue, "color"> {
  isFocused: boolean;
  isValidRange: boolean;
  color?: string;
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
  static template = TEMPLATE;
  private id = uuidGenerator.uuidv4();
  private previousRanges: string[] = this.props.ranges || [];
  private originSheet = this.env.model.getters.getActiveSheetId();
  private state = useState({
    isMissing: false,
  });

  get ranges(): SelectionRange[] {
    const existingSelectionRange = this.env.model.getters.getSelectionInput(this.id);
    const ranges = existingSelectionRange.length
      ? existingSelectionRange
      : this.props.ranges
      ? this.props.ranges.map((xc, i) => ({
          xc,
          id: i.toString(),
          isFocused: false,
        }))
      : [];
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

  setup() {
    onMounted(() => this.enableNewSelectionInput());
    onWillUnmount(async () => this.disableNewSelectionInput());
    onPatched(() => this.checkChange());
  }

  enableNewSelectionInput() {
    this.env.model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
      id: this.id,
      initialRanges: this.props.ranges,
      hasSingleRange: this.props.hasSingleRange,
    });
  }

  disableNewSelectionInput() {
    this.env.model.dispatch("DISABLE_SELECTION_INPUT", { id: this.id });
  }

  checkChange() {
    const value = this.env.model.getters.getSelectionInputValue(this.id);
    if (this.previousRanges.join() !== value.join()) {
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
    this.previousRanges = ranges;
  }

  focus(rangeId: string) {
    this.state.isMissing = false;
    this.env.model.dispatch("FOCUS_RANGE", {
      id: this.id,
      rangeId,
    });
  }

  addEmptyInput() {
    this.env.model.dispatch("ADD_EMPTY_RANGE", { id: this.id });
  }

  removeInput(rangeId: string) {
    this.env.model.dispatch("REMOVE_RANGE", { id: this.id, rangeId });
    this.triggerChange();
    this.props.onSelectionConfirmed?.();
  }

  onInputChanged(rangeId: string, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.env.model.dispatch("CHANGE_RANGE", {
      id: this.id,
      rangeId,
      value: target.value,
    });
    target.blur();
    this.triggerChange();
  }

  disable() {
    this.env.model.dispatch("UNFOCUS_SELECTION_INPUT");
    const ranges = this.env.model.getters.getSelectionInputValue(this.id);
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
