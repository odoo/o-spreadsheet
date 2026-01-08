import { _t, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { Top10Criterion } from "@odoo/o-spreadsheet-engine/types/data_validation";
import { deepCopy } from "../../../../helpers";
import { Select } from "../../../select/select";
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

export class Top10CriterionForm extends CriterionForm<Top10Criterion> {
  static template = "o-spreadsheet-Top10CriterionForm";
  static components = { CriterionInput, Select };

  onValueChanged(value: string) {
    const criterion = deepCopy(this.props.criterion);
    criterion.values[0] = value;
    this.updateCriterion(criterion);
  }

  updateIsBottom(value: "top" | "bottom") {
    const criterion = deepCopy(this.props.criterion);
    criterion.isBottom = value === "bottom";
    this.updateCriterion(criterion);
  }

  updateIsPercent(value: "values" | "percent") {
    const criterion = deepCopy(this.props.criterion);
    criterion.isPercent = value === "percent";
    this.updateCriterion(criterion);
  }

  get isBottomSelectOptions(): ValueAndLabel[] {
    return [
      { value: "top", label: _t("Top") },
      { value: "bottom", label: _t("Bottom") },
    ];
  }

  get isPercentSelectOptions(): ValueAndLabel[] {
    return [
      { value: "values", label: _t("Values") },
      { value: "percent", label: _t("Percent") },
    ];
  }
}
