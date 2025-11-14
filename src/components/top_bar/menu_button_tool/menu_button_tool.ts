import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { Action, ActionSpec, createAction } from "../../../actions/action";
import { Rect } from "../../../types";
import { ActionButton } from "../../action_button/action_button";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { MenuPopover } from "../../menu_popover/menu_popover";

interface Props {
  class: string;
  action: ActionSpec;
}

interface State {
  menuItems: Action[];
  anchorRect: Rect;
}

export class MenuButtonTool extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MenuButtonTool";
  static components = { MenuPopover, ActionButton };
  static props = { class: String, action: Object };
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
      const menu = createAction(this.props.action);
      this.state.menuItems = menu.children(this.env).sort((a, b) => a.sequence - b.sequence);
      this.state.anchorRect = getBoundingRectAsPOJO(this.buttonRef.el!);
      this.topBarToolStore.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }

  onClose() {
    this.topBarToolStore.closeDropdowns();
  }
}
