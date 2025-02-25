import { onWillStart, onWillUpdateProps } from "@odoo/owl";
import { _t } from "../../../../translation";
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

  setup() {
    super.setup();
    const setupDefault = (props: this["props"]) => {
      if (props.criterion.dateValue === undefined) {
        this.updateCriterion({ dateValue: "exactDate" });
      }
    };
    onWillUpdateProps(setupDefault);
    onWillStart(() => setupDefault(this.props));
  }

  onValueChanged(value: string) {
    this.updateCriterion({ values: [value] });
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
