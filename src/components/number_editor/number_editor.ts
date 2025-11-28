import { Ref } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  Component,
  onMounted,
  onWillUpdateProps,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { clip } from "../../helpers/index";
import { Store, useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

interface State {
  isOpen: boolean;
}

interface Props {
  currentValue: number;
  class: string;
  onValueChange: (fontSize: number) => void;
  onToggle?: () => void;
  onFocusInput?: () => void;
  valueIcon?: String;
  min: number;
  max: number;
  title: String;
  valueList: number[];
}

export class NumberEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberEditor";
  static props = {
    currentValue: Number,
    onValueChange: Function,
    onToggle: { type: Function, optional: true },
    onFocusInput: { type: Function, optional: true },
    class: String,
    valueIcon: { type: String, optional: true },
    min: Number,
    max: Number,
    title: String,
    valueList: Array<Number>,
  };

  static defaultProps = {
    onFocusInput: () => {},
  };

  static components = { Popover };

  dropdown: State = useState({ isOpen: false });

  private inputRef: Ref<HTMLInputElement> = useRef("inputNumber");
  private rootEditorRef = useRef("NumberEditor");
  private valueListRef = useRef("numberList");

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);

    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps) => {
      if (this.inputRef.el && document.activeElement !== this.inputRef.el) {
        this.inputRef.el.value = nextProps.currentValue;
      }
    });

    onMounted(() => {
      if (this.inputRef.el) {
        this.inputRef.el.value = this.props.currentValue.toString();
      }
    });
  }

  get popoverProps(): PopoverProps {
    const { x, y, width, height } = this.rootEditorRef.el!.getBoundingClientRect();
    return {
      anchorRect: { x, y, width, height },
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  onExternalClick(ev: MouseEvent) {
    if (!isChildEvent(this.valueListRef.el!, ev) && !isChildEvent(this.rootEditorRef.el!, ev)) {
      this.closeList();
    }
  }

  toggleList() {
    const isOpen = this.dropdown.isOpen;
    if (!isOpen) {
      this.props.onToggle?.();
      this.inputRef.el!.focus();
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
