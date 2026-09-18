import { onMounted, onWillUpdateProps, proxy, signal, useListener, useProps } from "@odoo/owl";
import { clip } from "../../helpers/misc";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { getElBoundingRect, isChildEvent } from "../helpers/dom_helpers";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

interface State {
  isOpen: boolean;
}

export class NumberEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberEditor";
  static components = { Popover };

  protected props = useProps({
    currentValue: types.number(),
    onValueChange: types.function<(fontSize: number) => void>(),
    onToggle: types.function().optional(),
    onFocusInput: types.function().optional(() => () => {}),
    class: types.string(),
    valueIcon: types.string().optional(),
    min: types.number(),
    max: types.number(),
    title: types.string(),
    valueList: types.array(types.number()),
  });

  dropdown: State = proxy({ isOpen: false });

  private inputRef = signal.ref(HTMLInputElement);
  private rootEditorRef = signal.ref();
  private valueListRef = signal.ref();

  /**
   * Skips the change event triggered when moving focus out of the input.
   * The value has already been committed by `onInputKeydown`.
   */
  private skipNextInputChange = false;
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);

    useListener(window, "click", this.onExternalClick.bind(this), { capture: true });
    onWillUpdateProps((nextProps) => {
      const input = this.inputRef();
      if (input && document.activeElement !== input) {
        input.value = nextProps.currentValue;
      }
    });

    onMounted(() => {
      const input = this.inputRef();
      if (input) {
        input.value = this.props.currentValue.toString();
      }
    });
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: getElBoundingRect(this.rootEditorRef()),
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  onExternalClick(ev: MouseEvent) {
    const valueListEl = this.valueListRef();
    const rootEditorEl = this.rootEditorRef();
    if (
      valueListEl &&
      rootEditorEl &&
      !isChildEvent(valueListEl, ev) &&
      !isChildEvent(rootEditorEl, ev)
    ) {
      this.closeList();
    }
  }

  toggleList() {
    const isOpen = this.dropdown.isOpen;
    if (!isOpen) {
      this.props.onToggle?.();
      this.inputRef()?.focus();
    } else {
      this.closeList();
    }
  }

  closeList() {
    this.dropdown.isOpen = false;
  }

  private setValue(valueStr: string): number | undefined {
    const value = clip(Math.round(parseFloat(valueStr)), this.props.min, this.props.max);
    if (isNaN(value)) {
      return undefined;
    }
    this.props.onValueChange(value);
    this.closeList();
    return value;
  }

  setValueFromInput(ev: InputEvent) {
    if (this.skipNextInputChange) {
      return;
    }
    this.setValue((ev.target as HTMLInputElement).value);
  }

  setValueFromList(valueStr: string) {
    this.setValue(valueStr);
  }

  get currentValue(): string {
    return `${this.props.currentValue}`;
  }

  onInputFocused(ev: InputEvent) {
    this.dropdown.isOpen = true;
    (ev.target as HTMLInputElement).select();
  }

  onInputKeydown(ev: KeyboardEvent) {
    const target = ev.target as HTMLInputElement;
    switch (ev.key) {
      case "Enter":
      case "Tab": {
        ev.preventDefault();
        ev.stopPropagation();
        const value = this.setValue(target.value);
        if (value === undefined) {
          return;
        }
        target.value = `${value}`;
        break;
      }
      case "Escape":
        // In the case of a ESCAPE key, we get the previous value back
        target.value = `${this.props.currentValue}`;
        this.closeList();
        break;
      default:
        return;
    }
    this.skipNextInputChange = true;
    this.DOMFocusableElementStore.focus();
    this.skipNextInputChange = false;
  }
}
