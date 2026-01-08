import { _t } from "@odoo/o-spreadsheet-engine";
import { onWillStart, onWillUpdateProps } from "@odoo/owl";
import { Color, IsValueInRangeCriterion, ValueAndLabel } from "../../../../types";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { CriterionForm } from "../criterion_form";

export class ValueInRangeCriterionForm extends CriterionForm<IsValueInRangeCriterion> {
  static template = "o-spreadsheet-ValueInRangeCriterionForm";
  static components = { RoundColorPicker, SelectionInput, Select };

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

  onChangedDisplayStyle(displayStyle: "arrow" | "plainText" | "chip") {
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

  get displayTypeOptions(): ValueAndLabel[] {
    return [
      { value: "chip", label: _t("Chip") },
      { value: "arrow", label: _t("Arrow") },
      { value: "plainText", label: _t("Plain text") },
    ];
  }
}
