import { deepCopy } from "../../../../../helpers";
import { DataValidationCriterionForm } from "../dv_criterion_form";
import { DataValidationInput } from "../dv_input/dv_input";

export class DataValidationSingleInputCriterionForm extends DataValidationCriterionForm {
  static template = "o-spreadsheet-DataValidationSingleInput";
  static components = { DataValidationInput };

  onValueChanged(value: string) {
    const criterion = deepCopy(this.props.criterion);
    criterion.values[0] = value;
    this.updateCriterion(criterion);
  }
}
