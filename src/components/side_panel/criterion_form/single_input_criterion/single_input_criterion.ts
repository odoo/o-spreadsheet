import { deepCopy } from "../../../../helpers";
import { DataValidationCriterionForm } from "../criterion_form";
import { DataValidationInput } from "../criterion_input/criterion_input";

export class DataValidationSingleInputCriterionForm extends DataValidationCriterionForm {
  static template = "o-spreadsheet-DataValidationSingleInput";
  static components = { DataValidationInput };

  onValueChanged(value: string) {
    const criterion = deepCopy(this.props.criterion);
    criterion.values[0] = value;
    this.updateCriterion(criterion);
  }
}
