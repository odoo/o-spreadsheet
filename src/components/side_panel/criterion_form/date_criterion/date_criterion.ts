import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { DateCriterionValue, GenericDateCriterion } from "../../../../types";
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
  static components = { CriterionInput };

  get currentDateValue() {
    return this.props.criterion.dateValue || "exactDate";
  }

  onValueChanged(value: string) {
    this.updateCriterion({
      values: [value],
      dateValue: this.currentDateValue,
    });
  }

  onDateValueChanged(ev: Event) {
    const dateValue = (ev.target as HTMLInputElement).value as DateCriterionValue;
    this.updateCriterion({ dateValue });
  }

  get dateValues() {
    return Object.keys(DATES_VALUES).map((key) => ({
      value: key,
      title: DATES_VALUES[key],
    }));
  }
}
