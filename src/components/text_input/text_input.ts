import { props } from "@odoo/owl";
import { isDefined } from "../../helpers/misc";
import {
  GenericInput,
  GenericInputProps,
  genericInputPropsDefinition,
} from "../generic_input/generic_input";
import { types } from "../props_validation";

interface Props extends GenericInputProps {
  alwaysShowBorder?: boolean;
  value: string;
  errorMessage?: string;
}

export class TextInput extends GenericInput<Props> {
  static template = "o-spreadsheet-TextInput";
  static components = {};

  protected props: Props = props({
    ...genericInputPropsDefinition,
    value: types.string(),
    "errorMessage?": types.string(),
  }) as unknown as Props;

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
