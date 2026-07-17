import { useProps } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { DEFAULT_FONT_SIZE } from "../../../constants";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { FontSizeEditor } from "../../font_size_editor/font_size_editor";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { types } from "../../props_validation";

export class TopBarFontSizeEditor extends Component<SpreadsheetChildEnv> {
  static components = { FontSizeEditor };
  static template = "o-spreadsheet-TopBarFontSizeEditor";

  protected props = useProps({ class: types.string() });
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

  get class() {
    return `${this.props.class} ${
      this.env.model.getters.isCurrentSheetLocked() ? "o-disabled" : ""
    }`;
  }
}
