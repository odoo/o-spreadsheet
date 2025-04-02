import { Component, useRef, useState } from "@odoo/owl";
import { ActionSpec, createActions } from "../../../../actions/action";
import { MenuMouseEvent } from "../../../../types";
import { SpreadsheetChildEnv } from "../../../../types/env";
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
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  private menuId = this.env.model.uuidGenerator.uuidv4();

  toggleMenu(ev: MenuMouseEvent) {
    if (ev.closedMenuId === this.menuId) {
      return;
    }

    const { x, y } = this.buttonRef.el!.getBoundingClientRect();
    this.menuState.isOpen = !this.menuState.isOpen;
    this.menuState.position = { x, y };
    this.menuState.menuItems = createActions(this.props.items);
  }
}
