import { props, types } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { DEFAULT_FONT_SIZE } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { FontSizeEditor } from "../../font_size_editor/font_size_editor";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";

import { Component } from "../../../owl3_compatibility_layer";
import { useModel } from "../../owl_plugins/model_plugin";

export class TopBarFontSizeEditor extends Component<SpreadsheetChildEnv> {
  static components = { FontSizeEditor };
  static template = "o-spreadsheet-TopBarFontSizeEditor";

  protected props = props({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;

  private model = useModel();
  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  get currentFontSize(): number {
    return this.model().getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  }
  setFontSize(fontSize: number) {
    setStyle(this.model(), { fontSize });
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
    return `${this.props.class} ${this.model().getters.isCurrentSheetLocked() ? "o-disabled" : ""}`;
  }
}
