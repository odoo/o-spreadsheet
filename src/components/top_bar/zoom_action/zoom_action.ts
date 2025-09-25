import { _t } from "@odoo/o-spreadsheet-engine";
import { ZOOM_VALUES } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { FontSizeEditor } from "../../font_size_editor/font_size_editor";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";

class ZoomEditor extends FontSizeEditor {
  fontSizes = ZOOM_VALUES.map((zoom) => `${zoom}%`);
  min = 50;
  max = 300;
  title = _t("Zoom");

  get currentValue(): string {
    return `${this.props.currentFontSize}%`;
  }
}

interface Props {
  class: string;
}

export class ToolBarZoom extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { ZoomEditor };
  static props = { class: String };
  topBarToolStore!: ToolBarDropdownStore;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  get currentFontSize(): number {
    const zoom = this.env.model.getters.getViewportZoomLevel() || 1;
    return zoom * 100;
  }

  setFontSize(fontSize: number) {
    this.env.model.dispatch("SET_ZOOM", { zoom: fontSize / 100 });
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
