import { onWillStart, onWillUpdateProps } from "@odoo/owl";
import { IsValueInRangeCriterion } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { DataValidationCriterionForm } from "../dv_criterion_form";

export class DataValidationValueInRangeCriterionForm extends DataValidationCriterionForm<IsValueInRangeCriterion> {
  static template = "o-spreadsheet-DataValidationValueInRangeCriterionForm";
  static components = { SelectionInput };

  setup() {
    super.setup();
    const setupDefault = (props: this["props"]) => {
      if (props.criterion.displayStyle === undefined) {
        this.updateCriterion({ displayStyle: "arrow" });
      }
    };
    onWillUpdateProps(setupDefault);
    onWillStart(() => setupDefault(this.props));
  }

  onRangeChanged(rangeXc: string) {
    this.updateCriterion({ values: [rangeXc] });
  }

  onChangedDisplayStyle(ev: Event) {
    const displayStyle = (ev.target as HTMLInputElement).value as "arrow" | "plainText";
    this.updateCriterion({ displayStyle });
  }
}
