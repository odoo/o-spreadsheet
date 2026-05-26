import { props } from "@odoo/owl";
import { debounce } from "../../helpers/misc";
import {
  GenericInput,
  GenericInputProps,
  genericInputPropsDefinition,
} from "../generic_input/generic_input";
import { types } from "../props_validation";

interface Props extends GenericInputProps {
  alwaysShowBorder?: boolean;
  min?: number;
  max?: number;
  value: number;
}

export class NumberInput extends GenericInput<Props> {
  static template = "o-spreadsheet-NumberInput";
  static components = {};

  protected props: Props = props({
    ...genericInputPropsDefinition,
    "min?": types.number(),
    "max?": types.number(),
  }) as unknown as Props;

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
