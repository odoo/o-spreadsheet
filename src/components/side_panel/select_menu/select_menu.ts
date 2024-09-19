import { UuidGenerator } from "@odoo/o-spreadsheet-utils";
import { Component, useRef, useState } from "@odoo/owl";
import { Action } from "../../../actions/action";
import { DOMCoordinates, MenuMouseEvent, SpreadsheetChildEnv } from "../../../types";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { Menu } from "../../menu/menu";

export interface SelectMenuProps {
  menuItems: Action[];
  selectedValue: string;
  class?: string;
}

interface State {
  isMenuOpen: boolean;
}

/** This component looks like a select input, but on click it opens a Menu with the items given as props instead of a dropdown */
export class SelectMenu extends Component<SelectMenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SelectMenu";
  static props = {
    menuItems: Array,
    selectedValue: String,
    class: { type: String, optional: true },
  };
  static components = { Menu };

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

  get menuPosition(): DOMCoordinates {
    return {
      x: this.selectRect.x,
      y: this.selectRect.y + this.selectRect.height,
    };
  }
}
