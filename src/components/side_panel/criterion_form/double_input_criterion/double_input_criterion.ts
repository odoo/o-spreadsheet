import { DataValidationCriterionForm } from "../criterion_form";
import { DataValidationInput } from "../criterion_input/criterion_input";

export class DataValidationDoubleInputCriterionForm extends DataValidationCriterionForm {
  static template = "o-spreadsheet-DataValidationDoubleInput";
  static components = { DataValidationInput };

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
