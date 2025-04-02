import { Component, useRef, useState } from "@odoo/owl";
import { Action } from "../../../actions/action";
import { UuidGenerator } from "../../../helpers";
import { MenuMouseEvent, Rect, SpreadsheetChildEnv } from "../../../types";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { MenuPopover } from "../../menu_popover/menu_popover";

export interface SelectMenuProps {
  menuItems: Action[];
  selectedValue: string;
  class?: string;
}

interface State {
  isMenuOpen: boolean;
}

/** This component looks like a select input, but on click it opens a MenuPopover with the items given as props instead of a dropdown */
export class SelectMenu extends Component<SelectMenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SelectMenu";
  static props = {
    menuItems: Array,
    selectedValue: String,
    class: { type: String, optional: true },
  };
  static components = { MenuPopover };

  menuId = new UuidGenerator().uuidv4();

  selectRef = useRef("select");
  selectRect = useAbsoluteBoundingRect(this.selectRef);

  state = useState<State>({
    isMenuOpen: false,
  });

  onClick(ev: MenuMouseEvent) {
    if (ev.closedMenuId === this.menuId) {
      return;
    }
    this.state.isMenuOpen = !this.state.isMenuOpen;
  }

  onMenuClosed() {
    this.state.isMenuOpen = false;
  }

  get menuAnchorRect(): Rect {
    return this.selectRect;
  }
}
