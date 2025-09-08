import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { ACTION_COLOR, GRAY_300, TEXT_BODY } from "../../constants";
import { GenericInput } from "../generic_input/generic_input";
import { css } from "../helpers";

css/* scss */ `
  .o-spreadsheet {
    .os-input {
      border-width: 0 0 1px 0;
      border-color: transparent;
      outline: none;
      text-overflow: ellipsis;
      color: ${TEXT_BODY};
    }
    .os-input:hover,
    .os-input.o-input-border {
      border-color: ${GRAY_300};
    }
    .os-input:focus {
      border-color: ${ACTION_COLOR};
    }
  }
`;

interface Props {
  value: string;
  onChange: (value: string) => void;
  class?: string;
  id?: string;
  placeholder?: string;
  autofocus?: boolean;
  alwaysShowBorder?: boolean;
}

export class TextInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TextInput";
  static components = { GenericInput };
  static props = {
    value: String,
    onChange: Function,
    class: {
      type: String,
      optional: true,
    },
    id: {
      type: String,
      optional: true,
    },
    placeholder: {
      type: String,
      optional: true,
    },
    autofocus: {
      type: Boolean,
      optional: true,
    },
    alwaysShowBorder: { type: Boolean, optional: true },
  };

  get inputClass(): string {
    return [this.props.class, "os-input w-100"].join(" ");
  }
}
