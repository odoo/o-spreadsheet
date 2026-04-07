import { onWillStart, onWillUpdateProps, useState } from "@odoo/owl";
import { Color, IsValueInListCriterion } from "../../../../types";
import { css } from "../../../helpers";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

css/* scss */ `
  .o-dv-list-item-delete {
    color: #666666;
    cursor: pointer;
  }
`;

interface ListItem {
  value: string;
  color?: Color;
}

interface State {
  items: ListItem[];
  focusedValueIndex?: number;
}

export class ListCriterionForm extends CriterionForm<IsValueInListCriterion> {
  static template = "o-spreadsheet-ListCriterionForm";
  static components = { CriterionInput, RoundColorPicker };

  state = useState<State>({
    items: [],
  });

  setup() {
    super.setup();
    const values = this.props.criterion.values || [];
    const colors = this.props.criterion.colors || {};
    this.state.items = Array.from({ length: Math.max(values.length, 2) }, (_, i) => {
      const value = values[i] ?? "";
      return {
        value,
        color: value ? colors[value] : undefined,
      };
    });

    const setupDefault = (props: this["props"]) => {
      if (props.criterion.displayStyle === undefined) {
        this.updateCriterion({ displayStyle: "chip" });
      }
    };
    onWillUpdateProps(setupDefault);
    onWillStart(() => setupDefault(this.props));
  }

  private syncCriterion() {
    const values = this.state.items.map((item) => item.value);
    const colors: Record<string, Color> = {};
    for (const { value, color } of this.state.items) {
      const trimmed = value?.trim();
      if (trimmed && color) {
        colors[trimmed] = color;
      }
    }
    this.updateCriterion({ values, colors });
  }

  onValueChanged(index: number, value: string) {
    this.state.items[index].value = value;
    this.syncCriterion();
  }

  onColorChanged(index: number, color: Color) {
    this.state.items[index].color = color;
    this.syncCriterion();
  }

  onAddAnotherValue() {
    this.state.items.push({ value: "" });
  }

  removeItem(index: number) {
    this.state.items.splice(index, 1);
    this.syncCriterion();
  }

  onChangedDisplayStyle(ev: Event) {
    const displayStyle = (ev.target as HTMLInputElement).value as "arrow" | "plainText";
    this.updateCriterion({ displayStyle });
  }

  onKeyDown(ev: KeyboardEvent, index: number) {
    if ((ev.key === "Enter" || ev.key === "Tab") && index === this.state.items.length - 1) {
      this.onAddAnotherValue();
      this.state.focusedValueIndex = index + 1;
      ev.preventDefault();
    } else if (ev.key === "Enter") {
      this.state.focusedValueIndex = index + 1;
    }
  }

  onBlurInput() {
    this.state.focusedValueIndex = undefined;
  }
}
