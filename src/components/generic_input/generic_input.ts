import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUpdateProps, useExternalListener, useRef } from "@odoo/owl";
import { Ref } from "../../types";
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
  };

  protected refName = "input";
  protected inputRef!: Ref<HTMLInputElement>;

  private lastOnChangeValue: string = this.props.value.toString();

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
      this.lastOnChangeValue = nextProps.value.toString();
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

  save() {
    const currentValue = (this.inputRef.el?.value || "").trim();
    if (currentValue !== this.lastOnChangeValue) {
      this.lastOnChangeValue = currentValue;
      this.props.onChange(currentValue);
    }
    if (document.activeElement === this.inputRef.el) {
      this.inputRef.el?.blur();
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
    this.save();
  }

  onInput(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.props.onInput?.(target.value);
  }
}
