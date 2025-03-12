import { deepCopy } from "../../../../helpers";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

export class SingleInputCriterionForm extends CriterionForm {
  static template = "o-spreadsheet-SingleInputCriterionForm";
  static components = { CriterionInput };

  onValueChanged(value: string) {
    const criterion = deepCopy(this.props.criterion);
    criterion.values[0] = value;
    this.updateCriterion(criterion);
  }
}
