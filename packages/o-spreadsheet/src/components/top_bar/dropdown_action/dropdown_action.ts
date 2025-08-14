import { Component, useRef } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { SpreadsheetChildEnv } from "../../../types";
import { ActionButton } from "../../action_button/action_button";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { Popover, PopoverProps } from "../../popover";

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
  actionRef = useRef("actionRef");

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
    const rect = this.actionRef.el
      ? this.actionRef.el.getBoundingClientRect()
      : { x: 0, y: 0, width: 0, height: 0 };
    return {
      anchorRect: rect,
      positioning: "bottom-left",
      verticalOffset: 0,
      class: "rounded",
    };
  }
}
