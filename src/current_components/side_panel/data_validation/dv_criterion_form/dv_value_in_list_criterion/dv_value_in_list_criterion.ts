import { onWillStart, onWillUpdateProps, useState } from "@odoo/owl";
import { IsValueInListCriterion } from "../../../../../types";
import { css } from "../../../../helpers";
import { DataValidationCriterionForm } from "../dv_criterion_form";
import { DataValidationInput } from "../dv_input/dv_input";

css/* scss */ `
  .o-dv-list-item-delete {
    color: #666666;
    cursor: pointer;
  }
`;

interface State {
  numberOfValues: number;
  focusedValueIndex?: number;
}

export class DataValidationListCriterionForm extends DataValidationCriterionForm<IsValueInListCriterion> {
  static template = "o-spreadsheet-DataValidationListCriterionForm";
  static components = { DataValidationInput };

  state = useState<State>({
    numberOfValues: Math.max(this.props.criterion.values.length, 2),
  });

  setup() {
    super.setup();
    const setupDefault = (props: this["props"]) => {
      if (props.criterion.displayStyle === undefined) {
        this.updateCriterion({ displayStyle: "arrow" });
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
