import { Component, onMounted, onPatched, useRef, useState } from "@odoo/owl";
import { BOTTOMBAR_HEIGHT } from "../../constants";
import { interactiveRenameSheet } from "../../helpers/ui/sheet_interactive";
import { getSheetMenuRegistry } from "../../registries";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { SpreadsheetChildEnv } from "../../types";
import { Ripple } from "../animation/ripple";
import { css } from "../helpers/css";

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
      color: #484;
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
  }
`;

interface Props {
  sheetId: string;
  openContextMenu: (registry: MenuItemRegistry, ev: MouseEvent) => void;
  style?: string;
  onMouseDown: (ev: MouseEvent) => void;
}

interface State {
  isEditing: boolean;
}

export class BottomBarSheet extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarSheet";
  static components = { Ripple };
  static defaultProps = {
    onMouseDown: () => {},
    style: "",
  };

  private state = useState<State>({ isEditing: false });

  private sheetDivRef = useRef("sheetDiv");
  private sheetNameRef = useRef("sheetNameSpan");

  private editionState: "initializing" | "editing" = "initializing";

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
    }
    if (ev.key === "Escape") {
      this.cancelEdition();
    }
  }

  onClickSheetName(ev: MouseEvent) {
    if (this.state.isEditing) ev.stopPropagation();
  }

  private startEdition() {
    this.state.isEditing = true;
    this.editionState = "initializing";
  }

  private stopEdition() {
    if (!this.state.isEditing) return;

    this.state.isEditing = false;
    this.editionState = "initializing";
    this.sheetNameRef.el?.blur();

    const inputValue = this.getInputContent() || "";
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

  get contextMenuRegistry() {
    return getSheetMenuRegistry({
      renameSheetCallback: () => {
        this.scrollToSheet();
        this.startEdition();
      },
    });
  }

  get isSheetActive() {
    return this.env.model.getters.getActiveSheetId() === this.props.sheetId;
  }

  get sheetName() {
    return this.env.model.getters.getSheetName(this.props.sheetId);
  }
}
BottomBarSheet.props = {
  sheetId: String,
  openContextMenu: Function,
  style: { type: String, optional: true },
  onMouseDown: { type: Function, optional: true },
};
