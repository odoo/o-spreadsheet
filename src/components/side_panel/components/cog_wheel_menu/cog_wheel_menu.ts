import { proxy, signal, useProps } from "@odoo/owl";
import { createActions } from "../../../../actions/action";
import { UuidGenerator } from "../../../../helpers/uuid";
import { MenuMouseEvent } from "../../../../types/misc";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";

export class CogWheelMenu extends SpreadsheetComponent {
  static template = "o-spreadsheet-CogWheelMenu";
  static components = { MenuPopover };
  protected props = useProps({
    items: types.array(types.ActionSpec()),
  });

  private buttonRef = signal.ref();
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
