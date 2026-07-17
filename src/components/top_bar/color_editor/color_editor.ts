import { proxy, useProps } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { deepEquals } from "../../../helpers/misc";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { types } from "../../props_validation";

export class TopBarColorEditor extends Component<SpreadsheetChildEnv> {
  static components = { ColorPickerWidget };
  static template = "o-spreadsheet-ColorEditor";

  protected props = useProps({
    class: types.string(),
    style: types.or([types.literal("textColor"), types.literal("fillColor")]),
    icon: types.string(),
    title: types.string(),
  });
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
