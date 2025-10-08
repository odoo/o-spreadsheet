import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component, useExternalListener, useRef } from "@odoo/owl";
import { isDefined } from "../../helpers";
import { Ref } from "../../types";
import { useAutofocus } from "../helpers/autofocus_hook";

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

  get inputClass(): string {
    return [this.props.class, this.props.alwaysShowBorder ? "o-input-border" : undefined]
      .filter(isDefined)
      .join(" ");
  }
}
