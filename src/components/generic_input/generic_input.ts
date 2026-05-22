import { onMounted, onWillUpdateProps, signal, useListener } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { useAutofocus } from "../helpers/autofocus_hook";

export interface GenericInputProps {
  value: string | number;
  onChange: (value: string) => void;
  onInput?: (value: string) => void;
  onFocused?: () => void;
  onBlur?: () => void;
  class?: string;
  id?: string;
  placeholder?: string;
  autofocus?: boolean;
  selectContentOnFocus?: boolean;
  resetOnBlur?: boolean;
}

export class GenericInput<T extends GenericInputProps> extends Component<T, SpreadsheetChildEnv> {
  static props = {
    value: [Number, String],
    onChange: Function,
    onFocused: { type: Function, optional: true },
    onBlur: { type: Function, optional: true },
    onInput: { type: Function, optional: true },
    class: { type: String, optional: true },
    id: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    autofocus: { type: Boolean, optional: true },
    alwaysShowBorder: { type: Boolean, optional: true },
    selectContentOnFocus: { type: Boolean, optional: true },
    resetOnBlur: { type: Boolean, optional: true },
  };

  protected genericInputRef = signal<HTMLInputElement | null>(null);

  private lastOnChangeValue: string = this.props.value.toString();

  setup() {
    useListener(
      window,
      "click",
      (ev) => {
        const el = this.genericInputRef();
        if (!el || ev.target === el || el.value === this.props.value.toString()) {
          return;
        }
        if (this.props.resetOnBlur) {
          el.value = this.props.value.toString();
        } else {
          this.save();
        }
      },
      { capture: true }
    );
    if (this.props.autofocus) {
      useAutofocus(this.genericInputRef);
    }
    onWillUpdateProps((nextProps) => {
      const el = this.genericInputRef();
      if (document.activeElement !== el && el) {
        el.value = nextProps.value;
      }
      this.lastOnChangeValue = nextProps.value.toString();
    });
    onMounted(() => {
      const el = this.genericInputRef();
      if (el) {
        el.value = this.props.value.toString();
      }
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
        const el = this.genericInputRef();
        if (el) {
          el.value = this.props.value.toString();
          el.blur();
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
    }
  }

  save() {
    const currentValue = (this.genericInputRef()?.value || "").trim();
    if (currentValue !== this.lastOnChangeValue) {
      this.lastOnChangeValue = currentValue;
      this.props.onChange(currentValue);
    }
    if (document.activeElement === this.genericInputRef()) {
      this.genericInputRef()?.blur();
    }
  }

  onMouseDown(ev: MouseEvent) {
    // Stop the event if the input is not focused, we handle everything in onMouseUp
    if (ev.target !== document.activeElement && this.props.selectContentOnFocus) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  onMouseUp(ev: MouseEvent) {
    const target = ev.target as HTMLInputElement;
    if (target !== document.activeElement && this.props.selectContentOnFocus) {
      target.focus();
      if (this.props.selectContentOnFocus) {
        target.select();
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  onFocus() {
    this.props.onFocused?.();
  }

  onBlur() {
    this.props.onBlur?.();
    if (this.props.resetOnBlur) {
      const el = this.genericInputRef();
      if (el) {
        el.value = this.props.value.toString();
      }
    } else {
      this.save();
    }
  }

  onInput(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.props.onInput?.(target.value);
  }
}
