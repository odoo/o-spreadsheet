import { onMounted, onWillUpdateProps, props, proxy, signal } from "@odoo/owl";
import { clip } from "../../helpers/misc";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
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

  protected props = props({
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
  private rootEditorRef = signal<HTMLElement | null>(null);
  private valueListRef = signal<HTMLElement | null>(null);

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);

    useExternalListener(window, "click", this.onExternalClick, { capture: true });
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

  private setValue(valueStr: string) {
    const value = clip(Math.floor(parseFloat(valueStr)), this.props.min, this.props.max);
    this.props.onValueChange(value);
    this.closeList();
  }

  setValueFromInput(ev: InputEvent) {
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
    if (ev.key === "Enter" || ev.key === "Escape") {
      this.closeList();
      const target = ev.target as HTMLInputElement;
      // In the case of a ESCAPE key, we get the previous font size back
      if (ev.key === "Escape") {
        target.value = `${this.props.currentValue}`;
      }
      this.props.onToggle?.();
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      ev.stopPropagation();
      this.closeList();
      this.DOMFocusableElementStore.focus();
      return;
    }
  }
}
