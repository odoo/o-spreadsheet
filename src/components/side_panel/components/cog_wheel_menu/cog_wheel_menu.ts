import { props, proxy, signal } from "@odoo/owl";
import { createActions } from "../../../../actions/action";
import { UuidGenerator } from "../../../../helpers/uuid";
import { Component } from "../../../../owl3_compatibility_layer";
import { MenuMouseEvent } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { types } from "../../../props_validation";

export class CogWheelMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CogWheelMenu";
  static components = { MenuPopover };
  protected props = props({
    items: types.array(types.ActionSpec()),
  });

  private buttonRef = signal<HTMLElement | null>(null);
  private menuState: MenuState = proxy({ isOpen: false, anchorRect: null, menuItems: [] });

  private menuId = UuidGenerator.uuidv4();

  toggleMenu(ev: MenuMouseEvent) {
    if (ev.closedMenuId === this.menuId) {
      return;
    }

    this.menuState.isOpen = !this.menuState.isOpen;
    this.menuState.anchorRect = getBoundingRectAsPOJO(this.buttonRef()!);
    this.menuState.menuItems = createActions(this.props.items);
  }
}
