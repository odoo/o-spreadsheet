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

interface CriterionValue {
  id: number;
  value: string;
  color?: Color;
}

interface State {
  values: CriterionValue[];
  focusedValueIndex?: number;
}

export class ListCriterionForm extends CriterionForm<IsValueInListCriterion> {
  static template = "o-spreadsheet-ListCriterionForm";
  static components = { CriterionInput, RoundColorPicker };

  private nextId: number = 1;
  state = useState<State>({
    values: [],
  });

  setup() {
    super.setup();
    const values = this.props.criterion.values || [];
    const colors = this.props.criterion.colors || {};
    this.state.values = Array.from({ length: Math.max(values.length, 2) }, (_, i) => {
      const value = values[i] || "";
      return {
        id: this.nextId++,
        value,
        color: colors[value],
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
    const values = this.state.values.map((item) => item.value);
    const colors: Record<string, Color> = {};
    for (const { value, color } of this.state.values) {
      const trimmed = value?.trim();
      if (trimmed && color) {
        colors[trimmed] = color;
      }
    }
    this.updateCriterion({ values, colors });
  }

  onValueChanged(item: CriterionValue, value: string) {
    item.value = value;
    this.syncCriterion();
  }

  onColorChanged(item: CriterionValue, color: Color) {
    item.color = color;
    this.syncCriterion();
  }

  onAddAnotherValue() {
    this.state.values.push({ id: this.nextId++, value: "" });
  }

  removeItem(index: number) {
    this.state.values.splice(index, 1);
    this.syncCriterion();
  }

  onChangedDisplayStyle(ev: Event) {
    const displayStyle = (ev.target as HTMLInputElement).value as "arrow" | "plainText";
    this.updateCriterion({ displayStyle });
  }

  onKeyDown(ev: KeyboardEvent, index: number) {
    if ((ev.key === "Enter" || ev.key === "Tab") && index === this.state.values.length - 1) {
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
