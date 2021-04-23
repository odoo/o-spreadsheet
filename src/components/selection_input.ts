import * as owl from "@odoo/owl";
import { uuidv4 } from "../helpers/index";
import { RangeInputValue } from "../plugins/ui/selection_inputs";
import { SpreadsheetEnv } from "../types";

const { Component } = owl;

const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-selection">
    <div t-foreach="ranges" t-as="range" t-key="range.id" class="o-selection-input">
      <input
        type="text"
        spellcheck="false"
        t-on-change="onInputChanged(range.id)"
        t-on-focus="focus(range.id)"
        t-att-value="range.xc"
        t-att-style="getStyle(range)"
        t-att-class="range.isFocused ? 'o-focused' : ''"
      />
      <button
        class="o-btn o-remove-selection"
        t-if="ranges.length > 1"
        t-on-click="removeInput(range.id)">✖</button>
    </div>

    <div class="o-selection-input">
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

const CSS = css/* scss */ `
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
      input.o-focused {
        border-color: #3266ca;
        border-width: 2px;
        padding: 3px 5px;
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
  maximumRanges?: number;
}

interface SelectionRange extends RangeInputValue {
  isFocused: boolean;
  isValidRange: boolean;
}
/**
 * This component can be used when the user needs to input some
 * ranges. He can either input the ranges with the regular DOM `<input/>`
 * displayed or by selecting zones on the grid.
 *
 * A `selection-changed` event is triggered every time the input value
 * changes.
 */
export class SelectionInput extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  private id = uuidv4();
  private previousRanges: string[] = this.props.ranges || [];
  private getters = this.env.getters;
  private dispatch = this.env.dispatch;
  private originSheet = this.env.getters.getActiveSheetId();

  get ranges(): SelectionRange[] {
    const existingSelectionRange = this.getters.getSelectionInput(this.id);
    const ranges = existingSelectionRange.length
      ? existingSelectionRange
      : this.props.ranges
      ? this.props.ranges.map((xc) => ({
          xc,
          id: uuidv4(),
          isFocused: false,
        }))
      : [];
    return ranges.map((range) => ({
      ...range,
      isValidRange: range.xc === "" || this.getters.isRangeValid(range.xc),
    }));
  }

  get hasFocus(): boolean {
    return this.ranges.filter((i) => i.isFocused).length > 0;
  }

  get canAddRange(): boolean {
    return !this.props.maximumRanges || this.ranges.length < this.props.maximumRanges;
  }

  mounted() {
    this.dispatch("ENABLE_NEW_SELECTION_INPUT", {
      id: this.id,
      initialRanges: this.props.ranges,
      maximumRanges: this.props.maximumRanges,
    });
  }

  async willUnmount() {
    this.dispatch("DISABLE_SELECTION_INPUT", { id: this.id });
  }

  async patched() {
    const value = this.getters.getSelectionInputValue(this.id);
    if (this.previousRanges.join() !== value.join()) {
      this.triggerChange();
    }
  }

  getStyle(range: SelectionRange) {
    const color = range.color || "#000";
    let style = "color: " + color + ";";
    if (!range.isValidRange) {
      return style + "border-color: red;";
    }
    return style;
  }

  private triggerChange() {
    const ranges = this.getters.getSelectionInputValue(this.id);
    this.trigger("selection-changed", { ranges });
    this.previousRanges = ranges;
  }

  focus(rangeId: string | null) {
    this.dispatch("FOCUS_RANGE", {
      id: this.id,
      rangeId,
    });
  }

  addEmptyInput() {
    this.dispatch("ADD_EMPTY_RANGE", { id: this.id });
  }

  removeInput(rangeId: string) {
    this.dispatch("REMOVE_RANGE", { id: this.id, rangeId });
    this.triggerChange();
    this.trigger("selection-confirmed");
  }

  onInputChanged(rangeId: string, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.dispatch("CHANGE_RANGE", {
      id: this.id,
      rangeId,
      value: target.value,
    });
    target.blur();
    this.triggerChange();
  }

  disable() {
    this.dispatch("FOCUS_RANGE", {
      id: this.id,
      rangeId: null,
    });
    const activeSheetId = this.getters.getActiveSheetId();
    if (this.originSheet !== activeSheetId) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: this.originSheet,
      });
    }
    this.trigger("selection-confirmed");
  }
}
