import { Component, useState } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { SpreadsheetChildEnv } from "../../../types";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";

type Props = {
  style: "textColor" | "fillColor";
  icon: string;
  class: string;
  title: string;
};

export class TopBarColorEditor extends Component<Props, SpreadsheetChildEnv> {
  static components = { ColorPickerWidget };
  static props = { class: String, style: String, icon: String, title: String };

  static template = "o-spreadsheet-ColorEditor";
  topBarToolStore!: ToolBarDropdownStore;

  state = useState({
    isOpen: false,
  });

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }
  get currentColor(): string {
    return (
      this.env.model.getters.getCurrentStyle()[this.props.style] ||
      (this.props.style === "textColor" ? "#000000" : "#ffffff")
    );
  }

  setColor(color: string) {
    setStyle(this.env, { [this.props.style]: color });
    this.state.isOpen = false;
  }

  get isMenuOpen(): boolean {
    return this.topBarToolStore.isActive;
  }

  onClick() {
    if (!this.isMenuOpen) {
      this.topBarToolStore.openDropdown();
    } else {
      this.topBarToolStore.closeDropdowns();
    }
  }
}
