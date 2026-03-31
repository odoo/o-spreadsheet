import { Component } from "@odoo/owl";
import { ZOOM_VALUES } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";

interface Props {
  class: string;
}

export class ToolBarZoom extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };
  static props = { class: String };
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
