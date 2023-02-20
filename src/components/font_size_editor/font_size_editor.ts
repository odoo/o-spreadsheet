import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { DEFAULT_FONT_SIZE, FONT_SIZES } from "../../constants";
import { clip } from "../../helpers/index";
import { setStyle } from "../../registries/index";
import { SpreadsheetChildEnv } from "../../types/index";
import { css } from "../helpers/css";
import { isChildEvent } from "../helpers/dom_helpers";

interface State {
  isOpen: boolean;
}

interface Props {
  onToggle: () => void;
  dropdownStyle: string;
}

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-font-size-editor {
    input.o-font-size {
      height: 20px;
      width: 23px;
    }
    input[type="number"] {
      -moz-appearance: textfield;
    }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }
  }
`;

export class FontSizeEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FontSizeEditor";
  static components = {};
  fontSizes = FONT_SIZES;

  dropdown: State = useState({ isOpen: false });

  private inputRef = useRef("inputFontSize");
  private rootEditorRef = useRef("FontSizeEditor");

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: MouseEvent) {
    if (!isChildEvent(this.rootEditorRef.el!, ev)) {
      this.closeFontList();
    }
  }

  get currentFontSize(): number {
    return this.env.model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  }

  toggleFontList() {
    const isOpen = this.dropdown.isOpen;
    if (!isOpen) {
      this.props.onToggle();
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
    setStyle(this.env, { fontSize });
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
        target.value = `${this.currentFontSize}`;
      }
      this.props.onToggle();
    }
  }
}

FontSizeEditor.props = {
  onToggle: Function,
  dropdownStyle: String,
};
