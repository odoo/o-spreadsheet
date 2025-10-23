import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUpdateProps, useExternalListener, useRef } from "@odoo/owl";
import { Ref } from "../../types";
import { useAutofocus } from "../helpers/autofocus_hook";

export interface GenericInputProps {
  value: string | number;
  onChange: (value: string) => void;
  class?: string;
  id?: string;
  placeholder?: string;
  autofocus?: boolean;
  selectContentOnFocus?: boolean;
}

export class GenericInput<T extends GenericInputProps> extends Component<T, SpreadsheetChildEnv> {
  static props = {
    value: [Number, String],
    onChange: Function,
    class: { type: String, optional: true },
    id: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    autofocus: { type: Boolean, optional: true },
    alwaysShowBorder: { type: Boolean, optional: true },
    selectContentOnFocus: { type: Boolean, optional: true },
  };

  protected refName = "input";
  protected inputRef!: Ref<HTMLInputElement>;

  setup() {
    this.inputRef = useRef(this.refName);
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
      useAutofocus({ refName: this.refName });
    }
    onWillUpdateProps((nextProps) => {
      if (document.activeElement !== this.inputRef.el && this.inputRef.el) {
        this.inputRef.el.value = nextProps.value;
      }
    });
    onMounted(() => {
      if (this.inputRef.el) this.inputRef.el.value = this.props.value.toString();
    });
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
          this.inputRef.el.value = this.props.value.toString();
          this.inputRef.el.blur();
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
    }
  }

  save(keepFocus = false) {
    const currentValue = (this.inputRef.el?.value || "").trim();
    if (currentValue !== this.props.value.toString()) {
      this.props.onChange(currentValue);
    }
    if (!keepFocus) {
      this.inputRef.el?.blur();
    }
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
      if (this.props.selectContentOnFocus) {
        target.select();
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
}
