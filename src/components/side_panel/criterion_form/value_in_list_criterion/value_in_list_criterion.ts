import { Color } from "@odoo/o-spreadsheet-engine";
import { onWillStart, onWillUpdateProps, useState } from "@odoo/owl";
import { IsValueInListCriterion } from "../../../../types";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

interface State {
  numberOfValues: number;
  focusedValueIndex?: number;
}

export class ListCriterionForm extends CriterionForm<IsValueInListCriterion> {
  static template = "o-spreadsheet-ListCriterionForm";
  static components = { CriterionInput, RoundColorPicker };

  state = useState<State>({
    numberOfValues: Math.max(this.props.criterion.values.length, 2),
  });

  setup() {
    super.setup();
    const setupDefault = (props: this["props"]) => {
      if (props.criterion.displayStyle === undefined) {
        this.updateCriterion({ displayStyle: "chip" });
      }
    };
    onWillUpdateProps(setupDefault);
    onWillStart(() => setupDefault(this.props));
  }

  onValueChanged(value: string, index: number) {
    const values = [...this.displayedValues];
    values[index] = value;
    this.updateCriterion({ values });
  }

  onColorChanged(color: Color, value: string) {
    const colors = { ...this.props.criterion.colors };
    colors[value] = color || undefined;
    this.updateCriterion({ colors });
  }

  onAddAnotherValue() {
    this.state.numberOfValues++;
  }

  removeItem(index: number) {
    const values = [...this.displayedValues];
    values.splice(index, 1);
    this.state.numberOfValues--;
    this.updateCriterion({ values });
  }

  onChangedDisplayStyle(ev: Event) {
    const displayStyle = (ev.target as HTMLInputElement).value as "arrow" | "plainText";
    this.updateCriterion({ displayStyle });
  }

  onKeyDown(ev: KeyboardEvent, index: number) {
    if ((ev.key === "Enter" || ev.key === "Tab") && index === this.state.numberOfValues - 1) {
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

  get displayedValues(): string[] {
    const values: string[] = [];
    for (let i = 0; i < this.state.numberOfValues; i++) {
      values.push(this.props.criterion.values[i] || "");
    }
    return values;
  }
}
