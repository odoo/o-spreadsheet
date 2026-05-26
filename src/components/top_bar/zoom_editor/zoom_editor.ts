import { props } from "@odoo/owl";
import { ZOOM_VALUES } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";

import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";
export class ToolBarZoom extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };

  protected props = props({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;

  valueList = ZOOM_VALUES;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  get currentFontSize(): number {
    const zoom = this.env.model.getters.getViewportZoomLevel() || 1;
    return zoom * 100;
  }

  setZoom(fontSize: number) {
    this.env.model.dispatch("SET_ZOOM", { zoom: fontSize / 100 });
  }

  toggle() {
    if (this.topBarToolStore.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
  }

  onFocusInput() {
    this.topBarToolStore.openDropdown();
  }
}
