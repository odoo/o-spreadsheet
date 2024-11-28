import { DataValidationCriterionForm } from "../dv_criterion_form";
import { DataValidationInput } from "../dv_input/dv_input";

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
