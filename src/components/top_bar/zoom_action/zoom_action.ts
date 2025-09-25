import { Component, useRef, useState } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { zoomAction } from "../../../actions/view_actions";
import { ZOOM_VALUES } from "../../../constants";
import { _t } from "../../../translation";
import { Rect, SpreadsheetChildEnv } from "../../../types";
import { ActionButton } from "../../action_button/action_button";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { MenuPopover } from "../../menu_popover/menu_popover";

interface Props {
  class: string;
}

interface State {
  menuItems: Action[];
  anchorRect: Rect;
}

export class ToolBarZoom extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { MenuPopover, ActionButton };
  static props = { class: String };
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
      this.state.menuItems = ZOOM_VALUES.map((zoom) => createAction(zoomAction(zoom)));
      this.state.anchorRect = getBoundingRectAsPOJO(this.buttonRef.el!);
      this.topBarToolStore.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }

  get action() {
    return {
      name: _t(`Zoom`),
      icon: "o-spreadsheet-Icon.ZOOM",
      isReadonlyAllowed: true,
    };
  }
}
