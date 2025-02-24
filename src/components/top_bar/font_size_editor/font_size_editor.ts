import { Component } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { DEFAULT_FONT_SIZE } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types";
import { FontSizeEditor } from "../../font_size_editor/font_size_editor";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";

type Props = {
  class: string;
};

export class TopBarFontSizeEditor extends Component<Props, SpreadsheetChildEnv> {
  static components = { FontSizeEditor };
  static props = { class: String };

  static template = "o-spreadsheet-TopBarFontSizeEditor";
  topBarToolStore!: ToolBarDropdownStore;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  get currentFontSize(): number {
    return this.env.model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  }
  setFontSize(fontSize: number) {
    setStyle(this.env, { fontSize });
  }

  onToggle() {
    if (this.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
  }

  onFocusInput() {
    this.topBarToolStore.openDropdown();
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }
}
