import { MenuMouseEvent } from "@odoo/o-spreadsheet-engine";
import { Component, useRef, useState } from "@odoo/owl";
import { ActionSpec, createActions } from "../../../../actions/action";
import { SpreadsheetChildEnv } from "../../../../types/env";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";

interface Props {
  items: ActionSpec[];
}

export class CogWheelMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CogWheelMenu";
  static components = { MenuPopover };
  static props = {
    items: Array,
  };

  private buttonRef = useRef("button");
  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  private menuId = this.env.model.uuidGenerator.uuidv4();

  toggleMenu(ev: MenuMouseEvent) {
    if (ev.closedMenuId === this.menuId) {
      return;
    }

    this.menuState.isOpen = !this.menuState.isOpen;
    this.menuState.anchorRect = getBoundingRectAsPOJO(this.buttonRef.el!);
    this.menuState.menuItems = createActions(this.props.items);
  }
}
