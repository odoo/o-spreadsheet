import { Component, useExternalListener, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { Ref } from "../../types";
import { css } from "../helpers";

css/* scss */ `
  .o-spreadsheet {
    .os-input {
      box-sizing: border-box;
      border-width: 0 0 1px 0;
      border-color: transparent;
      outline: none;
      text-overflow: ellipsis;
    }
    .os-input:hover,
    .os-input:focus {
      border-color: black;
    }
  }
`;

interface Props {
  value: string;
  onChange: (value: string) => void;
  class?: string;
  id?: string;
  placeholder?: string;
}

export class TextInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TextInput";
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
  };
  private inputRef: Ref<HTMLInputElement> = useRef("input");

  setup() {
    useExternalListener(
      window,
      "click",
      (ev) => {
        if (ev.target !== this.inputRef.el && this.inputRef.el?.value !== this.props.value) {
          this.save();
        }
      },
      {
        capture: true,
      }
    );
  }

  onChange() {
    this.save();
  }

  save() {
    this.props.onChange((this.inputRef.el?.value || "").trim());
  }
}
