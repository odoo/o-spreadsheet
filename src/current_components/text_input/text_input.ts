import { Component, useExternalListener, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { GRAY_300, TEXT_BODY } from "../../constants";
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
      { capture: true }
    );
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

  focusInputAndSelectContent() {
    const inputEl = this.inputRef.el;
    if (!inputEl) return;

    // The onFocus event selects all text in the input.
    // The subsequent mouseup event can deselect this text,
    // so t-on-mouseup.prevent.stop is used to prevent this
    // default behavior and preserve the selection.
    inputEl.focus();
    inputEl.select();
  }
}
