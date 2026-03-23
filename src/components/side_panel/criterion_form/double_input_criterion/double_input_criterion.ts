import { CalendarButton } from "../calendar_button/calendar_button";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

export class DoubleInputCriterionForm extends CriterionForm {
  static template = "o-spreadsheet-DoubleInputCriterionForm";
  static components = { CriterionInput, CalendarButton };

  onFirstValueChanged(value: string) {
    const values = this.props.criterion.values;
    this.updateCriterion({
      values: [value, values[1] || ""],
    });
  }

  onSecondValueChanged(value: string) {
    const values = this.props.criterion.values;
    this.updateCriterion({
      values: [values[0] || "", value],
    });
  }

  get isDateType() {
    return ["dateIsBetween", "dateIsNotBetween"].includes(this.props.criterion.type);
  }
}
