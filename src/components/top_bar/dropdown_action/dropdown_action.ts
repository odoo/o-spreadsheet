import { signal, useProps } from "@odoo/owl";
import { PropsOf } from "../../../types/props_of";
import { ActionButton } from "../../action_button/action_button";
import { getElBoundingRect } from "../../helpers/dom_helpers";
import { ToolBarDropdownPlugin, useToolBarDropdownPlugin } from "../../helpers/top_bar_tool_hook";
import { OSComponent } from "../../os_component";
import { Popover } from "../../popover/popover";
import { types } from "../../props_validation";

export class DropdownAction extends OSComponent {
  static template = "o-spreadsheet-DropdownAction";
  static components = { ActionButton, Popover };

  protected props = useProps({
    parentAction: types.ActionSpec(),
    childActions: types.array(types.ActionSpec()),
    class: types.string(),
    childClass: types.string(),
  });

  topBarToolPlugin!: ToolBarDropdownPlugin;
  actionRef = signal.ref();

  setup() {
    this.topBarToolPlugin = useToolBarDropdownPlugin();
  }

  toggleDropdown() {
    if (this.isActive) {
      this.topBarToolPlugin.closeDropdowns();
    } else {
      this.topBarToolPlugin.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolPlugin.isActive;
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: getElBoundingRect(this.actionRef()),
      positioning: "bottom-left",
      verticalOffset: 0,
      class: "rounded",
    };
  }
}
