import { Component, onMounted, onPatched, useExternalListener, useRef, useState } from "@odoo/owl";
import { ACTION_COLOR, BOTTOMBAR_HEIGHT } from "../../../constants";
import { interactiveRenameSheet } from "../../../helpers/ui/sheet_interactive";
import { getSheetMenuRegistry } from "../../../registries";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { Store, useStore } from "../../../store_engine";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import { Rect, SpreadsheetChildEnv } from "../../../types";
import { Ripple } from "../../animation/ripple";
import { ColorPicker } from "../../color_picker/color_picker";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";

css/* scss */ `
  .o-sheet {
    padding: 0 15px;
    padding-right: 10px;
    height: ${BOTTOMBAR_HEIGHT}px;
    border-left: 1px solid #c1c1c1;
    border-right: 1px solid #c1c1c1;
    margin-left: -1px;
    cursor: pointer;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }

    &.active {
      color: ${ACTION_COLOR};
      background-color: #ffffff;
      box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
    }

    .o-sheet-icon {
      z-index: 1;

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-sheet-name {
      outline: none;
      padding: 2px 4px;

      &.o-sheet-name-editable {
        border-radius: 2px;
        border: 2px solid mediumblue;
        /* negative margins so nothing moves when the border is added */
        margin-left: -2px;
        margin-right: -2px;
      }
    }

    .o-sheet-color {
      bottom: 0;
      left: 0;
      height: 6px;
      z-index: 1;
      width: calc(100% - 1px);
    }
  }
`;

interface Props {
  sheetId: string;
  openContextMenu: (registry: MenuItemRegistry, ev: MouseEvent) => void;
  style?: string;
  onMouseDown: (ev: MouseEvent) => void;
  isProtected: boolean;
}

interface State {
  isEditing: boolean;
  pickerOpened: boolean;
}

export class BottomBarSheet extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarSheet";
  static props = {
    sheetId: String,
    openContextMenu: Function,
    style: { type: String, optional: true },
    onMouseDown: { type: Function, optional: true },
    isProtected: { type: Boolean, optional: true },
  };
  static components = { Ripple, ColorPicker };
  static defaultProps = {
    onMouseDown: () => {},
    style: "",
  };

  private state = useState<State>({ isEditing: false, pickerOpened: false });

  private sheetDivRef = useRef("sheetDiv");
  private sheetNameRef = useRef("sheetNameSpan");

  private editionState: "initializing" | "editing" = "initializing";

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    onMounted(() => {
      if (this.isSheetActive) {
        this.scrollToSheet();
      }
    });
    onPatched(() => {
      if (this.sheetNameRef.el && this.state.isEditing && this.editionState === "initializing") {
        this.editionState = "editing";
        this.focusInputAndSelectContent();
      }
    });
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useExternalListener(window, "click", () => (this.state.pickerOpened = false));
  }

  private focusInputAndSelectContent() {
    if (!this.state.isEditing || !this.sheetNameRef.el) return;

    this.sheetNameRef.el.focus();
    const selection = window.getSelection();
    if (selection && this.sheetNameRef.el.firstChild) {
      selection.setBaseAndExtent(
        this.sheetNameRef.el.firstChild,
        0,
        this.sheetNameRef.el.firstChild,
        this.sheetNameRef.el.textContent?.length || 0
      );
    }
  }

  private scrollToSheet() {
    this.sheetDivRef.el?.scrollIntoView?.();
  }

  onFocusOut() {
    if (this.state.isEditing && this.editionState !== "initializing") {
      this.stopEdition();
    }
  }

  onMouseDown(ev) {
    this.activateSheet();
    this.props.onMouseDown(ev);
  }

  private activateSheet() {
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      sheetIdTo: this.props.sheetId,
    });
    this.scrollToSheet();
  }

  onDblClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    this.startEdition();
  }

  onKeyDown(ev: KeyboardEvent) {
    if (!this.state.isEditing) return;
    if (ev.key === "Enter") {
      ev.preventDefault();
      this.stopEdition();
      this.DOMFocusableElementStore.focus();
    }
    if (ev.key === "Escape") {
      this.cancelEdition();
      this.DOMFocusableElementStore.focus();
    }
  }

  onMouseEventSheetName(ev: MouseEvent) {
    if (this.state.isEditing) ev.stopPropagation();
  }

  private startEdition() {
    this.state.isEditing = true;
    this.editionState = "initializing";
  }

  private stopEdition() {
    const input = this.sheetNameRef.el;
    if (!this.state.isEditing || !input) return;

    this.state.isEditing = false;
    this.editionState = "initializing";
    input.blur();

    const inputValue = this.getInputContent() || "";
    input.innerText = inputValue;

    interactiveRenameSheet(this.env, this.props.sheetId, inputValue, () => this.startEdition());
  }

  private cancelEdition() {
    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef.el?.blur();
    this.setInputContent(this.sheetName);
  }

  onIconClick(ev: MouseEvent) {
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  onContextMenu(ev: MouseEvent) {
    if (!this.isSheetActive) {
      this.activateSheet();
    }
    this.props.openContextMenu(this.contextMenuRegistry, ev);
  }

  private getInputContent(): string | undefined | null {
    return this.sheetNameRef.el?.textContent;
  }

  private setInputContent(content: string) {
    if (this.sheetNameRef.el) this.sheetNameRef.el.textContent = content;
  }

  onColorPicked(color: string) {
    this.state.pickerOpened = false;
    this.env.model.dispatch("COLOR_SHEET", { sheetId: this.props.sheetId, color });
  }

  get colorPickerAnchorRect(): Rect {
    const button = this.sheetDivRef.el!;
    return getBoundingRectAsPOJO(button);
  }

  get contextMenuRegistry() {
    return getSheetMenuRegistry({
      renameSheetCallback: () => {
        this.scrollToSheet();
        this.startEdition();
      },
      openSheetColorPickerCallback: () => {
        this.state.pickerOpened = true;
      },
    });
  }

  get isSheetActive() {
    return this.env.model.getters.getActiveSheetId() === this.props.sheetId;
  }

  get sheetName() {
    return this.env.model.getters.getSheetName(this.props.sheetId);
  }

  get sheetColorStyle() {
    const color = this.env.model.getters.getSheet(this.props.sheetId).color || "";
    return cssPropertiesToCss({ background: color });
  }
}
