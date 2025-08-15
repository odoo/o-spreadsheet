import { Component, useExternalListener, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { GRAY_300, TEXT_BODY } from "../../constants";
import { Ref } from "../../types";
import { css } from "../helpers";
import { useAutofocus } from "../helpers/autofocus_hook";

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
    .os-input:focus {
      border-color: ${GRAY_300};
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
    autofocus: {
      type: Boolean,
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
      { capture: true }
    );
    if (this.props.autofocus) {
      useAutofocus({ refName: "input" });
    }
  }

  onKeyDown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        this.save();
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "Escape":
        if (this.inputRef.el) {
          this.inputRef.el.value = this.props.value;
          this.inputRef.el.blur();
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
    }
  }

  save() {
    const currentValue = (this.inputRef.el?.value || "").trim();
    if (currentValue !== this.props.value) {
      this.props.onChange(currentValue);
    }
    this.inputRef.el?.blur();
  }

  onMouseDown(ev: MouseEvent) {
    // Stop the event if the input is not focused, we handle everything in onMouseUp
    if (ev.target !== document.activeElement) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  onMouseUp(ev: MouseEvent) {
    const target = ev.target as HTMLInputElement;
    if (target !== document.activeElement) {
      target.focus();
      target.select();
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
}
