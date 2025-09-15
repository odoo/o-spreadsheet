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

  get inputClass(): string {
    return [this.props.class, "o-input"].join(" ");
  }
}
