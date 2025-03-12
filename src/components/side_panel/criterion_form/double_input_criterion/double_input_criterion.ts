import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

export class DoubleInputCriterionForm extends CriterionForm {
  static template = "o-spreadsheet-DoubleInputCriterionForm";
  static components = { CriterionInput };

  onFirstValueChanged(value: string) {
    const values = this.props.criterion.values;
    this.updateCriterion({
      values: [value, values[1]],
    });
  }

  onSecondValueChanged(value: string) {
    const values = this.props.criterion.values;
    this.updateCriterion({
      values: [values[0], value],
    });
  }
}
