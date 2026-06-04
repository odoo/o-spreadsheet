import { props, proxy, signal } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { Component } from "../../../owl3_compatibility_layer";
import { formatNumberMenuItemSpec } from "../../../registries/menus/number_format_menu_registry";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ActionButton } from "../../action_button/action_button";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { MenuPopover } from "../../menu_popover/menu_popover";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";

interface State {
  menuItems: Action[];
  anchorRect: Rect;
}

export class NumberFormatsTool extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberFormatsTool";
  static components = { MenuPopover, ActionButton };

  protected props = props({ class: types.string() });
  private model = useModel();
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  topBarToolStore!: ToolBarDropdownStore;

  buttonRef = signal<HTMLElement | null>(null);
  state: State = proxy({
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
      this.state.menuItems = menu
        .children(this.model(), this.env)
        .sort((a, b) => a.sequence - b.sequence);
      this.state.anchorRect = getBoundingRectAsPOJO(this.buttonRef()!);
      this.topBarToolStore.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }
}
