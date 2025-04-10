import { onWillStart, onWillUpdateProps } from "@odoo/owl";
import { IsValueInRangeCriterion } from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { CriterionForm } from "../criterion_form";

export class ValueInRangeCriterionForm extends CriterionForm<IsValueInRangeCriterion> {
  static template = "o-spreadsheet-ValueInRangeCriterionForm";
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
