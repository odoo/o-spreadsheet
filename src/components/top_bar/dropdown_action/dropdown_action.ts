import { signal, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ActionButton } from "../../action_button/action_button";
import { getElBoundingRect } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { Popover } from "../../popover/popover";
import { types } from "../../props_validation";

export class DropdownAction extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DropdownAction";
  static components = { ActionButton, Popover };

  protected props = useProps({
    parentAction: types.ActionSpec(),
    childActions: types.array(types.ActionSpec()),
    class: types.string(),
    childClass: types.string(),
  });

  topBarToolStore!: ToolBarDropdownStore;
  actionRef = signal<HTMLElement | null>(null);

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  toggleDropdown() {
    if (this.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
  }

  get isActive() {
    return this.topBarToolStore.isActive;
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
