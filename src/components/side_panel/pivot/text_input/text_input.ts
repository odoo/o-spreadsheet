/** @odoo-module */

import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import { Ref, SpreadsheetChildEnv } from "../../../..";
import { css } from "../../../helpers";

css/* scss */ `
  .o-spreadsheet {
    .os-input {
      box-sizing: border-box;
      border-width: 0 0 1px 0;
      border-color: transparent;
      outline: none;
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
  private state!: { value: string };
  private inputRef: Ref<HTMLInputElement> = useRef("input");

  setup() {
    this.state = useState({
      value: this.props.value,
    });
    useExternalListener(
      window,
      "click",
      (ev) => {
        if (ev.target !== this.inputRef.el && this.state.value !== this.props.value) {
          this.save();
        }
      },
      {
        capture: true,
      }
    );
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.value !== this.props.value) {
        this.state.value = nextProps.value;
      }
    });
  }

  onChange() {
    this.save();
  }

  save() {
    this.props.onChange(this.state.value.trim());
  }
}
