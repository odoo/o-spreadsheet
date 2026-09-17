import { useProps } from "@odoo/owl";
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, ZOOM_VALUES } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";

import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";
export class ToolBarZoom extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };

  protected props = useProps({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;

  valueList = ZOOM_VALUES;
  minZoom = MIN_ZOOM_LEVEL * 100;
  maxZoom = MAX_ZOOM_LEVEL * 100;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  getZoomLevel(): number {
    const zoom = this.env.model.getters.getViewportZoomLevel() || 1;
    return Math.round(zoom * 100);
  }

  setZoom(zoomPercentage: number) {
    this.env.model.dispatch("SET_ZOOM", { zoom: zoomPercentage / 100 });
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
