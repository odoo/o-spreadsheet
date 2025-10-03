import { debounce } from "../../helpers";
import { GenericInput, GenericInputProps } from "../generic_input/generic_input";

interface Props extends GenericInputProps {
  alwaysShowBorder?: boolean;
  min?: number;
  max?: number;
  value: number;
}

export class NumberInput extends GenericInput<Props> {
  static template = "o-spreadsheet-NumberInput";
  static components = {};
  static props = {
    ...GenericInput.props,
    min: { type: Number, optional: true },
    max: { type: Number, optional: true },
  };

  // Very short debounce to prevent up/down arrow on number input to spam the onChange
  debouncedOnChange = debounce(this.props.onChange.bind(this), 100, true);

  save() {
    const currentValue = (this.inputRef.el?.value || "").trim();
    if (currentValue !== this.props.value.toString()) {
      this.debouncedOnChange(currentValue);
    }
  }

  get inputClass(): string {
    return [this.props.class, "o-input"].join(" ");
  }
}
