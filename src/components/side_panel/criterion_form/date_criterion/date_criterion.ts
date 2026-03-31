<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { _t } from "../../../../translation";
import { DateCriterionValue, GenericDateCriterion, ValueAndLabel } from "../../../../types";
import { Select } from "../../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { DateCriterionValue, GenericDateCriterion } from "../../../../types";
=======
import { _t } from "../../../../translation";
import { DateCriterionValue, GenericDateCriterion } from "../../../../types";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { CriterionForm } from "../criterion_form";
import { CriterionInput } from "../criterion_input/criterion_input";

const DATES_VALUES: Record<DateCriterionValue, string> = {
  today: _t("today"),
  yesterday: _t("yesterday"),
  tomorrow: _t("tomorrow"),
  lastWeek: _t("in the past week"),
  lastMonth: _t("in the past month"),
  lastYear: _t("in the past year"),
  exactDate: _t("exact date"),
};

export class DateCriterionForm extends CriterionForm<GenericDateCriterion> {
  static template = "o-spreadsheet-DataValidationDateCriterion";
  static components = { CriterionInput, Select };

  get currentDateValue() {
    return this.props.criterion.dateValue || "exactDate";
  }

  onValueChanged(value: string) {
    this.updateCriterion({
      values: [value],
      dateValue: this.currentDateValue,
    });
  }

  onDateValueChanged(dateValue: DateCriterionValue) {
    this.updateCriterion({ dateValue });
  }

  get dateValues(): ValueAndLabel[] {
    return Object.keys(DATES_VALUES).map((key) => ({
      value: key,
      label: DATES_VALUES[key],
    }));
  }
}
