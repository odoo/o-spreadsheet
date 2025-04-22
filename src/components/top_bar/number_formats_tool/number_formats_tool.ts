import { Component, useRef, useState } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { formatNumberMenuItemSpec } from "../../../registries/menus";
import { Rect, SpreadsheetChildEnv } from "../../../types";
import { ActionButton } from "../../action_button/action_button";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { Menu } from "../../menu/menu";

interface Props {
  class: string;
}

interface State {
  menuItems: Action[];
  anchorRect: Rect;
}

export class NumberFormatsTool extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberFormatsTool";
  static components = { Menu, ActionButton };
  static props = { class: String };
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  topBarToolStore!: ToolBarDropdownStore;

  buttonRef = useRef("buttonRef");
  state: State = useState({
    anchorRect: { x: 0, y: 0, width: 0, height: 0 },
    menuItems: [],
  });

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  toggleMenu() {
    if (this.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      const menu = createAction(this.formatNumberMenuItemSpec);
      this.state.menuItems = menu.children(this.env).sort((a, b) => a.sequence - b.sequence);
      this.state.anchorRect = getBoundingRectAsPOJO(this.buttonRef.el!);
      this.topBarToolStore.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }
}
