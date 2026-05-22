import { signal } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ActionButton } from "../../action_button/action_button";
import { getElBoundingRect } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { Popover, PopoverProps } from "../../popover/popover";

interface Props {
  parentAction: ActionSpec;
  childActions: ActionSpec[];
  class: string;
  childClass: String;
}

export class DropdownAction extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DropdownAction";
  static components = { ActionButton, Popover };
  static props = {
    parentAction: Object,
    childActions: Array,
    class: String,
    childClass: String,
  };

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

  get popoverProps(): PopoverProps {
    return {
      anchorRect: getElBoundingRect(this.actionRef()),
      positioning: "bottom-left",
      verticalOffset: 0,
      class: "rounded",
    };
  }
}
