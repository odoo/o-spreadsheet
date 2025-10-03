import {
  Component,
  onMounted,
  onWillUpdateProps,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { FONT_SIZES } from "../../constants";
import { clip } from "../../helpers/index";
import { Ref, SpreadsheetChildEnv } from "../../types/index";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

interface State {
  isOpen: boolean;
}

interface Props {
  currentFontSize: number;
  class: string;
  onFontSizeChanged: (fontSize: number) => void;
  onToggle?: () => void;
  onFocusInput?: () => void;
}

export class FontSizeEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FontSizeEditor";
  static props = {
    currentFontSize: Number,
    onFontSizeChanged: Function,
    onToggle: { type: Function, optional: true },
    onFocusInput: { type: Function, optional: true },
    class: String,
  };

  static defaultProps = {
    onFocusInput: () => {},
  };

  static components = { Popover };
  fontSizes = FONT_SIZES;

  dropdown: State = useState({ isOpen: false });

  private inputRef: Ref<HTMLInputElement> = useRef("inputFontSize");
  private rootEditorRef = useRef("FontSizeEditor");
  private fontSizeListRef = useRef("fontSizeList");

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    onWillUpdateProps((newProps) => {
      if (this.inputRef.el && document.activeElement !== this.inputRef.el) {
        this.inputRef.el.value = newProps.currentFontSize;
      }
    });

    onMounted(() => {
      if (this.inputRef.el) {
        this.inputRef.el.value = this.props.currentFontSize.toString();
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
    if (!isChildEvent(this.fontSizeListRef.el!, ev) && !isChildEvent(this.rootEditorRef.el!, ev)) {
      this.closeFontList();
    }
  }

  toggleFontList() {
    const isOpen = this.dropdown.isOpen;
    if (!isOpen) {
      this.props.onToggle?.();
      this.inputRef.el!.focus();
    } else {
      this.closeFontList();
    }
  }

  closeFontList() {
    this.dropdown.isOpen = false;
  }

  private setSize(fontSizeStr: string) {
    const fontSize = clip(Math.floor(parseFloat(fontSizeStr)), 1, 400);
    this.props.onFontSizeChanged(fontSize);
    this.closeFontList();
  }

  setSizeFromInput(ev: InputEvent) {
    this.setSize((ev.target as HTMLInputElement).value);
  }

  setSizeFromList(fontSizeStr: string) {
    this.setSize(fontSizeStr);
  }

  onInputFocused(ev: InputEvent) {
    this.dropdown.isOpen = true;
    (ev.target as HTMLInputElement).select();
  }

  onInputKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === "Escape") {
      this.closeFontList();
      const target = ev.target as HTMLInputElement;
      // In the case of a ESCAPE key, we get the previous font size back
      if (ev.key === "Escape") {
        target.value = `${this.props.currentFontSize}`;
      }
      this.props.onToggle?.();
    }
  }
}
