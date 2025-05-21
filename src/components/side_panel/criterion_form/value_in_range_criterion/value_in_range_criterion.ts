import { onWillStart, onWillUpdateProps } from "@odoo/owl";
import { Color, IsValueInRangeCriterion } from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { CriterionForm } from "../criterion_form";

export class ValueInRangeCriterionForm extends CriterionForm<IsValueInRangeCriterion> {
  static template = "o-spreadsheet-ValueInRangeCriterionForm";
  static components = { RoundColorPicker, SelectionInput };

  setup() {
    super.setup();
    const setupDefault = (props: this["props"]) => {
      if (props.criterion.displayStyle === undefined) {
        this.updateCriterion({ displayStyle: "chip" });
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

  onColorChanged(color: Color, value: string) {
    const colors = { ...this.props.criterion.colors };
    colors[value] = color || undefined;
    this.updateCriterion({ colors });
  }

  get values() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const values = this.env.model.getters.getDataValidationRangeValues(
      sheetId,
      this.props.criterion
    );
    return new Set(values);
  }
}
