import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { FONT_SIZES } from "../../constants";
import { clip } from "../../helpers/index";
import { Store, useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { SpreadsheetChildEnv } from "../../types/index";
import { css } from "../helpers/css";
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

css/* scss */ `
  .o-font-size-editor {
    width: max-content !important;
    height: calc(100% - 4px);
    input.o-font-size {
      outline: none;
      height: 20px;
      width: 31px;
      text-align: center;
    }
  }
  .o-text-options > div {
    cursor: pointer;
    line-height: 26px;
    padding: 3px 12px;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
`;

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

  private inputRef = useRef("inputFontSize");
  private rootEditorRef = useRef("FontSizeEditor");
  private fontSizeListRef = useRef("fontSizeList");

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
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
    if (ev.key === "Tab") {
      ev.preventDefault();
      ev.stopPropagation();
      this.closeFontList();
      this.DOMFocusableElementStore.focus();
      return;
    }
  }
}
