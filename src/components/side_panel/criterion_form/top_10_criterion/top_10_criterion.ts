import { Top10Criterion } from "@odoo/o-spreadsheet-engine/types/data_validation";
import { deepCopy } from "../../../../helpers";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

export class Top10CriterionForm extends CriterionForm<Top10Criterion> {
  static template = "o-spreadsheet-Top10CriterionForm";
  static components = { CriterionInput };

  onValueChanged(value: string) {
    const criterion = deepCopy(this.props.criterion);
    criterion.values[0] = value;
    this.updateCriterion(criterion);
  }

  updateIsBottom(ev: InputEvent) {
    const criterion = deepCopy(this.props.criterion);
    criterion.isBottom = (ev.target as HTMLInputElement).value === "bottom";
    this.updateCriterion(criterion);
  }

  updateIsPercent(ev: InputEvent) {
    const criterion = deepCopy(this.props.criterion);
    criterion.isPercent = (ev.target as HTMLInputElement).value === "percent";
    this.updateCriterion(criterion);
  }
}
