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
import { Ref } from "../../types";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
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

  /**
   * Skips the change event triggered when moving focus out of the input.
   * The value has already been committed by `onInputKeydown`.
   */
  private skipNextInputChange = false;

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
