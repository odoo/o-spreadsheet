import { proxy } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { deepEquals } from "../../../helpers/misc";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
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

  state = proxy({
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
    if (this.props.style === "fillColor" && this.isWholeSheetSelected()) {
      const sheetId = this.env.model.getters.getActiveSheetId();
      this.env.model.dispatch("SET_BACKGROUND_FOR_ALL_CELLS", { sheetId, color });
      return;
    }
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

  private isWholeSheetSelected(): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const sheetZone = this.env.model.getters.getSheetZone(sheetId);
    return deepEquals(this.env.model.getters.getSelectedZone(), sheetZone);
  }
}
