import { props } from "@odoo/owl";
import { debounce } from "../../helpers/misc";
import { GenericInput, genericInputPropsDefinition } from "../generic_input/generic_input";
import { types } from "../props_validation";

export class NumberInput extends GenericInput<any> {
  static template = "o-spreadsheet-NumberInput";
  static components = {};

  protected props = props({
    ...genericInputPropsDefinition,
    min: types.number().optional(),
    max: types.number().optional(),
  });

  // Very short debounce to prevent up/down arrow on number input to spam the onChange
  debouncedOnChange = debounce(this.props.onChange.bind(this), 100, true);

  save() {
    const currentValue = (this.genericInputRef()?.value || "").trim();
    if (currentValue !== this.props.value.toString()) {
      this.debouncedOnChange(currentValue);
    }
  }

  get inputClass(): string {
    return [this.props.class, "o-input"].join(" ");
  }
}
