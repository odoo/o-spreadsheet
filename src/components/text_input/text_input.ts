import { isDefined } from "../../helpers";
import { GenericInput, GenericInputProps } from "../generic_input/generic_input";

interface Props extends GenericInputProps {
  alwaysShowBorder?: boolean;
  value: string;
  errorMessage?: string;
}

export class TextInput extends GenericInput<Props> {
  static template = "o-spreadsheet-TextInput";
  static components = {};
  static props = {
    ...GenericInput.props,
    errorMessage: { type: String, optional: true },
  };

  get inputClass(): string {
    return [
      this.props.class,
      "w-100 os-input",
      this.props.alwaysShowBorder ? "o-input-border" : undefined,
      this.props.errorMessage ? "o-invalid" : undefined,
    ]
      .filter(isDefined)
      .join(" ");
  }
}
