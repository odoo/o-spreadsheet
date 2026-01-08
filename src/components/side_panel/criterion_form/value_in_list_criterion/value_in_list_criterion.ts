import { _t } from "@odoo/o-spreadsheet-engine";
import { onWillStart, onWillUpdateProps, useState } from "@odoo/owl";
import { Color, IsValueInListCriterion, ValueAndLabel } from "../../../../types";
import { Select } from "../../../select/select";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

interface State {
  numberOfValues: number;
  focusedValueIndex?: number;
}

export class ListCriterionForm extends CriterionForm<IsValueInListCriterion> {
  static template = "o-spreadsheet-ListCriterionForm";
  static components = { CriterionInput, RoundColorPicker, Select };

  state = useState<State>({
    numberOfValues: Math.max(this.props.criterion.values.length, 2),
    focusedValueIndex: this.props.autofocus ? 0 : undefined,
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

  onChangedDisplayStyle(displayStyle: "arrow" | "plainText" | "chip") {
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

  get displayTypeOptions(): ValueAndLabel[] {
    return [
      { value: "chip", label: _t("Chip") },
      { value: "arrow", label: _t("Arrow") },
      { value: "plainText", label: _t("Plain text") },
    ];
  }
}
